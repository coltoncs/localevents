import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { TransportMode, DirectionsResponse, RouteGeoJSON } from '~/types/directions'

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
  imageUrl?: string
}

interface RouteSummary {
  distance: number
  duration: number
  legs: { distance: number; duration: number }[]
}

interface EventRoutePanelProps {
  isOpen: boolean
  onClose: () => void
  events: EventWithCoords[]
  userLocation: { longitude: number; latitude: number } | null
  currentRouteEvents: EventWithCoords[]
  currentRouteSummary: RouteSummary | null
  onRouteGenerated: (
    routeData: RouteGeoJSON,
    orderedEvents: EventWithCoords[],
    totalDistance: number,
    totalDuration: number,
    legs: { distance: number; duration: number }[]
  ) => void
  onRouteClear: () => void
  onUserLocationObtained?: (location: { longitude: number; latitude: number }) => void
}

type Step = 'location' | 'events' | 'transport' | 'route'

export default function EventRoutePanel({
  isOpen,
  onClose,
  events,
  userLocation,
  currentRouteEvents,
  currentRouteSummary,
  onRouteGenerated,
  onRouteClear,
  onUserLocationObtained,
}: EventRoutePanelProps) {
  // Determine initial step based on whether there's an existing route
  const hasExistingRoute = currentRouteEvents.length > 0 && currentRouteSummary !== null

  const [step, setStep] = useState<Step>(hasExistingRoute ? 'route' : 'location')
  const [startLocation, setStartLocation] = useState<{ lng: number; lat: number } | null>(
    userLocation ? { lng: userLocation.longitude, lat: userLocation.latitude } : null
  )
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false)
  const [nearbyEvents, setNearbyEvents] = useState<(EventWithCoords & { distance: number })[]>([])
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [transportMode, setTransportMode] = useState<TransportMode>('driving')
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeSummary, setRouteSummary] = useState<{
    distance: number
    duration: number
    legs: { distance: number; duration: number }[]
  } | null>(null)

  // Sync step when panel opens with existing route
  useEffect(() => {
    if (isOpen) {
      if (currentRouteEvents.length > 0 && currentRouteSummary) {
        setStep('route')
      }
    }
  }, [isOpen, currentRouteEvents.length, currentRouteSummary])

  // Track previous events to detect date changes
  const prevEventsRef = useRef<string>('')

  // Reset panel state when events change (e.g., date filter changed)
  useEffect(() => {
    // Create a simple hash of event IDs to detect changes
    const eventsHash = events.map(e => e.id).sort().join(',')

    if (prevEventsRef.current && prevEventsRef.current !== eventsHash) {
      // Events actually changed - reset to location step
      setStep('location')
      setNearbyEvents([])
      setSelectedEventIds(new Set())
      setRouteSummary(null)
    }

    prevEventsRef.current = eventsHash
  }, [events])

  // Haversine distance calculation
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

  // Find nearest events using greedy nearest-neighbor
  const findNearestEvents = useCallback((start: { lng: number; lat: number }, count: number = 10) => {
    const eventsWithDistance = events.map(event => ({
      ...event,
      distance: getDistance(start.lat, start.lng, event.latitude, event.longitude)
    }))
    return eventsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, count)
  }, [events, getDistance])

  // Order selected events by proximity (greedy nearest-neighbor)
  const orderEventsByProximity = useCallback((
    start: { lng: number; lat: number },
    selectedEvents: EventWithCoords[]
  ): EventWithCoords[] => {
    if (selectedEvents.length === 0) return []

    const ordered: EventWithCoords[] = []
    const remaining = [...selectedEvents]
    let currentPos = start

    while (remaining.length > 0) {
      let nearestIdx = 0
      let nearestDist = Infinity

      for (let i = 0; i < remaining.length; i++) {
        const dist = getDistance(currentPos.lat, currentPos.lng, remaining[i].latitude, remaining[i].longitude)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIdx = i
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0]
      ordered.push(nearest)
      currentPos = { lng: nearest.longitude, lat: nearest.latitude }
    }

    return ordered
  }, [getDistance])

  // Handle geolocation request
  const handleUseMyLocation = useCallback(() => {
    setIsGettingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lng: position.coords.longitude, lat: position.coords.latitude }
        setStartLocation(loc)
        setIsGettingLocation(false)

        // Notify parent of obtained location
        onUserLocationObtained?.({ longitude: loc.lng, latitude: loc.lat })

        // Find nearby events
        const nearby = findNearestEvents(loc)
        setNearbyEvents(nearby)
        setSelectedEventIds(new Set(nearby.map(e => e.id)))
        setStep('events')
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enter an address instead.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable. Please enter an address instead.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again or enter an address.')
            break
          default:
            setLocationError('Unable to get location. Please enter an address instead.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [findNearestEvents, onUserLocationObtained])

  // Handle address geocoding
  const handleLookupAddress = useCallback(async () => {
    if (!addressInput.trim()) {
      setLocationError('Please enter an address')
      return
    }

    setIsGeocodingAddress(true)
    setLocationError(null)

    try {
      const formData = new FormData()
      formData.append('address', addressInput.trim())
      if (cityInput.trim()) {
        formData.append('city', cityInput.trim())
      }

      const response = await fetch('/api/geocode', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setLocationError(data.error || 'Failed to find address')
        setIsGeocodingAddress(false)
        return
      }

      const loc = { lng: data.longitude, lat: data.latitude }
      setStartLocation(loc)
      setIsGeocodingAddress(false)

      // Find nearby events
      const nearby = findNearestEvents(loc)
      setNearbyEvents(nearby)
      setSelectedEventIds(new Set(nearby.map(e => e.id)))
      setStep('events')
    } catch (error) {
      setLocationError('Failed to lookup address')
      setIsGeocodingAddress(false)
    }
  }, [addressInput, cityInput, findNearestEvents])

  // Handle event selection toggle
  const handleToggleEvent = useCallback((eventId: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  // Generate route
  const handleGenerateRoute = useCallback(async () => {
    if (!startLocation || selectedEventIds.size < 2) return

    setIsGeneratingRoute(true)
    setRouteError(null)

    try {
      // Get selected events and order by proximity
      const selected = nearbyEvents.filter(e => selectedEventIds.has(e.id))
      const ordered = orderEventsByProximity(startLocation, selected)

      // Build coordinates: start location + ordered events
      const coordinates = [
        startLocation,
        ...ordered.map(e => ({ lng: e.longitude, lat: e.latitude }))
      ]

      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates, profile: transportMode }),
      })

      const data: DirectionsResponse & { error?: string } = await response.json()

      if (!response.ok || !data.routes || data.routes.length === 0) {
        setRouteError(data.error || 'Failed to generate route')
        setIsGeneratingRoute(false)
        return
      }

      const route = data.routes[0]
      setRouteSummary({
        distance: route.distance,
        duration: route.duration,
        legs: route.legs,
      })

      // Create GeoJSON feature for the route line
      const routeGeoJSON: RouteGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: route.geometry,
      }

      onRouteGenerated(routeGeoJSON, ordered, route.distance, route.duration, route.legs)
      setStep('route')
    } catch (error) {
      setRouteError('Failed to generate route')
    } finally {
      setIsGeneratingRoute(false)
    }
  }, [startLocation, selectedEventIds, nearbyEvents, orderEventsByProximity, transportMode, onRouteGenerated])

  // Just close the panel (preserve route if it exists)
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Clear route and start over
  const handleClearRoute = useCallback(() => {
    onRouteClear()
    setStep('location')
    setStartLocation(userLocation ? { lng: userLocation.longitude, lat: userLocation.latitude } : null)
    setLocationError(null)
    setAddressInput('')
    setCityInput('')
    setNearbyEvents([])
    setSelectedEventIds(new Set())
    setRouteError(null)
    setRouteSummary(null)
  }, [onRouteClear, userLocation])

  // Modify existing route (go back to events step)
  const handleModifyRoute = useCallback(() => {
    setStep('events')
  }, [])

  // Format distance (in miles)
  const formatDistance = (meters: number) => {
    const miles = meters / 1609.34
    if (miles < 0.1) {
      const feet = Math.round(meters * 3.28084)
      return `${feet} ft`
    }
    return `${miles.toFixed(1)} mi`
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes} min`
  }

  const selectedCount = selectedEventIds.size

  if (!isOpen) return null

  return (
    <div className="absolute top-4 right-16 w-80 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl z-10 max-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-white font-semibold">Plan Event Route</h3>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress indicator */}
      <div className="px-4 py-2 border-b border-slate-700 flex gap-1">
        {(['location', 'events', 'transport', 'route'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= ['location', 'events', 'transport', 'route'].indexOf(step)
                ? 'bg-blue-500'
                : 'bg-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Location */}
        {step === 'location' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Choose your starting point to find nearby events.
            </p>

            {/* Use My Location button */}
            <button
              onClick={handleUseMyLocation}
              disabled={isGettingLocation}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGettingLocation ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Use My Location
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-600" />
              <span className="text-slate-400 text-sm">or</span>
              <div className="flex-1 h-px bg-slate-600" />
            </div>

            {/* Address input */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">City (optional)</label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Raleigh"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleLookupAddress}
                disabled={isGeocodingAddress || !addressInput.trim()}
                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeocodingAddress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Looking up...
                  </>
                ) : (
                  'Find Location'
                )}
              </button>
            </div>

            {locationError && (
              <p className="text-red-400 text-sm">{locationError}</p>
            )}
          </div>
        )}

        {/* Step 2: Events */}
        {step === 'events' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Select events to include in your route ({selectedCount} selected, min 2).
            </p>

            {nearbyEvents.length === 0 ? (
              <p className="text-slate-400 text-sm">No events found nearby for this date.</p>
            ) : (
              <div className="space-y-2">
                {nearbyEvents.map((event) => (
                  <label
                    key={event.id}
                    className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEventIds.has(event.id)
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.has(event.id)}
                        onChange={() => handleToggleEvent(event.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-slate-700"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{event.title}</p>
                        <p className="text-slate-400 text-xs truncate">{event.location}</p>
                        <p className="text-slate-500 text-xs">{(event.distance * 0.621371).toFixed(1)} mi away</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('location')}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('transport')}
                disabled={selectedCount < 2}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Transport */}
        {step === 'transport' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              How will you be traveling?
            </p>

            <div className="grid grid-cols-3 gap-2">
              {([
                { mode: 'walking' as TransportMode, icon: 'M13 5.5a.5.5 0 11-1 0 .5.5 0 011 0zm-.5 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.72 7.97l2.03-2.03.72.72-2.03 2.03.72.72 2.75-2.75-.72-.72-.72-.72-1.31 1.31V9.5h-1v4.69l-1.31-1.31-.72.72 2.75 2.75.72-.72-.88-.88z', label: 'Walk' },
                { mode: 'cycling' as TransportMode, icon: 'M5 18a3 3 0 100-6 3 3 0 000 6zm0-1a2 2 0 110-4 2 2 0 010 4zm14 1a3 3 0 100-6 3 3 0 000 6zm0-1a2 2 0 110-4 2 2 0 010 4zm-6-9h3l1.5 3H12l-1 2.5L9.5 11H7l2-4h4zm-.5 1h-2.3l-1 2h2.1l1.2-2z', label: 'Bike' },
                { mode: 'driving' as TransportMode, icon: 'M5 11l1.5-4.5h11L19 11M5 11v6h2m0-6h10m0 6h2v-6M7 17a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', label: 'Drive' },
              ] as const).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setTransportMode(mode)}
                  className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
                    transportMode === mode
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  <span className="text-white text-sm">{label}</span>
                </button>
              ))}
            </div>

            {routeError && (
              <p className="text-red-400 text-sm">{routeError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('events')}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGenerateRoute}
                disabled={isGeneratingRoute}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingRoute ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Route'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Route Summary */}
        {step === 'route' && (currentRouteSummary || routeSummary) && (
          <div className="space-y-4">
            {(() => {
              const summary = currentRouteSummary || routeSummary!
              const routeEventsList = currentRouteEvents.length > 0 ? currentRouteEvents : nearbyEvents.filter(e => selectedEventIds.has(e.id))
              return (
                <>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 text-sm">Total Distance</span>
                      <span className="text-white font-semibold">{formatDistance(summary.distance)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Estimated Time</span>
                      <span className="text-white font-semibold">{formatDuration(summary.duration)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-slate-400 text-xs uppercase tracking-wide">Route Order</p>
                    {routeEventsList.map((event, index) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{event.title}</p>
                          {summary.legs[index] && (
                            <p className="text-slate-400 text-xs">
                              {formatDistance(summary.legs[index].distance)} &middot; {formatDuration(summary.legs[index].duration)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleClearRoute}
                      className="flex-1 px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Clear Route
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
