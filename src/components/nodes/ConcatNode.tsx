import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ConcatData } from '../../types/flow'

// Merges multiple text inputs into one, using a configurable separator.
// Useful for combining a prompt + context, or merging outputs from parallel models.

export function ConcatNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ConcatData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const collapsed = !!(d as unknown as Record<string, unknown>).collapsed

  const statusClass = (d as unknown as Record<string, unknown>).status === 'running' ? 'node-running'
    : (d as unknown as Record<string, unknown>).status === 'done' ? 'node-done'
    : (d as unknown as Record<string, unknown>).status === 'error' ? 'node-error' : ''

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as unknown as Record<string, unknown>).width as number ?? 176 }}>
      <NodeResizer minWidth={160} minHeight={80} isVisible={!!selected} />
      <Handle type="target" position={Position.Left} id="a"
        style={{ background: PORT_COLORS.text, top: '35%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="b"
        style={{ background: PORT_COLORS.text, top: '65%', width: 10, height: 10 }} />

      <div className="node-header bg-teal-700" onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 🔗 Combine Text</span>
      </div>
      {!collapsed && (
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
      )}

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
