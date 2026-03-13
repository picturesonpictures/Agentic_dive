# LLM Flow Builder

Browser-only LLM orchestration canvas — React Flow + OpenRouter. Think ComfyUI but for language models.

## Quick Start

```bash
npm run dev        # Vite dev server on localhost:5173
npm run build      # TypeScript strict check + production build
```

API key in `.env.local` as `VITE_OPENROUTER_API_KEY=sk-or-...`

## Architecture

**Stack**: React 19, TypeScript (strict), Vite 6, Tailwind CSS 4, @xyflow/react 12, Zustand 5, OpenAI SDK 4

**No backend.** Browser calls OpenRouter directly. API key stored in localStorage + `.env.local` (env takes precedence).

**Execution model**: Run → topological sort (Kahn's algorithm) → walk sorted nodes → stream LLM responses via SSE → update node output in real-time.

**State**: Single Zustand store (`flowStore`) with `persist` middleware. Runtime state (output, status, error) stripped before saving via `partialize`. On rehydration, `onRehydrateStorage` resets all nodes to idle. Separate `memoryStore` persists conversation buffers and variables across runs.

**Multi-output engine**: The `outputs` Map uses composite keys (`nodeId:handleId`) for multi-output nodes (e.g. Conditional). `resolveEdgeValue()` checks composite key first, then falls back to plain `nodeId` for single-output nodes.

## File Map

```
src/
├── App.tsx                       — ReactFlow canvas, nodeTypes registry, layout shell
├── main.tsx                      — React root mount
├── index.css                     — Tailwind + shared CSS: .node-shell, .node-header, .node-input
├── vite-env.d.ts                 — Vite env types
├── types/flow.ts                 — PortType, node data interfaces, ModelOption, MODELS array
├── store/flowStore.ts            — Zustand: nodes, edges, apiKey, isRunning, addNode(), loadFlow(), run()
├── store/memoryStore.ts          — Zustand: buffers (chat), variables (key-value) — persists across runs
├── lib/execution.ts              — topoSort() + runFlow() — the execution engine
├── lib/openrouter.ts             — OpenAI SDK wrapper → streamCompletion()
├── lib/modelRegistry.ts          — Live model fetch from OpenRouter API, 24h cache
├── lib/flowIO.ts                 — Export/import/save/load flows as JSON
├── lib/aiArchitect.ts            — System prompt + generateFlow() for AI-driven flow creation
├── hooks/useModels.ts            — React hook wrapping modelRegistry
├── components/ApiKeyBar.tsx      — Top bar: AI Architect + Flows + API key + Run
├── components/NodePicker.tsx     — Left sidebar: grouped node buttons (9 groups)
├── components/FlowLibrary.tsx    — Modal: save/load/import/export flows
├── components/AiArchitect.tsx    — Modal: describe flow → LLM generates → load to canvas
└── components/nodes/
    ├── TextInputNode.tsx         — Editable text → text port out
    ├── SystemPromptNode.tsx      — System prompt → text port out
    ├── ModelNode.tsx             — 359+ models, search filter, streaming, config
    ├── TextOutputNode.tsx        — Markdown display of results
    ├── ConcatNode.tsx            — Merge two text inputs
    ├── NoteNode.tsx              — Annotation sticky note (no ports)
    ├── JsonExtractNode.tsx       — Parse JSON + traverse dot-path expression
    ├── PromptTemplateNode.tsx    — Template with dynamic {{variable}} input handles
    ├── ConditionalNode.tsx       — Route input to true/false based on condition
    ├── HttpRequestNode.tsx       — Browser fetch() for API calls
    ├── CodeRunnerNode.tsx        — Execute JavaScript with input variable
    ├── ConversationBufferNode.tsx — Accumulate messages across runs (memory)
    └── VariableStoreNode.tsx     — Get/set persistent named variables (memory)
```

## Node Types (13 total)

| Node | Type ID | Group | Header Color | Ports In | Ports Out |
|------|---------|-------|--------------|----------|-----------|
| Text Input | textInput | Inputs | bg-blue-600 | — | out |
| System Prompt | systemPrompt | Inputs | bg-amber-700 | — | out |
| Model | model | Models | bg-violet-700 | user, system | out |
| Output | textOutput | Outputs | bg-emerald-700 | in | — |
| JSON Extract | jsonExtract | Data | bg-rose-700 | in | out |
| Prompt Template | promptTemplate | Data | bg-cyan-700 | dynamic {{vars}} | out |
| HTTP Request | httpRequest | Data | bg-pink-700 | in | out |
| Conditional | conditional | Logic | bg-orange-700 | in | true, false |
| Code Runner | codeRunner | Code | bg-lime-700 | in | out |
| Chat Buffer | conversationBuffer | Memory | bg-indigo-700 | in | out |
| Variable | variableStore | Memory | bg-amber-600 | in (set mode) | out |
| Combine Text | concat | Utilities | bg-teal-700 | a, b | out |
| Note | note | Utilities | per-scheme | — | — |

## How to Add a New Node (8 steps)

1. Define data interface in `src/types/flow.ts`
2. Create component in `src/components/nodes/NewNode.tsx` — use node-shell, node-header, node-input CSS; Handle from @xyflow/react with PORT_COLORS; cast data as `data as unknown as YourDataType`
3. Add default data to `defaults` record in `src/store/flowStore.ts` addNode()
4. Register component in `nodeTypes` object in `src/App.tsx`
5. Add entry to `NODE_TYPES` array in `src/components/NodePicker.tsx`
6. Add execution handler in the for-loop in `src/lib/execution.ts` — use `resolveEdgeValue()` for input resolution
7. If node has runtime state, add strip cases in: run() reset, `partialize`, and `onRehydrateStorage`
8. Add MiniMap color in App.tsx `nodeColor` function

Use ConcatNode.tsx as template for utility nodes, ModelNode.tsx for complex nodes, ConditionalNode.tsx for multi-output nodes.

## Key Systems

### Live Model Registry
- Fetches 300+ models from OpenRouter `/api/v1/models` on load
- Cached in localStorage with 24h TTL
- Merged with curated FALLBACK_MODELS (which have hand-picked tags)
- Search/filter input in ModelNode dropdown

### Flow Save/Load
- **Save to Library**: localStorage under `llm-flow-library` key
- **Export**: Download as `.json` file (version 1.0 format)
- **Import**: From file or clipboard
- **Share**: Copy JSON to clipboard
- Format strips API key and runtime state automatically

### Multi-Output Engine
- Single-output: `outputs.set(nodeId, value)`
- Multi-output: `outputs.set(`${nodeId}:${handleId}`, value)`
- Resolution: `resolveEdgeValue()` checks composite key first, then plain nodeId

### AI Architect (self-referential flow generation)
- **✨ AI Architect** button in header bar opens modal
- User describes a flow in natural language → sent to LLM via `streamCompletion()`
- LLM returns FlowFile JSON → parsed → `loadFlow()` snaps it to canvas
- System prompt in `src/lib/aiArchitect.ts` teaches the LLM all 13 node types, handle IDs, edge format
- Streams response in real-time (green JSON preview in modal)
- Model selector: user picks which LLM generates the flow (default: auto)
- Low temperature (0.4) for structured output reliability

### Memory System (persists across Runs)
- **memoryStore.ts**: Separate Zustand store with own localStorage key (`llm-flow-memory`)
- **Conversation Buffer**: `appendToBuffer(nodeId, msg, max)`, `getBuffer(nodeId)`
- **Variable Store**: `setVariable(name, value)`, `getVariable(name)`
- Accessed from execution.ts via `useMemoryStore.getState()`

## Conventions

- **Ports**: 10x10px, PORT_COLORS (text=#3b82f6, image=#a855f7, json=#22c55e)
- **Source handles**: id="out" (or "true"/"false" for conditional). **Target handles**: semantic ("user", "system", "a", "b", "in", or dynamic variable names)
- **Node shell**: node-shell w-XX (w-44 to w-80), node-header bg-COLOR-700, node-input text-xs
- **Text scale**: zinc-100 primary, zinc-300 secondary, zinc-400 labels, zinc-500 subtle
- **State**: always via updateNodeData(id, patch) — never direct mutation
- **Type casts**: `data as unknown as YourType` (double assertion for React Flow compatibility)
- **Execution**: always in execution.ts, never in node components
- **No backend** — browser-only architecture

## Subagents

Custom agents in `.claude/agents/`:
- **node-builder.md** — Creates new node types following the 8-step checklist
- **ui-reviewer.md** — Reviews visual consistency with dark theme
- **flow-tester.md** — Tests execution end-to-end
