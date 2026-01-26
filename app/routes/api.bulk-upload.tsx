import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/api.bulk-upload'
import { canUserManageAuthors } from '~/utils/permissions.server'
import { bulkCreateEvents } from '~/utils/events.server'
import { transformApiEvents } from '~/utils/transformApiData'

export async function action(args: Route.ActionArgs): Promise<Response> {
  const { userId } = await getAuth(args)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canManage = await canUserManageAuthors(userId)
  if (!canManage) {
    return Response.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await args.request.json()
    const { events, chunkIndex, totalChunks } = body as {
      events: unknown[]
      chunkIndex: number
      totalChunks: number
    }

    if (!Array.isArray(events)) {
      return Response.json({ error: 'Events must be an array' }, { status: 400 })
    }

    // Transform API events to app format
    const transformedEvents = transformApiEvents(events)

    // Set createdBy to the admin's userId and remove id field
    const eventsToCreate = transformedEvents.map(({ id, ...rest }) => ({
      ...rest,
      createdBy: userId
    }))

    // Create events in this chunk
    const result = await bulkCreateEvents(eventsToCreate)

    return Response.json({
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      chunkIndex,
      totalChunks,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Bulk upload chunk error:', error)
    return Response.json({ error: `Failed to process chunk: ${errorMessage}` }, { status: 500 })
  }
}
