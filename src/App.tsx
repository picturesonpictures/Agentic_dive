import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type IsValidConnection,
  type OnConnectStart,
  type OnConnectEnd,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useFlowStore } from './store/flowStore'
import { useUIStore } from './store/uiStore'
import { TextInputNode }    from './components/nodes/TextInputNode'
import { ModelNode }         from './components/nodes/ModelNode'
import { TextOutputNode }    from './components/nodes/TextOutputNode'
import { SystemPromptNode }  from './components/nodes/SystemPromptNode'
import { NoteNode }          from './components/nodes/NoteNode'
import { ConcatNode }        from './components/nodes/ConcatNode'
import { JsonExtractNode }   from './components/nodes/JsonExtractNode'
import { PromptTemplateNode } from './components/nodes/PromptTemplateNode'
import { ConditionalNode }    from './components/nodes/ConditionalNode'
import { HttpRequestNode }   from './components/nodes/HttpRequestNode'
import { CodeRunnerNode }    from './components/nodes/CodeRunnerNode'
import { ConversationBufferNode } from './components/nodes/ConversationBufferNode'
import { VariableStoreNode } from './components/nodes/VariableStoreNode'
// Multimodal nodes
import { ImageInputNode }    from './components/nodes/ImageInputNode'
import { ImageOutputNode }   from './components/nodes/ImageOutputNode'
// Agentic nodes
import { EvaluatorNode }     from './components/nodes/EvaluatorNode'
import { SubFlowNode }       from './components/nodes/SubFlowNode'
import { LoopNode }          from './components/nodes/LoopNode'
import { ModelRouterNode }   from './components/nodes/ModelRouterNode'
// UX components
import { NodePicker }        from './components/NodePicker'
import { ApiKeyBar }         from './components/ApiKeyBar'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { ContextMenu }       from './components/ContextMenu'
import { SelectionToolbar }  from './components/SelectionToolbar'
import { QuickConnectMenu }  from './components/QuickConnectMenu'

const nodeTypes = {
  textInput:    TextInputNode,
  model:        ModelNode,
  textOutput:   TextOutputNode,
  systemPrompt: SystemPromptNode,
  note:         NoteNode,
  concat:       ConcatNode,
  jsonExtract:  JsonExtractNode,
  promptTemplate: PromptTemplateNode,
  conditional:    ConditionalNode,
  httpRequest:    HttpRequestNode,
  codeRunner:     CodeRunnerNode,
  conversationBuffer: ConversationBufferNode,
  variableStore:  VariableStoreNode,
  // Multimodal
  imageInput:     ImageInputNode,
  imageOutput:    ImageOutputNode,
  // Agentic
  evaluator:      EvaluatorNode,
  subFlow:        SubFlowNode,
  loop:           LoopNode,
  modelRouter:    ModelRouterNode,
}

export default function App() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore()
  const snapEnabled = useUIStore(s => s.snapEnabled)
  const { openContextMenu, closeContextMenu, openQuickConnect } = useUIStore()

  // Track pending connection for quick-connect
  const pendingConnRef = useRef<{ nodeId: string; handleId: string; handleType: 'source' | 'target' } | null>(null)

  // All connections allowed — incompatible types degrade gracefully via asText()
  const isValidConnection = useCallback<IsValidConnection>(
    () => true,
    [],
  )

  // ── Context menu handlers ─────────────────────────────────────────────

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: { id: string }) => {
    event.preventDefault()
    openContextMenu({ type: 'node', x: event.clientX, y: event.clientY, targetId: node.id })
  }, [openContextMenu])

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: { id: string }) => {
    event.preventDefault()
    openContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, targetId: edge.id })
  }, [openContextMenu])

  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault()
    openContextMenu({ type: 'pane', x: event.clientX, y: event.clientY })
  }, [openContextMenu])

  // ── Quick-connect: drag wire to empty space ───────────────────────────

  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    pendingConnRef.current = {
      nodeId: params.nodeId ?? '',
      handleId: params.handleId ?? '',
      handleType: params.handleType ?? 'source',
    }
  }, [])

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    // Only trigger if the connection wasn't completed (dropped on empty space)
    const target = (event as MouseEvent).target as HTMLElement
    if (target?.classList?.contains('react-flow__pane') && pendingConnRef.current) {
      const mouseEvent = event as MouseEvent
      openQuickConnect({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        connection: pendingConnRef.current,
      })
    }
    pendingConnRef.current = null
  }, [openQuickConnect])

  // Close menus when clicking on the pane
  const onPaneClick = useCallback(() => {
    closeContextMenu()
  }, [closeContextMenu])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <ApiKeyBar />
      <div className="flex flex-1 overflow-hidden">
        <NodePicker />
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            // Context menu
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={onPaneClick}
            // Quick-connect
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            // Snap-to-grid
            snapToGrid={snapEnabled}
            snapGrid={[20, 20]}
            // Edge defaults
            defaultEdgeOptions={{ type: 'smoothstep', style: { strokeWidth: 2 }, animated: true }}
            fitView
            colorMode="dark"
          >
            <KeyboardShortcuts />
            <SelectionToolbar />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#3f3f46" />
            <Controls />
            <MiniMap
              nodeColor={n => {
                if (n.type === 'model')      return '#7c3aed'
                if (n.type === 'textInput')  return '#2563eb'
                if (n.type === 'textOutput') return '#059669'
                if (n.type === 'jsonExtract') return '#e11d48'
                if (n.type === 'promptTemplate') return '#0891b2'
                if (n.type === 'conditional') return '#ea580c'
                if (n.type === 'httpRequest') return '#db2777'
                if (n.type === 'codeRunner') return '#65a30d'
                if (n.type === 'conversationBuffer') return '#4f46e5'
                if (n.type === 'variableStore') return '#d97706'
                // Multimodal
                if (n.type === 'imageInput')  return '#9333ea'
                if (n.type === 'imageOutput') return '#7c3aed'
                // Agentic
                if (n.type === 'evaluator')   return '#a16207'
                if (n.type === 'subFlow')     return '#7e22ce'
                if (n.type === 'loop')        return '#7e22ce'
                if (n.type === 'modelRouter') return '#0369a1'
                return '#52525b'
              }}
              style={{ background: '#18181b' }}
            />
            <ContextMenu />
          </ReactFlow>
        </div>
      </div>
      {/* QuickConnectMenu doesn't need ReactFlow context, safe outside */}
      <QuickConnectMenu />
    </div>
  )
}
