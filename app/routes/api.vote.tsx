import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/api.vote'
import { toggleVote, getVoteCount } from '~/utils/votes.server'

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await args.request.formData()
  const eventId = formData.get('eventId') as string

  if (!eventId) {
    return Response.json({ error: 'Event ID required' }, { status: 400 })
  }

  const isVoted = await toggleVote(userId, eventId)
  const voteCount = await getVoteCount(eventId)

  return Response.json({ isVoted, voteCount })
}
