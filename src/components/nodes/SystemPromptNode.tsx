import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { TextInputData } from '../../types/flow'

export function SystemPromptNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TextInputData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const collapsed = !!(d as unknown as Record<string, unknown>).collapsed

  const statusClass = (d as unknown as Record<string, unknown>).status === 'running' ? 'node-running'
    : (d as unknown as Record<string, unknown>).status === 'done' ? 'node-done'
    : (d as unknown as Record<string, unknown>).status === 'error' ? 'node-error' : ''

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as unknown as Record<string, unknown>).width as number ?? 240 }}>
      <NodeResizer minWidth={160} minHeight={80} isVisible={!!selected} />
      <div className="node-header bg-amber-700" onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} ⚙️ System Prompt</span>
      </div>
      {!collapsed && (
        <div className="p-2">
          <textarea
            className="node-input text-xs resize-none h-24 w-full"
            value={d.value}
            onChange={e => updateNodeData(id, { value: e.target.value })}
            placeholder="You are a helpful assistant…"
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
