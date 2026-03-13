import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { TextInputData } from '../../types/flow'

export function SystemPromptNode({ id, data }: NodeProps) {
  const d = data as unknown as TextInputData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-60">
      <div className="node-header bg-amber-700">
        <span>⚙️ System Prompt</span>
      </div>
      <div className="p-2">
        <textarea
          className="node-input text-xs resize-none h-24 w-full"
          value={d.value}
          onChange={e => updateNodeData(id, { value: e.target.value })}
          placeholder="You are a helpful assistant…"
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
