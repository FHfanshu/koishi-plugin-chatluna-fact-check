"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectSearchSources = collectSearchSources;
exports.collectChatlunaModels = collectChatlunaModels;
const model_1 = require("./model");
const CHATLUNA_PROVIDER_SET = new Set(['chatluna', 'chatluna_model', 'model', 'llm']);
const TAVILY_PROVIDER_SET = new Set(['tavily']);
function normalizeProvider(provider) {
    return String(provider || '').trim().toLowerCase();
}
function collectLegacySources(config) {
    const legacy = config?.search?.sources;
    if (!Array.isArray(legacy)) {
        return [];
    }
    return legacy.map((item) => {
        if (item?.type === 'chatluna_model') {
            return {
                provider: 'chatluna',
                model: String(item?.model || ''),
            };
        }
        if (item?.type === 'tavily') {
            return {
                provider: 'tavily',
                tavilyApiKey: String(item?.tavilyApiKey || ''),
            };
        }
        return {
            provider: String(item?.provider || ''),
            model: String(item?.model || ''),
            tavilyApiKey: String(item?.tavilyApiKey || ''),
        };
    });
}
function collectSearchSources(config) {
    const results = [];
    const seen = new Set();
    let seq = 0;
    const chatlunaModels = config.search?.chatluna?.models || [];
    for (const rawModel of chatlunaModels) {
        const model = (0, model_1.normalizeModelName)(rawModel);
        if (!model)
            continue;
        const key = `chatluna:${model}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        seq += 1;
        results.push({
            kind: 'chatluna_model',
            provider: 'chatluna',
            model,
            key: `source-${seq}`,
        });
    }
    const customSources = [
        ...(config.search?.custom?.sources || []),
        ...collectLegacySources(config),
    ];
    for (const source of customSources) {
        const provider = normalizeProvider(source?.provider);
        if (!provider)
            continue;
        if (CHATLUNA_PROVIDER_SET.has(provider)) {
            const model = (0, model_1.normalizeModelName)(source?.model);
            if (!model)
                continue;
            const key = `chatluna:${model}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            seq += 1;
            results.push({
                kind: 'chatluna_model',
                provider,
                model,
                key: `source-${seq}`,
            });
            continue;
        }
        if (TAVILY_PROVIDER_SET.has(provider)) {
            const tavilyApiKey = String(source?.tavilyApiKey || '').trim();
            if (!tavilyApiKey)
                continue;
            const key = `tavily:${tavilyApiKey}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            seq += 1;
            results.push({
                kind: 'tavily',
                provider,
                tavilyApiKey,
                key: `source-${seq}`,
            });
        }
    }
    return results;
}
function collectChatlunaModels(config) {
    return collectSearchSources(config)
        .filter((item) => item.kind === 'chatluna_model')
        .map((item) => item.model);
}
