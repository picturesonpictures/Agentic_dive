import { useState, useRef } from 'react'
import { useFlowStore } from '../store/flowStore'
import {
  exportFlow, downloadFlow, flowToClipboard,
  importFlowFromJSON, saveToLibrary, listLibrary,
  loadFromLibrary, deleteFromLibrary, type SavedFlow,
} from '../lib/flowIO'

interface Props {
  open: boolean
  onClose: () => void
}

export function FlowLibrary({ open, onClose }: Props) {
  const { nodes, edges, loadFlow } = useFlowStore()
  const [tab, setTab] = useState<'save' | 'load' | 'import'>('save')
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<SavedFlow[]>([])
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Refresh library list when opening the load tab
  const openLoadTab = () => {
    setTab('load')
    setSaved(listLibrary())
  }

  const handleSave = () => {
    if (!name.trim()) return
    saveToLibrary(name.trim(), nodes, edges)
    setMessage(`Saved "${name.trim()}"`)
    setTimeout(() => setMessage(''), 2000)
  }

  const handleExport = () => {
    const flow = exportFlow(name.trim() || 'Untitled Flow', nodes, edges)
    downloadFlow(flow)
    setMessage('Downloaded!')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleCopy = async () => {
    const flow = exportFlow(name.trim() || 'Untitled Flow', nodes, edges)
    await flowToClipboard(flow)
    setMessage('Copied to clipboard!')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleLoad = (flow: SavedFlow) => {
    loadFlow(flow.nodes, flow.edges)
    setMessage(`Loaded "${flow.name}"`)
    onClose()
  }

  const handleDelete = (flowName: string) => {
    deleteFromLibrary(flowName)
    setSaved(listLibrary())
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const flow = importFlowFromJSON(reader.result as string)
      if (!flow) {
        setMessage('Invalid flow file')
        setTimeout(() => setMessage(''), 3000)
        return
      }
      loadFlow(flow.nodes, flow.edges)
      setMessage(`Imported "${flow.name}"`)
      onClose()
    }
    reader.readAsText(file)
  }

  const handleImportClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const flow = importFlowFromJSON(text)
      if (!flow) {
        setMessage('Invalid flow JSON in clipboard')
        setTimeout(() => setMessage(''), 3000)
        return
      }
      loadFlow(flow.nodes, flow.edges)
      setMessage(`Imported "${flow.name}"`)
      onClose()
    } catch {
      setMessage('Could not read clipboard')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-800 border border-zinc-600 rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-100">Flow Library</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {(['save', 'load', 'import'] as const).map(t => (
            <button
              key={t}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === t ? 'text-violet-400 border-b-2 border-violet-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              onClick={() => t === 'load' ? openLoadTab() : setTab(t)}
            >
              {t === 'save' ? '💾 Save' : t === 'load' ? '📂 Load' : '📥 Import'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {tab === 'save' && (
            <>
              <input
                className="node-input text-xs"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Flow name…"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSave}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                  Save to Library
                </button>
                <button onClick={handleExport}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">
                  Download .json
                </button>
              </div>
              <button onClick={handleCopy}
                className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">
                📋 Copy to Clipboard
              </button>
            </>
          )}

          {tab === 'load' && (
            <>
              {saved.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-4">No saved flows yet</p>
              )}
              {saved.map(flow => (
                <div key={flow.name} className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                  <div>
                    <div className="text-xs text-zinc-100 font-medium">{flow.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {flow.nodes.length} nodes · {flow.edges.length} edges ·{' '}
                      {new Date(flow.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleLoad(flow)}
                      className="px-2 py-1 rounded text-[10px] bg-violet-600 hover:bg-violet-500 text-white">
                      Load
                    </button>
                    <button onClick={() => handleDelete(flow.name)}
                      className="px-2 py-1 rounded text-[10px] bg-zinc-700 hover:bg-red-700 text-zinc-300">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'import' && (
            <>
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors border border-dashed border-zinc-500">
                📁 Import from File (.json)
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              <button onClick={handleImportClipboard}
                className="px-3 py-2 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">
                📋 Import from Clipboard
              </button>
            </>
          )}

          {/* Status message */}
          {message && (
            <div className="text-[11px] text-green-400 text-center py-1">{message}</div>
          )}
        </div>
      </div>
    </div>
  )
}
