import { Handle, Position } from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { PORT_COLORS } from '../../types/flow'
import type { ImageInputData } from '../../types/flow'
import { useCallback, useRef, useState } from 'react'
import { fileToDataUrl } from '../../lib/flowValue'

// ─── Image Input Node ────────────────────────────────────────────────────────
// Upload, paste, or provide a URL for an image.
// Outputs a FlowImageValue for vision-capable models.

export function ImageInputNode({ id, data }: { id: string; data: Record<string, unknown> }) {
  const d = data as unknown as ImageInputData
  const update = useFlowStore(s => s.updateNodeData)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const dataUrl = await fileToDataUrl(file)
    // Get dimensions
    const img = new Image()
    img.onload = () => {
      update(id, { dataUrl, width: img.naturalWidth, height: img.naturalHeight, source: 'upload' })
    }
    img.src = dataUrl
  }, [id, update])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const file = new File([blob], 'paste.png', { type: imageType })
          handleFile(file)
          return
        }
      }
    } catch {
      // Clipboard API not supported or denied
    }
  }, [handleFile])

  return (
    <div className="node-shell w-56">
      <div className="node-header bg-purple-700">
        🖼️ {d.label || 'Image Input'}
      </div>

      <div className="p-2 space-y-2">
        {/* Source tabs */}
        <div className="flex gap-1">
          {(['upload', 'url', 'clipboard'] as const).map(src => (
            <button
              key={src}
              onClick={() => update(id, { source: src })}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                d.source === src
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {src === 'upload' ? '📁 File' : src === 'url' ? '🔗 URL' : '📋 Paste'}
            </button>
          ))}
        </div>

        {/* Upload mode */}
        {d.source === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-purple-500 bg-purple-900/20'
                : 'border-zinc-700 hover:border-zinc-500'
            }`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <p className="text-[10px] text-zinc-500">
              {d.dataUrl ? 'Click to change' : 'Drop image or click to upload'}
            </p>
          </div>
        )}

        {/* URL mode */}
        {d.source === 'url' && (
          <input
            className="node-input w-full"
            type="text"
            placeholder="https://example.com/image.png"
            value={d.url}
            onChange={e => update(id, { url: e.target.value, dataUrl: e.target.value })}
          />
        )}

        {/* Clipboard mode */}
        {d.source === 'clipboard' && (
          <button
            onClick={handlePaste}
            className="w-full text-[10px] px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
          >
            📋 Paste from clipboard
          </button>
        )}

        {/* Preview */}
        {d.dataUrl && (
          <div className="relative">
            <img
              src={d.dataUrl}
              className="w-full rounded object-contain bg-zinc-900"
              style={{ maxHeight: 128 }}
              onClick={() => window.open(d.dataUrl, '_blank')}
            />
            <div className="absolute top-1 right-1 flex gap-1">
              {d.width && d.height && (
                <span className="text-[8px] bg-black/60 text-zinc-300 px-1 rounded">
                  {d.width}×{d.height}
                </span>
              )}
              <button
                onClick={e => { e.stopPropagation(); update(id, { dataUrl: '', url: '', width: undefined, height: undefined }) }}
                className="text-[10px] bg-black/60 text-zinc-400 hover:text-red-400 px-1 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ width: 10, height: 10, background: PORT_COLORS.image }}
      />
    </div>
  )
}
