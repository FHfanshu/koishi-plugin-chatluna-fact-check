import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

import type { PluginConfig } from '../types'
import { ChatlunaAdapter } from './chatluna'
import { JinaReaderService } from './jinaReader'
import { truncate } from '../utils/text'
import { isSafePublicHttpUrl, normalizeUrl } from '../utils/url'
import { collectChatlunaModels } from '../utils/sources'

type Ctx = any

class WebFetchTool extends StructuredTool<any> {
  name: string
  description: string
  schema = z.object({
    input: z.string().min(1).describe('要抓取的 URL。'),
  })

  private readonly logger: any
  private readonly chatluna: ChatlunaAdapter
  private readonly jinaReader: JinaReaderService

  constructor(
    private readonly ctx: Ctx,
    private readonly config: PluginConfig,
    toolName: string,
    toolDescription: string
  ) {
    super()
    this.name = sanitizeToolName(toolName, 'web_fetch')
    this.description = sanitizeToolDescription(
      toolDescription,
      '用于获取指定 URL 的网页内容。输入 URL，返回提取后的正文文本。'
    )
    this.logger = ctx.logger('chatluna-fact-check')
    this.chatluna = new ChatlunaAdapter(ctx, config)
    this.jinaReader = new JinaReaderService(ctx, config)
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

  async _call(input: { input: string } | string): Promise<string> {
    const rawUrl = this.unwrapInput(input).trim()
    if (!rawUrl) {
      return '[web_fetch]\n输入为空，请提供 URL。'
    }

    const targetUrl = normalizeUrl(rawUrl)
    if (!isSafePublicHttpUrl(targetUrl)) {
      return `[web_fetch]\nURL 非法或不安全: ${rawUrl}`
    }

    const providerOrder = this.config.web_fetch.providerOrder || 'grok-first'
    const tryGrokFirst = providerOrder !== 'jina-first'

    if (tryGrokFirst) {
      const grokContent = await this.fetchWithGrok(targetUrl)
      if (grokContent) {
        return `[web_fetch:grok]\n${this.truncateOutput(grokContent)}`
      }

      const jinaContent = await this.fetchWithJina(targetUrl)
      if (jinaContent) {
        return `[web_fetch:jina]\n${this.truncateOutput(jinaContent)}`
      }
    } else {
      const jinaContent = await this.fetchWithJina(targetUrl)
      if (jinaContent) {
        return `[web_fetch:jina]\n${this.truncateOutput(jinaContent)}`
      }

      const grokContent = await this.fetchWithGrok(targetUrl)
      if (grokContent) {
        return `[web_fetch:grok]\n${this.truncateOutput(grokContent)}`
      }
    }

    return `[web_fetch]\n抓取失败: Grok 与 Jina Reader 都未返回有效内容。URL=${targetUrl}`
  }

  private truncateOutput(content: string): string {
    return truncate(content, this.config.web_fetch.maxContentChars || 8000, '无有效内容')
  }

  private resolveChatlunaSearchModel(): string {
    for (const model of collectChatlunaModels(this.config)) {
      if (model) return model
    }
    return ''
  }

  private async fetchWithGrok(url: string): Promise<string | null> {
    const model = this.resolveChatlunaSearchModel()
    if (!model) {
      return null
    }

    try {
      const response = await this.chatluna.chatWithRetry(
        {
          model,
          message: `Read the following URL and extract its full text content. Return ONLY the extracted text, no commentary or formatting. URL: ${url}`,
          enableSearch: true,
        }
      )
      const content = (response.content || '').trim()
      return content || null
    } catch (error: any) {
      this.logger.warn(`[web_fetch] Grok(Chatluna) 失败: ${error?.message || error}`)
      return null
    }
  }

  private async fetchWithJina(url: string): Promise<string | null> {
    const result = await this.jinaReader.fetch(url)
    if (!result?.content) {
      return null
    }
    return result.content
  }

}

export function registerWebFetchTool(ctx: Ctx, config: PluginConfig): void {
  const logger = ctx.logger('chatluna-fact-check')

  if (!config.web_fetch.enabled) {
    logger.info('[WebFetchTool] 已禁用工具注册')
    return
  }

  const chatluna = ctx.chatluna
  if (!chatluna?.platform?.registerTool) {
    logger.warn('[WebFetchTool] chatluna.platform.registerTool 不可用，跳过注册')
    return
  }

  const toolName = sanitizeToolName(config.web_fetch.name, 'web_fetch')
  const toolDescription = sanitizeToolDescription(
    config.web_fetch.description,
    '用于获取指定 URL 的网页内容。输入 URL，返回提取后的正文文本。'
  )

  ctx.effect(() => {
    logger.info(`[WebFetchTool] 注册工具: ${toolName}`)

    const dispose = chatluna.platform.registerTool(toolName, {
      description: toolDescription,
      meta: {
        source: 'extension',
        group: 'fact-check',
        tags: ['web-fetch', 'fetch', 'search'],
      },
      createTool() {
        const tool = new WebFetchTool(ctx, config, toolName, toolDescription)
        const resolvedName = sanitizeToolName(tool.name, '')
        if (!resolvedName) {
          tool.name = 'web_fetch'
          logger.warn('[WebFetchTool] 检测到空工具名，已回退为 web_fetch')
        }
        return tool
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
