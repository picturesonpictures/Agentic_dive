import { useState } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { HttpRequestData } from '../../types/flow'

// Makes HTTP requests using browser fetch(). Useful for calling APIs,
// webhooks, or fetching data to feed into the pipeline.

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400', POST: 'text-blue-400', PUT: 'text-yellow-400', DELETE: 'text-red-400',
}

export function HttpRequestNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as HttpRequestData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const [expanded, setExpanded] = useState(false)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed

  return (
    <div className="node-shell" style={{ width: (data as Record<string, unknown>).width as number ?? 256 }}>
      <NodeResizer minWidth={180} minHeight={80} isVisible={selected} />
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />

      <div className="node-header bg-pink-700 flex justify-between items-center"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 🌐 HTTP Request</span>
        {d.status !== undefined && (
          <span className={`text-[10px] font-mono ${
            d.status >= 200 && d.status < 300 ? 'text-green-300' :
            d.status >= 400 ? 'text-red-300' : 'text-yellow-300'
          }`}>
            {d.status}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="p-2 flex flex-col gap-1.5">
          {/* Method + URL */}
          <div className="flex gap-1">
            <select
              className="node-input text-xs w-20 shrink-0"
              value={d.method}
              onChange={e => updateNodeData(id, { method: e.target.value })}
            >
              {METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              className="node-input text-xs flex-1"
              value={d.url}
              onChange={e => updateNodeData(id, { url: e.target.value })}
              placeholder="https://api.example.com/data"
            />
          </div>

          {/* Method badge */}
          <span className={`text-[9px] font-mono ${METHOD_COLORS[d.method] ?? 'text-zinc-400'}`}>
            {d.method} request
          </span>

          {/* Port label */}
          <div className="text-[10px] text-zinc-500 pl-1">
            ← body / URL override (optional)
          </div>

          {/* Expandable config */}
          <button
            className="text-[10px] text-zinc-400 hover:text-zinc-200 text-left"
            onClick={() => setExpanded(x => !x)}
          >
            {expanded ? '▾ hide config' : '▸ headers & body'}
          </button>

          {expanded && (
            <div className="flex flex-col gap-1.5">
              <div>
                <label className="text-[10px] text-zinc-400">Headers (JSON)</label>
                <textarea
                  className="node-input text-xs resize-none h-14 w-full font-mono"
                  value={d.headers}
                  onChange={e => updateNodeData(id, { headers: e.target.value })}
                  placeholder='{"Content-Type": "application/json"}'
                />
              </div>
              {(d.method === 'POST' || d.method === 'PUT') && (
                <div>
                  <label className="text-[10px] text-zinc-400">Body</label>
                  <textarea
                    className="node-input text-xs resize-none h-14 w-full font-mono"
                    value={d.body}
                    onChange={e => updateNodeData(id, { body: e.target.value })}
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
            </div>
          )}

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
      )}

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
