import { streamCompletion } from './openrouter'
import type { Node, Edge } from '@xyflow/react'
import type { ModelOption } from '../types/flow'

// ─── AI Architect ─────────────────────────────────────────────────────────────
// Takes a natural language description and generates a FlowFile (nodes + edges)
// using the same OpenRouter infrastructure the app already uses.
// The system prompt is effectively a "compiler spec" teaching the LLM how to
// produce valid canvas graphs.

const SYSTEM_PROMPT = `You are the AI Architect for LLM Flow Builder — a visual node-based LLM pipeline editor.

Your job: given a natural language description, output a valid JSON flow that can be loaded onto the canvas.

## OUTPUT FORMAT
Respond with ONLY a JSON object (no markdown, no backticks, no explanation):
{
  "nodes": [ ... ],
  "edges": [ ... ]
}

## NODE TYPES & DATA SCHEMAS

Each node has: { id, type, position: {x, y}, data: {...} }

### textInput
Data: { label: string, value: string }
Handles: source "out"
Use for: static text, user prompts, any input text

### systemPrompt
Data: { label: string, value: string }
Handles: source "out"
Use for: system instructions for a model

### model
Data: { model: string, systemPrompt: "", temperature: 0.7, output: "", status: "idle" }
Handles: target "user", target "system", source "out"
Use for: calling an LLM. Connect text to "user" handle, system prompt to "system" handle.
Model IDs: see MODEL CATALOG below for available models and their capabilities.
Choose models based on the task requirements:
- Need image input? Pick a model with "image" in input modalities
- Need tool use? Pick a model with "tools" capability
- Need cheap/free? Pick models with low cost or "ollama/" prefix (free, local)
- Need reasoning? Pick a model with "reasoning" capability
- Default safe choice: "openrouter/auto"
- Default free/local choice: "ollama/qwen3.5:27b"

### textOutput
Data: { value: "" }
Handles: target "in"
Use for: displaying final results

### concat
Data: { separator: "\\n\\n" }
Handles: target "a", target "b", source "out"
Use for: merging two text streams

### jsonExtract
Data: { path: string }
Handles: target "in", source "out"
Use for: extracting a value from JSON by dot-path (e.g. "data.items[0].name")

### promptTemplate
Data: { template: string }
Handles: target handles named after each {{variable}} in the template, source "out"
Use for: building prompts with variable substitution. Example template: "Summarize this {{topic}} for a {{audience}}"
IMPORTANT: target handle IDs must exactly match variable names (e.g. "topic", "audience")

### conditional
Data: { mode: "contains"|"regex"|"equals"|"not-empty", pattern: string }
Handles: target "in", source "true", source "false"
Use for: routing flow based on conditions

### httpRequest
Data: { method: "GET"|"POST"|"PUT"|"DELETE", url: string, headers: "", body: "" }
Handles: target "in", source "out"
Use for: fetching data from APIs

### codeRunner
Data: { code: string }
Handles: target "in", source "out"
Use for: custom JavaScript transforms. The code receives 'input' variable and must return a value.

### conversationBuffer
Data: { maxMessages: 20, messages: [] }
Handles: target "in", source "out"
Use for: accumulating conversation history across runs

### variableStore
Data: { varName: string, mode: "get"|"set" }
Handles: target "in" (only in "set" mode), source "out"
Use for: persistent key-value storage across runs

### note
Data: { text: string, color: "Yellow" }
No handles. Use for: annotations and comments on the canvas.

## EDGE FORMAT
{ id: "e1", source: "node-id", sourceHandle: "out", target: "node-id", targetHandle: "handle-id", animated: true }

## LAYOUT RULES
- Flow goes LEFT to RIGHT
- Space nodes ~250-300px apart horizontally
- Stagger vertically to avoid overlap (~120px between parallel nodes)
- Start the leftmost nodes at x:80, y:150
- Use descriptive IDs like "input-1", "model-1", "output-1", "template-1"

## EXAMPLES

User: "Simple chatbot that answers questions"
{
  "nodes": [
    { "id": "input-1", "type": "textInput", "position": {"x": 80, "y": 200}, "data": {"label": "Question", "value": "What is the capital of France?"} },
    { "id": "system-1", "type": "systemPrompt", "position": {"x": 80, "y": 50}, "data": {"label": "System", "value": "You are a helpful assistant. Answer questions clearly and concisely."} },
    { "id": "model-1", "type": "model", "position": {"x": 400, "y": 150}, "data": {"model": "openrouter/auto", "systemPrompt": "", "temperature": 0.7, "output": "", "status": "idle"} },
    { "id": "output-1", "type": "textOutput", "position": {"x": 720, "y": 200}, "data": {"value": ""} }
  ],
  "edges": [
    { "id": "e1", "source": "input-1", "sourceHandle": "out", "target": "model-1", "targetHandle": "user", "animated": true },
    { "id": "e2", "source": "system-1", "sourceHandle": "out", "target": "model-1", "targetHandle": "system", "animated": true },
    { "id": "e3", "source": "model-1", "sourceHandle": "out", "target": "output-1", "targetHandle": "in", "animated": true }
  ]
}

User: "Translate text to French and Spanish in parallel, then combine"
{
  "nodes": [
    { "id": "input-1", "type": "textInput", "position": {"x": 80, "y": 200}, "data": {"label": "Text to Translate", "value": "Hello, how are you today?"} },
    { "id": "sys-fr", "type": "systemPrompt", "position": {"x": 80, "y": 50}, "data": {"label": "French System", "value": "Translate the user's text to French. Output only the translation."} },
    { "id": "sys-es", "type": "systemPrompt", "position": {"x": 80, "y": 350}, "data": {"label": "Spanish System", "value": "Translate the user's text to Spanish. Output only the translation."} },
    { "id": "model-fr", "type": "model", "position": {"x": 400, "y": 100}, "data": {"model": "openrouter/auto", "systemPrompt": "", "temperature": 0.3, "output": "", "status": "idle"} },
    { "id": "model-es", "type": "model", "position": {"x": 400, "y": 300}, "data": {"model": "openrouter/auto", "systemPrompt": "", "temperature": 0.3, "output": "", "status": "idle"} },
    { "id": "combine-1", "type": "concat", "position": {"x": 700, "y": 200}, "data": {"separator": "\\n---\\n"} },
    { "id": "output-1", "type": "textOutput", "position": {"x": 1000, "y": 200}, "data": {"value": ""} }
  ],
  "edges": [
    { "id": "e1", "source": "input-1", "sourceHandle": "out", "target": "model-fr", "targetHandle": "user", "animated": true },
    { "id": "e2", "source": "sys-fr", "sourceHandle": "out", "target": "model-fr", "targetHandle": "system", "animated": true },
    { "id": "e3", "source": "input-1", "sourceHandle": "out", "target": "model-es", "targetHandle": "user", "animated": true },
    { "id": "e4", "source": "sys-es", "sourceHandle": "out", "target": "model-es", "targetHandle": "system", "animated": true },
    { "id": "e5", "source": "model-fr", "sourceHandle": "out", "target": "combine-1", "targetHandle": "a", "animated": true },
    { "id": "e6", "source": "model-es", "sourceHandle": "out", "target": "combine-1", "targetHandle": "b", "animated": true },
    { "id": "e7", "source": "combine-1", "sourceHandle": "out", "target": "output-1", "targetHandle": "in", "animated": true }
  ]
}

## CRITICAL RULES
1. ONLY output raw JSON — no markdown code fences, no commentary
2. Every edge must reference existing node IDs and valid handle IDs
3. Model nodes need "user" input at minimum; "system" is optional
4. TextOutput nodes need a "in" target handle
5. All edges should have animated: true
6. Use reasonable model choices — "openrouter/auto" is the safe default
7. Include helpful default values in textInput and systemPrompt nodes
8. For complex pipelines, add a Note node explaining the flow's purpose`

export interface GenerateFlowResult {
  nodes: Node[]
  edges: Edge[]
}

function buildModelCatalog(models: ModelOption[]): string {
  // Pick top ~40 most relevant models to keep prompt size manageable
  const priority = models.filter(m =>
    m.id.startsWith('ollama/') ||
    m.tags?.some(t => ['vision', 'reasoning', 'fast', 'cheap', 'free'].includes(t)) ||
    ['openrouter/auto', 'anthropic/claude-sonnet-4-6', 'openai/gpt-4o', 'google/gemini-2.5-pro-preview'].includes(m.id)
  ).slice(0, 40)

  // Fall back to curated list if nothing matched
  const list = priority.length > 5 ? priority : models.slice(0, 40)

  return list.map(m => {
    const parts = [m.id]
    if (m.inputModalities?.length) parts.push(`in:[${m.inputModalities.join(',')}]`)
    if (m.outputModalities?.length) parts.push(`out:[${m.outputModalities.join(',')}]`)
    if (m.capabilities?.length) parts.push(`can:[${m.capabilities.join(',')}]`)
    if (m.pricePer1M) parts.push(m.pricePer1M.input === 0 ? 'FREE' : `$${m.pricePer1M.input}/$${m.pricePer1M.output}/1M`)
    if (m.context) parts.push(`ctx:${m.context}`)
    return parts.join(' | ')
  }).join('\n')
}

export async function generateFlow(
  apiKey: string,
  description: string,
  model: string = 'openrouter/auto',
  onProgress?: (text: string) => void,
  availableModels?: ModelOption[],
): Promise<GenerateFlowResult> {
  const catalog = availableModels ? `\n\n## MODEL CATALOG\n${buildModelCatalog(availableModels)}` : ''
  const fullPrompt = SYSTEM_PROMPT + catalog

  return new Promise((resolve, reject) => {
    let accumulated = ''

    streamCompletion(
      apiKey,
      model,
      [
        { role: 'system', content: fullPrompt },
        { role: 'user', content: description },
      ],
      // onChunk
      (chunk) => {
        accumulated += chunk
        onProgress?.(accumulated)
      },
      // onDone
      (full) => {
        try {
          // Strip any markdown fences the model might add despite instructions
          let cleaned = full.trim()
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
          }
          const parsed = JSON.parse(cleaned)

          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            throw new Error('Response missing "nodes" or "edges" arrays')
          }

          resolve({ nodes: parsed.nodes, edges: parsed.edges })
        } catch (err) {
          reject(new Error(`Failed to parse flow JSON: ${err instanceof Error ? err.message : String(err)}`))
        }
      },
      // onError
      (errMsg) => {
        reject(new Error(errMsg))
      },
      0.4, // lower temperature for structured output
    )
  })
}
