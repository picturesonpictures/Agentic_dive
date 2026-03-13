import { useEffect, useState } from 'react'
import { useFlowStore } from '../store/flowStore'
import { FlowLibrary } from './FlowLibrary'
import { AiArchitect } from './AiArchitect'

export function ApiKeyBar() {
  const apiKey   = useFlowStore(s => s.apiKey)
  const setApiKey = useFlowStore(s => s.setApiKey)
  const isRunning = useFlowStore(s => s.isRunning)
  const run       = useFlowStore(s => s.run)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [architectOpen, setArchitectOpen] = useState(false)

  // Env key always wins over localStorage — runs on mount after Vite injects it
  useEffect(() => {
    const envKey = import.meta.env.VITE_OPENROUTER_API_KEY
    if (envKey) setApiKey(envKey)
  }, [])

  const isFromEnv = import.meta.env.VITE_OPENROUTER_API_KEY && apiKey === import.meta.env.VITE_OPENROUTER_API_KEY

  return (
    <>
      <header className="h-12 bg-zinc-900 border-b border-zinc-700 flex items-center px-4 gap-3 shrink-0">
        <span className="text-zinc-100 font-semibold text-sm tracking-tight">⚡ LLM Flow</span>

        {/* AI Architect button */}
        <button
          onClick={() => setArchitectOpen(true)}
          className="px-3 py-1 rounded text-xs font-medium bg-violet-900/60 hover:bg-violet-800/80 text-violet-200 border border-violet-600/50 transition-colors"
        >
          ✨ AI Architect
        </button>

        {/* Flow Library button */}
        <button
          onClick={() => setLibraryOpen(true)}
          className="px-3 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 transition-colors"
        >
          📂 Flows
        </button>

        <div className="flex-1" />
        <label className="text-xs text-zinc-400">
          OpenRouter API Key
          {isFromEnv && <span className="text-green-400 ml-1">● from .env.local</span>}
        </label>
        <input
          type="password"
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100 w-64 focus:outline-none focus:border-violet-500"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-or-…"
        />
        <button
          onClick={run}
          disabled={isRunning}
          className="px-4 py-1.5 rounded text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          {isRunning ? '⟳ Running…' : '▶ Run'}
        </button>
      </header>

      <FlowLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      <AiArchitect open={architectOpen} onClose={() => setArchitectOpen(false)} />
    </>
  )
}
