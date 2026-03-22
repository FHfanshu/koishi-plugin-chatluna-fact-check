"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const koishi_1 = require("koishi");
const customSourceSchema = koishi_1.Schema.object({
    provider: koishi_1.Schema.const('tavily').default('tavily').hidden().description('来源标识（固定 tavily）'),
    tavilyApiKey: koishi_1.Schema.string().role('secret').default('').description('Tavily API Key（provider=tavily 时使用）'),
}).description('Tavily 来源项');
const chatlunaModelItemSchema = koishi_1.Schema.object({
    model: koishi_1.Schema.dynamic('model').default('').description('搜索模型'),
}).description('搜索模型项');
const legacySourceSchema = koishi_1.Schema.union([
    koishi_1.Schema.object({
        type: koishi_1.Schema.const('chatluna_model').default('chatluna_model').description('来源类型'),
        model: koishi_1.Schema.dynamic('model').default('').description('搜索模型'),
    }).description('Chatluna 模型来源'),
    koishi_1.Schema.object({
        type: koishi_1.Schema.const('tavily').default('tavily').description('来源类型'),
        tavilyApiKey: koishi_1.Schema.string().role('secret').default('').description('Tavily API Key'),
    }).description('Tavily API 来源'),
]).description('旧版来源列表（兼容读取，不建议新增）');
const baseSchema = koishi_1.Schema.object({
    timeoutSeconds: koishi_1.Schema.number().min(5).max(600).default(120).description('快速返回最大等待秒数'),
    debug: koishi_1.Schema.boolean().default(false).description('输出调试日志'),
}).description('基础设置');
const toolSchema = koishi_1.Schema.object({
    tool: koishi_1.Schema.object({
        enabled: koishi_1.Schema.boolean().default(true).description('启用工具注册'),
        name: koishi_1.Schema.string().default('fact_check').description('工具名称'),
        description: koishi_1.Schema.string().default('联网事实核查与时效搜索').description('工具描述'),
        maxInputChars: koishi_1.Schema.number().min(100).max(10000).default(1200).description('工具输入最大字符数'),
        maxSources: koishi_1.Schema.number().min(1).max(50).default(20).description('来源输出最大数量'),
        forceExposeSources: koishi_1.Schema.boolean().default(true).description('强制附带原始来源链接'),
    }),
}).description('工具设置');
const searchSchema = koishi_1.Schema.object({
    search: koishi_1.Schema.object({
        chatluna: koishi_1.Schema.object({
            models: koishi_1.Schema.array(chatlunaModelItemSchema).role('table').default([]).description('Chatluna 模型列表'),
        }).description('Chatluna 模型来源'),
        custom: koishi_1.Schema.object({
            sources: koishi_1.Schema.array(customSourceSchema).default([]).description('可扩展来源列表'),
        }).description('可扩展来源'),
        sources: koishi_1.Schema.array(legacySourceSchema).default([]).hidden().description('旧版来源列表'),
        perSourceTimeout: koishi_1.Schema.number().min(5).max(180).default(45).description('单来源超时秒数'),
        maxFindingsChars: koishi_1.Schema.number().min(200).max(12000).default(3000).description('单来源结论最大字符数'),
    }),
}).description('搜索设置');
const webFetchSchema = koishi_1.Schema.object({
    web_fetch: koishi_1.Schema.object({
        enabled: koishi_1.Schema.boolean().default(true).description('启用网页抓取工具'),
        name: koishi_1.Schema.string().default('web_fetch').description('工具名称'),
        description: koishi_1.Schema.string().default('获取指定 URL 的网页内容').description('工具描述'),
        maxContentChars: koishi_1.Schema.number().min(500).max(50000).default(8000).description('返回内容最大字符数'),
        providerOrder: koishi_1.Schema.union([
            koishi_1.Schema.const('grok-first'),
            koishi_1.Schema.const('jina-first'),
        ]).default('grok-first').description('抓取来源优先级'),
    }),
}).description('网页抓取设置');
const jinaSchema = koishi_1.Schema.object({
    jina: koishi_1.Schema.object({
        apiKey: koishi_1.Schema.string().role('secret').default('').description('Jina API Key'),
        timeout: koishi_1.Schema.number().min(5).max(60).default(30).description('Jina 超时秒数'),
    }),
}).description('Jina 设置');
exports.Config = koishi_1.Schema.intersect([
    baseSchema,
    toolSchema,
    searchSchema,
    webFetchSchema,
    jinaSchema,
]);
