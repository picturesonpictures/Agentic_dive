import { useState, useCallback } from 'react'
import { ReactFlow, Background, Controls, MiniMap, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from './store/flowStore'
import { NodePicker } from './components/NodePicker'
import { AiArchitect } from './components/AiArchitect'
import { TextInputNode } from './components/nodes/TextInputNode'
import { ConcatNode } from './components/nodes/ConcatNode'
import { ModelNode } from './components/nodes/ModelNode'
import { ConditionalNode } from './components/nodes/ConditionalNode'
import { HttpNode } from './components/nodes/HttpNode'
import { OutputNode } from './components/nodes/OutputNode'

const nodeTypes = {
  textInput: TextInputNode,
  concat: ConcatNode,
  model: ModelNode,
  conditional: ConditionalNode,
  http: HttpNode,
  output: OutputNode,
}

function nodeColor(n: Node): string {
  if (n.type === 'textInput') return '#7c3aed'
  if (n.type === 'model') return '#4338ca'
  if (n.type === 'concat') return '#0f766e'
  if (n.type === 'conditional') return '#b45309'
  if (n.type === 'http') return '#c2410c'
  if (n.type === 'output') return '#166534'
  return '#6b7280'
}

export default function App() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, run, apiKey, setApiKey } = useFlowStore()
  const [showPicker, setShowPicker] = useState(false)
  const [showArchitect, setShowArchitect] = useState(false)
  const [running, setRunning] = useState(false)

  const handleRun = useCallback(async () => {
    setRunning(true)
    try { await run() } finally { setRunning(false) }
  }, [run])

  const handleExport = () => {
    const data = JSON.stringify({ version: 1, nodes, edges }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'flow.json'
    a.click(); URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const flow = JSON.parse(ev.target?.result as string)
          useFlowStore.getState().loadFlow(flow.nodes, flow.edges)
        } catch { alert('Invalid flow file') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="text-violet-400 font-bold text-lg mr-2">⚡ FlowBuilder</span>
        <button
          onClick={() => setShowPicker(true)}
          className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          + Add Node
        </button>
        <button
          onClick={() => setShowArchitect(true)}
          className="px-3 py-1.5 text-sm bg-violet-800 hover:bg-violet-700 rounded-lg transition-colors"
        >
          🏗️ AI Architect
        </button>
        <div className="flex-1" />
        <input
          type="password"
          className="bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-600 w-48 focus:outline-none focus:border-violet-500"
          placeholder="OpenRouter API key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
        <button onClick={handleImport} className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          Import
        </button>
        <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          Export
        </button>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-1.5 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg transition-colors font-medium"
        >
          {running ? '⟳ Running...' : '▶ Run'}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-gray-950"
        >
          <Background color="#374151" gap={20} />
          <Controls className="!bg-gray-800 !border-gray-700" />
          <MiniMap nodeColor={nodeColor} className="!bg-gray-900 !border-gray-700" />
        </ReactFlow>
      </div>

      {showPicker && <NodePicker onClose={() => setShowPicker(false)} />}
      {showArchitect && <AiArchitect onClose={() => setShowArchitect(false)} />}
    </div>
  )
}
