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

// ─── History snapshot ─────────────────────────────────────────────────────────

interface Snapshot {
  nodes: Node[]
  edges: Edge[]
}

const MAX_HISTORY = 50

// ─── Store ────────────────────────────────────────────────────────────────────

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  apiKey: string
  isRunning: boolean

  // History (undo/redo)
  past: Snapshot[]
  future: Snapshot[]

  setApiKey: (key: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  updateNodeData: (id: string, patch: Record<string, unknown>) => void
  addNode: (type: string, position?: { x: number; y: number }) => string
  duplicateNodes: (nodeIds: string[]) => void
  loadFlow: (nodes: Node[], edges: Edge[]) => void
  run: () => Promise<void>

  // History actions
  pushSnapshot: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

let nodeCounter = 10

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: DEFAULT_NODES,
      edges: DEFAULT_EDGES,
      apiKey: '',
      isRunning: false,
      past: [],
      future: [],

      setApiKey: key => set({ apiKey: key }),

      // ── History helpers ─────────────────────────────────────────────────

      pushSnapshot: () => {
        const { nodes, edges, past } = get()
        const snapshot: Snapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        }
        set({
          past: [...past.slice(-(MAX_HISTORY - 1)), snapshot],
          future: [], // new mutation clears redo stack
        })
      },

      undo: () => {
        const { past, nodes, edges } = get()
        if (past.length === 0) return
        const prev = past[past.length - 1]
        const currentSnapshot: Snapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        }
        set(s => ({
          nodes: prev.nodes,
          edges: prev.edges,
          past: s.past.slice(0, -1),
          future: [...s.future, currentSnapshot],
        }))
      },

      redo: () => {
        const { future, nodes, edges } = get()
        if (future.length === 0) return
        const next = future[future.length - 1]
        const currentSnapshot: Snapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        }
        set(s => ({
          nodes: next.nodes,
          edges: next.edges,
          future: s.future.slice(0, -1),
          past: [...s.past, currentSnapshot],
        }))
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      // ── Node/edge changes ───────────────────────────────────────────────

      onNodesChange: changes => {
        // Snapshot before structural changes (remove)
        const hasRemove = changes.some(c => c.type === 'remove')
        if (hasRemove) get().pushSnapshot()
        set(s => {
          const newNodes = applyNodeChanges(changes, s.nodes)
          // Persist width into data so node components can read it from Zustand
          const dimChanges = changes.filter(
            c => c.type === 'dimensions' && (c as { resizing?: boolean }).resizing
          ) as Array<{ id: string; dimensions?: { width: number; height: number } }>
          if (dimChanges.length === 0) return { nodes: newNodes }
          return {
            nodes: newNodes.map(n => {
              const dc = dimChanges.find(c => c.id === n.id)
              if (!dc?.dimensions) return n
              return { ...n, data: { ...n.data, width: dc.dimensions.width } }
            }),
          }
        })
      },

      onEdgesChange: changes => {
        const hasRemove = changes.some(c => c.type === 'remove')
        if (hasRemove) get().pushSnapshot()
        set(s => ({ edges: applyEdgeChanges(changes, s.edges) }))
      },

      onConnect: connection => {
        get().pushSnapshot()
        set(s => ({ edges: addEdge({ ...connection, animated: true }, s.edges) }))
      },

      updateNodeData: (id, patch) =>
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        })),

      addNode: (type, position) => {
        get().pushSnapshot()
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
          // Agentic nodes
          evaluator:      { model: 'openrouter/auto', temperature: 0.2, output: '', verdict: '', status: 'idle' },
          subFlow:        { flowName: '', inputMappings: [], outputMappings: [], output: '', status: 'idle' },
          loop:           { flowName: '', maxIterations: 5, breakMode: 'evaluator', breakPattern: '', evaluatorModel: 'openrouter/auto', inputMappings: [], outputMappings: [], feedbackOutputHandle: '', feedbackInputHandle: '', output: '', status: 'idle', iteration: 0, iterationLog: [] },
          modelRouter:    { routingMode: 'rule-based', rules: [], fallbackModel: 'openrouter/auto', routerModel: 'openrouter/auto', routerTemperature: 0.3, output: '', status: 'idle' },
        }
        const node: Node = {
          id,
          type,
          position: position ?? { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
          data: defaults[type] ?? {},
        }
        set(s => ({ nodes: [...s.nodes, node] }))
        return id
      },

      duplicateNodes: (nodeIds: string[]) => {
        get().pushSnapshot()
        const { nodes, edges } = get()
        const selected = nodes.filter(n => nodeIds.includes(n.id))
        if (selected.length === 0) return

        const idMap = new Map<string, string>()
        const newNodes: Node[] = selected.map(n => {
          const newId = `${n.type}-${++nodeCounter}`
          idMap.set(n.id, newId)
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + 40, y: n.position.y + 40 },
            data: { ...n.data },
            selected: false,
          }
        })

        // Duplicate edges between selected nodes
        const newEdges: Edge[] = edges
          .filter(e => idMap.has(e.source) && idMap.has(e.target))
          .map(e => ({
            ...e,
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
          }))

        set(s => ({
          nodes: [...s.nodes, ...newNodes],
          edges: [...s.edges, ...newEdges],
        }))
      },

      loadFlow: (nodes, edges) => {
        get().pushSnapshot()
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
            if (n.type === 'evaluator') return { ...n, data: { ...n.data, output: '', verdict: '', status: 'idle', error: undefined } }
            if (n.type === 'subFlow') return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, currentStep: '' } }
            if (n.type === 'loop') return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, iteration: 0, iterationLog: [] } }
            if (n.type === 'modelRouter') return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, reasoning: '' } }
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
        // Clear history on rehydrate — stale snapshots reference old state
        state.past = []
        state.future = []
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
          if (n.type === 'evaluator')
            return { ...n, data: { ...n.data, output: '', verdict: '', status: 'idle', error: undefined } }
          if (n.type === 'subFlow')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, currentStep: '' } }
          if (n.type === 'loop')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, iteration: 0, iterationLog: [] } }
          if (n.type === 'modelRouter')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, reasoning: '' } }
          return n
        })
      },
      partialize: s => ({
        apiKey: s.apiKey,
        edges: s.edges,
        // Don't persist history — it's ephemeral session state
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
          if (n.type === 'evaluator')
            return { ...n, data: { ...n.data, output: '', verdict: '', status: 'idle', error: undefined } }
          if (n.type === 'subFlow')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, currentStep: '' } }
          if (n.type === 'loop')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, iteration: 0, iterationLog: [] } }
          if (n.type === 'modelRouter')
            return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, reasoning: '' } }
          return n
        }),
      }),
    },
  ),
)
