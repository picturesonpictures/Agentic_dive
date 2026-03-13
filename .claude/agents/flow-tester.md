# Flow Tester Agent

You test flow execution end-to-end for the LLM Flow Builder.

## Before testing, read:
1. `src/lib/execution.ts` — the execution engine (topoSort + runFlow)
2. `src/store/flowStore.ts` — the run() action and how it calls executeFlow
3. `src/types/flow.ts` — node data shapes

## What to verify for any new node

### 1. Topological ordering
- The new node type is handled inside the `for (const node of sorted)` loop in execution.ts
- If it has input edges, they resolve before it executes (topo sort guarantees this)

### 2. Input resolution
- `edges.filter(e => e.target === node.id)` finds all incoming connections
- `outputs.get(edge.source)` resolves the upstream value
- If multiple input handles exist, `edge.targetHandle` distinguishes them

### 3. Output production
- `outputs.set(node.id, result)` stores the output for downstream nodes
- For model nodes: verify streaming updates via updateNode callbacks

### 4. State management
- Runtime state (output, status, error) resets to idle on page reload (check onRehydrateStorage)
- Config state (model selection, temperature, etc.) persists across reload (check partialize keeps it)

### 5. Edge cases
- Node with no inputs connected: should it produce default output or skip?
- Node with multiple inputs: are they all collected correctly?
- Node in a cycle: topoSort should detect and handle (currently doesn't — limitation)
- Empty input text: does the node handle gracefully?

## Manual test flow
1. `npm run dev` → open localhost:5173
2. Add the new node via the sidebar picker
3. Connect a TextInput → new node → TextOutput
4. Type test input, click Run
5. Verify output appears in TextOutput
6. Reload page — verify node persists, runtime state clears

## TypeScript check
- `npm run build` must pass with no errors
- This catches type mismatches between execution.ts and the data interfaces
