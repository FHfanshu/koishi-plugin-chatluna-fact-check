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

  const pushChatlunaModel = (provider: string, rawModel: unknown): void => {
    const model = normalizeModelName(typeof rawModel === 'string' ? rawModel : String(rawModel || ''))
    if (!model) return
    const key = `chatluna:${model}`
    if (seen.has(key)) return
    seen.add(key)
    seq += 1
    results.push({
      kind: 'chatluna_model',
      provider,
      model,
      key: `source-${seq}`,
    })
  }

  const pushTavilySource = (provider: string, rawApiKey: unknown): void => {
    const tavilyApiKey = String(rawApiKey || '').trim()
    if (!tavilyApiKey) return
    const key = `tavily:${tavilyApiKey}`
    if (seen.has(key)) return
    seen.add(key)
    seq += 1
    results.push({
      kind: 'tavily',
      provider: provider || 'tavily',
      tavilyApiKey,
      key: `source-${seq}`,
    })
  }

  const chatlunaModels = config.search?.chatluna?.models || []
  for (const rawModel of chatlunaModels) {
    pushChatlunaModel('chatluna', rawModel)
  }

  const customSources = config.search?.custom?.sources || []

  for (const source of customSources) {
    const provider = normalizeProvider((source as any)?.provider)
    const resolvedProvider = provider || 'tavily'
    if (!TAVILY_PROVIDER_SET.has(resolvedProvider)) continue
    pushTavilySource(resolvedProvider, (source as any)?.tavilyApiKey)
  }

  const legacySources = collectLegacySources(config)
  for (const source of legacySources) {
    const provider = normalizeProvider((source as any)?.provider)
    if (!provider) continue
    if (CHATLUNA_PROVIDER_SET.has(provider)) {
      pushChatlunaModel(provider, (source as any)?.model)
      continue
    }

    if (TAVILY_PROVIDER_SET.has(provider)) {
      pushTavilySource(provider, (source as any)?.tavilyApiKey)
    }
  }

  return results
}

export function collectChatlunaModels(config: PluginConfig): string[] {
  return collectSearchSources(config)
    .filter((item): item is Extract<ResolvedSearchSource, { kind: 'chatluna_model' }> => item.kind === 'chatluna_model')
    .map((item) => item.model)
}
