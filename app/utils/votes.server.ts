import { prisma } from './db.server'

/**
 * Toggle a vote for an event (add if not exists, remove if exists)
 * Returns the new vote state (true = voted, false = unvoted)
 */
export async function toggleVote(userId: string, eventId: string): Promise<boolean> {
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_eventId: { userId, eventId }
    }
  })

  if (existingVote) {
    await prisma.vote.delete({
      where: { id: existingVote.id }
    })
    return false
  } else {
    await prisma.vote.create({
      data: { userId, eventId }
    })
    return true
  }
}

/**
 * Check if a user has voted for an event
 */
export async function hasUserVoted(userId: string, eventId: string): Promise<boolean> {
  const vote = await prisma.vote.findUnique({
    where: {
      userId_eventId: { userId, eventId }
    }
  })
  return !!vote
}

/**
 * Get vote count for a single event
 */
export async function getVoteCount(eventId: string): Promise<number> {
  return prisma.vote.count({
    where: { eventId }
  })
}

/**
 * Batch fetch vote counts for multiple events (optimization)
 */
export async function getVoteCountsForEvents(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) {
    return {}
  }

  const counts = await prisma.vote.groupBy({
    by: ['eventId'],
    where: { eventId: { in: eventIds } },
    _count: { eventId: true }
  })

  const result: Record<string, number> = {}
  eventIds.forEach(id => result[id] = 0)
  counts.forEach(c => result[c.eventId] = c._count.eventId)
  return result
}

/**
 * Batch check if user has voted for multiple events (optimization)
 */
export async function getUserVotesForEvents(userId: string, eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set()
  }

  const votes = await prisma.vote.findMany({
    where: {
      userId,
      eventId: { in: eventIds }
    },
    select: { eventId: true }
  })
  return new Set(votes.map(v => v.eventId))
}

/**
 * Get all event IDs that a user has favorited
 */
export async function getUserFavoriteEventIds(userId: string): Promise<string[]> {
  const votes = await prisma.vote.findMany({
    where: { userId },
    select: { eventId: true }
  })
  return votes.map(v => v.eventId)
}
