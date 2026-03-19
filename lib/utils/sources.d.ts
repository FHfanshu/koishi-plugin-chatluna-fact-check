import type { PluginConfig } from '../types';
export type ResolvedSearchSource = {
    kind: 'chatluna_model';
    provider: string;
    model: string;
    key: string;
} | {
    kind: 'tavily';
    provider: string;
    tavilyApiKey: string;
    key: string;
};
export declare function collectSearchSources(config: PluginConfig): ResolvedSearchSource[];
export declare function collectChatlunaModels(config: PluginConfig): string[];
