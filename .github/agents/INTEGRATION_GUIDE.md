# Integration Guide — Flow Quality System

**For**: Integrating Flow Analyst, Flow Executor, Flow Orchestrator into LLM Flow Builder  
**Status**: Ready for implementation  
**Effort**: Medium (4-6 hours of wiring)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM Flow Builder UI                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [✨ AI Architect + Refine] ──→ Flow Orchestrator Agent         │
│                                  ↓                               │
│  [🔍 Validate] ───────────────→ Flow Analyst Agent              │
│                    ↓                                              │
│  [▶️ Run Flow] ───→ Flow Executor Agent                          │
│                         ↓                                         │
│  [Canvas] Display results, highlight errors                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Agent Interactions:
────────────────────

Flow Orchestrator
  → calls AI Architect (your existing aiArchitect.ts)
  → calls Flow Analyst
  → calls Flow Executor
  → orchestrates refinement loop

Flow Analyst
  → reads flow JSON
  → returns structured feedback (pass/fail/needs-refinement)

Flow Executor
  → reads flow JSON + test inputs
  → simulates execution
  → returns execution report with errors
```

---

## Integration Points (4 main areas)

### 1. **UI: Add Three New Buttons to ApiKeyBar.tsx**

**Current Buttons**: 
- ✨ AI Architect
- 💾 Flows (Library)
- Run, Settings, etc.

**New Buttons to Add**:

```tsx
// In ApiKeyBar.tsx, after AI Architect button:

<button 
  onClick={() => setValidateModalOpen(true)}
  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm"
>
  🔍 Validate
</button>

<button
  onClick={() => setExecuteTestOpen(true)}
  className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm"
>
  ▶️ Test Run
</button>
```

### 2. **Component: Create ValidateFlow Modal**

**File**: `src/components/ValidateFlowModal.tsx`

```tsx
import { useState } from 'react'
import { useFlowStore } from '../store/flowStore'
import { runSubagent } from '../lib/agents' // hypothetical

export function ValidateFlowModal({ isOpen, onClose }) {
  const { nodes, edges } = useFlowStore()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleValidate = async () => {
    setLoading(true)
    try {
      const flowJson = { nodes, edges }
      const analysisReport = await runSubagent('Flow Analyst', {
        flow: flowJson,
        description: useFlowStore.getState().description || ''
      })
      setReport(analysisReport)
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-content">
        <h2>Validate Flow</h2>
        
        <button onClick={handleValidate} disabled={loading}>
          {loading ? '⏳ Validating...' : '🔍 Validate'}
        </button>

        {report && (
          <div className="report">
            <div className={`status ${report.status}`}>
              Status: {report.status.toUpperCase()}
            </div>
            
            {/* Tier results */}
            {Object.entries(report.tiers).map(([tierName, tier]) => (
              <div key={tierName} className={`tier ${tier.pass ? 'pass' : 'fail'}`}>
                <h3>{tierName}</h3>
                <p>{tier.pass ? '✅ Pass' : '❌ Fail'}</p>
                {tier.issues.length > 0 && (
                  <ul>
                    {tier.issues.map((issue, i) => (
                      <li key={i} className={`issue-${issue.severity}`}>
                        <strong>{issue.message}</strong>
                        <p>💡 {issue.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Architect notes */}
            {report.architectNotes && (
              <div className="architect-notes">
                <strong>🏗️ AI Architect Notes:</strong>
                <p>{report.architectNotes}</p>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose}>Close</button>
      </div>
    </dialog>
  )
}
```

### 3. **Component: Create TestRunModal**

**File**: `src/components/TestRunModal.tsx`

```tsx
import { useState } from 'react'
import { useFlowStore } from '../store/flowStore'
import { runSubagent } from '../lib/agents'

export function TestRunModal({ isOpen, onClose }) {
  const { nodes, edges } = useFlowStore()
  const [testInputs, setTestInputs] = useState({})
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  // Auto-populate test inputs for textInput nodes
  useEffect(() => {
    const inputs = {}
    nodes
      .filter(n => n.type === 'textInput')
      .forEach(n => {
        inputs[n.id] = n.data.value
      })
    setTestInputs(inputs)
  }, [nodes])

  const handleTestRun = async () => {
    setLoading(true)
    try {
      const flowJson = { nodes, edges }
      const executionReport = await runSubagent('Flow Executor', {
        flow: flowJson,
        testInputs,
        mode: 'trace'
      })
      setReport(executionReport)
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-content">
        <h2>Test Flow Execution</h2>

        {/* Input editor */}
        <div className="test-inputs">
          <h3>Test Inputs</h3>
          {Object.entries(testInputs).map(([nodeId, value]) => (
            <div key={nodeId}>
              <label>{nodeId}</label>
              <textarea
                value={value}
                onChange={e => setTestInputs({
                  ...testInputs,
                  [nodeId]: e.target.value
                })}
              />
            </div>
          ))}
        </div>

        <button onClick={handleTestRun} disabled={loading}>
          {loading ? '⏳ Running...' : '▶️ Test Execute'}
        </button>

        {report && (
          <div className="execution-report">
            <div className={`status ${report.status}`}>
              Status: {report.status.toUpperCase()}
            </div>

            <div className="metrics">
              <p>⏱️ Execution Time: {report.executionTime}ms</p>
              <p>📊 Coverage: {report.summary.coverage}</p>
              <p>❌ Failed: {report.summary.failed}/{report.summary.totalNodes}</p>
            </div>

            {/* Node results */}
            <div className="node-results">
              <h3>Node Execution Trace</h3>
              {report.debugTrace.map((trace, i) => (
                <div key={i} className={`trace-entry ${trace.action}`}>
                  <code>{trace.node}</code>
                  <span>{trace.action}</span>
                  {trace.output && <pre>{JSON.stringify(trace.output)}</pre>}
                </div>
              ))}
            </div>

            {/* Errors */}
            {report.errors.length > 0 && (
              <div className="errors">
                <h3>❌ Errors</h3>
                {report.errors.map((err, i) => (
                  <div key={i} className={`error-${err.severity}`}>
                    <strong>{err.message}</strong>
                    <p>💡 {err.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onClose}>Close</button>
      </div>
    </dialog>
  )
}
```

### 4. **Library: Create Agent Invocation Wrapper**

**File**: `src/lib/agents.ts` (NEW)

```ts
/**
 * Wrapper to invoke Flow Quality agents via runSubagent.
 * This is the main integration point for coordinating with agents.
 */

export async function validateFlowWithAnalyst(
  flowJson: { nodes: any[], edges: any[] },
  description: string
): Promise<AnalysisReport> {
  const prompt = `
Analyze this flow JSON against the description:

DESCRIPTION: "${description}"

FLOW:
${JSON.stringify(flowJson, null, 2)}

Use the Flow Analyst framework to check all 5 tiers.
Return structured JSON report with: status, tiers, issues, architectNotes.
`

  const response = await runSubagent('Flow Analyst', prompt)
  return JSON.parse(response) // assumes agent returns JSON
}

export async function executeFlowWithExecutor(
  flowJson: { nodes: any[], edges: any[] },
  testInputs: Record<string, string>,
  mode: 'trace' | 'debug' | 'profile' = 'trace'
): Promise<ExecutionReport> {
  const prompt = `
Execute this flow step-by-step:

FLOW:
${JSON.stringify(flowJson, null, 2)}

TEST INPUTS:
${JSON.stringify(testInputs, null, 2)}

MODE: ${mode}

Run topological sort and execute each node. Return JSON report with:
status, executionTime, nodeResults, errors, debugTrace, summary.
`

  const response = await runSubagent('Flow Executor', prompt)
  return JSON.parse(response)
}

export async function generateFlowWithOrchestrator(
  description: string,
  maxIterations: number = 3
): Promise<OrchestrationResult> {
  const prompt = `
Generate a high-quality flow for this description. Use iterative refinement.

USER REQUEST: "${description}"

MAX ITERATIONS: ${maxIterations}

Process:
1. Call AI Architect to generate flow
2. Call Flow Analyst to analyze (including runtime pre-flight)
3. Call Flow Executor to validate runtime behavior
4. If either fails and iteration < max: feed combined feedback to Architect, loop
5. Return final production-ready flow JSON + quality metrics

Return JSON with: finalFlow, status, iterationCount, qualityMetrics.
`

  const response = await runSubagent('Flow Orchestrator', prompt)
  return JSON.parse(response)
}

// Type definitions
export interface AnalysisReport {
  status: 'pass' | 'fail' | 'needs-refinement'
  qualityScore: {
    value: number
    label: 'production-ready' | 'needs-review' | 'rework-required'
  }
  tiers: {
    structural: TierResult
    dataFlow: TierResult
    layout: TierResult
    intent: TierResult
    optimization: TierResult
    runtime: TierResult
  }
  summaryMetrics: Record<string, any>
  architectNotes: string
}

export interface ExecutionReport {
  status: 'success' | 'partial' | 'failure'
  executionTime: number
  nodeResults: Record<string, NodeResult>
  errors: ErrorReport[]
  debugTrace: TraceEntry[]
  summary: ExecutionSummary
}

export interface OrchestrationResult {
  finalFlow: { nodes: any[], edges: any[] }
  status: 'success' | 'partial'
  iterationCount: number
  qualityMetrics: Record<string, any>
  feedbackHistory: string[]
}
```

---

## Wiring Flow to UI State

### When User Clicks "Validate"

```tsx
// In ValidateFlowModal.tsx handleValidate():

const flowJson = { 
  nodes: useFlowStore.getState().nodes,
  edges: useFlowStore.getState().edges
}

const report = await validateFlowWithAnalyst(flowJson, flowDescription)

// Highlight failing nodes on canvas
if (report.status === 'fail') {
  report.summaryMetrics.orphanedNodeIds.forEach(nodeId => {
    highlightNodeAsError(nodeId, report.tiers.dataFlow.issues)
  })
}
```

### When User Clicks "Test Run"

```tsx
// In TestRunModal.tsx handleTestRun():

const flowJson = { 
  nodes: useFlowStore.getState().nodes,
  edges: useFlowStore.getState().edges
}

const report = await executeFlowWithExecutor(flowJson, testInputs, 'trace')

// Show execution trace in timeline
report.debugTrace.forEach(entry => {
  console.log(`[${entry.timestamp}] ${entry.node}: ${entry.action}`)
})

// Update node output displays if successful
if (report.status === 'success') {
  report.executionOrder.forEach(nodeId => {
    const output = report.nodeResults[nodeId].output
    useFlowStore.getState().updateNodeData(nodeId, { output })
  })
}
```

### When User Clicks "✨ AI Architect + Refine"

```tsx
// In AiArchitect.tsx component:

const orchestrationResult = await generateFlowWithOrchestrator(
  userDescription,
  maxIterations
)

if (orchestrationResult.status === 'success') {
  // Load the refined flow
  useFlowStore.getState().loadFlow({
    nodes: orchestrationResult.finalFlow.nodes,
    edges: orchestrationResult.finalFlow.edges
  })
  
  // Show iteration history
  showIterationTimeline(orchestrationResult.feedbackHistory)
  
  // Update metrics display
  showQualityScore(orchestrationResult.qualityMetrics)
}
```

---

## Error Highlighting on Canvas

**When validation fails, highlight problem nodes**:

```tsx
// Helper: highlight node as error on canvas
function highlightNodeAsError(nodeId: string, issues: Issue[]) {
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`)
  if (nodeElement) {
    nodeElement.classList.add('node-error')
    
    // Add tooltip with issue details
    const issueText = issues
      .filter(i => i.nodeId === nodeId)
      .map(i => `${i.severity.toUpperCase()}: ${i.message}`)
      .join('\n')
    
    nodeElement.setAttribute('title', issueText)
  }
}

// CSS styling
.node-error {
  border: 2px solid #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}
```

---

## Testing the Integration

### Step 1: Run a Valid Flow Through All Three Agents

```bash
# Terminal:
npm run dev

# In browser:
# 1. Create simple 3-node flow (input → model → output)
# 2. Click "🔍 Validate" → should show PASS
# 3. Click "▶️ Test Run" → should show SUCCESS with execution trace
# 4. Expected: No errors, all nodes highlighted green
```

### Step 2: Test Refinement Loop

```bash
# In AiArchitect modal:
# 1. Describe: "Summarize text and translate to French"
# 2. Click "✨ Generate + Refine"
# 3. Watch iteration counter (1 → 2 → done)
# 4. Expected: Flow Orchestrator shows iteration history, final flow loads
```

### Step 3: Break a Flow and Validate

```bash
# On canvas:
# 1. Create flow with orphaned node
# 2. Click "🔍 Validate"
# 3. Expected: Shows FAIL, highlights orphaned nodes, provides repair text
```

---

## Deployment Checklist

- [ ] Create `ValidateFlowModal.tsx`
- [ ] Create `TestRunModal.tsx`
- [ ] Create `agents.ts` wrapper library
- [ ] Add buttons to `ApiKeyBar.tsx`
- [ ] Add state to `ApiKeyBar.tsx` for modal visibility
- [ ] Add error highlighting CSS to `index.css`
- [ ] Test validation on example flows
- [ ] Test execution trace display
- [ ] Test orchestration loop
- [ ] Update CLAUDE.md with new UI flows
- [ ] Document error codes in user guide

---

## What Happens After Integration

### User Experience Flow

```
1. User writes description in AI Architect
   ↓
2. Clicks "✨ Generate + Refine"
   ↓
3. Flow Orchestrator runs (loops up to 3x):
   - Phase 1: AI Architect generates
  - Phase 2: Flow Analyst validates (6 tiers)
  - Phase 3: Flow Executor validates runtime
  - Phase 4: If issues/partial → provide combined feedback, refine → loop
   ↓
4. After Analyst=pass and Executor=success OR max iterations:
   - Flow loads to canvas
  - Metrics show quality score (0-100)
   - Iteration history displayed
   ↓
5. User can now:
   - Click "▶️ Test Run" to test with sample data
   - Click "🔍 Validate" to re-validate changes
   - Edit nodes manually and re-validate
   - Run the flow normally
```

---

## Performance Considerations

| Operation | Expected Time | Bottleneck |
|-----------|---------------|-----------|
| Validate Flow | 500-1000ms | Flow Analyst analysis |
| Test Run | 100-300ms | Topological sort + trace |
| Generate + Refine (1 iteration) | 2-5s | LLM call via OpenRouter |
| Full Orchestration (avg 2 iter) | 4-10s | 2x LLM calls + 2x validation |

**Recommendation**: Show loading spinners, disable buttons during operations.

---

## Future Enhancements

1. **Real-time validation**: Validate as user edits (highlight issues in real-time)
2. **Execution profiling**: Show which nodes are slowest
3. **Model selector**: Auto-suggest models based on task (via dedicated agent)
4. **Flow templates**: Pre-built flows for common tasks
5. **Batch validation**: Validate multiple flows at once
6. **Metrics dashboard**: Track quality scores over time

---

**Document**: Integration Guide  
**Created**: 2026-03-27  
**Status**: Ready for implementation  
**Next Step**: Pick integration point and implement ValidateFlowModal.tsx first (easiest)
