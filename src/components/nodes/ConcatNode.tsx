import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ConcatNodeData } from '../../types/flow'

export function ConcatNode({ id, data }: NodeProps) {
  const d = data as unknown as ConcatNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-52">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }}
      />
      <div className="node-header bg-teal-700">🔗 Concat</div>
      <div className="p-2">
        <label className="text-xs text-gray-400">Separator</label>
        <input
          className="node-input text-xs w-full mt-1"
          value={d.separator}
          onChange={e => updateNodeData(id, { separator: e.target.value })}
          placeholder="\n"
        />
        {d.output && (
          <div className="text-xs text-gray-400 truncate mt-1" title={d.output}>
            → {d.output.slice(0, 50)}{d.output.length > 50 ? '…' : ''}
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
