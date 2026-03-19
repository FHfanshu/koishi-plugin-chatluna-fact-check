import type { AgentSearchResult, PluginConfig } from '../types';
type Ctx = any;
export declare class TavilySearchService {
    private readonly ctx;
    private readonly config;
    private readonly logger;
    constructor(ctx: Ctx, config: PluginConfig);
    search(query: string, apiKey: string, perspective?: string): Promise<AgentSearchResult>;
}
export {};
