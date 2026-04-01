import OpenAI from 'openai'
import { dataUrlToBlob } from './flowValue'

// OpenRouter is OpenAI-API-compatible — we just point the base URL at them.
// dangerouslyAllowBrowser is required for direct browser calls (no backend).
// The user's key never leaves their machine — it goes directly to OpenRouter.

function makeClient(apiKey: string, model?: string) {
  const isOllama = model?.startsWith('ollama/')
  return new OpenAI({
    apiKey: isOllama ? 'ollama' : apiKey,
    baseURL: isOllama ? 'http://localhost:11434/v1' : 'https://openrouter.ai/api/v1',
    defaultHeaders: isOllama ? {} : {
      'HTTP-Referer': 'https://llm-flow-builder',
      'X-Title': 'LLM Flow Builder',
    },
    dangerouslyAllowBrowser: true,
  })
}

// Strip the "ollama/" prefix so Ollama gets the raw model name it expects
function resolveModelId(model: string): string {
  return model.startsWith('ollama/') ? model.slice(7) : model
}

// ─── Multimodal Message Types ────────────────────────────────────────────────
// The content field supports both plain strings (text-only) and arrays (vision/audio).
// When content is a string, it's passed through as-is for maximum compatibility.
// When content is an array, it contains typed content parts for multimodal inputs.

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } }

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

// ─── Chat Completions (streaming) ────────────────────────────────────────────

export async function streamCompletion(
  apiKey: string,
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (full: string) => void,
  onError: (err: string) => void,
  temperature = 0.7,
): Promise<void> {
  const client = makeClient(apiKey, model)
  let full = ''

  try {
    const stream = await client.chat.completions.create({
      model: resolveModelId(model),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      temperature,
      stream: true,
    })

    let inThink = false
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (!delta) continue

      // Strip <think>...</think> blocks from thinking models (e.g. Qwen 3.5)
      let remaining = delta
      while (remaining) {
        if (inThink) {
          const closeIdx = remaining.indexOf('</think>')
          if (closeIdx === -1) { remaining = ''; break }
          remaining = remaining.slice(closeIdx + 8)
          inThink = false
        } else {
          const openIdx = remaining.indexOf('<think>')
          if (openIdx === -1) {
            full += remaining
            onChunk(remaining)
            remaining = ''
          } else {
            const before = remaining.slice(0, openIdx)
            if (before) { full += before; onChunk(before) }
            remaining = remaining.slice(openIdx + 7)
            inThink = true
          }
        }
      }
    }

    onDone(full)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    onError(msg)
  }
}

// ─── Image Generation (DALL-E via OpenRouter) ────────────────────────────────

export async function generateImage(
  apiKey: string,
  prompt: string,
  options: { model?: string; size?: string; quality?: string; style?: string } = {},
): Promise<string> {
  const client = makeClient(apiKey)

  const response = await client.images.generate({
    model: options.model || 'dall-e-3',
    prompt,
    n: 1,
    size: (options.size || '1024x1024') as '1024x1024',
    quality: (options.quality || 'standard') as 'standard',
    style: (options.style || 'vivid') as 'vivid',
    response_format: 'b64_json',
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error('No image data returned')
  return `data:image/png;base64,${b64}`
}

// ─── Text-to-Speech ──────────────────────────────────────────────────────────

export async function textToSpeech(
  apiKey: string,
  input: string,
  options: { model?: string; voice?: string; speed?: number } = {},
): Promise<string> {
  const client = makeClient(apiKey)

  const response = await client.audio.speech.create({
    model: options.model || 'tts-1',
    voice: (options.voice || 'alloy') as 'alloy',
    input,
    speed: options.speed ?? 1.0,
    response_format: 'mp3',
  })

  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/mp3;base64,${btoa(binary)}`
}

// ─── Speech-to-Text (Whisper) ────────────────────────────────────────────────

export async function speechToText(
  apiKey: string,
  audioDataUri: string,
  options: { model?: string; language?: string } = {},
): Promise<string> {
  const client = makeClient(apiKey)

  const blob = dataUrlToBlob(audioDataUri)
  const file = new File([blob], 'audio.mp3', { type: blob.type })

  const response = await client.audio.transcriptions.create({
    model: options.model || 'whisper-1',
    file,
    language: options.language,
  })

  return response.text
}
