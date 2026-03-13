import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { TextInputNodeData } from '../../types/flow'

export function TextInputNode({ id, data }: NodeProps) {
  const d = data as unknown as TextInputNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-64">
      <div className="node-header bg-violet-700">📝 Text Input</div>
      <div className="p-2 space-y-1">
        <textarea
          className="node-input text-xs w-full h-20 resize-y"
          value={d.text}
          onChange={e => updateNodeData(id, { text: e.target.value })}
          placeholder="Enter text..."
        />
        {d.output && (
          <div className="text-xs text-gray-400 truncate" title={d.output}>
            → {d.output.slice(0, 60)}{d.output.length > 60 ? '…' : ''}
          </div>
        )}
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
