import { type Node, type Edge } from '@xyflow/react'

// ─── Flow File Format ────────────────────────────────────────────────────────

export interface FlowFile {
  version: '1.0'
  name: string
  createdAt: string
  nodes: Node[]
  edges: Edge[]
}

// ─── Library (localStorage) ──────────────────────────────────────────────────

const LIBRARY_KEY = 'llm-flow-library'

export interface SavedFlow {
  name: string
  createdAt: string
  updatedAt: string
  nodes: Node[]
  edges: Edge[]
}

function readLibrary(): Record<string, SavedFlow> {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeLibrary(library: Record<string, SavedFlow>) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
}

// ─── Strip Runtime State ─────────────────────────────────────────────────────
// Matches the partialize logic in flowStore.ts — removes output, status, error

function stripRuntime(nodes: Node[]): Node[] {
  return nodes.map(n => {
    if (n.type === 'model') {
      return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined } }
    }
    if (n.type === 'textOutput') {
      return { ...n, data: { ...n.data, value: '' } }
    }
    if (n.type === 'jsonExtract' || n.type === 'conditional') {
      return { ...n, data: { ...n.data, output: '', error: undefined } }
    }
    if (n.type === 'evaluator') {
      return { ...n, data: { ...n.data, output: '', verdict: '', status: 'idle', error: undefined } }
    }
    if (n.type === 'subFlow') {
      return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, currentStep: '' } }
    }
    if (n.type === 'loop') {
      return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, iteration: 0, iterationLog: [] } }
    }
    if (n.type === 'modelRouter') {
      return { ...n, data: { ...n.data, output: '', status: 'idle', error: undefined, reasoning: '' } }
    }
    return n
  })
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function exportFlow(name: string, nodes: Node[], edges: Edge[]): FlowFile {
  return {
    version: '1.0',
    name,
    createdAt: new Date().toISOString(),
    nodes: stripRuntime(nodes),
    edges,
  }
}

export function downloadFlow(flow: FlowFile) {
  const json = JSON.stringify(flow, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${flow.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function flowToClipboard(flow: FlowFile): Promise<void> {
  return navigator.clipboard.writeText(JSON.stringify(flow, null, 2))
}

// ─── Import ─────────────────────────────────────────────────────────────────

export function validateFlowFile(data: unknown): FlowFile | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (obj.version !== '1.0') return null
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null
  if (typeof obj.name !== 'string') return null
  return data as FlowFile
}

export function importFlowFromJSON(json: string): FlowFile | null {
  try {
    const parsed = JSON.parse(json)
    return validateFlowFile(parsed)
  } catch {
    return null
  }
}

// ─── Library CRUD ───────────────────────────────────────────────────────────

export function saveToLibrary(name: string, nodes: Node[], edges: Edge[]) {
  const library = readLibrary()
  const now = new Date().toISOString()
  const existing = library[name]
  library[name] = {
    name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    nodes: stripRuntime(nodes),
    edges,
  }
  writeLibrary(library)
}

export function listLibrary(): SavedFlow[] {
  const library = readLibrary()
  return Object.values(library).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function loadFromLibrary(name: string): SavedFlow | null {
  const library = readLibrary()
  return library[name] ?? null
}

export function deleteFromLibrary(name: string) {
  const library = readLibrary()
  delete library[name]
  writeLibrary(library)
}
