import { redirect, useLoaderData, useNavigate, useNavigation } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/my-events'
import { getPaginatedEventsByUser } from '~/utils/permissions.server'
import { getAllCategories, deleteEvent } from '~/utils/events.server'
import ShaderBackground from '~/components/ShaderBackground'
import EventsList from '~/components/EventsList'
import { useEventStore } from '~/stores'

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  const formData = await args.request.formData()
  const eventIds = formData.get('eventIds')

  if (!eventIds || typeof eventIds !== 'string') {
    return { success: false, error: 'No events selected' }
  }

  const ids = eventIds.split(',')
  let deletedCount = 0
  let failedCount = 0

  for (const id of ids) {
    const success = await deleteEvent(id)
    if (success) {
      deletedCount++
    } else {
      failedCount++
    }
  }

  return redirect(args.request.url)
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return redirect('/')
  }

  // Get page and filters from URL search params
  const url = new URL(args.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const searchQuery = url.searchParams.get('search') || undefined
  const category = url.searchParams.get('category') || undefined
  const priceFilter = (url.searchParams.get('price') as 'free' | 'paid' | 'all') || undefined
  const startDate = url.searchParams.get('startDate') || undefined
  const endDate = url.searchParams.get('endDate') || undefined
  const limit = 10

  // Get all available categories
  const allCategories = await getAllCategories()

  // Build filters object
  const filters = {
    searchQuery,
    category,
    priceFilter,
    startDate,
    endDate,
  }

  // Get paginated events from user
  const { events, totalCount } = await getPaginatedEventsByUser(userId, page, limit, filters)

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
    allCategories,
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - My Events' },
    { name: 'description', content: 'Manage your submitted events' },
  ]
}

export default function MyEventsPage() {
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
    allCategories,
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
  }, page: number = 1) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (filters.search) params.set('search', filters.search)
    if (filters.category) params.set('category', filters.category)
    if (filters.price && filters.price !== 'all') params.set('price', filters.price)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    return params
  }

  const handleFilterChange = (filters: {
    search?: string
    category?: string
    price?: 'free' | 'paid' | 'all'
    startDate?: string
    endDate?: string
  }) => {
    const params = buildFilterParams(filters, 1)
    navigate(`/my-events?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (searchQuery) params.set('search', searchQuery)
    if (category) params.set('category', category)
    if (priceFilter && priceFilter !== 'all') params.set('price', priceFilter)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    navigate(`/my-events?${params.toString()}`)
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <ShaderBackground variant="waves" />

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
        <div className="container sticky mx-auto px-4">
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
            isLoading={isLoading}
            canEditEvent={() => true}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onSelectEvent={(event) => selectEvent(event as any)}
            showFilters={true}
            showCreateButton={true}
            createButtonHref="/submit"
            emptyStateMessage="You haven't created any events yet."
            emptyStateActionLabel="Create Your First Event"
            emptyStateActionHref="/submit"
            enableBulkDelete={true}
          />
        </div>
      </div>
    </main>
  )
}
