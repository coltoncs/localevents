import { redirect } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import { deleteEvent } from '~/utils/events.server'
import { canUserModifyEvent } from '~/utils/permissions.server'
import type { Route } from './+types/events.$id.delete'

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  const eventId = args.params.id

  // Check permission
  const cookieHeader = args.request.headers.get('Cookie')
  const canDelete = await canUserModifyEvent(userId, eventId, cookieHeader)
  if (!canDelete) {
    throw new Response('You do not have permission to delete this event', { status: 403 })
  }

  // Delete the event
  await deleteEvent(eventId)

  return redirect('/my-events')
}

// This route only handles POST requests, redirect GET requests
export async function loader() {
  return redirect('/my-events')
}
