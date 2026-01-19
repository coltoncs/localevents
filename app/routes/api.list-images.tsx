import { list } from '@vercel/blob'
import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/api.list-images'
import { canUserCreateEvent } from '~/utils/permissions.server'

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has permission (authors and admins only)
  const cookieHeader = args.request.headers.get('Cookie')
  const canAccess = await canUserCreateEvent(userId, cookieHeader)
  if (!canAccess) {
    return Response.json({ error: 'Only authors and admins can access images' }, { status: 403 })
  }

  try {
    // List blobs with prefix matching user's folder
    const { blobs } = await list({
      prefix: `events/${userId}/`,
    })

    // Return sorted by upload date (newest first)
    const images = blobs
      .map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        uploadedAt: blob.uploadedAt,
      }))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    return Response.json({ images })
  } catch (error) {
    console.error('Failed to list images:', error)
    return Response.json({ error: 'Failed to list images' }, { status: 500 })
  }
}
