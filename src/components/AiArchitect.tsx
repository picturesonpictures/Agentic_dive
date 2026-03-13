import { useState } from 'react'
import { useFlowStore } from '../store/flowStore'
import { generateFlow } from '../lib/aiArchitect'
import type { Node, Edge } from '@xyflow/react'

export function AiArchitect({ onClose }: { onClose: () => void }) {
  const { apiKey, loadFlow } = useFlowStore()
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('openai/gpt-4o-mini')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError('')
    try {
      const flow = await generateFlow(description, apiKey, model)
      loadFlow(flow.nodes as Node[], flow.edges as Edge[])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-[480px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">🏗️ AI Architect</h2>
          <p className="text-gray-400 text-sm mt-1">Describe what you want the flow to do</p>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            autoFocus
            className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-violet-500 h-32 resize-none"
            placeholder="e.g. Build a flow that takes user input, sends it to GPT-4o with a summarization prompt, and displays the result..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1">Architect model</label>
            <select
              className="w-full bg-gray-800 text-white rounded px-3 py-1.5 text-sm border border-gray-600"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              <option value="openai/gpt-4o-mini">GPT-4o mini</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
            </select>
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {!apiKey && <div className="text-yellow-400 text-sm">⚠️ Set your API key in the toolbar first.</div>}
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim() || !apiKey}
            className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? '⟳ Generating...' : '✨ Generate Flow'}
          </button>
        </div>
      </div>
    </div>
  )
}
