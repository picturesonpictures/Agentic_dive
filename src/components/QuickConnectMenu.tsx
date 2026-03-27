import { useEffect, useCallback } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFlowStore } from '../store/flowStore'

// ─── Quick-Connect Menu ───────────────────────────────────────────────────────
// The "killer feature": drag a wire from a handle into empty space →
// a node creation menu appears → click to create + auto-connect.
// This is how Blender and ComfyUI work.

const QUICK_CONNECT_NODES = [
  { group: 'Inputs', nodes: [
    { type: 'textInput',    label: '✏️ Text Input' },
    { type: 'systemPrompt', label: '⚙️ System Prompt' },
    { type: 'imageInput',   label: '🖼️ Image Input' },
  ]},
  { group: 'Models', nodes: [
    { type: 'model', label: '🤖 Model' },
  ]},
  { group: 'Outputs', nodes: [
    { type: 'textOutput',  label: '📄 Output' },
    { type: 'imageOutput', label: '🖼️ Image Output' },
  ]},
  { group: 'Data', nodes: [
    { type: 'jsonExtract',    label: '🔍 JSON Extract' },
    { type: 'promptTemplate', label: '📝 Prompt Template' },
    { type: 'httpRequest',    label: '🌐 HTTP Request' },
  ]},
  { group: 'Logic', nodes: [
    { type: 'conditional', label: '🔀 Conditional' },
    { type: 'codeRunner',  label: '⚡ Code Runner' },
  ]},
  { group: 'Other', nodes: [
    { type: 'concat',             label: '🔗 Combine Text' },
    { type: 'conversationBuffer', label: '💬 Chat Buffer' },
    { type: 'variableStore',      label: '📦 Variable' },
  ]},
]

// Default handle IDs per node type for auto-connection
const DEFAULT_TARGET_HANDLE: Record<string, string> = {
  model: 'user',
  textOutput: 'in',
  imageOutput: 'in',
  concat: 'a',
  jsonExtract: 'in',
  conditional: 'in',
  httpRequest: 'in',
  codeRunner: 'in',
  conversationBuffer: 'in',
  variableStore: 'in',
  promptTemplate: 'in',
}

const DEFAULT_SOURCE_HANDLE: Record<string, string> = {
  textInput: 'out',
  systemPrompt: 'out',
  model: 'out',
  concat: 'out',
  jsonExtract: 'out',
  promptTemplate: 'out',
  conditional: 'true',
  httpRequest: 'out',
  codeRunner: 'out',
  conversationBuffer: 'out',
  variableStore: 'out',
  imageInput: 'out',
}

export function QuickConnectMenu() {
  const quickConnect = useUIStore(s => s.quickConnect)
  const closeQuickConnect = useUIStore(s => s.closeQuickConnect)
  const { addNode } = useFlowStore()
  const onConnect = useFlowStore(s => s.onConnect)

  const handleClose = useCallback(() => closeQuickConnect(), [closeQuickConnect])

  useEffect(() => {
    if (!quickConnect) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    // Delay click handler to avoid closing immediately from the same click
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClose)
    }, 50)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', onKey)
    }
  }, [quickConnect, handleClose])

  if (!quickConnect) return null

  const { x, y, connection } = quickConnect
  const isDraggingFromSource = connection.handleType === 'source'

  const handleNodeSelect = (type: string) => {
    // Create the new node at the drop position
    const newId = addNode(type, { x: x - 100, y: y - 30 })

    // Auto-connect
    if (isDraggingFromSource) {
      // Dragged FROM a source handle → connect TO the new node's target handle
      const targetHandle = DEFAULT_TARGET_HANDLE[type] ?? 'in'
      onConnect({
        source: connection.nodeId,
        sourceHandle: connection.handleId,
        target: newId,
        targetHandle,
      })
    } else {
      // Dragged FROM a target handle → connect FROM the new node's source handle
      const sourceHandle = DEFAULT_SOURCE_HANDLE[type] ?? 'out'
      onConnect({
        source: newId,
        sourceHandle,
        target: connection.nodeId,
        targetHandle: connection.handleId,
      })
    }

    handleClose()
  }

  return (
    <div
      className="context-menu max-h-80 overflow-y-auto"
      style={{ left: x, top: y, position: 'fixed' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="context-menu-label">
        {isDraggingFromSource ? 'Connect to…' : 'Connect from…'}
      </div>
      {QUICK_CONNECT_NODES.map(group => (
        <div key={group.group}>
          <div className="context-menu-label">{group.group}</div>
          {group.nodes.map(n => (
            <div
              key={n.type}
              className="context-menu-item"
              onClick={() => handleNodeSelect(n.type)}
            >
              {n.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
