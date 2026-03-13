import { Handle, Position, type NodeProps } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import { PORT_COLORS } from '../../types/flow'
import type { TextOutputData } from '../../types/flow'

export function TextOutputNode({ data }: NodeProps) {
  const d = data as unknown as TextOutputData

  return (
    <div className="node-shell w-80">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }}
      />
      <div className="node-header bg-emerald-700">
        <span>📄 Output</span>
      </div>
      <div className="p-3 min-h-16 max-h-64 overflow-y-auto">
        {d.value ? (
          <div className="prose prose-invert prose-sm max-w-none text-zinc-200">
            <ReactMarkdown>{d.value}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-zinc-500 text-xs italic">Output will appear here…</p>
        )}
      </div>
    </div>
  )
}
