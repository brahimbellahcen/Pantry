import { useState, useRef } from 'react'
import { apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'
import { Upload, X, Image } from 'lucide-react'
import { Spinner } from '@/components/ui/Badge'

interface Props {
  value?: string
  onChange: (url: string) => void
  label?: string
}

export function ImageUpload({ value, onChange, label = 'Product Image' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value || '')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post<{ url: string }>('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(data.url)
      onChange(data.url)
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview('')
    onChange('')
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer
          ${preview ? 'border-brand-300 bg-brand-50 dark:bg-brand-950' : 'border-gray-300 dark:border-gray-700 hover:border-brand-400 bg-gray-50 dark:bg-gray-800'}
          ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        style={{ minHeight: preview ? 160 : 120 }}
      >
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 rounded-xl z-10">
            <Spinner />
          </div>
        )}

        {preview ? (
          <>
            <img src={preview} alt="Preview" className="max-h-40 rounded-lg object-contain p-2" />
            <button onClick={clear}
              className="absolute right-2 top-2 rounded-full bg-white dark:bg-gray-800 p-1 shadow hover:bg-red-50">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <Image className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">Drop an image or <span className="text-brand-600 font-medium">browse</span></p>
            <p className="text-xs text-gray-400">PNG, JPG, WebP — max 5 MB</p>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* Manual URL fallback */}
      <input
        type="url"
        placeholder="Or paste an image URL…"
        value={preview}
        onChange={e => { setPreview(e.target.value); onChange(e.target.value) }}
        className="input text-xs text-gray-500"
      />
    </div>
  )
}
