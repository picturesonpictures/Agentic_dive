import { Handle, Position, NodeResizer } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ImageOutputData } from '../../types/flow'

// ─── Image Output Node ───────────────────────────────────────────────────────
// Displays an image received from the flow (vision output, generated image, etc.)

export function ImageOutputNode({ id, data, selected }: { id: string; data: Record<string, unknown>; selected?: boolean }) {
  const d = data as unknown as ImageOutputData
  const updateNodeData = useFlowStore(s => s.updateNodeData)
  const collapsed = !!(data as unknown as Record<string, unknown>).collapsed

  return (
    <div className="node-shell" style={{ width: (data as Record<string, unknown>).width as number ?? 288 }}>
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} />
      <div className="node-header bg-purple-600 flex items-center justify-between"
        onDoubleClick={() => updateNodeData(id, { collapsed: !collapsed })}>
        <span>{collapsed ? '▸' : '▾'} 🖼️ Image Output</span>
        {d.value && (
          <a
            href={d.value}
            download="output.png"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-purple-300 hover:text-white"
          >
            ⬇ Save
          </a>
        )}
      </div>

      {!collapsed && (
        <div className="p-2">
          {d.value ? (
            <div className="relative">
              <img
                src={d.value}
                className="w-full rounded object-contain bg-zinc-900 cursor-pointer"
                style={{ maxHeight: 256 }}
                onClick={() => window.open(d.value, '_blank')}
              />
              {d.width && d.height && (
                <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-zinc-300 px-1 rounded">
                  {d.width}×{d.height}
                </span>
              )}
            </div>
          ) : (
            <div className="h-24 bg-zinc-900 rounded flex items-center justify-center text-zinc-600 text-xs">
              No image yet — run the flow
            </div>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ width: 10, height: 10, background: PORT_COLORS.image }}
      />
    </div>
  )
}
