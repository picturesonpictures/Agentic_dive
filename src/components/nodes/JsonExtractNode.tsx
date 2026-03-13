import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { JsonExtractData } from '../../types/flow'

// Extracts a value from JSON text using a dot-path expression.
// Supports nested objects, array indexing (e.g. items[0].name), and graceful error handling.

export function JsonExtractNode({ id, data }: NodeProps) {
  const d = data as unknown as JsonExtractData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-52">
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />

      <div className="node-header bg-rose-700">
        <span>🔍 JSON Extract</span>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-400">Path expression</label>
        <input
          className="node-input text-xs"
          value={d.path}
          onChange={e => updateNodeData(id, { path: e.target.value })}
          placeholder="data.items[0].name"
        />

        {/* Output preview */}
        {d.output && !d.error && (
          <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-20 overflow-y-auto whitespace-pre-wrap leading-relaxed break-all">
            {d.output}
          </div>
        )}

        {/* Error display */}
        {d.error && (
          <div className="text-[11px] text-red-400 bg-zinc-900 rounded p-1.5 break-all">
            ✗ {d.error}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
