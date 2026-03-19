import path from 'node:path'

import type { Context } from 'koishi'

import { Config } from './config'
import type { PluginConfig } from './types'
import { registerFactCheckTool } from './services/factCheckTool'
import { registerWebFetchTool } from './services/webFetchTool'

export const name = 'chatluna-fact-check'

export const inject = {
  required: ['chatluna'],
  optional: ['console', 'chatluna_character'],
} as const

export const usage = `
## Chatluna Fact Check

用于 Chatluna 工具化联网核查，核心工具：
- \`fact_check\`：按来源列表并行执行事实核查（Chatluna 模型 / Tavily）
- \`web_fetch\`：网页正文抓取（Chatluna + Jina 回退）

配置要点：
1. 在 \`search.chatluna.models\` 中配置 Chatluna 模型来源。
2. 在 \`search.custom.sources\` 中配置可扩展来源（内置支持 chatluna / tavily，后续可扩展）。
3. \`timeoutSeconds\` 控制 fact_check 快速返回最大等待时长。`

export function apply(ctx: Context, config: PluginConfig): void {
  const logger = ctx.logger('chatluna-fact-check')

  if (!config || typeof config !== 'object') {
    logger.error('插件配置为空或无效，已跳过加载。请在 koishi.yml 中检查 chatluna-fact-check 配置。')
    return
  }

  registerFactCheckTool(ctx as any, config)
  registerWebFetchTool(ctx as any, config)

  ctx.inject(['console'], (innerCtx) => {
    const packageBase = path.resolve(ctx.baseDir, 'node_modules/koishi-plugin-chatluna-fact-check')
    const entry = process.env.KOISHI_BASE
      ? [`${process.env.KOISHI_BASE}/dist/index.js`]
      : process.env.KOISHI_ENV === 'browser'
        ? [path.resolve(__dirname, '../client/index.ts')]
        : {
            dev: path.resolve(packageBase, 'client/index.ts'),
            prod: path.resolve(packageBase, 'dist'),
          }

    ;(innerCtx as any).console?.addEntry?.(entry as any)
  })

  logger.info('chatluna-fact-check 插件已加载')
}

export { Config }
