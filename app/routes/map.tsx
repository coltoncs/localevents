import { useState, useCallback, useMemo, useRef } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import useSupercluster from 'use-supercluster'
import type { Route } from './+types/map'
import { getAllEvents } from '~/utils/events.server'
import 'mapbox-gl/dist/mapbox-gl.css'

interface EventWithCoords {
  id: string
  title: string
  description: string
  location: string
  latitude: number
  longitude: number
  date: string
  times?: string
  cost?: string
  categories: string[]
  city?: string
}

export async function loader(_args: Route.LoaderArgs) {
  const events = await getAllEvents()

  // Filter to only events with coordinates
  const eventsWithCoords: EventWithCoords[] = events
    .filter((e): e is typeof e & { coordinates: { lat: number; lng: number } } =>
      e.coordinates !== undefined
    )
    .map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      latitude: e.coordinates!.lat,
      longitude: e.coordinates!.lng,
      date: e.date,
      times: e.times,
      cost: e.cost,
      categories: e.categories || [],
      city: e.city,
    }))

  return {
    events: eventsWithCoords,
    mapboxToken: process.env.VITE_MAPBOX_TOKEN || '',
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: '919 Events - Map' },
    { name: 'description', content: 'View events on a map in the 919 area' },
  ]
}

export default function MapPage() {
  const { events, mapboxToken } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const mapRef = useRef<MapRef>(null)
  const [selectedEvents, setSelectedEvents] = useState<EventWithCoords[]>([])
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [isEventListExpanded, setIsEventListExpanded] = useState(false)
  const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null)
  const [viewState, setViewState] = useState({
    longitude: -78.6382,
    latitude: 35.7796,
    zoom: 10,
  })
  const TARGET_ZOOM = 12

  // Get today's date in YYYY-MM-DD format for the date input
  const today = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const [filterDate, setFilterDate] = useState(today)

  // Filter events to only show events on the selected date
  const filteredEvents = useMemo(() => {
    return events.filter(event => event.date === filterDate)
  }, [events, filterDate])

  // Calculate distance between two points using Haversine formula
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  // Group filtered events by city for the list display, sorted by proximity if user location available
  const eventsByCity = useMemo(() => {
    const grouped: Record<string, EventWithCoords[]> = {}
    filteredEvents.forEach(event => {
      const city = event.city || 'Other'
      if (!grouped[city]) {
        grouped[city] = []
      }
      grouped[city].push(event)
    })

    // Calculate average distance for each city if user location is available
    const cityDistances: Record<string, number> = {}
    if (userLocation) {
      Object.entries(grouped).forEach(([city, cityEvents]) => {
        const avgDistance = cityEvents.reduce((sum, event) => {
          return sum + getDistance(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude)
        }, 0) / cityEvents.length
        cityDistances[city] = avgDistance
      })
    }

    // Sort cities by proximity if user location available, otherwise alphabetically
    const sortedCities = Object.keys(grouped).sort((a, b) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      if (userLocation) {
        return (cityDistances[a] || 0) - (cityDistances[b] || 0)
      }
      return a.localeCompare(b)
    })

    // Also sort events within each city by proximity if user location available
    if (userLocation) {
      sortedCities.forEach(city => {
        grouped[city].sort((a, b) => {
          const distA = getDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
          const distB = getDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
          return distA - distB
        })
      })
    }

    return sortedCities.map(city => ({ city, events: grouped[city] }))
  }, [filteredEvents, userLocation, getDistance])

  // Group events by coordinates and create one point per unique location
  const points = useMemo(() => {
    const coordsMap: Record<string, EventWithCoords[]> = {}
    filteredEvents.forEach(event => {
      const key = `${event.longitude},${event.latitude}`
      if (!coordsMap[key]) {
        coordsMap[key] = []
      }
      coordsMap[key].push(event)
    })

    // Create one point per unique coordinate with all events at that location
    return Object.entries(coordsMap).map(([key, eventsAtLocation]) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        events: eventsAtLocation,
        eventCount: eventsAtLocation.length,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [eventsAtLocation[0].longitude, eventsAtLocation[0].latitude],
      },
    }))
  }, [filteredEvents])

  // Get map bounds for clustering
  const bounds = mapRef.current
    ? (mapRef.current.getMap().getBounds()?.toArray().flat() as [number, number, number, number])
    : undefined

  // Use supercluster for clustering
  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 20 },
  })

  // Easing function for smooth animations (ease-out-cubic)
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  const handleMarkerClick = useCallback((eventsAtLocation: EventWithCoords[], longitude: number, latitude: number) => {
    setSelectedEvents(eventsAtLocation)
    setActiveTabIndex(0)
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(viewState.zoom, 14),
      duration: 800,
      easing: easeOutCubic,
    })
  }, [viewState.zoom])

  const formatDate = (dateStr: string, times?: string) => {
    const dateFormatted = new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (times) {
      return `${dateFormatted} · ${times}`
    }
    return dateFormatted
  }

  if (!mapboxToken) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Map Unavailable</h1>
          <p className="text-slate-400">Mapbox token is not configured.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-[calc(100vh-4rem)] w-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={() => setSelectedEvents([])}
        onLoad={() => {
          setTimeout(() => {
            mapRef.current?.easeTo({
              zoom: TARGET_ZOOM,
              duration: 1500,
              easing: easeOutCubic,
            })
          }, 100)
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation
          onGeolocate={(e) => {
            setUserLocation({
              longitude: e.coords.longitude,
              latitude: e.coords.latitude,
            })
          }}
        />

        {clusters.map(cluster => {
          const [longitude, latitude] = cluster.geometry.coordinates
          const properties = cluster.properties as {
            cluster?: boolean
            point_count?: number
            events?: EventWithCoords[]
            eventCount?: number
          }
          const isCluster = properties.cluster
          const pointCount = properties.point_count || 0

          if (isCluster) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  const expansionZoom = Math.min(
                    supercluster?.getClusterExpansionZoom(cluster.id as number) ?? 20,
                    20
                  )
                  mapRef.current?.flyTo({
                    center: [longitude, latitude],
                    zoom: expansionZoom,
                    duration: 800,
                    easing: easeOutCubic,
                  })
                }}
              >
                <div className="cursor-pointer transform hover:scale-110 transition-transform">
                  <div
                    className="bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                    style={{
                      width: `${32 + (pointCount / points.length) * 20}px`,
                      height: `${32 + (pointCount / points.length) * 20}px`,
                    }}
                  >
                    <span className="text-white text-sm font-bold">{pointCount}</span>
                  </div>
                </div>
              </Marker>
            )
          }

          const eventsAtLocation = properties.events || []
          const eventCount = properties.eventCount || 1
          const firstEvent = eventsAtLocation[0]

          return (
            <Marker
              key={`location-${longitude}-${latitude}`}
              longitude={longitude}
              latitude={latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                handleMarkerClick(eventsAtLocation, longitude, latitude)
              }}
            >
              <div className="cursor-pointer transform hover:scale-110 transition-transform relative">
                <div className="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {firstEvent?.categories[0]?.[0]?.toUpperCase() || 'E'}
                  </span>
                </div>
                {eventCount > 1 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{eventCount}</span>
                  </div>
                )}
              </div>
            </Marker>
          )
        })}

        {selectedEvents.length > 0 && (
          <Popup
            longitude={selectedEvents[0].longitude}
            latitude={selectedEvents[0].latitude}
            anchor="bottom"
            onClose={() => setSelectedEvents([])}
            closeOnClick={false}
            className="map-popup"
          >
            <div className="p-2 max-w-xs">
              {/* Tabs for multiple events */}
              {selectedEvents.length > 1 && (
                <div className="flex gap-1 mb-2 border-b border-slate-300 pb-2">
                  {selectedEvents.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTabIndex(index)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        activeTabIndex === index
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-slate-500 self-center">
                    {selectedEvents.length} events
                  </span>
                </div>
              )}

              {/* Event content */}
              {(() => {
                const event = selectedEvents[activeTabIndex]
                return (
                  <>
                    <h3 className="font-bold text-slate-200 text-lg mb-1">
                      {event.title}
                    </h3>
                    <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>{formatDate(event.date, event.times)}</p>
                      <p>{event.location}</p>
                      {event.cost && (
                        <p className="font-medium text-emerald-400">
                          {event.cost === '0' || event.cost.toLowerCase() === 'free'
                            ? 'Free'
                            : `$${event.cost}`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-1.5 px-3 rounded transition-colors"
                    >
                      View Details
                    </button>
                  </>
                )
              })()}
            </div>
          </Popup>
        )}
      </Map>

      {/* Filter controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 max-w-xs">
        <div className="bg-slate-800/90 border border-slate-600 rounded-lg px-3 py-2">
          <label htmlFor="date-filter" className="block text-xs text-slate-400 mb-1">
            Show events on
          </label>
          <input
            type="date"
            id="date-filter"
            value={filterDate}
            min={today}
            onChange={(e) => {
              setFilterDate(e.target.value)
              setSelectedEvents([])
            }}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Collapsible event list */}
        <div className="bg-slate-800/90 border border-slate-600 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsEventListExpanded(!isEventListExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-white hover:bg-slate-700/50 transition-colors"
          >
            <span>
              <span className="font-medium">{filteredEvents.length}</span>
              <span className="text-slate-400 ml-1">events on map</span>
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${isEventListExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isEventListExpanded && (
            <div className="border-t border-slate-600 max-h-64 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <p className="px-4 py-3 text-slate-400 text-sm">No events on this date</p>
              ) : (
                <div>
                  {userLocation && (
                    <div className="px-4 py-1.5 bg-blue-900/50 border-b border-slate-600 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <span className="text-xs text-blue-400">Sorted by distance</span>
                    </div>
                  )}
                  {eventsByCity.map(({ city, events: cityEvents }) => (
                    <div key={city}>
                      <div className="px-4 py-1.5 bg-slate-700/50 border-b border-slate-600 sticky top-0">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{city}</span>
                        <span className="text-xs text-slate-500 ml-2">({cityEvents.length})</span>
                      </div>
                      <ul className="divide-y divide-slate-700">
                        {cityEvents.map(event => (
                          <li key={event.id}>
                            <button
                              onClick={() => {
                                handleMarkerClick([event], event.longitude, event.latitude)
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-slate-700/50 transition-colors"
                            >
                              <p className="text-white text-sm font-medium truncate">{event.title}</p>
                              <p className="text-slate-400 text-xs truncate">{event.location}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
