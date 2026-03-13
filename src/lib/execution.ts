import { type Edge, type Node } from '@xyflow/react'
import { streamCompletion, generateImage, textToSpeech, speechToText, type Message } from './openrouter'
import type {
  ModelNodeData, TextInputData, JsonExtractData, PromptTemplateData,
  ConditionalData, HttpRequestData, CodeRunnerData, ConversationBufferData,
  VariableStoreData, ImageInputData, ImageOutputData, AudioInputData,
  AudioOutputData, ImageGenData, TTSData, STTData, FileInputData,
} from '../types/flow'
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
) {
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

      for (const edge of incomingEdges) {
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
          data.model,
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

    // ── Text Output (write-back handled by flowStore.ts) ───────────────────
    if (node.type === 'textOutput') {
      // textOutput/imageOutput/audioOutput receive their value via the store
    }
  }

  return outputs
}
