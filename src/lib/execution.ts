import { type Edge, type Node } from '@xyflow/react'
import { streamCompletion, generateImage, textToSpeech, speechToText, type Message } from './openrouter'
import type {
  ModelNodeData, TextInputData, JsonExtractData, PromptTemplateData,
  ConditionalData, HttpRequestData, CodeRunnerData, ConversationBufferData,
  VariableStoreData, ImageInputData, ImageOutputData, AudioInputData,
  AudioOutputData, ImageGenData, TTSData, STTData, FileInputData,
  EvaluatorNodeData, SubFlowNodeData, LoopNodeData, ModelRouterNodeData,
} from '../types/flow'
import { evaluate } from './evaluator'
import { loadFromLibrary } from './flowIO'
import { loadModels } from './modelRegistry'
import { useMemoryStore } from '../store/memoryStore'
import {
  type FlowValue, type FlowImageValue, type FlowAudioValue,
  text, emptyText, image, audio, asText, isImage, isAudio,
} from './flowValue'

// ─── Topological Sort (Kahn's algorithm) ─────────────────────────────────────

function topoSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }

  for (const e of edges) {
    adj.get(e.source)!.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const queue = nodes.filter(n => inDegree.get(n.id) === 0)
  const sorted: Node[] = []

  while (queue.length) {
    const node = queue.shift()!
    sorted.push(node)
    for (const neighbour of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(neighbour) ?? 1) - 1
      inDegree.set(neighbour, deg)
      if (deg === 0) queue.push(nodes.find(n => n.id === neighbour)!)
    }
  }

  return sorted
}

// ─── Path Traversal ──────────────────────────────────────────────────────

function traversePath(obj: unknown, path: string): unknown {
  if (!path.trim()) return obj

  const tokens = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let current: unknown = obj
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[token]
  }
  return current
}

// ─── Multi-Output Resolve Helper ─────────────────────────────────────────
// Returns a FlowValue. For missing edges, returns an empty text value.

function resolveEdgeValue(outputs: Map<string, FlowValue>, edge: Edge): FlowValue {
  if (edge.sourceHandle) {
    const composite = `${edge.source}:${edge.sourceHandle}`
    if (outputs.has(composite)) return outputs.get(composite)!
  }
  return outputs.get(edge.source) ?? emptyText()
}

// ─── PDF Text Extraction ─────────────────────────────────────────────────
// Dynamically imports pdf.js from CDN to extract text from PDF data URIs.

async function extractPdfText(dataUrl: string): Promise<string> {
  try {
    // Dynamic import from CDN — no build dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib: any = await (Function('return import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm")')())
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs'

    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages.push(content.items.map((item: any) => item.str).join(' '))
    }
    return pages.join('\n\n')
  } catch (err) {
    throw new Error(`PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runFlow(
  nodes: Node[],
  edges: Edge[],
  apiKey: string,
  updateNode: (id: string, patch: Partial<ModelNodeData>) => void,
  options?: { depth?: number; maxDepth?: number },
) {
  const depth = options?.depth ?? 0
  const maxDepth = options?.maxDepth ?? 5
  // The universal outputs map — every edge carries a FlowValue
  const outputs = new Map<string, FlowValue>()

  const sorted = topoSort(nodes, edges)

  for (const node of sorted) {

    // ── Text Inputs ────────────────────────────────────────────────────────
    if (node.type === 'textInput' || node.type === 'systemPrompt') {
      const data = node.data as unknown as TextInputData
      outputs.set(node.id, text(data.value))
    }

    // ── Combine Text ───────────────────────────────────────────────────────
    if (node.type === 'concat') {
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeA = incomingEdges.find(e => e.targetHandle === 'a')
      const edgeB = incomingEdges.find(e => e.targetHandle === 'b')
      const a = edgeA ? asText(resolveEdgeValue(outputs, edgeA)) : ''
      const b = edgeB ? asText(resolveEdgeValue(outputs, edgeB)) : ''
      const sep = (node.data as { separator: string }).separator ?? '\n\n'
      outputs.set(node.id, text([a, b].filter(Boolean).join(sep)))
    }

    // ── Model (multimodal-aware) ───────────────────────────────────────────
    if (node.type === 'model') {
      const data = node.data as unknown as ModelNodeData

      const incomingEdges = edges.filter(e => e.target === node.id)
      const userTextParts: string[] = []
      const imageValues: FlowImageValue[] = []
      const audioValues: FlowAudioValue[] = []
      let systemText = ''

      // Check for dynamic model override from ModelRouter
      const overrideEdge = incomingEdges.find(e => e.targetHandle === 'model_override')
      const overrideModel = overrideEdge ? asText(resolveEdgeValue(outputs, overrideEdge)).trim() : ''
      const effectiveModel = overrideModel || data.model

      for (const edge of incomingEdges) {
        if (edge.targetHandle === 'model_override') continue // already handled
        const value = resolveEdgeValue(outputs, edge)
        if (edge.targetHandle === 'system') {
          systemText = asText(value)
        } else if (edge.targetHandle === 'images' && isImage(value)) {
          imageValues.push(value)
        } else if (edge.targetHandle === 'audio' && isAudio(value)) {
          audioValues.push(value)
        } else {
          // Text or any other type arriving at the user handle
          userTextParts.push(asText(value))
        }
      }

      // Build content parts — only use array format when we have media
      type ContentPart =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: string } }
        | { type: 'input_audio'; input_audio: { data: string; format: string } }

      const hasMedia = imageValues.length > 0 || audioValues.length > 0
      const imageDetail = (data as unknown as Record<string, unknown>).imageDetail as string ?? 'auto'

      const messages: Message[] = []
      if (systemText) messages.push({ role: 'system', content: systemText })

      if (hasMedia) {
        // Build a content array mixing text + images + audio
        const contentParts: ContentPart[] = []
        if (userTextParts.length) {
          contentParts.push({ type: 'text', text: userTextParts.join('\n\n') })
        }
        for (const img of imageValues) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: img.data, detail: imageDetail },
          })
        }
        for (const aud of audioValues) {
          const base64 = aud.data.includes(',') ? aud.data.split(',')[1] : aud.data
          const format = aud.mimeType.split('/')[1] ?? 'mp3'
          contentParts.push({
            type: 'input_audio',
            input_audio: { data: base64, format },
          })
        }
        if (contentParts.length) {
          messages.push({ role: 'user', content: contentParts })
        }
      } else if (userTextParts.length) {
        // Plain text — maximum compatibility
        messages.push({ role: 'user', content: userTextParts.join('\n\n') })
      }

      if (!messages.length) continue

      updateNode(node.id, { status: 'running', output: '', error: undefined })

      let full = ''

      await new Promise<void>(resolve => {
        streamCompletion(
          apiKey,
          effectiveModel,
          messages,
          chunk => {
            full += chunk
            updateNode(node.id, { output: full })
          },
          _full => {
            updateNode(node.id, { status: 'done' })
            outputs.set(node.id, text(full))
            resolve()
          },
          err => {
            updateNode(node.id, { status: 'error', error: err })
            resolve()
          },
          data.temperature,
        )
      })
    }

    // ── JSON Extract ───────────────────────────────────────────────────────
    if (node.type === 'jsonExtract') {
      const data = node.data as unknown as JsonExtractData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const input = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      try {
        const parsed = JSON.parse(input)
        const result = traversePath(parsed, data.path)
        const out = result === undefined ? '' :
          (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
        outputs.set(node.id, text(out))
        updateNode(node.id, { output: out, error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, emptyText())
        updateNode(node.id, { output: '', error: msg } as Record<string, unknown>)
      }
    }

    // ── Prompt Template ────────────────────────────────────────────────────
    if (node.type === 'promptTemplate') {
      const data = node.data as unknown as PromptTemplateData
      const incomingEdges = edges.filter(e => e.target === node.id)
      let result = data.template

      const varNames = [...new Set(Array.from(data.template.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]))]
      for (const varName of varNames) {
        const edge = incomingEdges.find(e => e.targetHandle === varName)
        const value = edge ? asText(resolveEdgeValue(outputs, edge)) : ''
        result = result.split(`{{${varName}}}`).join(value)
      }

      outputs.set(node.id, text(result))
    }

    // ── Conditional ────────────────────────────────────────────────────────
    if (node.type === 'conditional') {
      const data = node.data as unknown as ConditionalData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const input = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      let matches = false
      try {
        switch (data.mode) {
          case 'contains':
            matches = input.includes(data.pattern)
            break
          case 'regex':
            matches = new RegExp(data.pattern).test(input)
            break
          case 'equals':
            matches = input === data.pattern
            break
          case 'not-empty':
            matches = input.trim().length > 0
            break
        }

        if (matches) {
          outputs.set(`${node.id}:true`, text(input))
        } else {
          outputs.set(`${node.id}:false`, text(input))
        }
        outputs.set(node.id, text(input))

        updateNode(node.id, { output: matches ? 'true' : 'false', error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updateNode(node.id, { output: '', error: msg } as Record<string, unknown>)
      }
    }

    // ── HTTP Request ───────────────────────────────────────────────────────
    if (node.type === 'httpRequest') {
      const data = node.data as unknown as HttpRequestData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const inputValue = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      const url = data.url || inputValue
      const body = (data.method === 'POST' || data.method === 'PUT')
        ? (data.body || inputValue)
        : undefined

      try {
        let headers: Record<string, string> = {}
        if (data.headers.trim()) {
          headers = JSON.parse(data.headers)
        }

        updateNode(node.id, { status: 'running' as unknown as number, output: '', error: undefined } as Record<string, unknown>)

        const res = await fetch(url, { method: data.method, headers, body })
        const responseText = await res.text()
        outputs.set(node.id, text(responseText))
        updateNode(node.id, { output: responseText, status: res.status, error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, emptyText())
        updateNode(node.id, { output: '', error: msg, status: undefined } as Record<string, unknown>)
      }
    }

    // ── Code Runner ────────────────────────────────────────────────────────
    if (node.type === 'codeRunner') {
      const data = node.data as unknown as CodeRunnerData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const input = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      try {
        const fn = new Function('input', data.code)
        const result = fn(input)
        const out = result === undefined ? '' :
          (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
        outputs.set(node.id, text(out))
        updateNode(node.id, { output: out, error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, emptyText())
        updateNode(node.id, { output: '', error: msg } as Record<string, unknown>)
      }
    }

    // ── Conversation Buffer ────────────────────────────────────────────────
    if (node.type === 'conversationBuffer') {
      const data = node.data as unknown as ConversationBufferData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const input = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      const memory = useMemoryStore.getState()
      if (input.trim()) {
        memory.appendToBuffer(node.id, input, data.maxMessages)
      }

      const msgList = memory.getBuffer(node.id)
      const out = msgList.join('\n\n')
      outputs.set(node.id, text(out))
      updateNode(node.id, { output: out } as Record<string, unknown>)
    }

    // ── Variable Store ─────────────────────────────────────────────────────
    if (node.type === 'variableStore') {
      const data = node.data as unknown as VariableStoreData
      const memory = useMemoryStore.getState()

      if (data.mode === 'set') {
        const incomingEdges = edges.filter(e => e.target === node.id)
        const edgeIn = incomingEdges[0]
        const input = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''
        if (data.varName) {
          memory.setVariable(data.varName, input)
        }
        outputs.set(node.id, text(input))
        updateNode(node.id, { output: input } as Record<string, unknown>)
      } else {
        const value = data.varName ? memory.getVariable(data.varName) : ''
        outputs.set(node.id, text(value))
        updateNode(node.id, { output: value } as Record<string, unknown>)
      }
    }

    // ── Image Input ────────────────────────────────────────────────────────
    if (node.type === 'imageInput') {
      const data = node.data as unknown as ImageInputData
      const dataUrl = data.dataUrl || data.url
      if (dataUrl) {
        const mime = data.dataUrl
          ? (data.dataUrl.match(/data:([^;]+)/)?.[1] ?? 'image/png')
          : 'image/png'
        outputs.set(node.id, image(dataUrl, mime, data.width, data.height))
      } else {
        outputs.set(node.id, emptyText())
      }
    }

    // ── Image Output ───────────────────────────────────────────────────────
    if (node.type === 'imageOutput') {
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      if (edgeIn) {
        const value = resolveEdgeValue(outputs, edgeIn)
        if (isImage(value)) {
          updateNode(node.id, { value: value.data, width: value.width, height: value.height } as Record<string, unknown>)
        } else {
          // If text arrives (e.g., a URL string), treat as image URL
          const url = asText(value)
          updateNode(node.id, { value: url } as Record<string, unknown>)
        }
      }
    }

    // ── Audio Input ────────────────────────────────────────────────────────
    if (node.type === 'audioInput') {
      const data = node.data as unknown as AudioInputData
      if (data.dataUrl) {
        outputs.set(node.id, audio(data.dataUrl, data.mimeType || 'audio/mp3', data.durationMs))
      } else {
        outputs.set(node.id, emptyText())
      }
    }

    // ── Audio Output ───────────────────────────────────────────────────────
    if (node.type === 'audioOutput') {
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      if (edgeIn) {
        const value = resolveEdgeValue(outputs, edgeIn)
        if (isAudio(value)) {
          updateNode(node.id, { value: value.data, mimeType: value.mimeType, durationMs: value.durationMs } as Record<string, unknown>)
        }
      }
    }

    // ── Image Generation (DALL-E) ──────────────────────────────────────────
    if (node.type === 'imageGen') {
      const data = node.data as unknown as ImageGenData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const prompt = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      if (!prompt.trim()) continue

      updateNode(node.id, { status: 'running', output: '', error: undefined } as Record<string, unknown>)

      try {
        const dataUrl = await generateImage(apiKey, prompt, {
          model: data.model,
          size: data.size,
          quality: data.quality,
          style: data.style,
        })
        outputs.set(node.id, image(dataUrl, 'image/png'))
        updateNode(node.id, { output: dataUrl, status: 'done', error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, emptyText())
        updateNode(node.id, { output: '', status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── TTS (Text-to-Speech) ───────────────────────────────────────────────
    if (node.type === 'tts') {
      const data = node.data as unknown as TTSData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const inputText = edgeIn ? asText(resolveEdgeValue(outputs, edgeIn)) : ''

      if (!inputText.trim()) continue

      updateNode(node.id, { status: 'running', output: '', error: undefined } as Record<string, unknown>)

      try {
        const dataUrl = await textToSpeech(apiKey, inputText, {
          model: data.model,
          voice: data.voice,
          speed: data.speed,
        })
        outputs.set(node.id, audio(dataUrl, 'audio/mp3'))
        updateNode(node.id, { output: dataUrl, status: 'done', error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, emptyText())
        updateNode(node.id, { output: '', status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── STT (Speech-to-Text) ───────────────────────────────────────────────
    if (node.type === 'stt') {
      const data = node.data as unknown as STTData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const edgeIn = incomingEdges[0]
      const value = edgeIn ? resolveEdgeValue(outputs, edgeIn) : emptyText()

      if (!isAudio(value)) continue

      updateNode(node.id, { status: 'running', output: '', error: undefined } as Record<string, unknown>)

      try {
        const transcript = await speechToText(apiKey, value.data, {
          model: data.model,
          language: data.language,
        })
        outputs.set(node.id, text(transcript))
        updateNode(node.id, { output: transcript, status: 'done', error: undefined } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, emptyText())
        updateNode(node.id, { output: '', status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── File Input (PDF/text extraction) ───────────────────────────────────
    if (node.type === 'fileInput') {
      const data = node.data as unknown as FileInputData

      if (data.dataUrl) {
        try {
          let extracted: string
          if (data.mimeType === 'application/pdf') {
            extracted = await extractPdfText(data.dataUrl)
          } else {
            // Plain text, markdown, CSV — decode base64 directly
            const base64 = data.dataUrl.split(',')[1]
            extracted = atob(base64)
          }
          outputs.set(node.id, text(extracted))
          updateNode(node.id, { extractedText: extracted, error: undefined } as Record<string, unknown>)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          outputs.set(node.id, emptyText())
          updateNode(node.id, { extractedText: '', error: msg } as Record<string, unknown>)
        }
      } else {
        outputs.set(node.id, emptyText())
      }
    }

    // ── Evaluator/Gate ──────────────────────────────────────────────────────
    if (node.type === 'evaluator') {
      const data = node.data as unknown as EvaluatorNodeData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const inputEdge = incomingEdges.find(e => e.targetHandle === 'input')
      const criteriaEdge = incomingEdges.find(e => e.targetHandle === 'criteria')
      const inputValue = inputEdge ? asText(resolveEdgeValue(outputs, inputEdge)) : ''
      const criteriaValue = criteriaEdge ? asText(resolveEdgeValue(outputs, criteriaEdge)) : ''

      updateNode(node.id, { status: 'running', output: '', verdict: '', error: undefined } as Record<string, unknown>)

      let streamedReasoning = ''

      try {
        const result = await evaluate(
          apiKey, inputValue, criteriaValue,
          data.model, data.temperature,
          chunk => {
            streamedReasoning += chunk
            updateNode(node.id, { output: streamedReasoning } as Record<string, unknown>)
          },
        )

        const verdict = result.passed ? 'pass' : 'fail'
        outputs.set(`${node.id}:reasoning`, text(result.reasoning))
        if (result.passed) {
          outputs.set(`${node.id}:pass`, text(inputValue))
        } else {
          outputs.set(`${node.id}:fail`, text(inputValue))
        }
        outputs.set(node.id, text(result.reasoning))
        updateNode(node.id, { status: 'done', output: result.reasoning, verdict } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updateNode(node.id, { status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── Sub-Flow ─────────────────────────────────────────────────────────────
    if (node.type === 'subFlow') {
      const data = node.data as unknown as SubFlowNodeData

      if (depth >= maxDepth) {
        updateNode(node.id, { status: 'error', error: `Maximum sub-flow nesting depth (${maxDepth}) exceeded` } as Record<string, unknown>)
        continue
      }

      if (!data.flowName) {
        updateNode(node.id, { status: 'error', error: 'No flow selected' } as Record<string, unknown>)
        continue
      }

      const savedFlow = loadFromLibrary(data.flowName)
      if (!savedFlow) {
        updateNode(node.id, { status: 'error', error: `Flow "${data.flowName}" not found in library` } as Record<string, unknown>)
        continue
      }

      updateNode(node.id, { status: 'running', output: '', error: undefined, currentStep: '' } as Record<string, unknown>)

      try {
        // Deep-clone and namespace IDs
        const prefix = `${node.id}::`
        const subNodes = structuredClone(savedFlow.nodes).map(n => ({ ...n, id: prefix + n.id }))
        const subEdges = structuredClone(savedFlow.edges).map(e => ({
          ...e,
          id: prefix + e.id,
          source: prefix + e.source,
          target: prefix + e.target,
        }))

        // Inject input values
        const incomingEdges = edges.filter(e => e.target === node.id)
        for (const mapping of data.inputMappings) {
          const edge = incomingEdges.find(e => e.targetHandle === mapping.handleId)
          const value = edge ? asText(resolveEdgeValue(outputs, edge)) : ''
          const subNode = subNodes.find(n => n.id === prefix + mapping.subFlowNodeId)
          if (subNode) {
            subNode.data = { ...subNode.data, value }
          }
        }

        // Execute sub-flow recursively
        const subUpdateNode = (subId: string, patch: Partial<ModelNodeData>) => {
          const shortId = subId.replace(prefix, '')
          updateNode(node.id, { currentStep: shortId } as Record<string, unknown>)
          // Also forward the update so inner nodes get their status
        }

        const subOutputs = await runFlow(subNodes, subEdges, apiKey, subUpdateNode, { depth: depth + 1, maxDepth })

        // Extract outputs
        let firstOutput = ''
        for (const mapping of data.outputMappings) {
          const subNodeId = prefix + mapping.subFlowNodeId
          // Check for textOutput — its value comes from incoming edges in sub-flow
          const subIncoming = subEdges.find(e => e.target === subNodeId)
          let value: FlowValue = emptyText()
          if (subIncoming) {
            const compositeKey = subIncoming.sourceHandle ? `${subIncoming.source}:${subIncoming.sourceHandle}` : ''
            value = (compositeKey ? subOutputs.get(compositeKey) : undefined) ?? subOutputs.get(subIncoming.source) ?? emptyText()
          }
          outputs.set(`${node.id}:${mapping.handleId}`, value)
          if (!firstOutput) firstOutput = asText(value)
        }
        outputs.set(node.id, text(firstOutput))
        updateNode(node.id, { status: 'done', output: firstOutput, currentStep: '' } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updateNode(node.id, { status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── Loop/Retry ───────────────────────────────────────────────────────────
    if (node.type === 'loop') {
      const data = node.data as unknown as LoopNodeData

      if (depth >= maxDepth) {
        updateNode(node.id, { status: 'error', error: `Maximum nesting depth (${maxDepth}) exceeded` } as Record<string, unknown>)
        continue
      }

      if (!data.flowName) {
        updateNode(node.id, { status: 'error', error: 'No flow selected' } as Record<string, unknown>)
        continue
      }

      const savedFlow = loadFromLibrary(data.flowName)
      if (!savedFlow) {
        updateNode(node.id, { status: 'error', error: `Flow "${data.flowName}" not found` } as Record<string, unknown>)
        continue
      }

      const incomingEdges = edges.filter(e => e.target === node.id)
      const inputEdge = incomingEdges.find(e => e.targetHandle === 'input')
      let currentInput = inputEdge ? asText(resolveEdgeValue(outputs, inputEdge)) : ''
      const criteriaEdge = incomingEdges.find(e => e.targetHandle === 'criteria')
      const criteria = criteriaEdge ? asText(resolveEdgeValue(outputs, criteriaEdge)) : ''

      updateNode(node.id, { status: 'running', output: '', error: undefined, iteration: 0, iterationLog: [] } as Record<string, unknown>)

      let lastOutput = ''
      const log: string[] = []
      let finalIteration = 0

      try {
        for (let i = 0; i < data.maxIterations; i++) {
          finalIteration = i + 1
          updateNode(node.id, { iteration: i + 1 } as Record<string, unknown>)

          const prefix = `${node.id}::${i}::`
          const iterNodes = structuredClone(savedFlow.nodes).map(n => ({ ...n, id: prefix + n.id }))
          const iterEdges = structuredClone(savedFlow.edges).map(e => ({
            ...e,
            id: prefix + e.id,
            source: prefix + e.source,
            target: prefix + e.target,
          }))

          // Inject feedback input
          if (data.feedbackInputHandle && data.inputMappings.length > 0) {
            const feedbackMapping = data.inputMappings.find(m => m.handleId === data.feedbackInputHandle)
            if (feedbackMapping) {
              const subNode = iterNodes.find(n => n.id === prefix + feedbackMapping.subFlowNodeId)
              if (subNode) {
                subNode.data = { ...subNode.data, value: currentInput }
              }
            }
          }

          // Inject constant inputs from edges (non-feedback)
          for (const mapping of data.inputMappings) {
            if (mapping.handleId === data.feedbackInputHandle) continue
            const edge = incomingEdges.find(e => e.targetHandle === mapping.handleId)
            const value = edge ? asText(resolveEdgeValue(outputs, edge)) : ''
            const subNode = iterNodes.find(n => n.id === prefix + mapping.subFlowNodeId)
            if (subNode) {
              subNode.data = { ...subNode.data, value }
            }
          }

          const subUpdateNode = (_subId: string, _patch: Partial<ModelNodeData>) => {
            // Status forwarding for inner nodes
          }

          const subOutputs = await runFlow(iterNodes, iterEdges, apiKey, subUpdateNode, { depth: depth + 1, maxDepth })

          // Extract output via feedback output handle
          if (data.feedbackOutputHandle && data.outputMappings.length > 0) {
            const outputMapping = data.outputMappings.find(m => m.handleId === data.feedbackOutputHandle)
            if (outputMapping) {
              const subNodeId = prefix + outputMapping.subFlowNodeId
              const subIncoming = iterEdges.find(e => e.target === subNodeId)
              if (subIncoming) {
                const compositeKey = subIncoming.sourceHandle ? `${subIncoming.source}:${subIncoming.sourceHandle}` : ''
                const fv = (compositeKey ? subOutputs.get(compositeKey) : undefined) || subOutputs.get(subIncoming.source) || emptyText()
                lastOutput = asText(fv)
              }
            }
          }
          if (!lastOutput) {
            // Fallback: grab first output node's value
            for (const mapping of data.outputMappings) {
              const subNodeId = prefix + mapping.subFlowNodeId
              const subIncoming = iterEdges.find(e => e.target === subNodeId)
              if (subIncoming) {
                const fv = subOutputs.get(subIncoming.source) || emptyText()
                lastOutput = asText(fv)
                break
              }
            }
          }

          log.push(`[${i + 1}] ${lastOutput.slice(0, 100)}${lastOutput.length > 100 ? '…' : ''}`)
          updateNode(node.id, { output: lastOutput, iterationLog: [...log] } as Record<string, unknown>)

          // Check break condition
          if (data.breakMode === 'evaluator' && data.evaluatorModel) {
            const result = await evaluate(apiKey, lastOutput, criteria, data.evaluatorModel, 0.2)
            if (result.passed) break
          } else if (data.breakMode === 'regex' && data.breakPattern) {
            if (new RegExp(data.breakPattern).test(lastOutput)) break
          }

          currentInput = lastOutput
        }

        outputs.set(node.id, text(lastOutput))
        outputs.set(`${node.id}:out`, text(lastOutput))
        outputs.set(`${node.id}:iterations`, text(String(finalIteration)))
        outputs.set(`${node.id}:log`, text(log.join('\n')))
        updateNode(node.id, { status: 'done', output: lastOutput, iteration: finalIteration, iterationLog: log } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updateNode(node.id, { status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── Model Router ─────────────────────────────────────────────────────────
    if (node.type === 'modelRouter') {
      const data = node.data as unknown as ModelRouterNodeData
      const incomingEdges = edges.filter(e => e.target === node.id)
      const promptEdge = incomingEdges.find(e => e.targetHandle === 'prompt')
      const prompt = promptEdge ? asText(resolveEdgeValue(outputs, promptEdge)) : ''
      const budgetEdge = incomingEdges.find(e => e.targetHandle === 'budget')
      const budget = budgetEdge ? asText(resolveEdgeValue(outputs, budgetEdge)) : ''

      updateNode(node.id, { status: 'running', output: '', error: undefined, reasoning: '' } as Record<string, unknown>)

      try {
        let selectedModel = ''
        let reasoning = ''

        if (data.routingMode === 'rule-based') {
          const { models } = await loadModels(apiKey)

          for (const rule of data.rules) {
            const model = models.find(m => m.id === rule.modelId)
            if (!model) continue

            let matches = false
            switch (rule.condition) {
              case 'cost-under': {
                const price = model.price ?? ''
                const inputCost = parseFloat(price.split('/')[0]?.replace('$', '') ?? '999')
                matches = inputCost <= parseFloat(rule.value)
                break
              }
              case 'context-over': {
                const ctx = model.context ?? ''
                const ctxNum = ctx.endsWith('M') ? parseFloat(ctx) * 1000 : parseFloat(ctx)
                const ruleNum = rule.value.endsWith('M') ? parseFloat(rule.value) * 1000 : parseFloat(rule.value)
                matches = ctxNum >= ruleNum
                break
              }
              case 'has-tag':
                matches = model.tags?.some(t => t.toLowerCase() === rule.value.toLowerCase()) ?? false
                break
              case 'provider-is':
                matches = model.id.startsWith(rule.value)
                break
            }

            if (matches) {
              selectedModel = rule.modelId
              reasoning = `Rule matched: ${rule.condition} ${rule.value} → ${rule.modelId}`
              break
            }
          }

          if (!selectedModel) {
            selectedModel = data.fallbackModel || 'openrouter/auto'
            reasoning = `No rules matched, using fallback: ${selectedModel}`
          }
        } else {
          // LLM-based routing
          const { models } = await loadModels(apiKey)
          const modelList = models.slice(0, 30)
            .map(m => `${m.id} | ${m.label} | context:${m.context ?? '?'} | price:${m.price ?? '?'} | tags:${m.tags?.join(',') ?? ''}`)
            .join('\n')

          const messages = [
            {
              role: 'system' as const,
              content: `You are a model routing expert. Given a task and available models, pick the best model.
Consider: task complexity, required capabilities (vision, reasoning, code), cost, context length.
${budget ? `Budget constraint: ${budget}` : ''}
Respond with ONLY the model ID on the first line, then explain your reasoning.`,
            },
            {
              role: 'user' as const,
              content: `Task: ${prompt}\n\nAvailable models:\n${modelList}`,
            },
          ]

          let full = ''
          await new Promise<void>(resolve => {
            streamCompletion(
              apiKey, data.routerModel, messages,
              chunk => { full += chunk },
              () => resolve(),
              () => resolve(),
              data.routerTemperature,
            )
          })

          const lines = full.trim().split('\n')
          selectedModel = lines[0]?.trim() ?? 'openrouter/auto'
          reasoning = lines.slice(1).join('\n')

          // Validate model ID exists
          const valid = models.some(m => m.id === selectedModel)
          if (!valid) {
            reasoning = `Selected "${selectedModel}" not found in registry, falling back to auto.\n\n${reasoning}`
            selectedModel = 'openrouter/auto'
          }
        }

        outputs.set(node.id, text(selectedModel))
        outputs.set(`${node.id}:model_id`, text(selectedModel))
        outputs.set(`${node.id}:reasoning`, text(reasoning))
        updateNode(node.id, { status: 'done', output: selectedModel, reasoning } as Record<string, unknown>)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        outputs.set(node.id, text('openrouter/auto'))
        updateNode(node.id, { status: 'error', error: msg } as Record<string, unknown>)
      }
    }

    // ── Text Output (write-back handled by flowStore.ts) ───────────────────
    if (node.type === 'textOutput') {
      // textOutput/imageOutput/audioOutput receive their value via the store
    }
  }

  return outputs
}
