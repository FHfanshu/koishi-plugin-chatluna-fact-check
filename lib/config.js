"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const koishi_1 = require("koishi");
const sourceSchema = koishi_1.Schema.union([
    koishi_1.Schema.object({
        type: koishi_1.Schema.const('chatluna_model').description('来源类型。'),
        label: koishi_1.Schema.string().default('ChatlunaSearch').description('来源标签。'),
        model: koishi_1.Schema.dynamic('model').default('').description('搜索模型。'),
    }),
    koishi_1.Schema.object({
        type: koishi_1.Schema.const('tavily').description('来源类型。'),
        label: koishi_1.Schema.string().default('TavilySearch').description('来源标签。'),
        tavilyApiKey: koishi_1.Schema.string().role('secret').default('').description('Tavily API Key。'),
    }),
]);
const baseSchema = koishi_1.Schema.object({
    timeoutSeconds: koishi_1.Schema.number().min(5).max(600).default(120).description('快速返回最大等待秒数。'),
    debug: koishi_1.Schema.boolean().default(false).description('输出调试日志。'),
}).description('基础。');
const toolSchema = koishi_1.Schema.object({
    tool: koishi_1.Schema.object({
        enabled: koishi_1.Schema.boolean().default(true).description('启用工具注册。'),
        name: koishi_1.Schema.string().default('fact_check').description('工具名称。'),
        description: koishi_1.Schema.string().default('联网事实核查与时效搜索。').description('工具描述。'),
        maxInputChars: koishi_1.Schema.number().min(100).max(10000).default(1200).description('工具输入最大字符数。'),
        maxSources: koishi_1.Schema.number().min(1).max(50).default(20).description('来源输出最大数量。'),
        forceExposeSources: koishi_1.Schema.boolean().default(true).description('强制附带原始来源链接。'),
    }).description('工具配置。'),
}).description('tool。');
const searchSchema = koishi_1.Schema.object({
    search: koishi_1.Schema.object({
        sources: koishi_1.Schema.array(sourceSchema).default([]).description('搜索来源列表。'),
        perSourceTimeout: koishi_1.Schema.number().min(5).max(180).default(45).description('单来源超时秒数。'),
        maxFindingsChars: koishi_1.Schema.number().min(200).max(12000).default(3000).description('单来源结论最大字符数。'),
    }).description('搜索配置。'),
}).description('search。');
const webFetchSchema = koishi_1.Schema.object({
    web_fetch: koishi_1.Schema.object({
        enabled: koishi_1.Schema.boolean().default(true).description('启用网页抓取工具。'),
        name: koishi_1.Schema.string().default('web_fetch').description('工具名称。'),
        description: koishi_1.Schema.string().default('获取指定 URL 的网页内容。').description('工具描述。'),
        maxContentChars: koishi_1.Schema.number().min(500).max(50000).default(8000).description('返回内容最大字符数。'),
        providerOrder: koishi_1.Schema.union([
            koishi_1.Schema.const('grok-first'),
            koishi_1.Schema.const('jina-first'),
        ]).default('grok-first').description('抓取来源优先级。'),
    }).description('网页抓取配置。'),
}).description('web_fetch。');
const jinaSchema = koishi_1.Schema.object({
    jina: koishi_1.Schema.object({
        apiKey: koishi_1.Schema.string().role('secret').default('').description('Jina API Key。'),
        timeout: koishi_1.Schema.number().min(5).max(60).default(30).description('Jina 超时秒数。'),
    }).description('Jina 配置。'),
}).description('jina。');
exports.Config = koishi_1.Schema.intersect([
    baseSchema,
    toolSchema,
    searchSchema,
    webFetchSchema,
    jinaSchema,
]);
