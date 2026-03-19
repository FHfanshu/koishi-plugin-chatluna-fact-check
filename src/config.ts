import { Schema } from 'koishi'

import type { PluginConfig, SourceConfig } from './types'

const customSourceSchema = Schema.object({
  provider: Schema.string().default('tavily').description('来源标识（例如 chatluna、tavily）'),
  model: Schema.dynamic('model').default('').description('Chatluna 模型（provider=chatluna 时使用）'),
  tavilyApiKey: Schema.string().role('secret').default('').description('Tavily API Key（provider=tavily 时使用）'),
}).description('自定义来源项') as Schema<SourceConfig>

const legacySourceSchema = Schema.union([
  Schema.object({
    type: Schema.const('chatluna_model').default('chatluna_model').description('来源类型'),
    model: Schema.dynamic('model').default('').description('搜索模型'),
  }).description('Chatluna 模型来源'),
  Schema.object({
    type: Schema.const('tavily').default('tavily').description('来源类型'),
    tavilyApiKey: Schema.string().role('secret').default('').description('Tavily API Key'),
  }).description('Tavily API 来源'),
]).description('旧版来源列表（兼容读取，不建议新增）')

const baseSchema = Schema.object({
  timeoutSeconds: Schema.number().min(5).max(600).default(120).description('快速返回最大等待秒数'),
  debug: Schema.boolean().default(false).description('输出调试日志'),
}).description('基础设置')

const toolSchema = Schema.object({
  tool: Schema.object({
    enabled: Schema.boolean().default(true).description('启用工具注册'),
    name: Schema.string().default('fact_check').description('工具名称'),
    description: Schema.string().default('联网事实核查与时效搜索').description('工具描述'),
    maxInputChars: Schema.number().min(100).max(10_000).default(1_200).description('工具输入最大字符数'),
    maxSources: Schema.number().min(1).max(50).default(20).description('来源输出最大数量'),
    forceExposeSources: Schema.boolean().default(true).description('强制附带原始来源链接'),
  }),
}).description('工具设置')

const searchSchema = Schema.object({
  search: Schema.object({
    chatluna: Schema.object({
      models: Schema.array(
        Schema.dynamic('model').description('搜索模型')
      ).default([]).description('Chatluna 模型列表'),
    }).description('Chatluna 模型来源'),
    custom: Schema.object({
      sources: Schema.array(customSourceSchema).default([]).description('可扩展来源列表'),
    }).description('可扩展来源'),
    sources: Schema.array(legacySourceSchema).default([]).hidden().description('旧版来源列表'),
    perSourceTimeout: Schema.number().min(5).max(180).default(45).description('单来源超时秒数'),
    maxFindingsChars: Schema.number().min(200).max(12_000).default(3_000).description('单来源结论最大字符数'),
  }),
}).description('搜索设置')

const webFetchSchema = Schema.object({
  web_fetch: Schema.object({
    enabled: Schema.boolean().default(true).description('启用网页抓取工具'),
    name: Schema.string().default('web_fetch').description('工具名称'),
    description: Schema.string().default('获取指定 URL 的网页内容').description('工具描述'),
    maxContentChars: Schema.number().min(500).max(50_000).default(8_000).description('返回内容最大字符数'),
    providerOrder: Schema.union([
      Schema.const('grok-first'),
      Schema.const('jina-first'),
    ]).default('grok-first').description('抓取来源优先级'),
  }),
}).description('网页抓取设置')

const jinaSchema = Schema.object({
  jina: Schema.object({
    apiKey: Schema.string().role('secret').default('').description('Jina API Key'),
    timeout: Schema.number().min(5).max(60).default(30).description('Jina 超时秒数'),
  }),
}).description('Jina 设置')

export const Config: Schema<PluginConfig> = Schema.intersect([
  baseSchema,
  toolSchema,
  searchSchema,
  webFetchSchema,
  jinaSchema,
]) as Schema<PluginConfig>
