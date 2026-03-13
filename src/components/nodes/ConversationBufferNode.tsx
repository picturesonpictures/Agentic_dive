import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { useMemoryStore } from '../../store/memoryStore'
import { PORT_COLORS } from '../../types/flow'
import type { ConversationBufferData } from '../../types/flow'

// Accumulates messages across multiple Runs.
// Input: new message to append. Output: all accumulated messages joined.
// Persists independently via memoryStore — survives page reload AND flow changes.

export function ConversationBufferNode({ id, data }: NodeProps) {
  const d = data as unknown as ConversationBufferData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const messages = useMemoryStore(s => s.buffers[id] ?? [])
  const clearBuffer = useMemoryStore(s => s.clearBuffer)

  return (
    <div className="node-shell w-56">
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />

      <div className="node-header bg-indigo-700 flex justify-between items-center">
        <span>💬 Chat Buffer</span>
        <span className="text-[9px] text-indigo-300">{messages.length} msgs</span>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-400">Max messages</label>
          <input
            type="number"
            className="node-input text-xs w-16"
            value={d.maxMessages}
            min={1}
            max={100}
            onChange={e => updateNodeData(id, { maxMessages: parseInt(e.target.value) || 20 })}
          />
        </div>

        {/* Port label */}
        <div className="text-[10px] text-zinc-500 pl-1">
          ← new message to append
        </div>

        {/* Message preview */}
        {messages.length > 0 && (
          <div className="text-[11px] text-zinc-300 bg-zinc-900 rounded p-1.5 max-h-24 overflow-y-auto leading-relaxed">
            {messages.slice(-3).map((m, i) => (
              <div key={i} className="text-[10px] text-zinc-400 border-b border-zinc-800 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0 truncate">
                {m.slice(0, 80)}{m.length > 80 ? '…' : ''}
              </div>
            ))}
            {messages.length > 3 && (
              <div className="text-[9px] text-zinc-500 text-center">
                +{messages.length - 3} more
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => clearBuffer(id)}
          className="text-[10px] text-zinc-500 hover:text-red-400 text-left transition-colors"
        >
          ✕ Clear history
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
