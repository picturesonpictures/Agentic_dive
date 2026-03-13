import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Node, Edge } from '@xyflow/react'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Connection, NodeChange, EdgeChange } from '@xyflow/react'
import { runFlow } from '../lib/execution'

export interface FlowState {
  nodes: Node[]
  edges: Edge[]
  apiKey: string
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  updateNodeData: (id: string, data: Record<string, unknown>) => void
  setApiKey: (key: string) => void
  run: () => Promise<void>
  loadFlow: (nodes: Node[], edges: Edge[]) => void
}

type PartializeNode = Node & { data: Record<string, unknown> }

function stripRuntimeState(n: PartializeNode): PartializeNode {
  if (n.type === 'textInput')
    return { ...n, data: { ...n.data, output: '' } }
  if (n.type === 'concat')
    return { ...n, data: { ...n.data, output: '' } }
  if (n.type === 'model')
    return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
  if (n.type === 'http')
    return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
  if (n.type === 'conditional')
    return { ...n, data: { ...n.data, trueOutput: undefined, falseOutput: undefined } }
  if (n.type === 'output')
    return { ...n, data: { ...n.data, output: '' } }
  return n
}

let nodeCounter = 0

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      apiKey: '',

      onNodesChange: (changes) => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
      onEdgesChange: (changes) => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
      onConnect: (connection) => set(s => ({ edges: addEdge({ ...connection, id: `e-${Date.now()}` }, s.edges) })),

      addNode: (type, position) => {
        nodeCounter++
        const defaults: Record<string, Record<string, unknown>> = {
          textInput: { text: 'Hello world', output: '' },
          concat: { separator: '\\n', output: '' },
          model: { model: 'openai/gpt-4o-mini', systemPrompt: 'You are a helpful assistant.', temperature: 0.7, maxTokens: 1000, output: '', status: 'idle' },
          http: { url: 'https://api.example.com', method: 'GET', headers: '{}', body: '', output: '', status: 'idle' },
          conditional: { condition: 'input.length > 0', trueOutput: undefined, falseOutput: undefined },
          output: { label: 'Output', output: '' },
        }
        const data = defaults[type] ?? {}
        const node: Node = {
          id: `${type}-${nodeCounter}-${Date.now()}`,
          type,
          position,
          data,
        }
        set(s => ({ nodes: [...s.nodes, node] }))
      },

      updateNodeData: (id, data) => set(s => ({
        nodes: s.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
      })),

      setApiKey: (key) => set({ apiKey: key }),

      run: async () => {
        const { edges, apiKey, updateNodeData } = get()
        // Reset runtime state before run
        set(s => ({
          nodes: s.nodes.map(n => stripRuntimeState(n as PartializeNode)),
        }))
        await runFlow(
          get().nodes,
          edges,
          apiKey,
          (id, data) => updateNodeData(id, data),
        )
      },

      loadFlow: (nodes, edges) => set({ nodes, edges }),
    }),
    {
      name: 'flow-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes.map(n => stripRuntimeState(n as PartializeNode)),
        edges: state.edges,
        apiKey: state.apiKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.nodes = state.nodes.map(n => stripRuntimeState(n as PartializeNode))
        }
      },
    }
  )
)
