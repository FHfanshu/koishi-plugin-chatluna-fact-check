import type { PluginConfig } from '../types';
type Ctx = any;
export declare function clipText(input: string, maxLength: number): string;
export declare function resolveSummaryModel(config: PluginConfig): string;
export declare function maybeSummarize(ctx: Ctx, config: PluginConfig, text: string, label: string, options?: {
    enabled?: boolean;
    maxChars?: number;
}): Promise<string>;
export {};
