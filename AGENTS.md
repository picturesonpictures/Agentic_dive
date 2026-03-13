# Agent Instructions — LLM Flow Builder

Universal instructions for any AI coding agent working on this project.
Read CLAUDE.md first for architecture overview and file map.

## Orientation

Before making any changes, read these files in order:
1. `src/types/flow.ts` — all data types and the model catalog
2. `src/store/flowStore.ts` — state management, node defaults, run logic
3. `src/lib/execution.ts` — how flows execute (topological sort + streaming)
4. `src/components/nodes/ConcatNode.tsx` — simplest node template to follow

## Task: Add a New Node Type

Follow these 8 steps exactly. Do not skip any.

### Step 1 — Data interface (`src/types/flow.ts`)
```ts
export interface MyNodeData {
  configField: string    // persists across sessions
  output?: string        // runtime-only (stripped on save)
}
```

### Step 2 — Component (`src/components/nodes/MyNode.tsx`)
```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { MyNodeData } from '../../types/flow'

export function MyNode({ id, data }: NodeProps) {
  const d = data as unknown as MyNodeData
  const updateNodeData = useFlowStore(s => s.updateNodeData)

  return (
    <div className="node-shell w-52">
      <Handle type="target" position={Position.Left} id="in"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
      <div className="node-header bg-COLOR-700">🔧 My Node</div>
      <div className="p-2">
        <input className="node-input text-xs" value={d.configField}
          onChange={e => updateNodeData(id, { configField: e.target.value })} />
      </div>
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: PORT_COLORS.text, width: 10, height: 10 }} />
    </div>
  )
}
```

### Step 3 — Default data (`src/store/flowStore.ts`)
In the `defaults` record inside `addNode()`:
```ts
myNode: { configField: 'default' },
```

If your node has runtime-only fields, add a strip case in `partialize`:
```ts
if (n.type === 'myNode')
  return { ...n, data: { ...n.data, output: '' } }
```

### Step 4 — Register (`src/App.tsx`)
```ts
import { MyNode } from './components/nodes/MyNode'
// Add to nodeTypes object:
myNode: MyNode,
```

### Step 5 — Picker entry (`src/components/NodePicker.tsx`)
```ts
{ type: 'myNode', label: '🔧 My Node', desc: 'What it does' }
```

### Step 6 — Execution logic (`src/lib/execution.ts`)
Inside the `for (const node of sorted)` loop:
```ts
if (node.type === 'myNode') {
  const data = node.data as unknown as MyNodeData
  const incomingEdges = edges.filter(e => e.target === node.id)
  const edgeIn = incomingEdges[0]
  const input = edgeIn ? resolveEdgeValue(outputs, edgeIn) : ''
  const result = /* transform input based on node config */
  outputs.set(node.id, result)
  updateNode(node.id, { output: result } as Record<string, unknown>)
}
```

### Step 7 — Runtime state stripping (`src/store/flowStore.ts`)
If your node has runtime-only fields (output, error, status), add strip cases in THREE places:
- `run()` reset block (before runFlow)
- `onRehydrateStorage` callback
- `partialize` function
```ts
if (n.type === 'myNode')
  return { ...n, data: { ...n.data, output: '', error: undefined } }
```

### Step 8 — MiniMap color (`src/App.tsx`)
```ts
if (n.type === 'myNode') return '#hexcolor'
```

## Task: Add Execution Logic for an Existing Node

**Where**: `src/lib/execution.ts`, inside the `for (const node of sorted)` loop.

**Pattern**:
1. Check `node.type === 'yourType'`
2. Find incoming edges: `edges.filter(e => e.target === node.id)`
3. Resolve input values: `resolveEdgeValue(outputs, edge)` (handles multi-output nodes)
4. If multiple inputs, distinguish by `edge.targetHandle` (e.g. "user" vs "system")
5. Compute result
6. Store: `outputs.set(node.id, result)`

For async nodes (model, http), call `updateNode(node.id, { status: 'running' })` before and `{ status: 'done' }` after.

## Task: Modify the Model Selector

The `MODELS` array in `src/types/flow.ts` is the curated fallback list. Live models are fetched from OpenRouter API via `src/lib/modelRegistry.ts` (cached 24h in localStorage). ModelNode.tsx uses the `useModels()` hook which merges curated + API models.

Each model follows the `ModelOption` interface:
```ts
{ id: string, label: string, group: string, context?: string, price?: string, tags?: string[] }
```

Groups are auto-derived. Adding a curated model only requires adding to the MODELS array.

## Task: Add Multi-Output to a Node

See ConditionalNode.tsx as a template. Key pattern:
```ts
// Store each output handle separately
outputs.set(`${node.id}:handleA`, valueA)
outputs.set(`${node.id}:handleB`, valueB)
// Also set plain nodeId for backwards-compat
outputs.set(node.id, defaultValue)
```
Downstream resolution via `resolveEdgeValue()` checks `source:sourceHandle` first, then `source`.

## Task: Access Memory Store from Execution
```ts
import { useMemoryStore } from '../store/memoryStore'
// Inside execution handler:
const memory = useMemoryStore.getState()
memory.setVariable('key', 'value')
const val = memory.getVariable('key')
memory.appendToBuffer(nodeId, message, maxMessages)
```

## Task: Update the AI Architect

The AI Architect (`src/lib/aiArchitect.ts`) generates flows from natural language descriptions using LLMs.

**When adding a new node type**, also update the `SYSTEM_PROMPT` in `aiArchitect.ts`:
1. Add the node's type ID, data schema, and handle IDs to the node catalog section
2. Follow the existing format: type name, data fields, handle names, use case description

**Key files**:
- `src/lib/aiArchitect.ts` — system prompt + `generateFlow()` function
- `src/components/AiArchitect.tsx` — modal UI component

The system prompt is the "compiler spec" that teaches LLMs to produce valid FlowFile JSON. If handle IDs or data schemas change, the prompt MUST be updated.

## Anti-Patterns (do NOT do these)

- **Don't put execution logic in components** — it belongs in `execution.ts`
- **Don't access useFlowStore outside React** — use `get()` in store action functions
- **Don't add backend dependencies** — this is a browser-only app
- **Don't change `partialize` without understanding** it controls what persists to localStorage
- **Don't hardcode port colors** — use `PORT_COLORS` from `types/flow.ts`
- **Don't use inline styles for node layout** — use the `node-shell`, `node-header`, `node-input` classes

## Verification Checklist

After any change, verify:

1. `npm run build` passes (TypeScript strict mode)
2. Node appears in NodePicker under the correct group
3. Node renders on canvas with correct header color and port positions
4. Node connects to other nodes (drag edge from port to port)
5. Click Run — node executes and produces output
6. Reload page — node layout persists, runtime state resets
7. MiniMap shows node with an appropriate color (update `nodeColor` in App.tsx)
