import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ConditionalNodeData } from '../../types/flow'

export function ConditionalNode({ id, data }: NodeProps) {
  const d = data as unknown as ConditionalNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-60">
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
      <div className="node-header bg-yellow-700">⚡ Conditional</div>
      <div className="p-2 space-y-1">
        <label className="text-xs text-gray-400">Condition (JS)</label>
        <input
          className="node-input text-xs w-full font-mono"
          value={d.condition}
          onChange={e => updateNodeData(id, { condition: e.target.value })}
          placeholder="input.length > 0"
        />
        <div className="flex gap-2 text-xs text-gray-400 mt-1">
          <span className="flex-1">✓ true →</span>
          <span className="flex-1">✗ false →</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="true"
        style={{ background: PORT_COLORS.bool, width: 10, height: 10, top: '35%' }} />
      <Handle type="source" position={Position.Right} id="false"
        style={{ background: PORT_COLORS.bool, width: 10, height: 10, top: '65%' }} />
    </div>
  )
}
