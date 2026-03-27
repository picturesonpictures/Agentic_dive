import { useState, useMemo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { LoopNodeData } from '../../types/flow'
import { listLibrary, loadFromLibrary } from '../../lib/flowIO'
import { useModels } from '../../hooks/useModels'

const STATUS_ICON: Record<LoopNodeData['status'], string> = {
  idle: '○', running: '⟳', done: '✓', error: '✗',
}
const STATUS_COLOR: Record<LoopNodeData['status'], string> = {
  idle: 'text-zinc-400', running: 'text-yellow-400 animate-spin', done: 'text-green-400', error: 'text-red-400',
}

export function LoopNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as LoopNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed
  const statusClass = d.status === 'running' ? 'node-running' : d.status === 'done' ? 'node-done' : d.status === 'error' ? 'node-error' : ''

  const [expanded, setExpanded] = useState(false)
  const savedFlows = useMemo(() => listLibrary(), [])
  const { models } = useModels()

  // Load flow info for handle detection
  const flowInfo = useMemo(() => {
    if (!d.flowName) return null
    const flow = loadFromLibrary(d.flowName)
    if (!flow) return null

    const nodesWithIncoming = new Set(flow.edges.map(e => e.target))
    const inputs = flow.nodes.filter(n =>
      (n.type === 'textInput' || n.type === 'systemPrompt') && !nodesWithIncoming.has(n.id)
    )
    const outputs = flow.nodes.filter(n => n.type === 'textOutput')
    return { inputs, outputs }
  }, [d.flowName])

  const handleFlowSelect = (flowName: string) => {
    const flow = loadFromLibrary(flowName)
    if (!flow) {
      updateNodeData(id, { flowName, inputMappings: [], outputMappings: [] })
      return
    }

    const nodesWithIncoming = new Set(flow.edges.map(e => e.target))
    const inputs = flow.nodes.filter(n =>
      (n.type === 'textInput' || n.type === 'systemPrompt') && !nodesWithIncoming.has(n.id)
    )
    const outputs = flow.nodes.filter(n => n.type === 'textOutput')

    const inputMappings = inputs.map((n, i) => ({ handleId: `input_${i}`, subFlowNodeId: n.id }))
    const outputMappings = outputs.map((n, i) => ({ handleId: `output_${i}`, subFlowNodeId: n.id }))

    updateNodeData(id, {
      flowName,
      inputMappings,
      outputMappings,
      feedbackInputHandle: inputMappings[0]?.handleId ?? '',
      feedbackOutputHandle: outputMappings[0]?.handleId ?? '',
    })
  }

  const groups = useMemo(() => [...new Set(models.map(m => m.group))], [models])

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as Record<string, unknown>).width as number ?? 280 }}>
      <NodeResizer minWidth={200} minHeight={120} isVisible={selected} />

      <Handle type="target" position={Position.Left} id="input"
        style={{ background: PORT_COLORS.text, top: '30%', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="criteria"
        style={{ background: PORT_COLORS.text, top: '50%', width: 10, height: 10 }} />

      <div className="node-header bg-purple-700 flex justify-between items-center"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 🔄 Loop</span>
        <div className="flex items-center gap-1.5">
          {d.status === 'running' && d.iteration > 0 && (
            <span className="text-[9px] text-yellow-300">{d.iteration}/{d.maxIterations}</span>
          )}
          <span className={`text-base leading-none ${STATUS_COLOR[d.status]}`}>
            {STATUS_ICON[d.status]}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          {/* Flow selector */}
          <label className="text-[10px] text-zinc-400">Sub-Flow</label>
          <select
            className="node-input text-xs"
            value={d.flowName}
            onChange={e => handleFlowSelect(e.target.value)}
          >
            <option value="">— select a flow —</option>
            {savedFlows.map(f => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>

          {/* Max iterations */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-400 whitespace-nowrap">Max iterations</label>
            <input type="number" min={1} max={20}
              className="node-input text-xs w-16"
              value={d.maxIterations}
              onChange={e => updateNodeData(id, { maxIterations: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })} />
          </div>

          {/* Break mode */}
          <label className="text-[10px] text-zinc-400">Break condition</label>
          <select
            className="node-input text-xs"
            value={d.breakMode}
            onChange={e => updateNodeData(id, { breakMode: e.target.value })}
          >
            <option value="evaluator">LLM Evaluator</option>
            <option value="regex">Regex Match</option>
            <option value="max-only">Max Iterations Only</option>
          </select>

          {d.breakMode === 'regex' && (
            <input className="node-input text-xs"
              value={d.breakPattern}
              onChange={e => updateNodeData(id, { breakPattern: e.target.value })}
              placeholder="Break when output matches…" />
          )}

          {d.breakMode === 'evaluator' && (
            <select className="node-input text-xs"
              value={d.evaluatorModel}
              onChange={e => updateNodeData(id, { evaluatorModel: e.target.value })}>
              {groups.map(group => (
                <optgroup key={group} label={group}>
                  {models.filter(m => m.group === group).map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          {/* Advanced config */}
          <button className="text-[10px] text-zinc-400 hover:text-zinc-200 text-left"
            onClick={() => setExpanded(x => !x)}>
            {expanded ? '▾ hide feedback config' : '▸ feedback config'}
          </button>

          {expanded && flowInfo && (
            <div className="flex flex-col gap-1.5">
              <div>
                <label className="text-[10px] text-zinc-400">Feedback output → input</label>
                <div className="flex gap-1">
                  <select className="node-input text-xs flex-1"
                    value={d.feedbackOutputHandle}
                    onChange={e => updateNodeData(id, { feedbackOutputHandle: e.target.value })}>
                    {d.outputMappings.map(m => (
                      <option key={m.handleId} value={m.handleId}>{m.handleId}</option>
                    ))}
                  </select>
                  <span className="text-zinc-500 text-xs">→</span>
                  <select className="node-input text-xs flex-1"
                    value={d.feedbackInputHandle}
                    onChange={e => updateNodeData(id, { feedbackInputHandle: e.target.value })}>
                    {d.inputMappings.map(m => (
                      <option key={m.handleId} value={m.handleId}>{m.handleId}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Port labels */}
          <div className="flex justify-between text-[10px] mt-1">
            <div className="flex flex-col gap-0.5 text-zinc-500">
              <span>← input</span>
              <span>← criteria</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-zinc-500">
              <span>output →</span>
              <span>iterations →</span>
              <span>log →</span>
            </div>
          </div>

          {d.maxIterations > 5 && (
            <div className="text-[9px] text-amber-400">
              ⚠ {d.maxIterations} iterations may incur significant API costs
            </div>
          )}

          {/* Iteration log */}
          {d.iterationLog && d.iterationLog.length > 0 && (
            <div className="text-[10px] text-zinc-400 bg-zinc-900 rounded p-1.5 max-h-16 overflow-y-auto">
              {d.iterationLog.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
            </div>
          )}

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

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, top: '30%', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="iterations"
        style={{ background: PORT_COLORS.text, top: '55%', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="log"
        style={{ background: PORT_COLORS.text, top: '80%', width: 10, height: 10 }} />
    </div>
  )
}
