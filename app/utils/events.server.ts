import { prisma } from './db.server'
import type { Event } from '~/stores/useEventStore'

export async function getAllEvents(): Promise<Event[]> {
  const events = await prisma.event.findMany({
    orderBy: { date: 'asc' }
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

export async function getPaginatedEvents(
  page: number = 1,
  limit: number = 10,
  filters: EventFilters = {}
): Promise<{ events: Event[]; totalCount: number }> {
  const skip = (page - 1) * limit
  const { searchQuery, category, priceFilter, startDate, endDate } = filters

  // Build dynamic where clause
  const whereConditions: any[] = []

  // Always filter to show only upcoming events (today and later in US Eastern timezone)
  // unless a specific startDate is provided
  if (!startDate) {
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/New_York'
    })
    whereConditions.push({
      date: { gte: today },
    })
  }

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

export async function getAllCategories(): Promise<string[]> {
  const events = await prisma.event.findMany({
    select: { categories: true },
  })

  const categoriesSet = new Set<string>()
  events.forEach((event) => {
    event.categories.forEach((cat) => categoriesSet.add(cat))
  })

  return Array.from(categoriesSet).sort()
}

export async function getEventById(id: string): Promise<Event | null> {
  const event = await prisma.event.findUnique({
    where: { id }
  })

  if (!event) return null

  return {
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
  }
}

export async function createEvent(eventData: Omit<Event, 'id'>): Promise<Event> {
  const event = await prisma.event.create({
    data: {
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      location: eventData.location,
      address: eventData.address,
      latitude: eventData.coordinates?.lat,
      longitude: eventData.coordinates?.lng,
      imageUrl: eventData.imageUrl,
      categories: eventData.categories || [],
      cost: eventData.cost,
      times: eventData.times,
      url: eventData.url,
      region: eventData.region,
      recurrence: eventData.recurrence,
      endDate: eventData.endDate,
      city: eventData.city,
      createdBy: eventData.createdBy,
    }
  })

  return {
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
  }
}

export async function updateEvent(id: string, eventData: Partial<Event>): Promise<Event | null> {
  const event = await prisma.event.update({
    where: { id },
    data: {
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      location: eventData.location,
      address: eventData.address,
      latitude: eventData.coordinates?.lat,
      longitude: eventData.coordinates?.lng,
      imageUrl: eventData.imageUrl,
      categories: eventData.categories,
      cost: eventData.cost,
      times: eventData.times,
      url: eventData.url,
      region: eventData.region,
      recurrence: eventData.recurrence,
      endDate: eventData.endDate,
      city: eventData.city,
    }
  })

  return {
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
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    await prisma.event.delete({
      where: { id }
    })
    return true
  } catch (error) {
    return false
  }
}

export async function bulkCreateEvents(events: Omit<Event, 'id'>[]): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const eventData of events) {
    try {
      await createEvent(eventData)
      success++
    } catch (error) {
      failed++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to create "${eventData.title}": ${errorMessage}`)
    }
  }

  return { success, failed, errors }
}
