import { useState, useRef } from 'react'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUrlChange: (url: string) => void
}

type InputMode = 'upload' | 'url'

export function ImageUpload({ currentImageUrl, onImageUrlChange }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [urlInput, setUrlInput] = useState(currentImageUrl || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Track the blob URL for deletion purposes
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type client-side
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP')
      return
    }

    // Validate file size client-side (4.5MB)
    const maxSize = 4.5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 4.5MB')
      return
    }

    setError(null)
    setIsUploading(true)

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to server
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadedBlobUrl(data.url)
      onImageUrlChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview(currentImageUrl || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setError('Please enter a URL')
      return
    }

    try {
      new URL(urlInput)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    setError(null)
    setPreview(urlInput)
    onImageUrlChange(urlInput)
  }

  const handleRemove = async () => {
    // Delete the blob if it was uploaded during this session
    if (uploadedBlobUrl) {
      try {
        const formData = new FormData()
        formData.append('url', uploadedBlobUrl)
        await fetch('/api/delete-image', {
          method: 'POST',
          body: formData,
        })
      } catch (err) {
        // Silently fail - the blob might already be deleted
        console.error('Failed to delete image:', err)
      }
      setUploadedBlobUrl(null)
    }

    setPreview(null)
    setUrlInput('')
    onImageUrlChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Event Image</label>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            inputMode === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setInputMode('url')}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            inputMode === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Enter URL
        </button>
      </div>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Event preview"
            className="max-w-xs max-h-48 rounded border border-slate-700 object-cover"
            onError={() => {
              setError('Failed to load image from URL')
              setPreview(null)
              onImageUrlChange('')
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : inputMode === 'upload' ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-xs h-32 border-2 border-dashed border-slate-600 rounded cursor-pointer hover:border-slate-500 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">Click to upload image</span>
          <span className="text-xs">JPEG, PNG, GIF, WebP (max 4.5MB)</span>
        </div>
      ) : (
        <div className="flex gap-2 max-w-md">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Load
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
