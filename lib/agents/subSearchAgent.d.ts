import type { AgentSearchResult, PluginConfig } from '../types';
type Ctx = any;
export declare class SubSearchAgent {
    private readonly ctx;
    private readonly config;
    private readonly chatluna;
    private readonly logger;
    constructor(ctx: Ctx, config: PluginConfig);
    deepSearchWithModel(claim: string, modelName: string, agentId?: string, perspective?: string, promptOverride?: string, systemPromptOverride?: string, allowFallback?: boolean): Promise<AgentSearchResult>;
    private shouldFallbackToFastModel;
    private resolveFallbackModel;
    private parseResponse;
}
export {};
