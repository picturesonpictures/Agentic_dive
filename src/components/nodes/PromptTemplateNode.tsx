import { useMemo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { PromptTemplateData } from '../../types/flow'

// Extracts unique {{variable}} names from a template string.
function extractVars(template: string): string[] {
  return [...new Set(Array.from(template.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]))]
}

export function PromptTemplateNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as PromptTemplateData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed

  const vars = useMemo(() => extractVars(d.template), [d.template])

  return (
    <div className="node-shell" style={{ width: (data as Record<string, unknown>).width as number ?? 256 }}>
      <NodeResizer minWidth={180} minHeight={80} isVisible={selected} />
      {/* Dynamic input handles — one per detected {{variable}} */}
      {vars.map((v, i) => (
        <Handle
          key={v}
          type="target"
          position={Position.Left}
          id={v}
          style={{
            background: PORT_COLORS.text,
            width: 10,
            height: 10,
            top: `${((i + 1) * 100) / (vars.length + 1)}%`,
          }}
        />
      ))}

      <div className="node-header bg-cyan-700"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 📝 Prompt Template</span>
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-2">
          <textarea
            className="node-input text-xs resize-y h-24 w-full"
            value={d.template}
            onChange={e => updateNodeData(id, { template: e.target.value })}
            placeholder="You are a {{role}}. Help me with {{topic}}."
          />

          {/* Port labels next to each dynamic handle */}
          {vars.length > 0 && (
            <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500 pl-1">
              {vars.map(v => (
                <span key={v}>&larr; {v}</span>
              ))}
            </div>
          )}

          {/* Variable badges */}
          {vars.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {vars.map(v => (
                <span
                  key={v}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-900 text-cyan-300"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          )}

          {vars.length === 0 && (
            <p className="text-[10px] text-zinc-500">
              Use {'{{variable}}'} syntax to create input ports
            </p>
          )}
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
