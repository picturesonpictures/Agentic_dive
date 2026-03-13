import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useFlowStore } from './store/flowStore'
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
import { NodePicker }        from './components/NodePicker'
import { ApiKeyBar }         from './components/ApiKeyBar'

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
}

export default function App() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore()

  // All connections allowed — incompatible types degrade gracefully via asText()
  const isValidConnection = useCallback<IsValidConnection>(
    () => true,
    [],
  )

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
            fitView
            colorMode="dark"
          >
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
                return '#52525b'
              }}
              style={{ background: '#18181b' }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
