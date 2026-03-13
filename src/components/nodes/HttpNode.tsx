import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { HttpNodeData } from '../../types/flow'

export function HttpNode({ id, data }: NodeProps) {
  const d = data as unknown as HttpNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const statusColor = d.status === 'running' ? 'text-yellow-400' :
    d.status === 'done' ? 'text-green-400' :
    d.status === 'error' ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="node-shell w-64">
      <Handle type="target" position={Position.Left} id="url"
        style={{ background: PORT_COLORS.text, width: 10, height: 10, top: '35%' }} />
      <Handle type="target" position={Position.Left} id="body"
        style={{ background: PORT_COLORS.text, width: 10, height: 10, top: '65%' }} />
      <div className="node-header bg-orange-700">🌐 HTTP
        <span className={`ml-auto text-xs ${statusColor}`}>
          {d.status === 'running' ? '⟳' : d.status === 'done' ? '✓' : d.status === 'error' ? '✗' : ''}
        </span>
      </div>
      <div className="p-2 space-y-1">
        <div className="flex gap-1">
          <select
            className="node-input text-xs"
            value={d.method}
            onChange={e => updateNodeData(id, { method: e.target.value })}
          >
            {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
          </select>
          <input
            className="node-input text-xs flex-1"
            value={d.url}
            onChange={e => updateNodeData(id, { url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <textarea
          className="node-input text-xs w-full h-12 font-mono"
          value={d.headers}
          onChange={e => updateNodeData(id, { headers: e.target.value })}
          placeholder="{}"
        />
        {d.error && <div className="text-xs text-red-400">{d.error}</div>}
        {d.output && (
          <div className="text-xs text-gray-400 truncate" title={d.output}>
            → {d.output.slice(0, 60)}{d.output.length > 60 ? '…' : ''}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
