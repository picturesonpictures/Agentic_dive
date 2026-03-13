import type { Node, Edge } from '@xyflow/react'
import type { TextInputNodeData, ConcatNodeData, ModelNodeData, HttpNodeData, ConditionalNodeData } from '../types/flow'
import { useMemoryStore } from '../store/memoryStore'

type UpdateNodeFn = (id: string, data: Record<string, unknown>) => void

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>()
  const graph = new Map<string, string[]>()
  
  for (const node of nodes) {
    inDegree.set(node.id, 0)
    graph.set(node.id, [])
  }
  
  for (const edge of edges) {
    const targets = graph.get(edge.source) ?? []
    targets.push(edge.target)
    graph.set(edge.source, targets)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }
  
  const queue: Node[] = nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0)
  const sorted: Node[] = []
  
  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)
    for (const targetId of graph.get(node.id) ?? []) {
      const deg = (inDegree.get(targetId) ?? 1) - 1
      inDegree.set(targetId, deg)
      if (deg === 0) {
        const targetNode = nodes.find(n => n.id === targetId)
        if (targetNode) queue.push(targetNode)
      }
    }
  }
  
  return sorted
}

export function resolveEdgeValue(outputs: Map<string, string>, edge: Edge): string {
  // Check source:sourceHandle first (for multi-output nodes), then plain source
  if (edge.sourceHandle) {
    const keyed = outputs.get(`${edge.source}:${edge.sourceHandle}`)
    if (keyed !== undefined) return keyed
  }
  return outputs.get(edge.source) ?? ''
}

export async function runFlow(
  nodes: Node[],
  edges: Edge[],
  apiKey: string,
  updateNode: UpdateNodeFn,
): Promise<void> {
  const sorted = topologicalSort(nodes, edges)
  const outputs = new Map<string, string>()
  const memory = useMemoryStore.getState()
  memory.reset()

  for (const node of sorted) {
    if (node.type === 'textInput') {
      const data = node.data as unknown as TextInputNodeData
      const result = data.text
      outputs.set(node.id, result)
      updateNode(node.id, { output: result } as Record<string, unknown>)
    }

    else if (node.type === 'concat') {
      const data = node.data as unknown as ConcatNodeData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const parts = incomingEdges.map(e => resolveEdgeValue(outputs, e))
      const sep = data.separator.replace(/\\n/g, '\n')
      const result = parts.join(sep)
      outputs.set(node.id, result)
      updateNode(node.id, { output: result } as Record<string, unknown>)
    }

    else if (node.type === 'conditional') {
      const data = node.data as unknown as ConditionalNodeData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const input = edgeIn ? resolveEdgeValue(outputs, edgeIn) : ''
      let condition = false
      try {
        // Safe-ish eval using Function constructor
        const fn = new Function('input', `return !!(${data.condition})`)
        condition = fn(input)
      } catch {
        condition = false
      }
      const trueOutput = condition ? input : ''
      const falseOutput = condition ? '' : input
      outputs.set(`${node.id}:true`, trueOutput)
      outputs.set(`${node.id}:false`, falseOutput)
      outputs.set(node.id, input)
      updateNode(node.id, { trueOutput, falseOutput } as Record<string, unknown>)
    }

    else if (node.type === 'model') {
      const data = node.data as unknown as ModelNodeData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const userEdge = incomingEdges.find(e => e.targetHandle === 'user') ?? incomingEdges[0]
      const systemEdge = incomingEdges.find(e => e.targetHandle === 'system')
      const userInput = userEdge ? resolveEdgeValue(outputs, userEdge) : ''
      const systemOverride = systemEdge ? resolveEdgeValue(outputs, systemEdge) : ''
      const systemPrompt = systemOverride || data.systemPrompt
      
      if (!apiKey) {
        const err = 'No API key set. Please enter your OpenRouter API key.'
        outputs.set(node.id, err)
        updateNode(node.id, { output: err, status: 'error', error: err } as Record<string, unknown>)
        continue
      }

      updateNode(node.id, { status: 'running' } as Record<string, unknown>)
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
          },
          body: JSON.stringify({
            model: data.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userInput },
            ],
            temperature: data.temperature,
            max_tokens: data.maxTokens,
            stream: false,
          }),
        })
        const json = await response.json()
        if (!response.ok) {
          throw new Error(json.error?.message ?? `HTTP ${response.status}`)
        }
        const result = json.choices?.[0]?.message?.content ?? ''
        outputs.set(node.id, result)
        updateNode(node.id, { output: result, status: 'done' } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, `Error: ${msg}`)
        updateNode(node.id, { output: `Error: ${msg}`, status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    else if (node.type === 'http') {
      const data = node.data as unknown as HttpNodeData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const urlEdge = incomingEdges.find(e => e.targetHandle === 'url') ?? incomingEdges[0]
      const bodyEdge = incomingEdges.find(e => e.targetHandle === 'body')
      const url = urlEdge ? resolveEdgeValue(outputs, urlEdge) : data.url
      const body = bodyEdge ? resolveEdgeValue(outputs, bodyEdge) : data.body
      
      updateNode(node.id, { status: 'running' } as Record<string, unknown>)
      try {
        let headers: Record<string, string> = {}
        try { headers = JSON.parse(data.headers) } catch { /* ignore */ }
        const fetchOpts: RequestInit = {
          method: data.method,
          headers: { 'Content-Type': 'application/json', ...headers },
        }
        if (data.method !== 'GET' && body) {
          fetchOpts.body = body
        }
        const res = await fetch(url, fetchOpts)
        const text = await res.text()
        outputs.set(node.id, text)
        updateNode(node.id, { output: text, status: 'done' } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, `Error: ${msg}`)
        updateNode(node.id, { output: `Error: ${msg}`, status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    else if (node.type === 'output') {
      // node.data is typed as OutputNodeData but only the incoming edge value is used
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const result = edgeIn ? resolveEdgeValue(outputs, edgeIn) : ''
      outputs.set(node.id, result)
      updateNode(node.id, { output: result } as Record<string, unknown>)
    }
  }
}
