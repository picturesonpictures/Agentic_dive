# LLM Flow Builder — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (localhost:5173)                   │
│                                                                   │
│  ┌──────────┐ ┌────────────────────────────────────┐             │
│  │ NodePicker│ │         ReactFlow Canvas           │             │
│  │ (sidebar) │ │                                    │             │
│  │           │ │  [TextInput]──→[Model]──→[Output]  │             │
│  │ + Text In │ │       ↑                            │             │
│  │ + Model   │ │  [SystemPrompt]                    │             │
│  │ + Output  │ │                                    │             │
│  │ + ...     │ │  [Note] (floating annotation)      │             │
│  └──────────┘ └────────────────────────────────────┘             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Zustand Store (flowStore.ts)                                │ │
│  │ nodes: Node[] | edges: Edge[] | apiKey | isRunning          │ │
│  │ persist → localStorage (partialize strips runtime state)    │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │ run()                                   │
│  ┌──────────────────────▼──────────────────────────────────────┐ │
│  │ Execution Engine (execution.ts)                             │ │
│  │ 1. topoSort(nodes, edges)  ← Kahn's algorithm              │ │
│  │ 2. for each sorted node:                                    │ │
│  │    - resolve inputs from outputs Map                        │ │
│  │    - execute node logic                                     │ │
│  │    - store result in outputs Map                            │ │
│  │ 3. Model nodes → streamCompletion() → SSE chunks           │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │                                         │
│  ┌──────────────────────▼──────────────────────────────────────┐ │
│  │ OpenRouter Client (openrouter.ts)                           │ │
│  │ OpenAI SDK → baseURL: openrouter.ai/api/v1                 │ │
│  │ streamCompletion(key, model, messages, onChunk, onDone)     │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │ HTTPS                                   │
└─────────────────────────┼───────────────────────────────────────┘
                          ▼
              ┌──────────────────────┐
              │   OpenRouter API     │
              │  openrouter.ai/v1    │
              │  300+ LLM models     │
              └──────────────────────┘
```

## Data Flow

### 1. User Interaction
User adds nodes via NodePicker, connects them by dragging edges between ports, configures each node's settings (model selection, temperature, prompt text), then clicks Run.

### 2. State Management
All state lives in a single Zustand store:
- `nodes: Node[]` — positions, types, data (config + runtime)
- `edges: Edge[]` — connections between node ports
- `apiKey: string` — OpenRouter API key
- `isRunning: boolean` — prevents concurrent runs

Persistence: `zustand/middleware` persist writes to localStorage under key `"llm-flow"`. The `partialize` function strips runtime fields (output, status, error) before saving. The `onRehydrateStorage` callback resets all nodes to idle on load.

### 3. Execution Pipeline
When Run is clicked:
1. **Reset**: All model nodes set to `status: 'idle'`, outputs cleared
2. **Sort**: `topoSort()` uses Kahn's algorithm to determine execution order
3. **Walk**: For each node in sorted order:
   - **Input nodes** (textInput, systemPrompt): emit their `value` to the outputs Map
   - **Transform nodes** (concat, jsonExtract, promptTemplate): read inputs from Map, compute, write result to Map
   - **Model nodes**: collect inputs, call `streamCompletion()`, pipe SSE chunks to the store for live UI updates
   - **Output nodes** (textOutput): receive their value via the store after execution
4. **Done**: `isRunning` set to false, output nodes display final results

### 4. Streaming
Model nodes use the OpenAI SDK's streaming API pointed at OpenRouter. Each chunk arrives via SSE and is immediately written to the node's `output` field in the store, which triggers a React re-render showing the text as it arrives.

## Node System

### Port Types
Every connection has a type. Currently all ports are `text` type:
- `text` → blue (#3b82f6)
- `image` → purple (#a855f7) [future]
- `json` → green (#22c55e) [future]
- `any` → gray (#6b7280) [future]

### Node Anatomy
```
┌─────────────────────────────┐
│ [input handle] ←            │  ← Handle (10x10px, PORT_COLORS)
├─────────────────────────────┤
│  🤖 Node Header             │  ← .node-header bg-COLOR-700
├─────────────────────────────┤
│                             │
│  Config fields              │  ← .node-input (text/select/range)
│  Status indicators          │
│  Output preview             │
│                             │
├─────────────────────────────┤
│            → [output handle]│  ← Handle source
└─────────────────────────────┘
```

### Adding New Nodes
See CLAUDE.md for the 6-step checklist. See AGENTS.md for full code templates.

## Key Design Decisions

### Browser-Only
No backend server. The API key lives in `.env.local` (loaded by Vite at build time) or localStorage. The browser makes direct HTTPS calls to OpenRouter. This means:
- Zero deployment complexity (static files)
- CORS handled by OpenRouter's permissive headers
- API key security relies on the user's machine

### Topological Sort
Kahn's algorithm ensures nodes execute in dependency order. This handles:
- Linear chains (A → B → C)
- Fan-out (A → B, A → C)
- Fan-in (A → C, B → C)
- Complex DAGs (arbitrary depth)

Does NOT handle: cycles (infinite loops). The sort silently drops nodes involved in cycles.

### Zustand over Redux/Context
- Minimal boilerplate
- Built-in persistence middleware
- `get()` access from non-React code (execution engine)
- Immer-free (plain immutable updates)

### React Flow (@xyflow/react)
- Handles all graph rendering, dragging, connecting, zooming
- Custom node types via component registry
- Built-in MiniMap, Controls, Background
- Large community, active maintenance

## Future Architecture Considerations

### Multi-Output Nodes (Conditional/Router)
The current `outputs` Map uses `nodeId → value`. For nodes with multiple output handles, extend to `nodeId:handleId → value` with a helper function that falls back to plain `nodeId` for backwards compatibility.

### Sub-Graph Execution (Loop/Iterator)
Loop nodes require executing a sub-graph multiple times. This means:
- Identifying the downstream subgraph of the loop node
- Cloning the subgraph context for each iteration
- Collecting results into an array
- This is the most complex future engine change

### Live Model Registry
Replace the hardcoded MODELS array with a live fetch from OpenRouter's `/api/v1/models` endpoint, cached in localStorage with a 24-hour TTL.

### Flow Persistence
Export/import flows as JSON files. Auto-save named flows to localStorage. Share via clipboard.
