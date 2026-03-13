import type { ModelOption } from '../types/flow'
import { MODELS } from '../types/flow'

const CACHE_KEY = 'openrouter_models_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

interface CacheEntry {
  timestamp: number
  models: ModelOption[]
}

export async function fetchModelsFromOpenRouter(apiKey: string): Promise<ModelOption[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached)
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.models
      }
    }
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return []
    const json = await res.json()
    const models: ModelOption[] = (json.data ?? []).map((m: { id: string; name: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }) => ({
      id: m.id,
      label: m.name,
      group: m.id.split('/')[0] ?? 'Other',
      context: m.context_length ? `${Math.round(m.context_length / 1000)}k` : undefined,
      price: m.pricing
        ? `$${(parseFloat(m.pricing.prompt ?? '0') * 1e6).toFixed(2)}/$${(parseFloat(m.pricing.completion ?? '0') * 1e6).toFixed(2)}`
        : undefined,
    }))
    const entry: CacheEntry = { timestamp: Date.now(), models }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
    return models
  } catch {
    return []
  }
}

export function useModels(apiKey?: string): ModelOption[] {
  // For now, return curated models. In a real app, this would be a React hook using SWR/React Query.
  // We keep it simple and just return curated + any cached API models merged.
  if (!apiKey) return MODELS
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached)
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        const apiModels = entry.models
        const curatedIds = new Set(MODELS.map(m => m.id))
        const extra = apiModels.filter(m => !curatedIds.has(m.id))
        return [...MODELS, ...extra]
      }
    }
  } catch { /* ignore */ }
  return MODELS
}
