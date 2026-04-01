import { useState, useRef } from 'react'
import { useFlowStore } from '../store/flowStore'
import { generateFlow } from '../lib/aiArchitect'
import { FLOW_TEMPLATES, TEMPLATE_CATEGORIES, type FlowTemplate } from '../lib/flowTemplates'
import { useModels } from '../hooks/useModels'

// ─── AI Architect ─────────────────────────────────────────────────────────────
// Two modes:
// 1. TEMPLATES — pre-built flows that load instantly (no API call)
// 2. GENERATE — describe in natural language → LLM creates the flow

const EXAMPLE_PROMPTS = [
  'Simple Q&A chatbot with a system prompt',
  'Translate text to 3 languages in parallel, then combine results',
  'Fetch a URL, extract JSON data, then summarize with an LLM',
  'Code review pipeline: analyze code, check for bugs, suggest improvements',
  'Multi-step research: generate questions, answer them, synthesize a report',
]

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'templates' | 'generate'

export function AiArchitect({ open, onClose }: Props) {
  const apiKey = useFlowStore(s => s.apiKey)
  const loadFlow = useFlowStore(s => s.loadFlow)
  const { models: allModels } = useModels()

  const [tab, setTab] = useState<Tab>('templates')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('openrouter/auto')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(false)

  if (!open) return null

  const filteredTemplates = selectedCategory === 'all'
    ? FLOW_TEMPLATES
    : FLOW_TEMPLATES.filter(t => t.category === selectedCategory)

  const handleLoadTemplate = (template: FlowTemplate) => {
    // Deep clone to avoid mutation
    const nodes = JSON.parse(JSON.stringify(template.nodes))
    const edges = JSON.parse(JSON.stringify(template.edges))
    loadFlow(nodes, edges)
    onClose()
  }

  const handleGenerate = async () => {
    if (!apiKey) { setError('Set your OpenRouter API key first'); return }
    if (!description.trim()) { setError('Describe the flow you want to build'); return }

    setGenerating(true)
    setPreview('')
    setError('')
    abortRef.current = false

    try {
      const result = await generateFlow(
        apiKey,
        description.trim(),
        model,
        (text) => {
          if (!abortRef.current) setPreview(text)
        },
        allModels,
      )

      if (abortRef.current) return

      loadFlow(result.nodes, result.edges)
      onClose()
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleCancel = () => {
    if (generating) {
      abortRef.current = true
      setGenerating(false)
    }
  }

  const handleClose = () => {
    handleCancel()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header with tabs */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-semibold text-zinc-100">AI Architect</h2>
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setTab('templates')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  tab === 'templates'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📋 Templates
              </button>
              <button
                onClick={() => setTab('generate')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  tab === 'generate'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ✨ Generate
              </button>
            </div>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
        </div>

        {/* ═══════════════════ TEMPLATES TAB ═══════════════════ */}
        {tab === 'templates' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Category filter */}
            <div className="flex gap-1.5 p-3 border-b border-zinc-800 overflow-x-auto shrink-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                }`}
              >
                All ({FLOW_TEMPLATES.length})
              </button>
              {TEMPLATE_CATEGORIES.map(cat => {
                const count = FLOW_TEMPLATES.filter(t => t.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2.5">
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleLoadTemplate(template)}
                    className="text-left bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-violet-500/40 rounded-lg p-3 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                          {template.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                          {template.desc}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {template.nodes.length} nodes
                          </span>
                          <span className="text-[9px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {template.edges.length} edges
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t border-zinc-700 bg-zinc-900/80">
              <span className="text-[10px] text-zinc-500">
                Click a template to load it instantly
              </span>
              <button
                onClick={handleClose}
                className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════ GENERATE TAB ═══════════════════ */}
        {tab === 'generate' && (
          <>
            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
              {/* Description input */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
                  Describe the flow you want to build
                </label>
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Build a pipeline that takes user feedback, classifies it as positive/negative, and generates an appropriate response for each..."
                  disabled={generating}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate()
                  }}
                />
              </div>

              {/* Examples */}
              {!generating && !preview && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Try an example</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_PROMPTS.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setDescription(ex)}
                        className="text-[11px] text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200 px-2 py-1 rounded-md transition-colors border border-zinc-700/50"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Model selector */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 shrink-0">Architect model:</label>
                <select
                  className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  disabled={generating}
                >
                  {Object.entries(
                    allModels.reduce<Record<string, typeof allModels>>((acc, m) => {
                      (acc[m.group] ??= []).push(m)
                      return acc
                    }, {})
                  ).map(([group, groupModels]) => (
                    <optgroup key={group} label={group}>
                      {groupModels.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Live preview */}
              {preview && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    {generating ? '⟳ Generating...' : '✓ Generated JSON'}
                  </p>
                  <pre className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-[11px] text-emerald-400 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {preview}
                  </pre>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-2">
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-700 bg-zinc-900/80">
              <span className="text-[10px] text-zinc-500">
                {generating ? 'Streaming response...' : 'Ctrl+Enter to generate'}
              </span>
              <div className="flex gap-2">
                {generating ? (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleClose}
                      className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={!description.trim() || !apiKey}
                      className="px-4 py-1.5 rounded text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5"
                    >
                      ✨ Generate Flow
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
