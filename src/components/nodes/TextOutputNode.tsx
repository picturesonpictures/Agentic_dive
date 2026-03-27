import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { TextOutputData } from '../../types/flow'

export function TextOutputNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TextOutputData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const collapsed = !!(d as unknown as Record<string, unknown>).collapsed

  const statusClass = (d as unknown as Record<string, unknown>).status === 'running' ? 'node-running'
    : (d as unknown as Record<string, unknown>).status === 'done' ? 'node-done'
    : (d as unknown as Record<string, unknown>).status === 'error' ? 'node-error' : ''

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as unknown as Record<string, unknown>).width as number ?? 320 }}>
      <NodeResizer minWidth={200} minHeight={100} isVisible={!!selected} />
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }}
      />
      <div className="node-header bg-emerald-700 flex justify-between items-center" onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 📄 Output</span>
        {d.value && (
          <button
            className="text-[10px] text-zinc-400 hover:text-zinc-200 px-1 leading-none"
            title="Copy content"
            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(d.value) }}
          >
            📋
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="p-3 min-h-16 max-h-64 overflow-y-auto">
          {d.value ? (
            <div className="prose prose-invert prose-sm max-w-none text-zinc-200">
              <ReactMarkdown>{d.value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-zinc-500 text-xs italic">Output will appear here…</p>
          )}
        </div>
      )}
    </div>
  )
}
