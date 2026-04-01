import { MODELS, type ModelOption } from '../types/flow'

// ─── Cache ───────────────────────────────────────────────────────────────────
const CACHE_KEY = 'llm-flow-models'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CachedModels {
  models: ModelOption[]
  timestamp: number
}

function readCache(): CachedModels | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedModels
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(models: ModelOption[]) {
  try {
    const data: CachedModels = { models, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full — silently ignore
  }
}

// ─── Group Inference ─────────────────────────────────────────────────────────
// OpenRouter model IDs follow "provider/model-name" format.
// We map the provider prefix to a human-friendly group name.

const PROVIDER_GROUPS: Record<string, string> = {
  'anthropic':   '🟣 Anthropic',
  'openai':      '🟢 OpenAI',
  'google':      '🔵 Google',
  'deepseek':    '🐋 DeepSeek',
  'meta-llama':  '🦙 Meta',
  'mistralai':   '🌊 Mistral',
  'x-ai':        '⚡ xAI',
  'cohere':      '🔶 Cohere',
  'perplexity':  '🔍 Perplexity',
  'openrouter':  '✨ OpenRouter',
  'qwen':        '🏮 Qwen',
  'microsoft':   '🪟 Microsoft',
  'nvidia':      '🟩 NVIDIA',
  'amazon':      '📦 Amazon',
}

function inferGroup(modelId: string): string {
  const prefix = modelId.split('/')[0]
  return PROVIDER_GROUPS[prefix] ?? `📦 ${prefix}`
}

// ─── Price Formatter ─────────────────────────────────────────────────────────

function formatPrice(promptPrice?: string, completionPrice?: string): string {
  if (!promptPrice && !completionPrice) return ''
  const p = parseFloat(promptPrice ?? '0') * 1_000_000
  const c = parseFloat(completionPrice ?? '0') * 1_000_000
  if (p === 0 && c === 0) return 'free'
  return `$${p < 1 ? p.toFixed(2) : Math.round(p)}/$${c < 1 ? c.toFixed(2) : Math.round(c)}`
}

function formatContext(contextLength?: number): string {
  if (!contextLength) return ''
  if (contextLength >= 1_000_000) return `${(contextLength / 1_000_000).toFixed(contextLength % 1_000_000 === 0 ? 0 : 1)}M`
  if (contextLength >= 1_000) return `${Math.round(contextLength / 1_000)}K`
  return `${contextLength}`
}

// ─── API Types (subset of OpenRouter /api/v1/models response) ────────────────

interface OpenRouterModel {
  id: string
  name: string
  context_length?: number
  pricing?: {
    prompt?: string
    completion?: string
  }
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
  }
  supported_parameters?: string[]
  top_provider?: {
    is_moderated?: boolean
  }
}

interface OpenRouterResponse {
  data: OpenRouterModel[]
}

// ─── Fetch & Transform ───────────────────────────────────────────────────────

async function fetchFromAPI(apiKey: string): Promise<ModelOption[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`OpenRouter API: ${res.status}`)
  const json = (await res.json()) as OpenRouterResponse

  return json.data
    .filter(m => m.id && m.name)
    .map(m => {
      const promptPer1M = parseFloat(m.pricing?.prompt ?? '0') * 1_000_000
      const completionPer1M = parseFloat(m.pricing?.completion ?? '0') * 1_000_000

      // Derive capability tags from supported_parameters
      const caps: string[] = []
      const params = m.supported_parameters ?? []
      if (params.includes('tools')) caps.push('tools')
      if (params.includes('reasoning') || params.includes('include_reasoning')) caps.push('reasoning')
      if (params.includes('structured_outputs')) caps.push('structured_outputs')

      return {
        id: m.id,
        label: m.name,
        group: inferGroup(m.id),
        context: formatContext(m.context_length),
        price: formatPrice(m.pricing?.prompt, m.pricing?.completion),
        pricePer1M: { input: promptPer1M, output: completionPer1M },
        inputModalities: m.architecture?.input_modalities,
        outputModalities: m.architecture?.output_modalities,
        capabilities: caps.length > 0 ? caps : undefined,
      }
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))
}

// ─── Merge Strategy ──────────────────────────────────────────────────────────
// Curated models (FALLBACK_MODELS) have hand-picked tags and verified metadata.
// API models provide breadth. When both exist for the same ID, curated wins.

function mergeModels(curated: ModelOption[], api: ModelOption[]): ModelOption[] {
  const curatedIds = new Set(curated.map(m => m.id))
  const apiOnly = api.filter(m => !curatedIds.has(m.id))
  return [...curated, ...apiOnly]
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ModelRegistryResult {
  models: ModelOption[]
  loading: boolean
  lastFetched: number | null
  error: string | null
  refresh: () => Promise<void>
}

let _cachedResult: { models: ModelOption[]; timestamp: number } | null = null

export async function loadModels(apiKey: string): Promise<{ models: ModelOption[]; fromCache: boolean }> {
  // Check memory cache first
  if (_cachedResult && Date.now() - _cachedResult.timestamp < CACHE_TTL) {
    return { models: _cachedResult.models, fromCache: true }
  }

  // Check localStorage cache
  const cached = readCache()
  if (cached) {
    _cachedResult = { models: cached.models, timestamp: cached.timestamp }
    return { models: cached.models, fromCache: true }
  }

  // Fetch from API
  if (!apiKey) return { models: MODELS, fromCache: false }

  try {
    const apiModels = await fetchFromAPI(apiKey)
    const merged = mergeModels(MODELS, apiModels)
    writeCache(merged)
    _cachedResult = { models: merged, timestamp: Date.now() }
    return { models: merged, fromCache: false }
  } catch {
    // On failure, return curated fallback
    return { models: MODELS, fromCache: false }
  }
}

// Invalidate cache (used when user wants to force refresh)
export function invalidateModelCache() {
  _cachedResult = null
  try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}
