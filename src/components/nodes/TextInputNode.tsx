import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import type { TextInputData } from '../../types/flow'
import { PORT_COLORS } from '../../types/flow'

export function TextInputNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TextInputData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const collapsed = !!(d as unknown as Record<string, unknown>).collapsed

  const statusClass = (d as unknown as Record<string, unknown>).status === 'running' ? 'node-running'
    : (d as unknown as Record<string, unknown>).status === 'done' ? 'node-done'
    : (d as unknown as Record<string, unknown>).status === 'error' ? 'node-error' : ''

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as unknown as Record<string, unknown>).width as number ?? 224 }}>
      <NodeResizer minWidth={160} minHeight={80} isVisible={!!selected} />
      <div className="node-header bg-blue-600" onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} ✏️ Text Input</span>
      </div>
      {!collapsed && (
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
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }}
      />
    </div>
  )
}
