import { useState, useEffect, useCallback, useMemo } from 'react'
import { useReactFlow, useOnSelectionChange } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { useFlowStore } from '../store/flowStore'

// ─── Selection Toolbar ────────────────────────────────────────────────────────
// Floating toolbar that appears above selected nodes.
// Single component approach — no per-node changes needed.

export function SelectionToolbar() {
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([])
  const { deleteElements } = useReactFlow()
  const { duplicateNodes, updateNodeData } = useFlowStore()

  useOnSelectionChange({
    onChange: useCallback(({ nodes }: { nodes: Node[] }) => {
      setSelectedNodes(nodes)
    }, []),
  })

  // Calculate bounding box center of selected nodes
  const position = useMemo(() => {
    if (selectedNodes.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity
    for (const n of selectedNodes) {
      minX = Math.min(minX, n.position.x)
      minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x + (n.measured?.width ?? 200))
    }
    return { x: (minX + maxX) / 2, y: minY }
  }, [selectedNodes])

  if (selectedNodes.length === 0 || !position) return null

  return (
    <div
      className="absolute z-10 flex gap-1 bg-zinc-800 border border-zinc-600 rounded-lg px-1.5 py-1 shadow-xl"
      style={{
        transform: `translate(-50%, -100%)`,
        left: position.x,
        top: position.y - 12,
        pointerEvents: 'all',
      }}
    >
      <button
        className="px-2 py-0.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
        title="Duplicate (Ctrl+D)"
        onClick={() => duplicateNodes(selectedNodes.map(n => n.id))}
      >
        📋
      </button>
      <button
        className="px-2 py-0.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
        title="Toggle Collapse"
        onClick={() => {
          for (const n of selectedNodes) {
            updateNodeData(n.id, { collapsed: !(n.data as Record<string, unknown>).collapsed })
          }
        }}
      >
        🔽
      </button>
      <div className="w-px bg-zinc-600 mx-0.5" />
      <button
        className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded transition-colors"
        title="Delete (Del)"
        onClick={() => deleteElements({ nodes: selectedNodes.map(n => ({ id: n.id })) })}
      >
        🗑️
      </button>
    </div>
  )
}
