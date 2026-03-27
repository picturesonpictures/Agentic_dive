import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { useMemoryStore } from '../../store/memoryStore'
import { PORT_COLORS } from '../../types/flow'
import type { VariableStoreData } from '../../types/flow'

// Named key-value store that persists across runs.
// In "set" mode: writes input to the named variable.
// In "get" mode: outputs the current value of the named variable.

export function VariableStoreNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as VariableStoreData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const currentValue = useMemoryStore(s => s.variables[d.varName] ?? '')
  const variables = useMemoryStore(s => s.variables)

  const collapsed = !!(d as unknown as Record<string, unknown>).collapsed

  const statusClass = (d as unknown as Record<string, unknown>).status === 'running' ? 'node-running'
    : (d as unknown as Record<string, unknown>).status === 'done' ? 'node-done'
    : (d as unknown as Record<string, unknown>).status === 'error' ? 'node-error' : ''

  const varCount = Object.keys(variables).length

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as unknown as Record<string, unknown>).width as number ?? 208 }}>
      <NodeResizer minWidth={160} minHeight={80} isVisible={!!selected} />
      {d.mode === 'set' && (
        <Handle type="target" position={Position.Left} id="in"
          style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
      )}

      <div className="node-header bg-amber-600 flex justify-between items-center" onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} {d.mode === 'get' ? '📖 Get Var' : '📝 Set Var'}</span>
        <span className="text-[9px] text-amber-200">{varCount} vars</span>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          <div className="flex gap-1">
            <select
              className="node-input text-xs w-16 shrink-0"
              value={d.mode}
              onChange={e => updateNodeData(id, { mode: e.target.value })}
            >
              <option value="get">Get</option>
              <option value="set">Set</option>
            </select>
            <input
              className="node-input text-xs flex-1"
              value={d.varName}
              onChange={e => updateNodeData(id, { varName: e.target.value })}
              placeholder="variable_name"
            />
          </div>

          {/* Port labels */}
          <div className="text-[10px] text-zinc-500 pl-1">
            {d.mode === 'set' ? '← value to store' : '→ outputs stored value'}
          </div>

          {/* Current value preview */}
          {d.varName && currentValue && (
            <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-16 overflow-y-auto whitespace-pre-wrap break-all">
              <span className="text-amber-400 text-[9px]">{d.varName} =</span>{' '}
              {currentValue.slice(0, 200)}{currentValue.length > 200 ? '…' : ''}
            </div>
          )}

          {/* Show all variables if few exist */}
          {varCount > 0 && varCount <= 5 && (
            <div className="text-[9px] text-zinc-500 flex flex-wrap gap-1">
              {Object.keys(variables).map(k => (
                <span key={k} className="px-1 py-0.5 rounded bg-zinc-900 text-amber-400/70">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {(d.mode === 'get' || d.mode === 'set') && (
        <Handle type="source" position={Position.Right} id="out"
          style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
      )}
    </div>
  )
}
