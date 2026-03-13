// ─── FlowValue: Universal Edge Type ─────────────────────────────────────────
// The discriminated union that makes the entire flow graph multimodal.
// Every edge carries a FlowValue. The `.type` discriminant determines the payload.
//
// The key design property: `asText()` degrades ANY FlowValue to a string,
// giving perfect backward compatibility. Existing text-only nodes never break.

// ─── Variants ────────────────────────────────────────────────────────────────

export interface FlowTextValue {
  type: 'text'
  data: string
}

export interface FlowImageValue {
  type: 'image'
  /** data URL (data:image/...;base64,...) or remote HTTPS URL */
  data: string
  mimeType: string
  width?: number
  height?: number
}

export interface FlowAudioValue {
  type: 'audio'
  /** data URL (data:audio/...;base64,...) or blob URL */
  data: string
  mimeType: string
  durationMs?: number
}

export interface FlowJsonValue {
  type: 'json'
  data: unknown
}

export type FlowValue = FlowTextValue | FlowImageValue | FlowAudioValue | FlowJsonValue

// ─── Constructors ────────────────────────────────────────────────────────────

/** Wrap a plain string into a FlowTextValue */
export function text(s: string): FlowTextValue {
  return { type: 'text', data: s }
}

/** Create an empty text value (the default for missing edges) */
export function emptyText(): FlowTextValue {
  return { type: 'text', data: '' }
}

/** Create a FlowImageValue from a data URL or remote URL */
export function image(
  data: string,
  mimeType = 'image/png',
  width?: number,
  height?: number,
): FlowImageValue {
  return { type: 'image', data, mimeType, width, height }
}

/** Create a FlowAudioValue from a data URL */
export function audio(
  data: string,
  mimeType = 'audio/mp3',
  durationMs?: number,
): FlowAudioValue {
  return { type: 'audio', data, mimeType, durationMs }
}

/** Create a FlowJsonValue from any data */
export function json(data: unknown): FlowJsonValue {
  return { type: 'json', data }
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isText(v: FlowValue): v is FlowTextValue {
  return v.type === 'text'
}

export function isImage(v: FlowValue): v is FlowImageValue {
  return v.type === 'image'
}

export function isAudio(v: FlowValue): v is FlowAudioValue {
  return v.type === 'audio'
}

export function isJson(v: FlowValue): v is FlowJsonValue {
  return v.type === 'json'
}

// ─── Conversions ─────────────────────────────────────────────────────────────

/**
 * Degrade any FlowValue to a string representation.
 * This is the Rosetta Stone of backward compatibility —
 * every existing text-only node calls this on its inputs.
 */
export function asText(v: FlowValue): string {
  switch (v.type) {
    case 'text':
      return v.data
    case 'image':
      // For text-expecting nodes, return a placeholder.
      // The actual data URL is preserved in the FlowValue for media-aware nodes.
      return v.data.startsWith('data:')
        ? `[image: ${v.mimeType}${v.width ? `, ${v.width}×${v.height}` : ''}]`
        : v.data // If it's a URL, return the URL string
    case 'audio':
      return `[audio: ${v.mimeType}${v.durationMs ? `, ${Math.round(v.durationMs / 1000)}s` : ''}]`
    case 'json':
      return typeof v.data === 'string' ? v.data : JSON.stringify(v.data, null, 2)
  }
}

/**
 * Convert a data URL to a Blob — used for API calls that need file uploads.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

/**
 * Convert a File/Blob to a data URL via FileReader.
 */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
