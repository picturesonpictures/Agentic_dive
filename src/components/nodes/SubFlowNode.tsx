import { useMemo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { SubFlowNodeData } from '../../types/flow'
import { listLibrary, loadFromLibrary } from '../../lib/flowIO'

const STATUS_ICON: Record<SubFlowNodeData['status'], string> = {
  idle: '○', running: '⟳', done: '✓', error: '✗',
}
const STATUS_COLOR: Record<SubFlowNodeData['status'], string> = {
  idle: 'text-zinc-400', running: 'text-yellow-400 animate-spin', done: 'text-green-400', error: 'text-red-400',
}

export function SubFlowNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as SubFlowNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed
  const statusClass = d.status === 'running' ? 'node-running' : d.status === 'done' ? 'node-done' : d.status === 'error' ? 'node-error' : ''

  const savedFlows = useMemo(() => listLibrary(), [])

  // Auto-detect inputs/outputs from the selected flow
  const flowInfo = useMemo(() => {
    if (!d.flowName) return null
    const flow = loadFromLibrary(d.flowName)
    if (!flow) return null

    const flowEdges = flow.edges
    const nodesWithIncoming = new Set(flowEdges.map(e => e.target))

    const inputs = flow.nodes.filter(n =>
      (n.type === 'textInput' || n.type === 'systemPrompt') && !nodesWithIncoming.has(n.id)
    )
    const outputs = flow.nodes.filter(n => n.type === 'textOutput')

    return { inputs, outputs, nodeCount: flow.nodes.length, edgeCount: flow.edges.length }
  }, [d.flowName])

  // Auto-configure mappings when flow changes
  const effectiveInputMappings = d.inputMappings.length > 0 ? d.inputMappings :
    (flowInfo?.inputs.map((n, i) => ({ handleId: `input_${i}`, subFlowNodeId: n.id })) ?? [])
  const effectiveOutputMappings = d.outputMappings.length > 0 ? d.outputMappings :
    (flowInfo?.outputs.map((n, i) => ({ handleId: `output_${i}`, subFlowNodeId: n.id })) ?? [])

  const handleFlowSelect = (flowName: string) => {
    const flow = loadFromLibrary(flowName)
    if (!flow) {
      updateNodeData(id, { flowName, inputMappings: [], outputMappings: [] })
      return
    }

    const flowEdges = flow.edges
    const nodesWithIncoming = new Set(flowEdges.map(e => e.target))
    const inputs = flow.nodes.filter(n =>
      (n.type === 'textInput' || n.type === 'systemPrompt') && !nodesWithIncoming.has(n.id)
    )
    const outputs = flow.nodes.filter(n => n.type === 'textOutput')

    updateNodeData(id, {
      flowName,
      inputMappings: inputs.map((n, i) => ({ handleId: `input_${i}`, subFlowNodeId: n.id })),
      outputMappings: outputs.map((n, i) => ({ handleId: `output_${i}`, subFlowNodeId: n.id })),
    })
  }

  return (
    <div className={`node-shell ${statusClass}`} style={{ width: (data as Record<string, unknown>).width as number ?? 256 }}>
      <NodeResizer minWidth={180} minHeight={100} isVisible={selected} />

      {/* Dynamic input handles */}
      {effectiveInputMappings.map((m, i) => (
        <Handle key={m.handleId} type="target" position={Position.Left} id={m.handleId}
          style={{
            background: PORT_COLORS.text, width: 10, height: 10,
            top: `${((i + 1) * 100) / (effectiveInputMappings.length + 1)}%`,
          }} />
      ))}

      <div className="node-header bg-purple-700 flex justify-between items-center"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 📦 Sub-Flow</span>
        <div className="flex items-center gap-1.5">
          {d.currentStep && d.status === 'running' && (
            <span className="text-[9px] text-yellow-300 animate-pulse truncate max-w-[80px]">{d.currentStep}</span>
          )}
          <span className={`text-base leading-none ${STATUS_COLOR[d.status]}`}>
            {STATUS_ICON[d.status]}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-400">Flow from Library</label>
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

          {flowInfo && (
            <div className="text-[10px] text-zinc-500">
              {flowInfo.nodeCount} nodes · {flowInfo.edgeCount} edges
            </div>
          )}

          {/* Port labels */}
          {(effectiveInputMappings.length > 0 || effectiveOutputMappings.length > 0) && (
            <div className="flex justify-between text-[10px] mt-1">
              <div className="flex flex-col gap-0.5 text-zinc-500">
                {effectiveInputMappings.map(m => {
                  const node = flowInfo?.inputs.find(n => n.id === m.subFlowNodeId)
                  const label = (node?.data as Record<string, unknown>)?.label || m.subFlowNodeId
                  return <span key={m.handleId}>← {String(label)}</span>
                })}
              </div>
              <div className="flex flex-col items-end gap-0.5 text-zinc-500">
                {effectiveOutputMappings.map(m => (
                  <span key={m.handleId}>out_{effectiveOutputMappings.indexOf(m)} →</span>
                ))}
              </div>
            </div>
          )}

          {!d.flowName && (
            <div className="text-[10px] text-zinc-500 italic">
              Save a flow to the Library first, then select it here.
            </div>
          )}

          {d.flowName && !flowInfo && (
            <div className="text-[10px] text-red-400">
              Flow "{d.flowName}" not found in library.
            </div>
          )}

          {/* Output preview */}
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

      {/* Dynamic output handles */}
      {effectiveOutputMappings.map((m, i) => (
        <Handle key={m.handleId} type="source" position={Position.Right} id={m.handleId}
          style={{
            background: PORT_COLORS.text, width: 10, height: 10,
            top: `${((i + 1) * 100) / (effectiveOutputMappings.length + 1)}%`,
          }} />
      ))}
      {/* Always have a default "out" handle for single-output compatibility */}
      {effectiveOutputMappings.length === 0 && (
        <Handle type="source" position={Position.Right} id="out"
          style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
      )}
    </div>
  )
}
