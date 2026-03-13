import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { CodeRunnerData } from '../../types/flow'

// Runs JavaScript code with `input` as a variable.
// The code should return a value (last expression or explicit `return`).
// Useful for text transformations, parsing, formatting, and computation.

export function CodeRunnerNode({ id, data }: NodeProps) {
  const d = data as unknown as CodeRunnerData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-72">
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />

      <div className="node-header bg-lime-700">
        <span>⚡ Code Runner</span>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-400">
          JavaScript — <code className="text-lime-400">input</code> is the incoming text
        </label>
        <textarea
          className="node-input text-xs resize-y h-28 w-full font-mono leading-relaxed"
          value={d.code}
          onChange={e => updateNodeData(id, { code: e.target.value })}
          placeholder={`// Example: parse JSON and extract field\nconst data = JSON.parse(input)\nreturn data.name.toUpperCase()`}
          spellCheck={false}
        />

        {/* Port label */}
        <div className="text-[10px] text-zinc-500 pl-1">
          ← input (available as <code className="text-lime-400">input</code> variable)
        </div>

        {/* Output preview */}
        {d.output && !d.error && (
          <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-20 overflow-y-auto whitespace-pre-wrap leading-relaxed break-all font-mono">
            {d.output.slice(0, 500)}{d.output.length > 500 ? '…' : ''}
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
