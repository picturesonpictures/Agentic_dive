import { useState, useMemo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ModelRouterNodeData } from '../../types/flow'
import { useModels } from '../../hooks/useModels'

const STATUS_ICON: Record<ModelRouterNodeData['status'], string> = {
  idle: '○', running: '⟳', done: '✓', error: '✗',
}
const STATUS_COLOR: Record<ModelRouterNodeData['status'], string> = {
  idle: 'text-zinc-400', running: 'text-yellow-400 animate-spin', done: 'text-green-400', error: 'text-red-400',
}

const CONDITIONS = [
  { value: 'cost-under', label: 'Cost under' },
  { value: 'context-over', label: 'Context over' },
  { value: 'has-tag', label: 'Has tag' },
  { value: 'provider-is', label: 'Provider is' },
] as const

export function ModelRouterNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ModelRouterNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed
  const statusClass = d.status === 'running' ? 'node-running' : d.status === 'done' ? 'node-done' : d.status === 'error' ? 'node-error' : ''

  const [search, setSearch] = useState('')
  const { models } = useModels()

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models
    const q = search.toLowerCase()
    return models.filter(m =>
      m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    )
  }, [models, search])

  const groups = useMemo(() => [...new Set(filteredModels.map(m => m.group))], [filteredModels])

  const addRule = () => {
    updateNodeData(id, {
      rules: [...d.rules, { condition: 'has-tag' as const, value: '', modelId: 'openrouter/auto' }],
    })
  }

  const updateRule = (index: number, patch: Record<string, string>) => {
    const rules = [...d.rules]
    rules[index] = { ...rules[index], ...patch }
    updateNodeData(id, { rules })
  }

  const removeRule = (index: number) => {
    updateNodeData(id, { rules: d.rules.filter((_, i) => i !== index) })
  }

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as Record<string, unknown>).width as number ?? 280 }}>
      <NodeResizer minWidth={200} minHeight={120} isVisible={selected} />

      <Handle type="target" position={Position.Left} id="prompt"
        style={{ background: PORT_COLORS.text, top: '35%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="budget"
        style={{ background: PORT_COLORS.text, top: '65%', width: 10, height: 10 }} />

      <div className="node-header bg-sky-700 flex justify-between items-center"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 🧭 Router</span>
        <div className="flex items-center gap-1.5">
          {d.output && (
            <span className="text-[9px] text-sky-200 truncate max-w-[100px]">{d.output.split('/').pop()}</span>
          )}
          <span className={`text-base leading-none ${STATUS_COLOR[d.status]}`}>
            {STATUS_ICON[d.status]}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          {/* Routing mode */}
          <div className="flex gap-1">
            <button
              className={`text-[10px] px-2 py-0.5 rounded ${d.routingMode === 'rule-based' ? 'bg-sky-700 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              onClick={() => updateNodeData(id, { routingMode: 'rule-based' })}
            >Rules</button>
            <button
              className={`text-[10px] px-2 py-0.5 rounded ${d.routingMode === 'llm-based' ? 'bg-sky-700 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              onClick={() => updateNodeData(id, { routingMode: 'llm-based' })}
            >LLM</button>
          </div>

          {d.routingMode === 'rule-based' && (
            <div className="flex flex-col gap-1">
              {d.rules.map((rule, i) => (
                <div key={i} className="flex flex-col gap-0.5 bg-zinc-900 rounded p-1">
                  <div className="flex gap-1 items-center">
                    <select className="node-input text-[10px] flex-1" value={rule.condition}
                      onChange={e => updateRule(i, { condition: e.target.value })}>
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input className="node-input text-[10px] w-16" value={rule.value}
                      onChange={e => updateRule(i, { value: e.target.value })}
                      placeholder="value" />
                    <button className="text-red-400 text-xs hover:text-red-300" onClick={() => removeRule(i)}>✗</button>
                  </div>
                  <select className="node-input text-[10px]" value={rule.modelId}
                    onChange={e => updateRule(i, { modelId: e.target.value })}>
                    {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              ))}
              <button className="text-[10px] text-sky-400 hover:text-sky-300" onClick={addRule}>+ Add rule</button>

              <div>
                <label className="text-[10px] text-zinc-400">Fallback model</label>
                <select className="node-input text-xs" value={d.fallbackModel}
                  onChange={e => updateNodeData(id, { fallbackModel: e.target.value })}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {d.routingMode === 'llm-based' && (
            <div className="flex flex-col gap-1.5">
              <input className="node-input text-xs" value={search}
                onChange={e => setSearch(e.target.value)} placeholder="🔍 Search models…" />
              <select className="node-input text-xs" value={d.routerModel}
                onChange={e => updateNodeData(id, { routerModel: e.target.value })}>
                {groups.map(group => (
                  <optgroup key={group} label={group}>
                    {filteredModels.filter(m => m.group === group).map(m => (
                      <option key={m.id} value={m.id}>{m.label}{m.price ? ` · ${m.price}` : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div>
                <label className="text-[10px] text-zinc-400">Temperature: {d.routerTemperature.toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.05} value={d.routerTemperature}
                  className="w-full accent-sky-500"
                  onChange={e => updateNodeData(id, { routerTemperature: parseFloat(e.target.value) })} />
              </div>
            </div>
          )}

          {/* Port labels */}
          <div className="flex justify-between text-[10px] mt-1">
            <div className="flex flex-col gap-0.5 text-zinc-500">
              <span>← prompt</span>
              <span>← budget</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-zinc-500">
              <span>model_id →</span>
              <span>reasoning →</span>
            </div>
          </div>

          {d.reasoning && (
            <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-16 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {d.reasoning}
            </div>
          )}
          {d.error && (
            <div className="text-[11px] text-red-400 bg-zinc-900 rounded p-1.5 break-all">
              ✗ {d.error}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="model_id"
        style={{ background: PORT_COLORS.text, top: '40%', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="reasoning"
        style={{ background: PORT_COLORS.text, top: '70%', width: 10, height: 10 }} />
    </div>
  )
}
