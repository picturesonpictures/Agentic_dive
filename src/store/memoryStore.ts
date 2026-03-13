import { create } from 'zustand'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface MemoryState {
  variables: Record<string, string>
  buffers: Record<string, Message[]>
  setVariable: (key: string, value: string) => void
  getVariable: (key: string) => string
  appendToBuffer: (nodeId: string, message: Message, maxMessages?: number) => void
  getBuffer: (nodeId: string) => Message[]
  clearBuffer: (nodeId: string) => void
  reset: () => void
}

export const useMemoryStore = create<MemoryState>()((set, get) => ({
  variables: {},
  buffers: {},
  setVariable: (key, value) => set(s => ({ variables: { ...s.variables, [key]: value } })),
  getVariable: (key) => get().variables[key] ?? '',
  appendToBuffer: (nodeId, message, maxMessages = 20) => set(s => {
    const buf = [...(s.buffers[nodeId] ?? []), message]
    return { buffers: { ...s.buffers, [nodeId]: buf.slice(-maxMessages) } }
  }),
  getBuffer: (nodeId) => get().buffers[nodeId] ?? [],
  clearBuffer: (nodeId) => set(s => ({ buffers: { ...s.buffers, [nodeId]: [] } })),
  reset: () => set({ variables: {}, buffers: {} }),
}))
