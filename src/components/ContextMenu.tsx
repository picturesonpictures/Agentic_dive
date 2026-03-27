import { useEffect, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useUIStore } from '../store/uiStore'
import { useFlowStore } from '../store/flowStore'

// ─── Context Menu ─────────────────────────────────────────────────────────────
// Right-click context menu for nodes, edges, and canvas.

const NODE_TYPES_MENU = [
  { type: 'textInput',    label: '✏️ Text Input' },
  { type: 'systemPrompt', label: '⚙️ System Prompt' },
  { type: 'model',        label: '🤖 Model' },
  { type: 'textOutput',   label: '📄 Output' },
  { type: 'concat',       label: '🔗 Combine Text' },
  { type: 'jsonExtract',  label: '🔍 JSON Extract' },
  { type: 'promptTemplate', label: '📝 Prompt Template' },
  { type: 'conditional',  label: '🔀 Conditional' },
  { type: 'httpRequest',  label: '🌐 HTTP Request' },
  { type: 'codeRunner',   label: '⚡ Code Runner' },
  { type: 'imageInput',   label: '🖼️ Image Input' },
  { type: 'imageOutput',  label: '🖼️ Image Output' },
]

export function ContextMenu() {
  const contextMenu = useUIStore(s => s.contextMenu)
  const closeContextMenu = useUIStore(s => s.closeContextMenu)
  const { deleteElements, fitView, setNodes, getNodes } = useReactFlow()
  const { duplicateNodes, addNode, updateNodeData } = useFlowStore()

  // Close on click outside, scroll, or Escape
  const handleClose = useCallback(() => closeContextMenu(), [closeContextMenu])

  useEffect(() => {
    if (!contextMenu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('click', handleClose)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [contextMenu, handleClose])

  if (!contextMenu) return null

  const { type, x, y, targetId } = contextMenu

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Node context ────────────────────────────────────────────────── */}
      {type === 'node' && targetId && (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              duplicateNodes([targetId])
              handleClose()
            }}
          >
            📋 Duplicate
            <span className="ml-auto text-zinc-500 text-[10px]">Ctrl+D</span>
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              const node = getNodes().find(n => n.id === targetId)
              if (node) {
                updateNodeData(targetId, { collapsed: !(node.data as Record<string, unknown>).collapsed })
              }
              handleClose()
            }}
          >
            🔽 Toggle Collapse
          </div>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item text-red-400 hover:!text-red-300"
            onClick={() => {
              deleteElements({ nodes: [{ id: targetId }] })
              handleClose()
            }}
          >
            🗑️ Delete
            <span className="ml-auto text-zinc-500 text-[10px]">Del</span>
          </div>
        </>
      )}

      {/* ── Edge context ────────────────────────────────────────────────── */}
      {type === 'edge' && targetId && (
        <>
          <div
            className="context-menu-item text-red-400 hover:!text-red-300"
            onClick={() => {
              deleteElements({ edges: [{ id: targetId }] })
              handleClose()
            }}
          >
            🗑️ Delete Edge
          </div>
        </>
      )}

      {/* ── Pane (canvas) context ───────────────────────────────────────── */}
      {type === 'pane' && (
        <>
          <div className="context-menu-label">Add Node</div>
          {NODE_TYPES_MENU.map(n => (
            <div
              key={n.type}
              className="context-menu-item"
              onClick={() => {
                addNode(n.type, { x: x - 100, y: y - 50 })
                handleClose()
              }}
            >
              {n.label}
            </div>
          ))}
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            onClick={() => {
              setNodes(ns => ns.map(n => ({ ...n, selected: true })))
              handleClose()
            }}
          >
            ☑️ Select All
            <span className="ml-auto text-zinc-500 text-[10px]">Ctrl+A</span>
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              fitView({ duration: 300 })
              handleClose()
            }}
          >
            🔲 Fit View
            <span className="ml-auto text-zinc-500 text-[10px]">F</span>
          </div>
        </>
      )}
    </div>
  )
}
