import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ConditionalData } from '../../types/flow'

// Routes input to one of two output handles (true/false) based on a condition.
// Modes: contains (substring), regex (pattern match), equals (exact), not-empty.

const MODES = [
  { value: 'contains',  label: 'Contains' },
  { value: 'regex',     label: 'Regex' },
  { value: 'equals',    label: 'Equals' },
  { value: 'not-empty', label: 'Not Empty' },
] as const

export function ConditionalNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ConditionalData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed

  return (
    <div className="node-shell" style={{ width: (data as Record<string, unknown>).width as number ?? 224 }}>
      <NodeResizer minWidth={160} minHeight={80} isVisible={selected} />
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />

      <div className="node-header bg-orange-700"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 🔀 Conditional</span>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-400">Mode</label>
          <select
            className="node-input text-xs"
            value={d.mode}
            onChange={e => updateNodeData(id, { mode: e.target.value })}
          >
            {MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {d.mode !== 'not-empty' && (
            <>
              <label className="text-[10px] text-zinc-400">Pattern</label>
              <input
                className="node-input text-xs"
                value={d.pattern}
                onChange={e => updateNodeData(id, { pattern: e.target.value })}
                placeholder={d.mode === 'regex' ? '\\d+' : 'search text'}
              />
            </>
          )}

          {/* Port labels */}
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-zinc-500">← input</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-green-400">✓ true →</span>
              <span className="text-red-400">✗ false →</span>
            </div>
          </div>

          {/* Status indicator */}
          {d.output && !d.error && (
            <div className="text-[10px] text-zinc-300 bg-zinc-900 rounded px-1.5 py-1 text-center">
              Last: <span className={d.output === 'true' ? 'text-green-400' : 'text-red-400'}>
                {d.output}
              </span>
            </div>
          )}

          {d.error && (
            <div className="text-[11px] text-red-400 bg-zinc-900 rounded p-1.5 break-all">
              ✗ {d.error}
            </div>
          )}
        </div>
      )}

      {/* Two output handles positioned vertically */}
      <Handle type="source" position={Position.Right} id="true"
        style={{ background: '#4ade80', top: '60%', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="false"
        style={{ background: '#f87171', top: '80%', width: 10, height: 10 }} />
    </div>
  )
}
