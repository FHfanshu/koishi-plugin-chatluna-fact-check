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
    const pushChatlunaModel = (provider, rawModel) => {
        const model = (0, model_1.normalizeModelName)(typeof rawModel === 'string' ? rawModel : String(rawModel || ''));
        if (!model)
            return;
        const key = `chatluna:${model}`;
        if (seen.has(key))
            return;
        seen.add(key);
        seq += 1;
        results.push({
            kind: 'chatluna_model',
            provider,
            model,
            key: `source-${seq}`,
        });
    };
    const pushTavilySource = (provider, rawApiKey) => {
        const tavilyApiKey = String(rawApiKey || '').trim();
        if (!tavilyApiKey)
            return;
        const key = `tavily:${tavilyApiKey}`;
        if (seen.has(key))
            return;
        seen.add(key);
        seq += 1;
        results.push({
            kind: 'tavily',
            provider: provider || 'tavily',
            tavilyApiKey,
            key: `source-${seq}`,
        });
    };
    const chatlunaModels = config.search?.chatluna?.models || [];
    for (const rawModel of chatlunaModels) {
        pushChatlunaModel('chatluna', rawModel);
    }
    const customSources = config.search?.custom?.sources || [];
    for (const source of customSources) {
        const provider = normalizeProvider(source?.provider);
        const resolvedProvider = provider || 'tavily';
        if (!TAVILY_PROVIDER_SET.has(resolvedProvider))
            continue;
        pushTavilySource(resolvedProvider, source?.tavilyApiKey);
    }
    const legacySources = collectLegacySources(config);
    for (const source of legacySources) {
        const provider = normalizeProvider(source?.provider);
        if (!provider)
            continue;
        if (CHATLUNA_PROVIDER_SET.has(provider)) {
            pushChatlunaModel(provider, source?.model);
            continue;
        }
        if (TAVILY_PROVIDER_SET.has(provider)) {
            pushTavilySource(provider, source?.tavilyApiKey);
        }
    }
    return results;
}
function collectChatlunaModels(config) {
    return collectSearchSources(config)
        .filter((item) => item.kind === 'chatluna_model')
        .map((item) => item.model);
}
