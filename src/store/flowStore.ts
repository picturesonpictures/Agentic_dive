import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type Node, type Edge,
  applyNodeChanges, applyEdgeChanges,
  type NodeChange, type EdgeChange,
  type Connection, addEdge,
} from '@xyflow/react'
import type { ModelNodeData } from '../types/flow'
import { runFlow } from '../lib/execution'
import { asText, type FlowValue } from '../lib/flowValue'

// ─── Default canvas ───────────────────────────────────────────────────────────

const DEFAULT_NODES: Node[] = [
  {
    id: 'input-1',
    type: 'textInput',
    position: { x: 80, y: 200 },
    data: { label: 'Prompt', value: 'Explain quantum entanglement in one sentence.' },
  },
  {
    id: 'model-1',
    type: 'model',
    position: { x: 380, y: 160 },
    data: {
      model: 'openrouter/auto',
      systemPrompt: '',
      temperature: 0.7,
      output: '',
      status: 'idle',
    },
  },
  {
    id: 'output-1',
    type: 'textOutput',
    position: { x: 720, y: 200 },
    data: { value: '' },
  },
]

const DEFAULT_EDGES: Edge[] = [
  { id: 'e1', source: 'input-1', target: 'model-1', targetHandle: 'user' },
  { id: 'e2', source: 'model-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
]

// ─── Store ────────────────────────────────────────────────────────────────────

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  apiKey: string
  isRunning: boolean

  setApiKey: (key: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  updateNodeData: (id: string, patch: Record<string, unknown>) => void
  addNode: (type: string) => void
  loadFlow: (nodes: Node[], edges: Edge[]) => void
  run: () => Promise<void>
}

let nodeCounter = 10

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: DEFAULT_NODES,
      edges: DEFAULT_EDGES,
      apiKey: '',
      isRunning: false,

      setApiKey: key => set({ apiKey: key }),

      onNodesChange: changes =>
        set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),

      onEdgesChange: changes =>
        set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),

      onConnect: connection =>
        set(s => ({ edges: addEdge({ ...connection, animated: true }, s.edges) })),

      updateNodeData: (id, patch) =>
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        })),

      addNode: type => {
        const id = `${type}-${++nodeCounter}`
        const defaults: Record<string, Record<string, unknown>> = {
          textInput:    { label: 'Text Input', value: '' },
          systemPrompt: { label: 'System Prompt', value: '' },
          model:        { model: 'openrouter/auto', systemPrompt: '', temperature: 0.7, output: '', status: 'idle', imageDetail: 'auto' },
          textOutput:   { value: '' },
          note:         { text: '', color: 'Yellow' },
          concat:       { separator: '\n\n' },
          jsonExtract:  { path: '' },
          promptTemplate: { template: 'You are a {{role}}. Help me with {{topic}}.' },
          conditional:    { mode: 'contains', pattern: '' },
          httpRequest:    { method: 'GET', url: '', headers: '', body: '' },
          codeRunner:     { code: '// Transform input\nreturn input.toUpperCase()' },
          conversationBuffer: { maxMessages: 20, messages: [] },
          variableStore:  { varName: '', mode: 'get' },
          // Multimodal nodes
          imageInput:     { label: 'Image', source: 'upload', url: '', dataUrl: '' },
          imageOutput:    { value: '' },
          audioInput:     { label: 'Audio', source: 'upload', dataUrl: '', mimeType: 'audio/mp3' },
          audioOutput:    { value: '', mimeType: 'audio/mp3' },
          fileInput:      { label: 'File', fileName: '', mimeType: '', dataUrl: '', extractedText: '' },
          imageGen:       { model: 'dall-e-3', size: '1024x1024', quality: 'standard', style: 'vivid', output: '', status: 'idle' },
          tts:            { model: 'tts-1', voice: 'alloy', speed: 1.0, output: '', status: 'idle' },
          stt:            { model: 'whisper-1', language: '', output: '', status: 'idle' },
        }
        const node: Node = {
          id,
          type,
          position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
          data: defaults[type] ?? {},
        }
        set(s => ({ nodes: [...s.nodes, node] }))
      },

      loadFlow: (nodes, edges) => {
        set({ nodes, edges, isRunning: false })
      },

      run: async () => {
        const { nodes, edges, apiKey, isRunning, updateNodeData } = get()
        if (isRunning) return
        if (!apiKey) { alert('Please enter your OpenRouter API key first.'); return }

        set({ isRunning: true })

        // Reset all runtime state before running
        set(s => ({
          nodes: s.nodes.map(n => {
            if (n.type === 'model') return { ...n, data: { ...n.data, output: '', status: 'idle' } }
            if (n.type === 'jsonExtract') return { ...n, data: { ...n.data, output: '', error: undefined } }
            if (n.type === 'conditional') return { ...n, data: { ...n.data, output: '', error: undefined } }
            if (n.type === 'httpRequest') return { ...n, data: { ...n.data, output: '', error: undefined, status: undefined } }
            if (n.type === 'codeRunner') return { ...n, data: { ...n.data, output: '', error: undefined } }
            if (n.type === 'imageGen') return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
            if (n.type === 'tts') return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
            if (n.type === 'stt') return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
            if (n.type === 'imageOutput') return { ...n, data: { ...n.data, value: '' } }
            if (n.type === 'audioOutput') return { ...n, data: { ...n.data, value: '' } }
            if (n.type === 'fileInput') return { ...n, data: { ...n.data, extractedText: '', error: undefined } }
            return n
          }),
        }))

        const outputs = await runFlow(
          nodes, edges, apiKey,
          (id, patch) => updateNodeData(id, patch as Record<string, unknown>),
        )

        // Write final outputs into display nodes
        set(s => ({
          nodes: s.nodes.map(n => {
            // Text output — extract text from FlowValue
            if (n.type === 'textOutput') {
              const incoming = edges.find(e => e.target === n.id)
              if (!incoming) return n
              const compositeKey = incoming.sourceHandle ? `${incoming.source}:${incoming.sourceHandle}` : ''
              const fv: FlowValue | undefined = (compositeKey ? outputs.get(compositeKey) : undefined) || outputs.get(incoming.source)
              const val = fv ? asText(fv) : ''
              return { ...n, data: { ...n.data, value: val } }
            }
            return n
          }),
          isRunning: false,
        }))
      },
    }),
    {
      name: 'llm-flow',
      onRehydrateStorage: () => state => {
        if (!state) return
        state.isRunning = false
        state.nodes = state.nodes.map(n => {
          if (n.type === 'model')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'textOutput')
            return { ...n, data: { ...n.data, value: '' } }
          if (n.type === 'jsonExtract')
            return { ...n, data: { ...n.data, output: '', error: undefined } }
          if (n.type === 'conditional')
            return { ...n, data: { ...n.data, output: '', error: undefined } }
          if (n.type === 'httpRequest')
            return { ...n, data: { ...n.data, output: '', error: undefined, status: undefined } }
          if (n.type === 'codeRunner')
            return { ...n, data: { ...n.data, output: '', error: undefined } }
          if (n.type === 'imageGen')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'tts')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'stt')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'imageOutput')
            return { ...n, data: { ...n.data, value: '' } }
          if (n.type === 'audioOutput')
            return { ...n, data: { ...n.data, value: '' } }
          return n
        })
      },
      partialize: s => ({
        apiKey: s.apiKey,
        edges: s.edges,
        nodes: s.nodes.map(n => {
          if (n.type === 'model')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'textOutput')
            return { ...n, data: { ...n.data, value: '' } }
          if (n.type === 'jsonExtract')
            return { ...n, data: { ...n.data, output: '', error: undefined } }
          if (n.type === 'conditional')
            return { ...n, data: { ...n.data, output: '', error: undefined } }
          if (n.type === 'httpRequest')
            return { ...n, data: { ...n.data, output: '', error: undefined, status: undefined } }
          if (n.type === 'codeRunner')
            return { ...n, data: { ...n.data, output: '', error: undefined } }
          if (n.type === 'imageGen')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'tts')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'stt')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
          if (n.type === 'imageOutput')
            return { ...n, data: { ...n.data, value: '' } }
          if (n.type === 'audioOutput')
            return { ...n, data: { ...n.data, value: '' } }
          return n
        }),
      }),
    },
  ),
)
