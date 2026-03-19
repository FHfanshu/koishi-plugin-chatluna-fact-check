import { normalizeUrl } from '../utils/url'

import type { AgentSearchResult, PluginConfig } from '../types'

type Ctx = any

interface TavilyResultItem {
  title?: string
  url?: string
  content?: string
}

interface TavilyResponse {
  answer?: string
  results?: TavilyResultItem[]
}

export class TavilySearchService {
  private readonly logger: any

  constructor(
    private readonly ctx: Ctx,
    private readonly config: PluginConfig,
  ) {
    this.logger = ctx.logger('chatluna-fact-check')
  }

  async search(query: string, apiKey: string, label: string): Promise<AgentSearchResult> {
    const normalizedLabel = (label || 'TavilySearch').trim() || 'TavilySearch'
    const cleanedApiKey = (apiKey || '').trim()
    const cleanedQuery = (query || '').trim()

    if (!cleanedQuery) {
      return {
        agentId: 'tavily-search',
        perspective: normalizedLabel,
        findings: '搜索失败: 查询为空。',
        sources: [],
        confidence: 0,
        failed: true,
        error: 'empty query',
      }
    }

    if (!cleanedApiKey) {
      return {
        agentId: 'tavily-search',
        perspective: normalizedLabel,
        findings: '搜索失败: Tavily API Key 未配置。',
        sources: [],
        confidence: 0,
        failed: true,
        error: 'missing tavily api key',
      }
    }

    try {
      const response = await this.ctx.http.post(
        'https://api.tavily.com/search',
        {
          api_key: cleanedApiKey,
          query: cleanedQuery,
          max_results: 5,
          include_answer: true,
        },
        {
          timeout: Math.max(5, this.config.search.perSourceTimeout || 45) * 1000,
        }
      ) as TavilyResponse

      const answer = typeof response?.answer === 'string' ? response.answer.trim() : ''
      const results = Array.isArray(response?.results) ? response.results : []
      const sources = [...new Set(
        results
          .map((item) => normalizeUrl(item?.url || ''))
          .filter(Boolean)
      )]

      const fallbackLines = results
        .slice(0, 5)
        .map((item, index) => {
          const title = (item.title || '').trim() || `结果 ${index + 1}`
          const content = (item.content || '').replace(/\s+/g, ' ').trim()
          const preview = content.length > 180 ? `${content.slice(0, 180)}...` : content
          return `[${index + 1}] ${title}${preview ? `\n${preview}` : ''}`
        })

      const findings = answer || fallbackLines.join('\n\n') || 'Tavily 未返回有效摘要。'

      return {
        agentId: 'tavily-search',
        perspective: normalizedLabel,
        findings,
        sources,
        confidence: 0.5,
      }
    } catch (error: any) {
      this.logger.warn(`[TavilySearch] 请求失败: ${error?.message || error}`)
      return {
        agentId: 'tavily-search',
        perspective: normalizedLabel,
        findings: `搜索失败: ${error?.message || error}`,
        sources: [],
        confidence: 0,
        failed: true,
        error: error?.message || String(error),
      }
    }
  }
}
