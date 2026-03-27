import { useEffect, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../store/flowStore'
import { useUIStore } from '../store/uiStore'

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
// Mounted inside <ReactFlow> to access the flow instance.
// Only fires when the canvas is focused (not when editing text inputs).

export function KeyboardShortcuts() {
  const { deleteElements, getNodes, setNodes, fitView } = useReactFlow()
  const { undo, redo, duplicateNodes, pushSnapshot } = useFlowStore()
  const toggleSnap = useUIStore(s => s.toggleSnap)

  const isEditing = useCallback(() => {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditing()) return

      const mod = e.ctrlKey || e.metaKey

      // Ctrl+Z — Undo
      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl+Shift+Z or Ctrl+Y — Redo
      if ((mod && e.shiftKey && e.key === 'z') || (mod && e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Delete / Backspace — Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const selected = getNodes().filter(n => n.selected)
        if (selected.length > 0) {
          deleteElements({ nodes: selected })
        }
        return
      }

      // Ctrl+D — Duplicate selected
      if (mod && e.key === 'd') {
        e.preventDefault()
        const selectedIds = getNodes().filter(n => n.selected).map(n => n.id)
        if (selectedIds.length > 0) {
          duplicateNodes(selectedIds)
        }
        return
      }

      // Ctrl+A — Select all
      if (mod && e.key === 'a') {
        e.preventDefault()
        setNodes(ns => ns.map(n => ({ ...n, selected: true })))
        return
      }

      // Escape — Deselect all
      if (e.key === 'Escape') {
        setNodes(ns => ns.map(n => ({ ...n, selected: false })))
        return
      }

      // F — Fit view
      if (e.key === 'f' && !mod) {
        e.preventDefault()
        fitView({ duration: 300 })
        return
      }

      // G — Toggle snap-to-grid
      if (e.key === 'g' && !mod) {
        e.preventDefault()
        toggleSnap()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditing, undo, redo, deleteElements, getNodes, setNodes, duplicateNodes, pushSnapshot, fitView, toggleSnap])

  return null
}
