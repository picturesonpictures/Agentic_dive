import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS, MODELS } from '../../types/flow'
import type { ModelNodeData } from '../../types/flow'

export function ModelNode({ id, data }: NodeProps) {
  const d = data as unknown as ModelNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const statusColor = d.status === 'running' ? 'text-yellow-400' :
    d.status === 'done' ? 'text-green-400' :
    d.status === 'error' ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="node-shell w-72">
      <Handle type="target" position={Position.Left} id="user"
        style={{ background: PORT_COLORS.text, width: 10, height: 10, top: '35%' }} />
      <Handle type="target" position={Position.Left} id="system"
        style={{ background: PORT_COLORS.text, width: 10, height: 10, top: '65%' }} />
      <div className="node-header bg-indigo-700">🤖 Model
        <span className={`ml-auto text-xs ${statusColor}`}>
          {d.status === 'running' ? '⟳ running' : d.status === 'done' ? '✓' : d.status === 'error' ? '✗' : ''}
        </span>
      </div>
      <div className="p-2 space-y-1">
        <select
          className="node-input text-xs w-full"
          value={d.model}
          onChange={e => updateNodeData(id, { model: e.target.value })}
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label} ({m.group})</option>
          ))}
        </select>
        <textarea
          className="node-input text-xs w-full h-16 resize-y"
          value={d.systemPrompt}
          onChange={e => updateNodeData(id, { systemPrompt: e.target.value })}
          placeholder="System prompt..."
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400">Temp</label>
            <input
              type="number" min="0" max="2" step="0.1"
              className="node-input text-xs w-full"
              value={d.temperature}
              onChange={e => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400">Max tokens</label>
            <input
              type="number" min="1" max="32000"
              className="node-input text-xs w-full"
              value={d.maxTokens}
              onChange={e => updateNodeData(id, { maxTokens: parseInt(e.target.value) })}
            />
          </div>
        </div>
        {d.error && <div className="text-xs text-red-400">{d.error}</div>}
        {d.output && (
          <div className="text-xs text-gray-400 truncate" title={d.output}>
            → {d.output.slice(0, 80)}{d.output.length > 80 ? '…' : ''}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
