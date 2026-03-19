import { Schema } from 'koishi'

import type { PluginConfig, SourceConfig } from './types'

const sourceSchema = Schema.union([
  Schema.object({
    type: Schema.const('chatluna_model').default('chatluna_model').description('来源类型。'),
    label: Schema.string().default('ChatlunaSearch').description('来源标签。'),
    model: Schema.dynamic('model').default('').description('搜索模型。'),
  }).description('Chatluna 模型来源。'),
  Schema.object({
    type: Schema.const('tavily').default('tavily').description('来源类型。'),
    label: Schema.string().default('TavilySearch').description('来源标签。'),
    tavilyApiKey: Schema.string().role('secret').default('').description('Tavily API Key。'),
  }).description('Tavily API 来源。'),
]) as Schema<SourceConfig>

const baseSchema = Schema.object({
  timeoutSeconds: Schema.number().min(5).max(600).default(120).description('快速返回最大等待秒数。'),
  debug: Schema.boolean().default(false).description('输出调试日志。'),
}).description('基础。')

const toolSchema = Schema.object({
  tool: Schema.object({
    enabled: Schema.boolean().default(true).description('启用工具注册。'),
    name: Schema.string().default('fact_check').description('工具名称。'),
    description: Schema.string().default('联网事实核查与时效搜索。').description('工具描述。'),
    maxInputChars: Schema.number().min(100).max(10_000).default(1_200).description('工具输入最大字符数。'),
    maxSources: Schema.number().min(1).max(50).default(20).description('来源输出最大数量。'),
    forceExposeSources: Schema.boolean().default(true).description('强制附带原始来源链接。'),
  }).description('工具配置。'),
}).description('tool。')

const searchSchema = Schema.object({
  search: Schema.object({
    sources: Schema.array(sourceSchema).default([]).description('搜索来源列表。'),
    perSourceTimeout: Schema.number().min(5).max(180).default(45).description('单来源超时秒数。'),
    maxFindingsChars: Schema.number().min(200).max(12_000).default(3_000).description('单来源结论最大字符数。'),
  }).description('搜索配置。'),
}).description('search。')

const webFetchSchema = Schema.object({
  web_fetch: Schema.object({
    enabled: Schema.boolean().default(true).description('启用网页抓取工具。'),
    name: Schema.string().default('web_fetch').description('工具名称。'),
    description: Schema.string().default('获取指定 URL 的网页内容。').description('工具描述。'),
    maxContentChars: Schema.number().min(500).max(50_000).default(8_000).description('返回内容最大字符数。'),
    providerOrder: Schema.union([
      Schema.const('grok-first'),
      Schema.const('jina-first'),
    ]).default('grok-first').description('抓取来源优先级。'),
  }).description('网页抓取配置。'),
}).description('web_fetch。')

const jinaSchema = Schema.object({
  jina: Schema.object({
    apiKey: Schema.string().role('secret').default('').description('Jina API Key。'),
    timeout: Schema.number().min(5).max(60).default(30).description('Jina 超时秒数。'),
  }).description('Jina 配置。'),
}).description('jina。')

export const Config: Schema<PluginConfig> = Schema.intersect([
  baseSchema,
  toolSchema,
  searchSchema,
  webFetchSchema,
  jinaSchema,
]) as Schema<PluginConfig>
