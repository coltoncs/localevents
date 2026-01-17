import { useLoaderData, Link } from 'react-router'
import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/events.$id'
import { getEventById } from '~/utils/events.server'
import { canUserModifyEvent } from '~/utils/permissions.server'
import { formatDate } from '~/utils/dateFormatter'
import FavoriteButton from '~/components/FavoriteButton'
import { prisma } from '~/utils/db.server'

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args)

  const eventId = args.params.id
  const event = await getEventById(eventId)

  if (!event) {
    throw new Response('Event not found', { status: 404 })
  }

  // Check if user can edit this event
  let canEdit = false
  if (userId) {
    const cookieHeader = args.request.headers.get('Cookie')
    canEdit = await canUserModifyEvent(userId, eventId, cookieHeader)
  }

  // Get vote count for this event
  const voteCount = await prisma.vote.count({
    where: { eventId }
  })

  // Check if user has voted
  let hasVoted = false
  if (userId) {
    const vote = await prisma.vote.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId
        }
      }
    })
    hasVoted = !!vote
  }

  return {
    event,
    canEdit,
    voteCount,
    hasVoted,
    isAuthenticated: !!userId
  }
}

export function meta({ data }: Route.MetaArgs) {
  if (!data?.event) {
    return [
      { title: '919 Events - Event Not Found' },
      { name: 'description', content: 'Event not found' },
    ]
  }

  return [
    { title: `${data.event.title} - 919 Events` },
    { name: 'description', content: data.event.description },
  ]
}

export default function EventDetailPage() {
  const { event, canEdit, voteCount, hasVoted, isAuthenticated } = useLoaderData<typeof loader>()

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button */}
      <Link
        to="/events"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </Link>

      <article className="bg-slate-800/80 border border-slate-700 rounded-lg overflow-hidden">
        {/* Event Image */}
        {event.imageUrl && (
          <div className="w-full h-64 md:h-96 overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{event.title}</h1>
                <FavoriteButton
                  eventId={event.id}
                  initialVoted={hasVoted}
                  initialCount={voteCount}
                  isAuthenticated={isAuthenticated}
                  size="lg"
                  showCount={true}
                />
              </div>
              {event.createdByName && (
                <p className="text-slate-400 mt-2">Submitted by {event.createdByName}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Visit Website
                </a>
              )}
              {canEdit && (
                <Link
                  to={`/events/${event.id}/edit`}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Edit Event
                </Link>
              )}
            </div>
          </div>

          {/* Categories */}
          {event.categories && event.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {event.categories.map((category, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          {/* Key details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Date & Time */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-semibold text-white">Date & Time</h3>
              </div>
              <p className="text-slate-300 text-lg">{formatDate(event.date)}</p>
              {event.times && (
                <p className="text-slate-400 mt-1">{event.times}</p>
              )}
              {event.recurrence && (
                <p className="text-slate-400 mt-2">
                  <span className="inline-block mr-1">🔁</span>
                  {event.recurrence}
                  {event.endDate && ` (until ${formatDate(event.endDate)})`}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-semibold text-white">Location</h3>
              </div>
              <p className="text-slate-300 text-lg">{event.location}</p>
              {event.address && (
                <p className="text-slate-400 mt-1">{event.address}</p>
              )}
              {event.city && (
                <p className="text-slate-400">
                  {event.city}
                  {event.region && `, ${event.region}`}
                </p>
              )}
              {event.coordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${event.coordinates.lat},${event.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Google Maps
                </a>
              )}
            </div>

            {/* Cost */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-white">Cost</h3>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                !event.cost
                  ? 'bg-slate-600/30 text-slate-300'
                  : event.cost.toLowerCase().includes('free')
                  ? 'bg-green-600/30 text-green-300'
                  : 'bg-yellow-600/30 text-yellow-300'
              }`}>
                {event.cost || 'Not specified'}
              </span>
            </div>

            {/* External Link */}
            {event.url && (
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h3 className="font-semibold text-white">Website</h3>
                </div>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 break-all"
                >
                  {event.url}
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="border-t border-slate-700 pt-6">
            <h2 className="text-xl font-semibold text-white mb-4">About This Event</h2>
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </div>
          </div>

        </div>
      </article>
    </main>
  )
}
