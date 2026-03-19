"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TavilySearchService = void 0;
const url_1 = require("../utils/url");
class TavilySearchService {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.logger = ctx.logger('chatluna-fact-check');
    }
    async search(query, apiKey, perspective = 'TavilySearch') {
        const normalizedPerspective = (perspective || 'TavilySearch').trim() || 'TavilySearch';
        const cleanedApiKey = (apiKey || '').trim();
        const cleanedQuery = (query || '').trim();
        if (!cleanedQuery) {
            return {
                agentId: 'tavily-search',
                perspective: normalizedPerspective,
                findings: '搜索失败: 查询为空。',
                sources: [],
                confidence: 0,
                failed: true,
                error: 'empty query',
            };
        }
        if (!cleanedApiKey) {
            return {
                agentId: 'tavily-search',
                perspective: normalizedPerspective,
                findings: '搜索失败: Tavily API Key 未配置。',
                sources: [],
                confidence: 0,
                failed: true,
                error: 'missing tavily api key',
            };
        }
        try {
            const response = await this.ctx.http.post('https://api.tavily.com/search', {
                api_key: cleanedApiKey,
                query: cleanedQuery,
                max_results: 5,
                include_answer: true,
            }, {
                timeout: Math.max(5, this.config.search.perSourceTimeout || 45) * 1000,
            });
            const answer = typeof response?.answer === 'string' ? response.answer.trim() : '';
            const results = Array.isArray(response?.results) ? response.results : [];
            const sources = [...new Set(results
                    .map((item) => (0, url_1.normalizeUrl)(item?.url || ''))
                    .filter(Boolean))];
            const fallbackLines = results
                .slice(0, 5)
                .map((item, index) => {
                const title = (item.title || '').trim() || `结果 ${index + 1}`;
                const content = (item.content || '').replace(/\s+/g, ' ').trim();
                const preview = content.length > 180 ? `${content.slice(0, 180)}...` : content;
                return `[${index + 1}] ${title}${preview ? `\n${preview}` : ''}`;
            });
            const findings = answer || fallbackLines.join('\n\n') || 'Tavily 未返回有效摘要。';
            return {
                agentId: 'tavily-search',
                perspective: normalizedPerspective,
                findings,
                sources,
                confidence: 0.5,
            };
        }
        catch (error) {
            this.logger.warn(`[TavilySearch] 请求失败: ${error?.message || error}`);
            return {
                agentId: 'tavily-search',
                perspective: normalizedPerspective,
                findings: `搜索失败: ${error?.message || error}`,
                sources: [],
                confidence: 0,
                failed: true,
                error: error?.message || String(error),
            };
        }
    }
}
exports.TavilySearchService = TavilySearchService;
