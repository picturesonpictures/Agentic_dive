export type NodeStatus = 'idle' | 'running' | 'done' | 'error'

export interface PORT_COLORS_TYPE {
  text: string
  json: string
  bool: string
  number: string
}

export const PORT_COLORS = {
  text: '#a78bfa',
  json: '#34d399',
  bool: '#fbbf24',
  number: '#60a5fa',
}

export interface TextInputNodeData {
  text: string
  output?: string
}

export interface ConcatNodeData {
  separator: string
  output?: string
}

export interface ModelNodeData {
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  output?: string
  status?: NodeStatus
  error?: string
}

export interface ConditionalNodeData {
  condition: string
  trueOutput?: string
  falseOutput?: string
}

export interface HttpNodeData {
  url: string
  method: string
  headers: string
  body: string
  output?: string
  status?: NodeStatus
  error?: string
}

export interface OutputNodeData {
  label: string
  output?: string
}

export interface ModelOption {
  id: string
  label: string
  group: string
  context?: string
  price?: string
  tags?: string[]
}

export const MODELS: ModelOption[] = [
  { id: 'openai/gpt-4o', label: 'GPT-4o', group: 'OpenAI', context: '128k', price: '$2.50/$10', tags: ['flagship'] },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', group: 'OpenAI', context: '128k', price: '$0.15/$0.60', tags: ['fast', 'cheap'] },
  { id: 'openai/o3-mini', label: 'o3-mini', group: 'OpenAI', context: '200k', price: '$1.10/$4.40', tags: ['reasoning'] },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', group: 'Anthropic', context: '200k', price: '$3/$15', tags: ['flagship'] },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', group: 'Anthropic', context: '200k', price: '$0.80/$4', tags: ['fast'] },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', group: 'Google', context: '1M', price: '$0.10/$0.40', tags: ['fast', 'cheap'] },
  { id: 'google/gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro', group: 'Google', context: '1M', price: '$1.25/$10', tags: ['flagship'] },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', group: 'Meta', context: '128k', price: '$0.12/$0.30', tags: ['open'] },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1 24B', group: 'Mistral', context: '128k', price: '$0.10/$0.30', tags: ['open', 'fast'] },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', group: 'DeepSeek', context: '64k', price: '$0.14/$0.28', tags: ['cheap'] },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', group: 'DeepSeek', context: '64k', price: '$0.55/$2.19', tags: ['reasoning'] },
]

export interface FlowFile {
  version: number
  nodes: import('@xyflow/react').Node[]
  edges: import('@xyflow/react').Edge[]
}
