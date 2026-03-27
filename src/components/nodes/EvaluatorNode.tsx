import { useState, useMemo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { EvaluatorNodeData } from '../../types/flow'
import { useModels } from '../../hooks/useModels'

const STATUS_ICON: Record<EvaluatorNodeData['status'], string> = {
  idle: '○', running: '⟳', done: '✓', error: '✗',
}
const STATUS_COLOR: Record<EvaluatorNodeData['status'], string> = {
  idle: 'text-zinc-400', running: 'text-yellow-400 animate-spin', done: 'text-green-400', error: 'text-red-400',
}

export function EvaluatorNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as EvaluatorNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed
  const statusClass = d.status === 'running' ? 'node-running' : d.status === 'done' ? 'node-done' : d.status === 'error' ? 'node-error' : ''

  const [search, setSearch] = useState('')
  const { models } = useModels()

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models
    const q = search.toLowerCase()
    return models.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q))
    )
  }, [models, search])

  const groups = useMemo(() => [...new Set(filteredModels.map(m => m.group))], [filteredModels])

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as Record<string, unknown>).width as number ?? 256 }}>
      <NodeResizer minWidth={180} minHeight={100} isVisible={selected} />
      <Handle type="target" position={Position.Left} id="input"
        style={{ background: PORT_COLORS.text, top: '35%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="criteria"
        style={{ background: PORT_COLORS.text, top: '55%', width: 10, height: 10 }} />

      <div className="node-header bg-yellow-700 flex justify-between items-center"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} ⚖️ Evaluator</span>
        <div className="flex items-center gap-1.5">
          {d.verdict && (
            <span className={`text-[9px] font-bold ${d.verdict === 'pass' ? 'text-green-300' : 'text-red-300'}`}>
              {d.verdict.toUpperCase()}
            </span>
          )}
          <span className={`text-base leading-none ${STATUS_COLOR[d.status]}`}>
            {STATUS_ICON[d.status]}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          <input
            className="node-input text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search models…"
          />
          <select
            className="node-input text-xs"
            value={d.model}
            onChange={e => updateNodeData(id, { model: e.target.value })}
          >
            {groups.map(group => (
              <optgroup key={group} label={group}>
                {filteredModels.filter(m => m.group === group).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label}{m.price ? ` · ${m.price}` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div>
            <label className="text-[10px] text-zinc-400">Temperature: {d.temperature.toFixed(2)}</label>
            <input type="range" min={0} max={1} step={0.05} value={d.temperature}
              className="w-full accent-yellow-500"
              onChange={e => updateNodeData(id, { temperature: parseFloat(e.target.value) })} />
          </div>

          {/* Port labels */}
          <div className="flex justify-between text-[10px] mt-1">
            <div className="flex flex-col gap-0.5 text-zinc-500">
              <span>← input</span>
              <span>← criteria</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-green-400">✓ pass →</span>
              <span className="text-red-400">✗ fail →</span>
              <span className="text-zinc-400">reasoning →</span>
            </div>
          </div>

          {/* Reasoning preview */}
          {d.output && (
            <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-20 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {d.output}
            </div>
          )}
          {d.error && (
            <div className="text-[11px] text-red-400 bg-zinc-900 rounded p-1.5 break-all">
              ✗ {d.error}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="pass"
        style={{ background: '#4ade80', top: '40%', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="fail"
        style={{ background: '#f87171', top: '60%', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="reasoning"
        style={{ background: PORT_COLORS.text, top: '80%', width: 10, height: 10 }} />
    </div>
  )
}
