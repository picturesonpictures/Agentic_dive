import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import type { NoteData } from '../../types/flow'

const NOTE_COLORS = [
  { label: 'Yellow', bg: 'bg-yellow-900/60', border: 'border-yellow-600' },
  { label: 'Blue',   bg: 'bg-blue-900/60',   border: 'border-blue-600' },
  { label: 'Green',  bg: 'bg-green-900/60',  border: 'border-green-600' },
  { label: 'Purple', bg: 'bg-purple-900/60', border: 'border-purple-600' },
  { label: 'Red',    bg: 'bg-red-900/60',    border: 'border-red-600' },
]

export function NoteNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as NoteData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  const collapsed = !!(d as unknown as Record<string, unknown>).collapsed

  const scheme = NOTE_COLORS.find(c => c.label === d.color) ?? NOTE_COLORS[0]

  return (
    <div className={`rounded-lg border ${scheme.border} ${scheme.bg} shadow-lg w-48`}>
      <NodeResizer minWidth={120} minHeight={60} isVisible={!!selected} />
      <div className="flex items-center justify-between px-2 pt-1.5" onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{collapsed ? '▸' : '▾'} Note</span>
        <div className="flex gap-1">
          {NOTE_COLORS.map(c => (
            <button
              key={c.label}
              onClick={() => updateNodeData(id, { color: c.label })}
              className={`w-3 h-3 rounded-full border ${c.border} ${c.bg} ${d.color === c.label ? 'ring-1 ring-white' : ''}`}
            />
          ))}
        </div>
      </div>
      {!collapsed && (
        <textarea
          className="bg-transparent text-xs text-zinc-200 p-2 w-full resize-none h-20 focus:outline-none placeholder:text-zinc-500"
          value={d.text}
          onChange={e => updateNodeData(id, { text: e.target.value })}
          placeholder="Add a note…"
        />
      )}
    </div>
  )
}
