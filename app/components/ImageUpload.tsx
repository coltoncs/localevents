import { useState, useRef, useEffect } from 'react'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUrlChange: (url: string) => void
}

interface UserImage {
  url: string
  pathname: string
  uploadedAt: string
}

type InputMode = 'upload' | 'url' | 'gallery'

export function ImageUpload({ currentImageUrl, onImageUrlChange }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [urlInput, setUrlInput] = useState(currentImageUrl || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Track the blob URL for deletion purposes
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null)
  // Gallery state
  const [userImages, setUserImages] = useState<UserImage[]>([])
  const [isLoadingGallery, setIsLoadingGallery] = useState(false)
  const [galleryLoaded, setGalleryLoaded] = useState(false)
  const [isManageMode, setIsManageMode] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)

  // Load user's images when gallery mode is selected
  useEffect(() => {
    if (inputMode === 'gallery' && !galleryLoaded) {
      loadUserImages()
    }
  }, [inputMode, galleryLoaded])

  const loadUserImages = async () => {
    setIsLoadingGallery(true)
    setError(null)
    try {
      const response = await fetch('/api/list-images')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load images')
      }

      setUserImages(data.images)
      setGalleryLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images')
    } finally {
      setIsLoadingGallery(false)
    }
  }

  const handleSelectFromGallery = (url: string) => {
    if (isManageMode) return // Don't select in manage mode
    setPreview(url)
    onImageUrlChange(url)
    setError(null)
  }

  const handleDeleteFromGallery = async (url: string) => {
    if (!confirm('Delete this image permanently? This cannot be undone.')) {
      return
    }

    setDeletingUrl(url)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('url', url)
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete image')
      }

      // Remove from local state
      setUserImages((prev) => prev.filter((img) => img.url !== url))

      // If this was the currently selected image, clear it
      if (preview === url) {
        setPreview(null)
        onImageUrlChange('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image')
    } finally {
      setDeletingUrl(null)
    }
  }

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
      <div className="flex gap-2 flex-wrap">
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
          onClick={() => setInputMode('gallery')}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            inputMode === 'gallery'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          My Images
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
      ) : inputMode === 'gallery' ? (
        <div className="space-y-3">
          {isLoadingGallery ? (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading your images...</span>
            </div>
          ) : userImages.length === 0 ? (
            <div className="text-slate-400 text-sm py-4">
              No uploaded images found. Upload an image first to see it here.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between max-w-md">
                <span className="text-sm text-slate-400">
                  {isManageMode ? 'Click an image to delete it' : 'Click an image to select it'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsManageMode(!isManageMode)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    isManageMode
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {isManageMode ? 'Done' : 'Manage'}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 max-w-md">
                {userImages.map((image) => (
                  <div key={image.url} className="relative group">
                    <button
                      type="button"
                      onClick={() => isManageMode ? handleDeleteFromGallery(image.url) : handleSelectFromGallery(image.url)}
                      disabled={deletingUrl === image.url}
                      className={`aspect-square rounded border-2 transition-colors overflow-hidden focus:outline-none w-full ${
                        isManageMode
                          ? 'border-red-500/50 hover:border-red-500'
                          : 'border-slate-700 hover:border-blue-500 focus:border-blue-500'
                      } ${deletingUrl === image.url ? 'opacity-50' : ''}`}
                    >
                      <img
                        src={image.url}
                        alt="Previously uploaded"
                        className="w-full h-full object-cover"
                      />
                      {isManageMode && (
                        <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                      )}
                      {deletingUrl === image.url && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
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
