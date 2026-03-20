import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

import { SubSearchAgent } from '../agents/subSearchAgent'
import type { AgentSearchResult, PluginConfig } from '../types'
import { TavilySearchService } from './tavilySearch'
import { withTimeout } from '../utils/async'
import { normalizeModelName } from '../utils/model'
import { buildFactCheckToolSearchPrompt, FACT_CHECK_TOOL_SEARCH_SYSTEM_PROMPT } from '../utils/prompts'
import { maybeSummarize } from '../utils/summary'
import { truncate } from '../utils/text'
import { extractUrls } from '../utils/url'
import { collectSearchSources, type ResolvedSearchSource } from '../utils/sources'

type Ctx = any

type SourceTaskOutcome =
  | { index: number; source: ResolvedSearchSource; status: 'fulfilled'; value: AgentSearchResult }
  | { index: number; source: ResolvedSearchSource; status: 'rejected'; reason: unknown }
  | { status: 'timeout' }

class FactCheckTool extends StructuredTool<any> {
  name: string
  description: string
  schema = z.object({
    input: z.string().min(1).describe('待核查的文本。'),
  })

  private readonly logger: any
  private readonly subSearchAgent: SubSearchAgent
  private readonly tavilySearch: TavilySearchService
  private readonly backgroundTasks = new Set<Promise<SourceTaskOutcome>>()

  constructor(
    private readonly ctx: Ctx,
    private readonly config: PluginConfig,
    toolName: string,
    toolDescription: string
  ) {
    super()
    this.name = sanitizeToolName(toolName, 'fact_check')
    this.description = sanitizeToolDescription(toolDescription, '联网事实核查与时效搜索。')
    this.logger = ctx.logger('chatluna-fact-check')
    this.subSearchAgent = new SubSearchAgent(ctx, config)
    this.tavilySearch = new TavilySearchService(ctx, config)
  }

  private unwrapInput(input: unknown): string {
    if (typeof input === 'string') {
      return input
    }
    if (input && typeof input === 'object' && 'input' in input) {
      const raw = (input as { input?: unknown }).input
      return typeof raw === 'string' ? raw : ''
    }
    return ''
  }

  private getConfiguredSources(): ResolvedSearchSource[] {
    return collectSearchSources(this.config)
  }

  private getSourcePerspective(source: ResolvedSearchSource, index: number): string {
    if (source.kind === 'chatluna_model') {
      return normalizeModelName(source.model) || `ChatlunaSearch-${index + 1}`
    }
    return index > 0 ? `TavilySearch-${index + 1}` : 'TavilySearch'
  }

  private getSourceLogLabel(source: ResolvedSearchSource, index: number): string {
    if (source.kind === 'chatluna_model') {
      const model = normalizeModelName(source.model)
      return model ? `chatluna:${model}` : `chatluna:source-${index + 1}`
    }
    return `tavily:${source.provider || `source-${index + 1}`}`
  }

  private createSourceTask(claim: string, source: ResolvedSearchSource, index: number): Promise<SourceTaskOutcome> {
    const perspective = this.getSourcePerspective(source, index)
    const task = source.kind === 'chatluna_model'
      ? this.subSearchAgent.deepSearchWithModel(
          claim,
          normalizeModelName(source.model),
          `fact-check-${index + 1}`,
          perspective,
          buildFactCheckToolSearchPrompt(claim),
          FACT_CHECK_TOOL_SEARCH_SYSTEM_PROMPT
        )
      : this.tavilySearch.search(
          claim,
          source.tavilyApiKey,
          perspective
        )

    return withTimeout(
      task,
      Math.max(5, this.config.search.perSourceTimeout || 45) * 1000,
      this.getSourceLogLabel(source, index)
    )
      .then((value) => ({ index, source, status: 'fulfilled' as const, value }))
      .catch((reason) => ({ index, source, status: 'rejected' as const, reason }))
  }

  private trackBackgroundTask(task: Promise<SourceTaskOutcome>, label: string): void {
    this.backgroundTasks.add(task)
    task.then(() => {
      this.logger.info(`[FactCheckTool] 后台任务完成: ${label}`)
    }).catch((error: any) => {
      this.logger.info(`[FactCheckTool] 后台任务失败: ${label}: ${error?.message || error}`)
    }).finally(() => {
      this.backgroundTasks.delete(task)
    })
  }

  private async waitNextOutcome(
    active: Map<number, Promise<SourceTaskOutcome>>,
    remainingMs: number
  ): Promise<SourceTaskOutcome> {
    if (active.size === 0 || remainingMs <= 0) {
      return { status: 'timeout' }
    }

    return Promise.race([
      ...active.values(),
      new Promise<SourceTaskOutcome>((resolve) => {
        setTimeout(() => resolve({ status: 'timeout' }), remainingMs)
      }),
    ])
  }

  private buildInternalContextPreamble(): string {
    return [
      '[INTERNAL_TOOL_CONTEXT]',
      'INTERNAL_TOOL_CONTEXT_DO_NOT_QUOTE_VERBATIM',
      '以下内容仅用于 Agent 内部推理，不要逐字转发给用户。',
      '对用户回复时请只输出结论、关键依据和必要来源链接。',
      '',
    ].join('\n')
  }

  private formatFindingsForContext(text: string | undefined, maxChars: number): string {
    const normalized = (text || '').trim()
    if (!normalized) return '无'
    return truncate(normalized, maxChars, '无')
  }

  private formatSourcesForContext(sources: string[], limit: number): string {
    const items = (sources || []).filter(Boolean).slice(0, limit)
    if (items.length === 0) return '- 无'
    return items.map((item) => `- ${item}`).join('\n')
  }

  private appendDirectSourcesBlock(output: string, sources: string[]): string {
    if (!this.config.tool.forceExposeSources) {
      return output
    }

    const directSources = [...new Set(
      (sources || [])
        .flatMap((source) => extractUrls(String(source || '').trim()))
        .filter(Boolean)
    )].slice(0, this.config.tool.maxSources)

    const sourceText = directSources.length > 0
      ? directSources.map((source) => `- ${source}`).join('\n')
      : '- 无'

    return `${output}\n\n[DirectSendSources]\n以下原始链接为直接发送给用户用，不要改写、补全或重写。\n${sourceText}`
  }

  private formatResults(results: AgentSearchResult[]): string {
    const lines: string[] = [this.buildInternalContextPreamble(), '[FactCheckContext]', '模式: multi-source']
    const allSources: string[] = []
    const maxFindingsChars = this.config.search.maxFindingsChars || 3000

    results.forEach((result, index) => {
      const confidence = Number.isFinite(result.confidence)
        ? `${Math.round(result.confidence * 100)}%`
        : '未知'

      lines.push('')
      lines.push(`[Source ${index + 1}]`)
      lines.push(`来源: ${result.perspective}`)
      lines.push(`置信度: ${confidence}`)
      lines.push(`关键发现: ${this.formatFindingsForContext(result.findings, maxFindingsChars)}`)
      lines.push('[Sources]')
      lines.push(this.formatSourcesForContext(result.sources || [], this.config.tool.maxSources))

      allSources.push(...(result.sources || []))
    })

    return this.appendDirectSourcesBlock(lines.join('\n'), allSources)
  }

  private async summarizeOutput(output: string, label: string): Promise<string> {
    const summaryEnabled = ['1', 'true', 'on'].includes(
      String(process.env.CHATLUNA_FACT_CHECK_ENABLE_SUMMARY || '').toLowerCase()
    )
    return maybeSummarize(this.ctx, this.config, output, label, {
      enabled: summaryEnabled,
      maxChars: this.config.search.maxFindingsChars,
    })
  }

  async _call(input: { input: string } | string): Promise<string> {
    const rawClaim = this.unwrapInput(input).trim()
    if (!rawClaim) {
      return '[FactCheck]\n输入为空，请提供需要检索的文本。'
    }

    const maxInputChars = this.config.tool.maxInputChars || 1_200
    const claim = rawClaim.slice(0, maxInputChars)
    if (rawClaim.length > maxInputChars) {
      this.logger.warn(`[FactCheckTool] 输入过长，已截断到 ${maxInputChars} 字符`)
    }

    const configuredSources = this.getConfiguredSources()
    if (configuredSources.length === 0) {
      return '[FactCheck]\n搜索失败: 未配置搜索来源。'
    }

    const failedLabels: string[] = []
    const successResults: AgentSearchResult[] = []
    const active = new Map<number, Promise<SourceTaskOutcome>>()
    const start = Date.now()
    const maxWaitMs = Math.max(1, this.config.timeoutSeconds || 120) * 1000

    configuredSources.forEach((source, index) => {
      active.set(index, this.createSourceTask(claim, source, index))
    })

    while (active.size > 0) {
      const remainingMs = maxWaitMs - (Date.now() - start)
      const outcome = await this.waitNextOutcome(active, remainingMs)

      if (outcome.status === 'timeout') {
        this.logger.info(`[FactCheckTool] 达到总超时上限 ${maxWaitMs}ms，剩余 ${active.size} 个来源未完成`)
        break
      }

      active.delete(outcome.index)

      if (outcome.status === 'fulfilled') {
        this.logger.info(`[FactCheckTool] 来源 #${outcome.index + 1} 完成: perspective=${outcome.value.perspective}, failed=${outcome.value.failed}, findings=${String(outcome.value.findings || '').slice(0, 80)}`)
        if (outcome.value.failed) {
          failedLabels.push(outcome.value.perspective || `source-${outcome.index + 1}`)
        } else {
          successResults.push(outcome.value)
        }
      } else {
        this.logger.warn(`[FactCheckTool] 来源 #${outcome.index + 1} rejected: ${this.getSourcePerspective(outcome.source, outcome.index)}`)
        failedLabels.push(this.getSourcePerspective(outcome.source, outcome.index))
      }
    }

    this.logger.info(`[FactCheckTool] 循环结束: active=${active.size}, success=${successResults.length}, failed=${failedLabels.length}`)

    if (active.size > 0) {
      active.forEach((task, index) => {
        const source = configuredSources[index]
        this.trackBackgroundTask(task, source ? this.getSourcePerspective(source, index) : `source-${index + 1}`)
      })
    }

    if (successResults.length === 0) {
      return `[FactCheck]\n搜索失败: ${failedLabels.join('、') || '全部来源不可用'}`
    }

    const output = this.formatResults(successResults)
    if (failedLabels.length > 0) {
      return this.summarizeOutput(`${output}\n\n[Failed]\n- ${failedLabels.join('\n- ')}`, 'fact_check')
    }
    return this.summarizeOutput(output, 'fact_check')
  }
}

export function registerFactCheckTool(ctx: Ctx, config: PluginConfig): void {
  const logger = ctx.logger('chatluna-fact-check')

  if (!config.tool.enabled) {
    logger.info('[FactCheckTool] 已禁用工具注册')
    return
  }

  const chatluna = ctx.chatluna
  if (!chatluna?.platform?.registerTool) {
    logger.warn('[FactCheckTool] chatluna.platform.registerTool 不可用，跳过注册')
    return
  }

  const toolName = sanitizeToolName(config.tool.name, 'fact_check')
  const toolDescription = sanitizeToolDescription(config.tool.description, '联网事实核查与时效搜索。')

  ctx.effect(() => {
    logger.info(`[FactCheckTool] 注册工具: ${toolName}`)
    const dispose = chatluna.platform.registerTool(toolName, {
      description: toolDescription,
      meta: {
        source: 'extension',
        group: 'fact-check',
        tags: ['fact-check', 'search'],
      },
      createTool() {
        return new FactCheckTool(ctx, config, toolName, toolDescription)
      },
      selector() {
        return true
      },
    })

    return () => {
      if (typeof dispose === 'function') {
        dispose()
      }
    }
  })
}

function sanitizeToolName(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    return fallback
  }

  const normalized = text
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64)

  return normalized || fallback
}

function sanitizeToolDescription(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}
