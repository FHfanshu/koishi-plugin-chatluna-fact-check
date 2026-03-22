export interface SourceChatlunaModelConfig {
  provider: string
  model: string
  tavilyApiKey?: string
}

export interface SourceTavilyConfig {
  provider: string
  model?: string
  tavilyApiKey: string
}

export type SourceConfig = SourceChatlunaModelConfig | SourceTavilyConfig

export interface Config {
  timeoutSeconds: number
  debug: boolean
  tool: {
    enabled: boolean
    name: string
    description: string
    maxInputChars: number
    maxSources: number
    forceExposeSources: boolean
  }
  search: {
    chatluna: {
      models: Array<string | { model: string }>
    }
    custom: {
      sources: SourceConfig[]
    }
    perSourceTimeout: number
    maxFindingsChars: number
  }
  web_fetch: {
    enabled: boolean
    name: string
    description: string
    maxContentChars: number
    providerOrder: 'grok-first' | 'jina-first'
  }
  jina: {
    apiKey: string
    timeout: number
  }
}

export type PluginConfig = Config

export interface SearchResultItem {
  title?: string
  name?: string
  description?: string
  content?: string
  snippet?: string
  url?: string
  link?: string
  [key: string]: unknown
}

export interface AgentSearchResult {
  agentId: string
  perspective: string
  findings: string
  sources: string[]
  confidence: number
  failed?: boolean
  error?: string
}

export interface ChatRequest {
  model: string
  message: string
  systemPrompt?: string
  images?: string[]
  enableSearch?: boolean
}

export interface ChatResponse {
  content: string
  model: string
  sources: string[]
}
