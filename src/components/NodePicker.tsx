import { useState } from 'react'
import { useFlowStore } from '../store/flowStore'

interface NodeEntry {
  type: string
  label: string
  desc: string
  group: string
}

const NODE_CATALOG: NodeEntry[] = [
  { type: 'textInput', label: '📝 Text Input', desc: 'Static text that feeds into the flow', group: 'Input' },
  { type: 'model', label: '🤖 Model', desc: 'Call an LLM via OpenRouter', group: 'AI' },
  { type: 'concat', label: '🔗 Concat', desc: 'Join multiple inputs with a separator', group: 'Transform' },
  { type: 'conditional', label: '⚡ Conditional', desc: 'Route flow based on a JS condition', group: 'Logic' },
  { type: 'http', label: '🌐 HTTP', desc: 'Make an HTTP request', group: 'IO' },
  { type: 'output', label: '📤 Output', desc: 'Display flow results', group: 'Output' },
]

export function NodePicker({ onClose }: { onClose: () => void }) {
  const addNode = useFlowStore(s => s.addNode)
  const [search, setSearch] = useState('')

  const filtered = NODE_CATALOG.filter(n =>
    n.label.toLowerCase().includes(search.toLowerCase()) ||
    n.desc.toLowerCase().includes(search.toLowerCase())
  )

  const groups = [...new Set(filtered.map(n => n.group))]

  const handleAdd = (type: string) => {
    addNode(type, { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-96 max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold mb-2">Add Node</h2>
          <input
            autoFocus
            className="w-full bg-gray-800 text-white rounded px-3 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-violet-500"
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto p-2">
          {groups.map(group => (
            <div key={group} className="mb-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">{group}</div>
              {filtered.filter(n => n.group === group).map(node => (
                <button
                  key={node.type}
                  onClick={() => handleAdd(node.type)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="text-sm text-white">{node.label}</div>
                  <div className="text-xs text-gray-400">{node.desc}</div>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-4">No nodes found</div>
          )}
        </div>
      </div>
    </div>
  )
}
