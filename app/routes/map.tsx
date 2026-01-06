import { Suspense, lazy } from 'react'
import { useLoaderData } from 'react-router'
import { clerkClient } from '@clerk/react-router/server'
import type { Route } from './+types/map'
import { useEventStore } from '~/stores'
import { getAllEvents } from '~/utils/events.server'

export async function loader(args: Route.LoaderArgs) {
  const events = await getAllEvents()

  // Fetch creator names for events that have a createdBy field
  // const eventsWithCreators = await Promise.all(
  //   events.map(async (event) => {
  //     if (event.createdBy) {
  //       try {
  //         const creator = await clerkClient(args).users.getUser(event.createdBy)
  //         return {
  //           ...event,
  //           createdByName: creator.username || creator.fullName || creator.firstName || creator.emailAddresses[0]?.emailAddress || 'Unknown User'
  //         }
  //       } catch (error) {
  //         return {
  //           ...event,
  //           createdByName: 'Unknown User'
  //         }
  //       }
  //     }
  //     return event
  //   })
  // )

  return { events }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - Map' },
    { name: 'description', content: 'View events on an interactive map' },
  ]
}

const MapComponent = lazy(() => import('~/components/Map'))

function MapLoadingFallback() {
  return (
    <div className="absolute left-0 top-0 w-full h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="text-2xl font-semibold text-white">
          Loading map
          <span className="inline-flex ml-1">
            <span className="animate-[bounce_1.4s_ease-in-out_infinite]">.</span>
            <span className="animate-[bounce_1.4s_ease-in-out_0.2s_infinite]">.</span>
            <span className="animate-[bounce_1.4s_ease-in-out_0.4s_infinite]">.</span>
          </span>
        </p>
      </div>
    </div>
  )
}

export default function MapPage() {
  const { events } = useLoaderData<typeof loader>()
  const { selectedEvent, selectEvent } = useEventStore()

  return (
    <main className="absolute left-0 top-0">
      <Suspense fallback={<MapLoadingFallback />}>
        <MapComponent events={events} selectedEvent={selectedEvent} selectEvent={selectEvent} />
      </Suspense>
    </main>
  )
}
