import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { OutputNodeData } from '../../types/flow'

export function OutputNode({ id, data }: NodeProps) {
  const d = data as unknown as OutputNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-64">
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
      <div className="node-header bg-green-700">📤 Output</div>
      <div className="p-2 space-y-1">
        <input
          className="node-input text-xs w-full"
          value={d.label}
          onChange={e => updateNodeData(id, { label: e.target.value })}
          placeholder="Output label"
        />
        {d.output && (
          <div className="text-xs text-gray-300 bg-gray-800 rounded p-1 max-h-24 overflow-y-auto whitespace-pre-wrap">
            {d.output}
          </div>
        )}
      </div>
    </div>
  )
}
