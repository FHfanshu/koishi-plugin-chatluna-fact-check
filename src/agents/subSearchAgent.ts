import { ChatlunaAdapter } from '../services/chatluna'
import { buildSubSearchPrompt, DEEP_SEARCH_AGENT_SYSTEM_PROMPT } from '../utils/prompts'
import { normalizeModelName } from '../utils/model'
import { collectChatlunaModels } from '../utils/sources'

import type { AgentSearchResult, PluginConfig } from '../types'

type Ctx = any

interface ParsedSubSearchResponse {
  findings?: string
  sources?: string[]
  confidence?: number
}

export class SubSearchAgent {
  private static readonly FALLBACK_PATTERNS = [
    "unexpected token 'd'",
    "unexpected token 'e'",
    '"data: {"',
    'is not valid json',
    'chat.completion.chunk',
    'event: error',
    'appchatreverse: chat failed, 429',
    'chat failed, 429',
    'status code: 429',
    'appchatreverse: chat failed, 403',
    'chat failed, 403',
    'status code: 403',
    'upstream_error',
    '模型暂时熔断',
  ] as const

  private readonly chatluna: ChatlunaAdapter
  private readonly logger: any

  constructor(private readonly ctx: Ctx, private readonly config: PluginConfig) {
    this.chatluna = new ChatlunaAdapter(ctx, config)
    this.logger = ctx.logger('chatluna-fact-check')
  }

  async deepSearchWithModel(
    claim: string,
    modelName: string,
    agentId = 'multi-search',
    perspective = '多源深度搜索',
    promptOverride?: string,
    systemPromptOverride?: string,
    allowFallback = true
  ): Promise<AgentSearchResult> {
    this.logger.info(`[SubSearchAgent] 开始深度搜索，模型: ${modelName}`)

    try {
      const response = await this.chatluna.chatWithRetry(
        {
          model: modelName,
          message: promptOverride || buildSubSearchPrompt(claim),
          systemPrompt: systemPromptOverride || DEEP_SEARCH_AGENT_SYSTEM_PROMPT,
          enableSearch: true,
        }
      )

      const parsed = this.parseResponse(response.content)
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(parsed.confidence, 1))
        : 0.3

      return {
        agentId,
        perspective,
        findings: parsed.findings || response.content,
        sources: parsed.sources || response.sources || [],
        confidence,
      }
    } catch (error: any) {
      if (allowFallback && this.shouldFallbackToFastModel(error)) {
        const fallbackModel = this.resolveFallbackModel(modelName)
        if (fallbackModel) {
          this.logger.warn(`[SubSearchAgent] 模型 ${modelName} 异常，回退到 ${fallbackModel}`)
          return this.deepSearchWithModel(
            claim,
            fallbackModel,
            agentId,
            `${perspective} (fallback)`,
            promptOverride,
            systemPromptOverride,
            false
          )
        }
      }

      this.logger.error('[SubSearchAgent] 搜索失败:', error)
      return {
        agentId,
        perspective,
        findings: `深度搜索失败: ${error?.message || error}`,
        sources: [],
        confidence: 0,
        failed: true,
        error: error?.message || String(error),
      }
    }
  }

  private shouldFallbackToFastModel(error: unknown): boolean {
    const message = this.getErrorFingerprint(error)
    return SubSearchAgent.FALLBACK_PATTERNS.some((pattern) => message.includes(pattern))
  }

  private getErrorFingerprint(error: unknown): string {
    const parts: string[] = []
    const visited = new Set<any>()
    const queue: any[] = [error]

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current || visited.has(current)) {
        continue
      }
      visited.add(current)

      if (typeof current === 'string') {
        parts.push(current)
        continue
      }

      if (current instanceof Error) {
        if (current.message) parts.push(current.message)
        if (current.stack) parts.push(current.stack)
      }

      if (typeof current === 'object') {
        for (const key of ['message', 'stack', 'code', 'name']) {
          const value = (current as Record<string, unknown>)[key]
          if (typeof value === 'string' && value) {
            parts.push(value)
          }
        }

        for (const key of ['originError', 'cause', 'error']) {
          const nested = (current as Record<string, unknown>)[key]
          if (nested && typeof nested === 'object') {
            queue.push(nested)
          } else if (typeof nested === 'string') {
            parts.push(nested)
          }
        }
      }
    }

    return parts.join('\n').toLowerCase()
  }

  private resolveFallbackModel(currentModel: string): string {
    const normalizedCurrent = normalizeModelName(currentModel)
    for (const model of collectChatlunaModels(this.config)) {
      if (model && model !== normalizedCurrent) {
        return model
      }
    }
    return ''
  }

  private parseResponse(content: string): ParsedSubSearchResponse {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content)

      return {
        findings: parsed.findings,
        sources: parsed.sources,
        confidence: parsed.confidence,
      }
    } catch {
      return {}
    }
  }
}
