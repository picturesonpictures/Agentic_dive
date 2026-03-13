import { useState, useEffect, useCallback } from 'react'
import { MODELS, type ModelOption } from '../types/flow'
import { loadModels, invalidateModelCache } from '../lib/modelRegistry'
import { useFlowStore } from '../store/flowStore'

export function useModels() {
  const apiKey = useFlowStore(s => s.apiKey)
  const [models, setModels] = useState<ModelOption[]>(MODELS)
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doLoad = useCallback(async () => {
    if (!apiKey) {
      setModels(MODELS)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await loadModels(apiKey)
      setModels(result.models)
      setLastFetched(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
      setModels(MODELS)
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  // Load on mount and when API key changes
  useEffect(() => {
    doLoad()
  }, [doLoad])

  const refresh = useCallback(async () => {
    invalidateModelCache()
    await doLoad()
  }, [doLoad])

  return { models, loading, lastFetched, error, refresh }
}
