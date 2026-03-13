import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import type { TextInputData } from '../../types/flow'
import { PORT_COLORS } from '../../types/flow'

export function TextInputNode({ id, data }: NodeProps) {
  const d = data as unknown as TextInputData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-56">
      <div className="node-header bg-blue-600">
        <span>✏️ Text Input</span>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <input
          className="node-input text-xs font-semibold"
          value={d.label}
          onChange={e => updateNodeData(id, { label: e.target.value })}
          placeholder="Label"
        />
        <textarea
          className="node-input text-xs resize-none h-20"
          value={d.value}
          onChange={e => updateNodeData(id, { value: e.target.value })}
          placeholder="Enter text…"
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }}
      />
    </div>
  )
}
