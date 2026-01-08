import { useLoaderData, useNavigate, useNavigation } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/events'
import ShaderBackground from '~/components/ShaderBackground'
import { useEventStore } from '~/stores'
import { getPaginatedEvents, getAllCategories } from '~/utils/events.server'
import { getUserRole } from '~/utils/roles.server'
import { getVoteCountsForEvents, getUserVotesForEvents, getUserFavoriteEventIds } from '~/utils/votes.server'
import type { UserRole } from '~/types/roles'
import EventsList from '~/components/EventsList'

export async function loader(args: Route.LoaderArgs) {
  // Get page and filters from URL search params
  const url = new URL(args.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const searchQuery = url.searchParams.get('search') || undefined
  const category = url.searchParams.get('category') || undefined
  const priceFilter = (url.searchParams.get('price') as 'free' | 'paid' | 'all') || undefined
  const startDate = url.searchParams.get('startDate') || undefined
  const endDate = url.searchParams.get('endDate') || undefined
  const showFavorites = url.searchParams.get('favorites') === 'true'
  const limit = 10

  // Get current user ID (if signed in)
  const { userId } = await getAuth(args)

  // Get all available categories
  const allCategories = await getAllCategories()

  // Get user's favorite event IDs if filtering by favorites
  let favoriteEventIds: string[] | undefined
  if (showFavorites && userId) {
    favoriteEventIds = await getUserFavoriteEventIds(userId)
  }

  // Build filters object
  const filters = {
    searchQuery,
    category,
    priceFilter,
    startDate,
    endDate,
    favoriteEventIds,
  }

  // Get paginated events from server storage with filters
  const { events, totalCount } = await getPaginatedEvents(page, limit, filters)

  // Get vote data
  const eventIds = events.map(e => e.id)
  const voteCounts = await getVoteCountsForEvents(eventIds)
  const userVotes = userId
    ? await getUserVotesForEvents(userId, eventIds)
    : new Set<string>()

  let userRole: UserRole | null = null
  if (userId) {
    const cookieHeader = args.request.headers.get('Cookie')
    userRole = await getUserRole(userId, cookieHeader)
  }

  // Events now have createdByName already stamped on them from creation time
  return {
    events,
    totalCount,
    currentPage: page,
    eventsPerPage: limit,
    searchQuery: searchQuery || '',
    category: category || '',
    priceFilter: priceFilter || 'all',
    startDate: startDate || '',
    endDate: endDate || '',
    showFavorites,
    allCategories,
    currentUserId: userId || null,
    userRole,
    voteCounts,
    userVotes: Array.from(userVotes),
    isAuthenticated: !!userId,
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - List' },
    { name: 'description', content: 'Browse upcoming events in the 919 area' },
  ]
}

export default function EventsPage() {
  const {
    events,
    totalCount,
    currentPage,
    eventsPerPage,
    searchQuery,
    category,
    priceFilter,
    startDate,
    endDate,
    showFavorites,
    allCategories,
    currentUserId,
    userRole,
    voteCounts,
    userVotes,
    isAuthenticated,
  } = useLoaderData<typeof loader>()
  const { selectEvent } = useEventStore()
  const navigate = useNavigate()
  const navigation = useNavigation()

  const isLoading = navigation.state === 'loading'

  const buildFilterParams = (filters: {
    search?: string
    category?: string
    price?: 'free' | 'paid' | 'all'
    startDate?: string
    endDate?: string
    favorites?: boolean
  }, page: number = 1) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (filters.search) params.set('search', filters.search)
    if (filters.category) params.set('category', filters.category)
    if (filters.price && filters.price !== 'all') params.set('price', filters.price)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.favorites) params.set('favorites', 'true')
    return params
  }

  const handleFilterChange = (filters: {
    search?: string
    category?: string
    price?: 'free' | 'paid' | 'all'
    startDate?: string
    endDate?: string
    favorites?: boolean
  }) => {
    const params = buildFilterParams(filters, 1)
    navigate(`/events?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (searchQuery) params.set('search', searchQuery)
    if (category) params.set('category', category)
    if (priceFilter && priceFilter !== 'all') params.set('price', priceFilter)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (showFavorites) params.set('favorites', 'true')
    navigate(`/events?${params.toString()}`)
  }

  const canEditEvent = (event: any): boolean => {
    return !!(currentUserId && (
      userRole === 'admin' ||
      (userRole === 'author' && event.createdBy === currentUserId)
    ))
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <ShaderBackground variant='waves' />

      {/* Dark overlay filter */}
      <div className="absolute inset-0 bg-black/70 z-0" />

      {/* Loading Spinner Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-slate-800/90 border border-slate-600 rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white font-medium">Loading events...</p>
          </div>
        </div>
      )}

      <div className="z-10 pt-20 pb-8">
        <div className="sticky container mx-auto px-4">
          <EventsList
            events={events}
            totalCount={totalCount}
            currentPage={currentPage}
            eventsPerPage={eventsPerPage}
            allCategories={allCategories}
            searchQuery={searchQuery}
            category={category}
            priceFilter={priceFilter}
            startDate={startDate}
            endDate={endDate}
            showFavorites={showFavorites}
            isLoading={isLoading}
            canEditEvent={canEditEvent}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onSelectEvent={(event) => selectEvent(event as any)}
            showFilters={true}
            showCreateButton={false}
            voteCounts={voteCounts}
            userVotes={userVotes}
            isAuthenticated={isAuthenticated}
            emptyStateMessage={
              searchQuery || category || (priceFilter && priceFilter !== 'all') || startDate || endDate || showFavorites
                ? 'No events match your current filters. Try adjusting your search criteria.'
                : 'No events available at the moment.'
            }
          />
        </div>
      </div>
    </main>
  )
}
