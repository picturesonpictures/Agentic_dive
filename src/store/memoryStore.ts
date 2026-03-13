import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Memory Store ────────────────────────────────────────────────────────────
// Persists across runs independently of the flow store.
// Used by Conversation Buffer and Variable Store nodes.

interface MemoryState {
  // Conversation buffers: keyed by node ID
  buffers: Record<string, string[]>

  // Variable store: global key-value pairs
  variables: Record<string, string>

  // Actions
  appendToBuffer: (nodeId: string, message: string, maxMessages: number) => void
  getBuffer: (nodeId: string) => string[]
  clearBuffer: (nodeId: string) => void

  setVariable: (name: string, value: string) => void
  getVariable: (name: string) => string
  deleteVariable: (name: string) => void
  listVariables: () => Record<string, string>
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      buffers: {},
      variables: {},

      appendToBuffer: (nodeId, message, maxMessages) => {
        set(s => {
          const current = s.buffers[nodeId] ?? []
          const updated = [...current, message].slice(-maxMessages)
          return { buffers: { ...s.buffers, [nodeId]: updated } }
        })
      },

      getBuffer: (nodeId) => get().buffers[nodeId] ?? [],

      clearBuffer: (nodeId) => {
        set(s => {
          const { [nodeId]: _, ...rest } = s.buffers
          return { buffers: rest }
        })
      },

      setVariable: (name, value) => {
        set(s => ({ variables: { ...s.variables, [name]: value } }))
      },

      getVariable: (name) => get().variables[name] ?? '',

      deleteVariable: (name) => {
        set(s => {
          const { [name]: _, ...rest } = s.variables
          return { variables: rest }
        })
      },

      listVariables: () => get().variables,
    }),
    {
      name: 'llm-flow-memory',
    },
  ),
)
