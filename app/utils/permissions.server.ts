import { getEventById } from './events.server'
import type { Event } from '~/stores/useEventStore'
import { prisma } from './db.server'
import { getUserRole, isAdmin } from './roles.server'

/**
 * Check if a user can edit/delete an event
 * Admins can modify ANY event
 * Authors can modify ONLY their own events
 * Users cannot modify events
 */
export async function canUserModifyEvent(userId: string, eventId: string, cookieHeader?: string | null): Promise<boolean> {
  // Admins can modify any event
  if (await isAdmin(userId, cookieHeader)) {
    return true
  }

  // Authors can only modify their own events
  const role = await getUserRole(userId, cookieHeader)
  if (role === 'author') {
    const event = await getEventById(eventId)
    if (!event) {
      return false
    }
    return event.createdBy === userId
  }

  // Users cannot modify events
  return false
}

/**
 * Check if a user can create events
 * Only Admins and Authors can create events
 */
export async function canUserCreateEvent(userId: string, cookieHeader?: string | null): Promise<boolean> {
  const role = await getUserRole(userId, cookieHeader)
  return role === 'admin' || role === 'author'
}

/**
 * Check if a user can view an event
 * All users (including unauthenticated) can view events
 */
export async function canUserViewEvent(): Promise<boolean> {
  return true
}

/**
 * Check if a user can manage author applications
 * Only Admins can approve/reject author applications
 */
export async function canUserManageAuthors(userId: string, cookieHeader?: string | null): Promise<boolean> {
  return await isAdmin(userId, cookieHeader)
}

/**
 * Get all events created by a specific user
 */
export async function getEventsByUser(userId: string): Promise<Event[]> {
  const events = await prisma.event.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' }
  })

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    location: event.location,
    address: event.address || undefined,
    coordinates: event.latitude && event.longitude
      ? { lat: event.latitude, lng: event.longitude }
      : undefined,
    imageUrl: event.imageUrl || undefined,
    categories: event.categories,
    cost: event.cost || undefined,
    times: event.times || undefined,
    url: event.url || undefined,
    region: event.region || undefined,
    recurrence: event.recurrence || undefined,
    endDate: event.endDate || undefined,
    city: event.city || undefined,
    createdBy: event.createdBy,
  }))
}

interface EventFilters {
  searchQuery?: string
  category?: string
  priceFilter?: 'free' | 'paid' | 'all'
  startDate?: string
  endDate?: string
}

/**
 * Get paginated events created by a specific user with optional filters
 */
export async function getPaginatedEventsByUser(
  userId: string,
  page: number = 1,
  limit: number = 10,
  filters: EventFilters = {}
): Promise<{ events: Event[]; totalCount: number }> {
  const skip = (page - 1) * limit
  const { searchQuery, category, priceFilter, startDate, endDate } = filters

  // Build dynamic where clause (same as getPaginatedEvents but with userId filter)
  const whereConditions: any[] = [
    { createdBy: userId }  // Only show user's events
  ]

  // Search query
  if (searchQuery) {
    whereConditions.push({
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' as const } },
        { description: { contains: searchQuery, mode: 'insensitive' as const } },
        { location: { contains: searchQuery, mode: 'insensitive' as const } },
        { city: { contains: searchQuery, mode: 'insensitive' as const } },
        { address: { contains: searchQuery, mode: 'insensitive' as const } },
        { categories: { has: searchQuery } },
      ],
    })
  }

  // Category filter
  if (category) {
    whereConditions.push({
      categories: { has: category },
    })
  }

  // Price filter
  if (priceFilter === 'free') {
    whereConditions.push({
      OR: [
        { cost: { contains: 'free', mode: 'insensitive' as const } },
        { cost: null },
      ],
    })
  } else if (priceFilter === 'paid') {
    whereConditions.push({
      AND: [
        { cost: { not: null } },
        { cost: { not: { contains: 'free', mode: 'insensitive' as const } } },
      ],
    })
  }

  // Date range filter
  if (startDate) {
    whereConditions.push({
      date: { gte: startDate },
    })
  }
  if (endDate) {
    whereConditions.push({
      date: { lte: endDate },
    })
  }

  const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {}

  const [events, totalCount] = await Promise.all([
    prisma.event.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where: whereClause }),
  ])

  return {
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      address: event.address || undefined,
      coordinates: event.latitude && event.longitude
        ? { lat: event.latitude, lng: event.longitude }
        : undefined,
      imageUrl: event.imageUrl || undefined,
      categories: event.categories,
      cost: event.cost || undefined,
      times: event.times || undefined,
      url: event.url || undefined,
      region: event.region || undefined,
      recurrence: event.recurrence || undefined,
      endDate: event.endDate || undefined,
      city: event.city || undefined,
      createdBy: event.createdBy,
    })),
    totalCount,
  }
}
