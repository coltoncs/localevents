import { del } from '@vercel/blob'
import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/api.delete-image'
import { canUserCreateEvent } from '~/utils/permissions.server'

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has permission (authors and admins only)
  const cookieHeader = args.request.headers.get('Cookie')
  const canDelete = await canUserCreateEvent(userId, cookieHeader)
  if (!canDelete) {
    return Response.json({ error: 'Only authors and admins can delete images' }, { status: 403 })
  }

  const formData = await args.request.formData()
  const url = formData.get('url') as string | null

  if (!url) {
    return Response.json({ error: 'No URL provided' }, { status: 400 })
  }

  // Only delete Vercel Blob URLs (security check)
  if (!url.includes('.vercel-storage.com') && !url.includes('.blob.vercel-storage.com')) {
    // Not a Vercel Blob URL, just return success (nothing to delete)
    return Response.json({ success: true, message: 'Not a Vercel Blob URL' })
  }

  try {
    await del(url)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete image error:', error)
    // Return success even if delete fails - the image might already be deleted
    return Response.json({ success: true, message: 'Image may have already been deleted' })
  }
}
