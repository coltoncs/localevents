import { put } from '@vercel/blob'
import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/api.upload'
import { canUserCreateEvent } from '~/utils/permissions.server'

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has permission to upload (authors and admins only)
  const cookieHeader = args.request.headers.get('Cookie')
  const canUpload = await canUserCreateEvent(userId, cookieHeader)
  if (!canUpload) {
    return Response.json({ error: 'Only authors and admins can upload images' }, { status: 403 })
  }

  const formData = await args.request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' }, { status: 400 })
  }

  // Validate file size (max 4.5MB for Vercel Blob free tier)
  const maxSize = 4.5 * 1024 * 1024
  if (file.size > maxSize) {
    return Response.json({ error: 'File too large. Maximum size is 4.5MB' }, { status: 400 })
  }

  try {
    // Generate a unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `events/${userId}/${timestamp}.${extension}`

    const blob = await put(filename, file, {
      access: 'public',
    })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
