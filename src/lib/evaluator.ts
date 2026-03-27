import { streamCompletion, type Message } from './openrouter'

// ─── Shared Evaluation Function ──────────────────────────────────────────────
// Used by both the Evaluator node and the Loop node's break condition.
// Sends content + criteria to an LLM and parses VERDICT: PASS/FAIL from response.

export async function evaluate(
  apiKey: string,
  content: string,
  criteria: string,
  model: string,
  temperature: number,
  onChunk?: (chunk: string) => void,
): Promise<{ passed: boolean; reasoning: string }> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a strict evaluator. You will be given content and evaluation criteria.
Evaluate the content against the criteria carefully.
You MUST end your response with exactly one of these two lines:
VERDICT: PASS
VERDICT: FAIL
Before the verdict line, explain your reasoning concisely.`,
    },
    {
      role: 'user',
      content: `## Content to Evaluate\n${content}\n\n## Criteria\n${criteria || 'Evaluate whether the content is complete, coherent, and well-formed.'}`,
    },
  ]

  let full = ''

  await new Promise<void>((resolve) => {
    streamCompletion(
      apiKey,
      model,
      messages,
      chunk => {
        full += chunk
        onChunk?.(chunk)
      },
      () => resolve(),
      () => resolve(), // On error, resolve anyway — we'll default to FAIL
      temperature,
    )
  })

  // Parse verdict — check last 100 chars for robustness
  const tail = full.slice(-100)
  const verdictMatch = tail.match(/VERDICT:\s*(PASS|FAIL)/i)
  const passed = verdictMatch ? verdictMatch[1].toUpperCase() === 'PASS' : false

  return { passed, reasoning: full }
}
