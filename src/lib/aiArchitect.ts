const SYSTEM_PROMPT = `You are an AI that generates LLM flow graphs. Output ONLY valid JSON matching the FlowFile schema.

FlowFile schema:
{
  "version": 1,
  "nodes": [ Node[] ],
  "edges": [ Edge[] ]
}

Node types and their data schemas:
- textInput: { text: string } — handles: out(source)
- model: { model: string, systemPrompt: string, temperature: number, maxTokens: number } — handles: user(target), system(target), out(source)
- concat: { separator: string } — handles: in(target, multiple allowed), out(source)
- conditional: { condition: string } — handles: in(target), true(source), false(source)
- http: { url: string, method: string, headers: string, body: string } — handles: url(target), body(target), out(source)
- output: { label: string } — handles: in(target)

Node object shape: { id: string, type: string, position: { x: number, y: number }, data: {...} }
Edge object shape: { id: string, source: string, target: string, sourceHandle?: string, targetHandle?: string }

Rules:
- Use descriptive node IDs like "input-1", "model-1", "output-1"
- Position nodes left-to-right with ~250px spacing
- Connect nodes via edges using correct handle IDs
- System prompt handle is optional; use "user" handle for main user input
- For model nodes, always set model to "openai/gpt-4o-mini" unless specified otherwise
- Output only the JSON, no markdown or explanation
`

interface FlowFile {
  version: number
  nodes: {
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
  }[]
  edges: {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }[]
}

export async function generateFlow(
  description: string,
  apiKey: string,
  model = 'openai/gpt-4o-mini'
): Promise<FlowFile> {
  if (!apiKey) {
    throw new Error('API key required')
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Create a flow that: ${description}` },
      ],
      temperature: 0.3,
    }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error?.message ?? 'Failed to generate flow')
  const content = json.choices?.[0]?.message?.content ?? '{}'
  // Strip any markdown code blocks
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as FlowFile
}
