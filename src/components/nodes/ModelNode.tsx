import { useState, useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ModelNodeData } from '../../types/flow'
import { useModels } from '../../hooks/useModels'

const STATUS_ICON: Record<ModelNodeData['status'], string> = {
  idle: '○', running: '⟳', done: '✓', error: '✗',
}
const STATUS_COLOR: Record<ModelNodeData['status'], string> = {
  idle: 'text-zinc-400', running: 'text-yellow-400 animate-spin', done: 'text-green-400', error: 'text-red-400',
}

export function ModelNode({ id, data }: NodeProps) {
  const d = data as unknown as ModelNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const { models, loading, refresh } = useModels()

  // Filter models by search term
  const filteredModels = useMemo(() => {
    if (!search.trim()) return models
    const q = search.toLowerCase()
    return models.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.group.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q))
    )
  }, [models, search])

  // Group the filtered models
  const groups = useMemo(() => {
    const groupSet = [...new Set(filteredModels.map(m => m.group))]
    return groupSet
  }, [filteredModels])

  const current = models.find(m => m.id === d.model)

  return (
    <div className="node-shell w-72">
      <Handle type="target" position={Position.Left} id="user"
        style={{ background: PORT_COLORS.text, top: '30%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="system"
        style={{ background: PORT_COLORS.text, top: '48%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="images"
        style={{ background: PORT_COLORS.image, top: '66%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="audio"
        style={{ background: PORT_COLORS.audio, top: '84%', width: 10, height: 10 }} />

      <div className="node-header bg-violet-700 flex justify-between items-center">
        <span>🤖 Model</span>
        <div className="flex items-center gap-1.5">
          {loading && <span className="text-[9px] text-yellow-300 animate-pulse">loading…</span>}
          <span className="text-[9px] text-zinc-400">{models.length}</span>
          <span className={`text-base leading-none ${STATUS_COLOR[d.status]}`}>
            {STATUS_ICON[d.status]}
          </span>
        </div>
      </div>

      <div className="p-2 flex flex-col gap-2">
        {/* Search filter */}
        <input
          className="node-input text-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search models…"
        />

        {/* Grouped model selector */}
        <select
          className="node-input text-xs"
          value={d.model}
          onChange={e => updateNodeData(id, { model: e.target.value })}
        >
          {groups.map(group => (
            <optgroup key={group} label={group}>
              {filteredModels.filter(m => m.group === group).map(m => (
                <option key={m.id} value={m.id}>
                  {m.label}{m.price ? ` · ${m.price}` : ''}{m.context ? ` · ${m.context}` : ''}
                </option>
              ))}
            </optgroup>
          ))}
          {!current && <option value={d.model}>{d.model}</option>}
        </select>

        {/* Tag badges */}
        {current?.tags && current.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {current.tags.map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Port labels */}
        <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500 pl-1">
          <span>← user message</span>
          <span>← system prompt</span>
          <span className="text-purple-400/60">← images (vision)</span>
          <span className="text-amber-400/60">← audio</span>
        </div>

        {/* Config toggle */}
        <button
          className="text-[10px] text-zinc-400 hover:text-zinc-200 text-left"
          onClick={() => setExpanded(x => !x)}
        >
          {expanded ? '▾ hide config' : '▸ show config'}
        </button>

        {expanded && (
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[10px] text-zinc-400">Temperature: {d.temperature.toFixed(2)}</label>
              <input type="range" min={0} max={2} step={0.05} value={d.temperature}
                className="w-full accent-violet-500"
                onChange={e => updateNodeData(id, { temperature: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400">System prompt override</label>
              <textarea
                className="node-input text-xs resize-none h-14 w-full"
                value={d.systemPrompt}
                placeholder="(uses connected system node if blank)"
                onChange={e => updateNodeData(id, { systemPrompt: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400">Custom model ID</label>
              <input className="node-input text-xs w-full" value={d.model}
                placeholder="e.g. anthropic/claude-opus-4-6"
                onChange={e => updateNodeData(id, { model: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400">Vision detail level</label>
              <select
                className="node-input text-xs w-full"
                value={(d as unknown as Record<string, unknown>).imageDetail as string ?? 'auto'}
                onChange={e => updateNodeData(id, { imageDetail: e.target.value })}
              >
                <option value="auto">Auto</option>
                <option value="low">Low (faster, cheaper)</option>
                <option value="high">High (more detail)</option>
              </select>
            </div>
            <button
              className="text-[10px] text-violet-400 hover:text-violet-300 text-left"
              onClick={refresh}
            >
              ↻ Refresh model list
            </button>
          </div>
        )}

        {/* Streaming output preview */}
        {d.output && (
          <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {d.output}
          </div>
        )}
        {d.error && (
          <div className="text-[11px] text-red-400 bg-zinc-900 rounded p-1.5 break-all">
            ✗ {d.error}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
