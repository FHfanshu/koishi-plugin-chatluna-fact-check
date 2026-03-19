import type { PluginConfig, SourceConfig } from '../types'
import { normalizeModelName } from './model'

export type ResolvedSearchSource =
  | {
      kind: 'chatluna_model'
      provider: string
      model: string
      key: string
    }
  | {
      kind: 'tavily'
      provider: string
      tavilyApiKey: string
      key: string
    }

const CHATLUNA_PROVIDER_SET = new Set(['chatluna', 'chatluna_model', 'model', 'llm'])
const TAVILY_PROVIDER_SET = new Set(['tavily'])

function normalizeProvider(provider: unknown): string {
  return String(provider || '').trim().toLowerCase()
}

function collectLegacySources(config: PluginConfig): SourceConfig[] {
  const legacy = (config as any)?.search?.sources
  if (!Array.isArray(legacy)) {
    return []
  }

  return legacy.map((item: any) => {
    if (item?.type === 'chatluna_model') {
      return {
        provider: 'chatluna',
        model: String(item?.model || ''),
      }
    }

    if (item?.type === 'tavily') {
      return {
        provider: 'tavily',
        tavilyApiKey: String(item?.tavilyApiKey || ''),
      }
    }

    return {
      provider: String(item?.provider || ''),
      model: String(item?.model || ''),
      tavilyApiKey: String(item?.tavilyApiKey || ''),
    }
  })
}

export function collectSearchSources(config: PluginConfig): ResolvedSearchSource[] {
  const results: ResolvedSearchSource[] = []
  const seen = new Set<string>()
  let seq = 0

  const chatlunaModels = config.search?.chatluna?.models || []
  for (const rawModel of chatlunaModels) {
    const model = normalizeModelName(rawModel)
    if (!model) continue
    const key = `chatluna:${model}`
    if (seen.has(key)) continue
    seen.add(key)
    seq += 1
    results.push({
      kind: 'chatluna_model',
      provider: 'chatluna',
      model,
      key: `source-${seq}`,
    })
  }

  const customSources = [
    ...(config.search?.custom?.sources || []),
    ...collectLegacySources(config),
  ]

  for (const source of customSources) {
    const provider = normalizeProvider((source as any)?.provider)
    if (!provider) continue

    if (CHATLUNA_PROVIDER_SET.has(provider)) {
      const model = normalizeModelName((source as any)?.model)
      if (!model) continue
      const key = `chatluna:${model}`
      if (seen.has(key)) continue
      seen.add(key)
      seq += 1
      results.push({
        kind: 'chatluna_model',
        provider,
        model,
        key: `source-${seq}`,
      })
      continue
    }

    if (TAVILY_PROVIDER_SET.has(provider)) {
      const tavilyApiKey = String((source as any)?.tavilyApiKey || '').trim()
      if (!tavilyApiKey) continue
      const key = `tavily:${tavilyApiKey}`
      if (seen.has(key)) continue
      seen.add(key)
      seq += 1
      results.push({
        kind: 'tavily',
        provider,
        tavilyApiKey,
        key: `source-${seq}`,
      })
    }
  }

  return results
}

export function collectChatlunaModels(config: PluginConfig): string[] {
  return collectSearchSources(config)
    .filter((item): item is Extract<ResolvedSearchSource, { kind: 'chatluna_model' }> => item.kind === 'chatluna_model')
    .map((item) => item.model)
}
