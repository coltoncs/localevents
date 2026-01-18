import { useState, useEffect } from 'react'
import { formatDate } from '~/utils/dateFormatter'
import FavoriteButton from './FavoriteButton'

interface Event {
  id: string
  title: string
  description: string
  location: string
  address?: string
  city?: string
  date: string
  times?: string
  cost?: string
  imageUrl?: string
  url?: string
  categories?: string[]
  recurrence?: string
  endDate?: string
  createdBy?: string
  createdByName?: string
}

interface EventsListProps {
  events: Event[]
  totalCount: number
  currentPage: number
  eventsPerPage: number
  allCategories?: string[]
  searchQuery?: string
  category?: string
  priceFilter?: 'free' | 'paid' | 'all'
  startDate?: string
  endDate?: string
  showFavorites?: boolean
  isLoading?: boolean
  canEditEvent?: (event: Event) => boolean
  onSearch?: (query: string) => void
  onFilterChange?: (filters: {
    search?: string
    category?: string
    price?: 'free' | 'paid' | 'all'
    startDate?: string
    endDate?: string
    favorites?: boolean
  }) => void
  onPageChange?: (page: number) => void
  onSelectEvent?: (event: Event) => void
  showFilters?: boolean
  showCreateButton?: boolean
  createButtonHref?: string
  emptyStateMessage?: string
  emptyStateActionLabel?: string
  emptyStateActionHref?: string
  enableBulkDelete?: boolean
  voteCounts?: Record<string, number>
  userVotes?: string[]
  isAuthenticated?: boolean
}

export default function EventsList({
  events,
  totalCount,
  currentPage,
  eventsPerPage,
  allCategories = [],
  searchQuery = '',
  category = '',
  priceFilter = 'all',
  startDate = '',
  endDate = '',
  showFavorites = false,
  isLoading = false,
  canEditEvent,
  onSearch,
  onFilterChange,
  onPageChange,
  onSelectEvent,
  showFilters = true,
  showCreateButton = false,
  createButtonHref = '/submit',
  emptyStateMessage = 'No events found',
  emptyStateActionLabel,
  emptyStateActionHref,
  enableBulkDelete = false,
  voteCounts = {},
  userVotes = [],
  isAuthenticated = false,
}: EventsListProps) {
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState(category)
  const [selectedPrice, setSelectedPrice] = useState(priceFilter)
  const [selectedStartDate, setSelectedStartDate] = useState(startDate)
  const [selectedEndDate, setSelectedEndDate] = useState(endDate)
  const [selectedShowFavorites, setSelectedShowFavorites] = useState(showFavorites)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())

  const userVotesSet = new Set(userVotes)

  const totalPages = Math.ceil(totalCount / eventsPerPage)
  const startIndex = (currentPage - 1) * eventsPerPage
  const endIndex = startIndex + eventsPerPage

  const hasActiveFilters = searchQuery || category || (priceFilter && priceFilter !== 'all') || startDate || endDate || showFavorites

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onFilterChange) {
      onFilterChange({
        search: searchInput.trim() || undefined,
        category: selectedCategory || undefined,
        price: selectedPrice !== 'all' ? selectedPrice : undefined,
        startDate: selectedStartDate || undefined,
        endDate: selectedEndDate || undefined,
        favorites: selectedShowFavorites || undefined,
      })
    }
  }

  const handleFilterChange = () => {
    if (onFilterChange) {
      onFilterChange({
        search: searchInput.trim() || undefined,
        category: selectedCategory || undefined,
        price: selectedPrice !== 'all' ? selectedPrice : undefined,
        startDate: selectedStartDate || undefined,
        endDate: selectedEndDate || undefined,
        favorites: selectedShowFavorites || undefined,
      })
    }
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setSelectedCategory('')
    setSelectedPrice('all')
    setSelectedStartDate('')
    setSelectedEndDate('')
    setSelectedShowFavorites(false)
    if (onFilterChange) {
      onFilterChange({})
    }
  }

  const handleToggleFavorites = () => {
    const newValue = !selectedShowFavorites
    setSelectedShowFavorites(newValue)
    if (onFilterChange) {
      onFilterChange({
        search: searchInput.trim() || undefined,
        category: selectedCategory || undefined,
        price: selectedPrice !== 'all' ? selectedPrice : undefined,
        startDate: selectedStartDate || undefined,
        endDate: selectedEndDate || undefined,
        favorites: newValue || undefined,
      })
    }
  }

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSelectEvent = (eventId: string, checked: boolean) => {
    const newSelected = new Set(selectedEventIds)
    if (checked) {
      newSelected.add(eventId)
    } else {
      newSelected.delete(eventId)
    }
    setSelectedEventIds(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEventIds(new Set(events.map(e => e.id)))
    } else {
      setSelectedEventIds(new Set())
    }
  }

  const handleBulkDelete = () => {
    if (selectedEventIds.size === 0) return

    const count = selectedEventIds.size
    if (!confirm(`Are you sure you want to delete ${count} event${count > 1 ? 's' : ''}?`)) {
      return
    }

    const form = document.createElement('form')
    form.method = 'post'
    form.action = ''

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'eventIds'
    input.value = Array.from(selectedEventIds).join(',')

    form.appendChild(input)
    document.body.appendChild(form)
    form.submit()
  }

  const allSelected = events.length > 0 && selectedEventIds.size === events.length
  const someSelected = selectedEventIds.size > 0 && selectedEventIds.size < events.length

  // Clear selections when events change (e.g., page navigation)
  useEffect(() => {
    setSelectedEventIds(new Set())
  }, [events])

  return (
    <>
      <div className="flex-col md:flex md:flex-row justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">
          {showCreateButton ? 'My Events' : 'Upcoming Events'}
        </h2>
        <div className="flex items-center gap-4">
          {totalCount > 0 && (
            <p className="text-slate-400 text-sm hidden md:block">
              Showing {startIndex + 1}-{Math.min(endIndex, totalCount)} of {totalCount} events
            </p>
          )}
          {enableBulkDelete && viewMode === 'table' && selectedEventIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedEventIds.size})
            </button>
          )}
          {showCreateButton && totalCount > 0 && (
            <a
              href={createButtonHref}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              New Event
            </a>
          )}
          {isAuthenticated && (
            <button
              onClick={handleToggleFavorites}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border ${
                selectedShowFavorites
                  ? 'bg-red-600/20 text-red-400 border-red-600/50 hover:bg-red-600/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-600 hover:text-white hover:border-slate-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={selectedShowFavorites ? 'Show all events' : 'Show favorites only'}
            >
              <svg
                className="w-4 h-4"
                fill={selectedShowFavorites ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {selectedShowFavorites ? 'Favorites' : 'Favorites'}
            </button>
          )}
          {totalCount > 0 && (
            <div className="flex gap-1 bg-slate-800/80 border border-slate-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Card view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showFilters && totalCount > 0 && false && (
        <>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search events by title, location, city, or category..."
                  className="w-full px-4 py-3 pl-10 bg-slate-800/80 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="mb-6 p-4 bg-slate-800/80 border border-slate-600 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {allCategories.length > 0 && (
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    disabled={isLoading}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value)
                      setTimeout(handleFilterChange, 0)
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Categories</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-slate-300 mb-2">
                  Price
                </label>
                <select
                  id="price"
                  value={selectedPrice}
                  disabled={isLoading}
                  onChange={(e) => {
                    setSelectedPrice(e.target.value as 'free' | 'paid' | 'all')
                    setTimeout(handleFilterChange, 0)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={selectedStartDate}
                  disabled={isLoading}
                  onChange={(e) => {
                    setSelectedStartDate(e.target.value)
                    setTimeout(handleFilterChange, 0)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-2">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={selectedEndDate}
                  disabled={isLoading}
                  onChange={(e) => {
                    setSelectedEndDate(e.target.value)
                    setTimeout(handleFilterChange, 0)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="px-3 py-1 bg-blue-600/30 text-blue-300 border border-blue-600/50 rounded-full text-sm">
                      Search: "{searchQuery}"
                    </span>
                  )}
                  {category && (
                    <span className="px-3 py-1 bg-purple-600/30 text-purple-300 border border-purple-600/50 rounded-full text-sm">
                      Category: {category}
                    </span>
                  )}
                  {priceFilter && priceFilter !== 'all' && (
                    <span className="px-3 py-1 bg-green-600/30 text-green-300 border border-green-600/50 rounded-full text-sm">
                      Price: {priceFilter === 'free' ? 'Free' : 'Paid'}
                    </span>
                  )}
                  {startDate && (
                    <span className="px-3 py-1 bg-orange-600/30 text-orange-300 border border-orange-600/50 rounded-full text-sm">
                      From: {new Date(startDate).toLocaleDateString()}
                    </span>
                  )}
                  {endDate && (
                    <span className="px-3 py-1 bg-orange-600/30 text-orange-300 border border-orange-600/50 rounded-full text-sm">
                      To: {new Date(endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearFilters}
                  disabled={isLoading}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {events.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-12 w-12 text-slate-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
            <p className="text-slate-400 mb-4">{emptyStateMessage}</p>
            {emptyStateActionLabel && emptyStateActionHref && (
              <a
                href={emptyStateActionHref}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {emptyStateActionLabel}
              </a>
            )}
            {hasActiveFilters && !emptyStateActionLabel && (
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full bg-slate-800/80 border border-slate-700 rounded-lg">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  {enableBulkDelete && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = someSelected
                          }
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">Fav</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {events.map((event) => {
                  const canEdit = canEditEvent ? canEditEvent(event) : false
                  const isSelected = selectedEventIds.has(event.id)
                  return (
                    <tr
                      key={event.id}
                      className={`hover:bg-slate-700/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-700/30' : ''
                      }`}
                      onClick={() => onSelectEvent?.(event)}
                    >
                      {enableBulkDelete && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectEvent(event.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        <div className="flex items-center gap-2">
                          {event.imageUrl && (
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <span className="line-clamp-2">{event.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        <div className="line-clamp-2 max-w-xs">{event.description}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                        {event.city || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                        {formatDate(event.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        <div className="max-w-[120px] truncate" title={event.times || '-'}>
                          {event.times || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs max-w-[100px] truncate inline-block ${
                          !event.cost
                            ? 'bg-slate-600/30 text-slate-300'
                            : event.cost.toLowerCase().includes('free')
                            ? 'bg-green-600/30 text-green-300'
                            : 'bg-yellow-600/30 text-yellow-300'
                        }`} title={event.cost || 'N/A'}>
                          {event.cost || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <FavoriteButton
                          eventId={event.id}
                          initialVoted={userVotesSet.has(event.id)}
                          initialCount={voteCounts[event.id] || 0}
                          isAuthenticated={isAuthenticated}
                          size="sm"
                          showCount={true}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`/events/${event.id}`}
                            className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors text-xs"
                            title="View Details"
                          >
                            Details
                          </a>
                          {event.url && (
                            <a
                              href={event.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                              title="Visit Website"
                            >
                              Link
                            </a>
                          )}
                          {canEdit && (
                            <>
                              <a
                                href={`/events/${event.id}/edit`}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                                title="Edit"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/events/${event.id}/delete`}
                                className="inline"
                              >
                                <button
                                  type="submit"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!confirm('Are you sure you want to delete this event?')) {
                                      e.preventDefault()
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                                  title="Delete"
                                >
                                  Del
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => {
              const canEdit = canEditEvent ? canEditEvent(event) : false
              return (
                <article
                  key={event.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700 dark:bg-slate-800/80 backdrop-blur-sm"
                  onClick={() => onSelectEvent?.(event)}
                >
                  <div className={`flex ${event.imageUrl ? 'flex-col md:flex-row' : ''}`}>
                    {event.imageUrl && (
                      <div className="w-full md:w-80 md:min-w-80 h-48 md:h-auto overflow-hidden flex-shrink-0">
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <h3 className="text-2xl font-semibold mb-2 text-white">{event.title}</h3>
                            <div onClick={(e) => e.stopPropagation()}>
                              <FavoriteButton
                                eventId={event.id}
                                initialVoted={userVotesSet.has(event.id)}
                                initialCount={voteCounts[event.id] || 0}
                                isAuthenticated={isAuthenticated}
                                size="md"
                                showCount={true}
                              />
                            </div>
                          </div>
                          <p className="text-gray-300">
                            {event.location}
                          </p>
                          {event.address && (
                            <p className="text-sm text-gray-400">
                              {event.address}
                              {event.city && `, ${event.city}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-400 ml-4">
                          <p className="font-semibold">{formatDate(event.date)}</p>
                          {event.times && <p className="text-xs mt-1">{event.times}</p>}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-gray-200 mb-3">{event.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          !event.cost
                            ? 'bg-slate-600/30 text-slate-300'
                            : event.cost.toLowerCase().includes('free')
                            ? 'bg-green-600/30 text-green-300'
                            : 'bg-yellow-600/30 text-yellow-300'
                        }`}>
                          {event.cost || 'N/A'}
                        </span>
                        {event.categories?.slice(0, 3).map((category, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm"
                          >
                            {category}
                          </span>
                        ))}
                      </div>

                      {event.recurrence && (
                        <p className="text-sm text-gray-400 mb-3">
                          🔁 {event.recurrence}
                          {event.endDate && ` (until ${formatDate(event.endDate)})`}
                        </p>
                      )}

                      {event.createdByName && (
                        <p className="text-sm text-gray-400 mb-3">
                          Submitted by: {event.createdByName}
                        </p>
                      )}

                      <div className="flex gap-3 mt-4">
                        <a
                          href={`/events/${event.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors inline-block"
                        >
                          View Details
                        </a>
                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors inline-block"
                          >
                            Visit Website
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <a
                              href={`/events/${event.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              Edit
                            </a>
                            <form
                              method="post"
                              action={`/events/${event.id}/delete`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline"
                            >
                              <button
                                type="submit"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!confirm('Are you sure you want to delete this event?')) {
                                    e.preventDefault()
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)

              if (!showPage) {
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-3 py-2 text-slate-400">...</span>
                }
                return null
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}
