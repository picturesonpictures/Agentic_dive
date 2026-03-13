import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ConcatData } from '../../types/flow'

// Merges multiple text inputs into one, using a configurable separator.
// Useful for combining a prompt + context, or merging outputs from parallel models.

export function ConcatNode({ id, data }: NodeProps) {
  const d = data as unknown as ConcatData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-44">
      <Handle type="target" position={Position.Left} id="a"
        style={{ background: PORT_COLORS.text, top: '35%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="b"
        style={{ background: PORT_COLORS.text, top: '65%', width: 10, height: 10 }} />

      <div className="node-header bg-teal-700">
        <span>🔗 Combine Text</span>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500 pl-1 mb-1">
          <span>← input A</span>
          <span>← input B</span>
        </div>
        <label className="text-[10px] text-zinc-400">Separator</label>
        <input
          className="node-input text-xs"
          value={d.separator}
          onChange={e => updateNodeData(id, { separator: e.target.value })}
          placeholder="\n\n"
        />
      </div>

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
