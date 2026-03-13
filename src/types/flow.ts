// ─── Port Types ──────────────────────────────────────────────────────────────
// Each port has a type that determines which connections are valid.
// Colors mirror ComfyUI conventions so the UI feels immediately familiar.

export type PortType = 'text' | 'image' | 'audio' | 'json' | 'any'

export const PORT_COLORS: Record<PortType, string> = {
  text:  '#3b82f6', // blue
  image: '#a855f7', // purple
  audio: '#f59e0b', // amber
  json:  '#22c55e', // green
  any:   '#6b7280', // gray
}

// ─── Node Data ────────────────────────────────────────────────────────────────

export interface TextInputData {
  label: string
  value: string
}

export interface ModelNodeData {
  model: string
  systemPrompt: string
  temperature: number
  output: string
  status: 'idle' | 'running' | 'done' | 'error'
  error?: string
}

export interface TextOutputData {
  value: string
}

export interface NoteData {
  text: string
  color: string
}

export interface ConcatData {
  separator: string
}

export interface JsonExtractData {
  path: string
  output?: string
  error?: string
}

export interface PromptTemplateData {
  template: string
}

export interface ConditionalData {
  mode: 'contains' | 'regex' | 'equals' | 'not-empty'
  pattern: string
  output?: string   // shows which branch fired
  error?: string
}

export interface HttpRequestData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers: string     // JSON string of headers
  body: string        // request body (for POST/PUT)
  output?: string
  status?: number
  error?: string
}

export interface ConversationBufferData {
  maxMessages: number       // max messages to keep
  messages: string[]        // accumulated messages (persists across runs)
  output?: string           // serialized messages for downstream
}

export interface VariableStoreData {
  varName: string           // variable name
  mode: 'get' | 'set'      // read or write
  output?: string           // current value for display
}

export interface CodeRunnerData {
  code: string
  output?: string
  error?: string
}

// ─── Multimodal Node Data ────────────────────────────────────────────────────

export interface ImageInputData {
  label: string
  source: 'upload' | 'url' | 'clipboard'
  url: string
  dataUrl: string
  width?: number
  height?: number
}

export interface ImageOutputData {
  value: string       // data URL or remote URL
  width?: number
  height?: number
}

export interface AudioInputData {
  label: string
  source: 'upload' | 'record'
  dataUrl: string
  mimeType: string
  durationMs?: number
}

export interface AudioOutputData {
  value: string       // data URI
  mimeType: string
  durationMs?: number
}

export interface FileInputData {
  label: string
  fileName: string
  mimeType: string
  dataUrl: string
  extractedText: string
  error?: string
}

export interface ImageGenData {
  model: string
  size: string
  quality: 'standard' | 'hd'
  style: 'vivid' | 'natural'
  output?: string
  status: 'idle' | 'running' | 'done' | 'error'
  error?: string
}

export interface TTSData {
  model: string
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed: number
  output?: string
  status: 'idle' | 'running' | 'done' | 'error'
  error?: string
}

export interface STTData {
  model: string
  language?: string
  output?: string
  status: 'idle' | 'running' | 'done' | 'error'
  error?: string
}

// ─── Available Models ─────────────────────────────────────────────────────────

export interface ModelOption {
  id: string
  label: string
  group: string
  context?: string   // e.g. "1M"
  price?: string     // e.g. "$3/$15"
  tags?: string[]    // e.g. ["vision", "fast", "free"]
}

export const MODELS: ModelOption[] = [
  // ── Routing ──────────────────────────────────────────────────────────────
  { id: 'openrouter/auto', label: 'Auto (best for task)', group: '✨ OpenRouter', tags: ['smart'] },
  { id: 'openrouter/free', label: 'Free (auto)',          group: '✨ OpenRouter', tags: ['free'] },

  // ── Anthropic ─────────────────────────────────────────────────────────────
  { id: 'anthropic/claude-opus-4-6',           label: 'Claude Opus 4.6',        group: '🟣 Anthropic', context: '1M',   price: '$5/$25',    tags: ['vision', 'reasoning'] },
  { id: 'anthropic/claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',      group: '🟣 Anthropic', context: '1M',   price: '$3/$15',    tags: ['vision', 'fast'] },
  { id: 'anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',       group: '🟣 Anthropic', context: '200K', price: '$1/$5',     tags: ['vision', 'fast', 'cheap'] },
  { id: 'anthropic/claude-3-5-sonnet',         label: 'Claude 3.5 Sonnet',      group: '🟣 Anthropic', context: '200K', price: '$3/$15',    tags: ['vision'] },
  { id: 'anthropic/claude-3-5-haiku',          label: 'Claude 3.5 Haiku',       group: '🟣 Anthropic', context: '200K', price: '$0.8/$4',   tags: ['vision', 'fast'] },

  // ── OpenAI ────────────────────────────────────────────────────────────────
  { id: 'openai/gpt-4o',       label: 'GPT-4o',        group: '🟢 OpenAI', context: '128K', price: '$2.5/$10',   tags: ['vision'] },
  { id: 'openai/gpt-4o-mini',  label: 'GPT-4o Mini',   group: '🟢 OpenAI', context: '128K', price: '$0.15/$0.6', tags: ['vision', 'fast', 'cheap'] },
  { id: 'openai/o1',           label: 'o1',             group: '🟢 OpenAI', context: '200K', price: '$15/$60',    tags: ['reasoning'] },
  { id: 'openai/o1-mini',      label: 'o1 Mini',        group: '🟢 OpenAI', context: '128K', price: '$1.1/$4.4',  tags: ['reasoning', 'fast'] },
  { id: 'openai/o3-mini',      label: 'o3 Mini',        group: '🟢 OpenAI', context: '200K', price: '$1.1/$4.4',  tags: ['reasoning'] },
  { id: 'openai/gpt-4-turbo',  label: 'GPT-4 Turbo',   group: '🟢 OpenAI', context: '128K', price: '$10/$30',    tags: ['vision'] },

  // ── Google ────────────────────────────────────────────────────────────────
  { id: 'google/gemini-2.5-pro-preview',   label: 'Gemini 2.5 Pro',    group: '🔵 Google', context: '1M',  price: '$1.25/$10',   tags: ['vision', 'reasoning'] },
  { id: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash',  group: '🔵 Google', context: '1M',  price: '$0.15/$0.6',  tags: ['vision', 'fast'] },
  { id: 'google/gemini-2.0-flash-001',     label: 'Gemini 2.0 Flash',  group: '🔵 Google', context: '1M',  price: '$0.1/$0.4',   tags: ['vision', 'fast'] },
  { id: 'google/gemini-flash-1.5',         label: 'Gemini 1.5 Flash',  group: '🔵 Google', context: '1M',  price: '$0.075/$0.3', tags: ['vision', 'fast', 'cheap'] },
  { id: 'google/gemini-pro-1.5',           label: 'Gemini 1.5 Pro',    group: '🔵 Google', context: '2M',  price: '$1.25/$5',    tags: ['vision'] },

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  { id: 'deepseek/deepseek-chat',                  label: 'DeepSeek V3',           group: '🐋 DeepSeek', context: '64K', price: '$0.27/$1.1',  tags: ['cheap'] },
  { id: 'deepseek/deepseek-r1',                    label: 'DeepSeek R1',           group: '🐋 DeepSeek', context: '64K', price: '$0.55/$2.19', tags: ['reasoning', 'free'] },
  { id: 'deepseek/deepseek-r1-distill-llama-70b',  label: 'DeepSeek R1 Llama 70B', group: '🐋 DeepSeek', context: '64K', price: '$0.23/$0.69', tags: ['reasoning', 'cheap'] },

  // ── Meta / Llama ──────────────────────────────────────────────────────────
  { id: 'meta-llama/llama-3.3-70b-instruct',  label: 'Llama 3.3 70B',  group: '🦙 Meta', context: '128K', tags: ['free'] },
  { id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', group: '🦙 Meta', context: '128K', price: '$2/$2',  tags: [] },
  { id: 'meta-llama/llama-3.1-8b-instruct',   label: 'Llama 3.1 8B',   group: '🦙 Meta', context: '128K', tags: ['free', 'fast'] },

  // ── Mistral ───────────────────────────────────────────────────────────────
  { id: 'mistralai/mistral-large',          label: 'Mistral Large',   group: '🌊 Mistral', context: '128K', price: '$2/$6',     tags: [] },
  { id: 'mistralai/mistral-small',          label: 'Mistral Small',   group: '🌊 Mistral', context: '128K', price: '$0.2/$0.6', tags: ['cheap'] },
  { id: 'mistralai/codestral-2501',         label: 'Codestral',       group: '🌊 Mistral', context: '256K', price: '$0.3/$0.9', tags: ['code'] },
  { id: 'mistralai/mixtral-8x22b-instruct', label: 'Mixtral 8x22B',   group: '🌊 Mistral', context: '64K',  price: '$0.9/$0.9', tags: [] },

  // ── xAI ───────────────────────────────────────────────────────────────────
  { id: 'x-ai/grok-2-1212', label: 'Grok 2',    group: '⚡ xAI', context: '131K', price: '$2/$10',  tags: ['vision'] },
  { id: 'x-ai/grok-beta',   label: 'Grok Beta', group: '⚡ xAI', context: '131K', price: '$5/$15',  tags: [] },

  // ── Cohere ────────────────────────────────────────────────────────────────
  { id: 'cohere/command-r-plus', label: 'Command R+', group: '🔶 Cohere', context: '128K', price: '$2.5/$10',  tags: [] },
  { id: 'cohere/command-r',      label: 'Command R',  group: '🔶 Cohere', context: '128K', price: '$0.15/$0.6', tags: ['cheap'] },

  // ── Perplexity ────────────────────────────────────────────────────────────
  { id: 'perplexity/sonar-pro', label: 'Sonar Pro', group: '🔍 Perplexity', context: '200K', price: '$3/$15', tags: ['web-search'] },
  { id: 'perplexity/sonar',     label: 'Sonar',     group: '🔍 Perplexity', context: '127K', price: '$1/$1',  tags: ['web-search'] },
]

export const MODEL_GROUPS = [...new Set(MODELS.map(m => m.group))]
