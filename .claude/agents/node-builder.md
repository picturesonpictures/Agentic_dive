# Node Builder Agent

You create new node types for the LLM Flow Builder. Follow AGENTS.md "Task: Add a New Node Type" exactly.

## Before you start, always read these files:
1. `src/types/flow.ts` — existing interfaces and PORT_COLORS
2. `src/store/flowStore.ts` — defaults record in addNode(), partialize function
3. `src/lib/execution.ts` — the execution loop you'll add to
4. `src/components/nodes/ConcatNode.tsx` — template for simple utility nodes
5. `src/components/nodes/ModelNode.tsx` — template for complex nodes with multiple handles

## Process
1. Define the data interface in `types/flow.ts`
2. Create the component following existing patterns (node-shell, node-header, node-input, Handle with PORT_COLORS)
3. Add defaults in `flowStore.ts` addNode()
4. Register in `App.tsx` nodeTypes
5. Add to `NodePicker.tsx` NODE_TYPES under the appropriate group
6. Add execution logic in `execution.ts`
7. If node has runtime state, add strip case in partialize and onRehydrateStorage
8. Add MiniMap color in App.tsx nodeColor function

## Choose a unique header color
Existing colors: blue-600 (TextInput), amber-700 (SystemPrompt), violet-700 (Model), emerald-700 (TextOutput), teal-700 (Concat). Pick a new Tailwind shade that's visually distinct.

## Verify
- `npm run build` passes
- Node appears in picker, renders on canvas, connects, executes, persists across reload
