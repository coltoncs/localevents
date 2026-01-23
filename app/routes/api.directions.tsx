import type { Route } from './+types/api.directions'
import type { DirectionsRequest, DirectionsResponse } from '~/types/directions'

export async function action(args: Route.ActionArgs) {
  const mapboxToken = process.env.VITE_MAPBOX_TOKEN
  if (!mapboxToken) {
    return Response.json({ error: 'Mapbox token not configured' }, { status: 500 })
  }

  let body: DirectionsRequest
  try {
    body = await args.request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { coordinates, profile } = body

  // Validate profile
  const validProfiles = ['walking', 'cycling', 'driving']
  if (!profile || !validProfiles.includes(profile)) {
    return Response.json({ error: 'Invalid profile. Must be walking, cycling, or driving' }, { status: 400 })
  }

  // Validate coordinates
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return Response.json({ error: 'At least 2 coordinates are required' }, { status: 400 })
  }

  if (coordinates.length > 25) {
    return Response.json({ error: 'Maximum 25 coordinates allowed' }, { status: 400 })
  }

  // Validate each coordinate
  for (const coord of coordinates) {
    if (typeof coord.lng !== 'number' || typeof coord.lat !== 'number') {
      return Response.json({ error: 'Each coordinate must have lng and lat as numbers' }, { status: 400 })
    }
    if (coord.lng < -180 || coord.lng > 180 || coord.lat < -90 || coord.lat > 90) {
      return Response.json({ error: 'Coordinates out of valid range' }, { status: 400 })
    }
  }

  try {
    // Format coordinates for Mapbox API: lng,lat;lng,lat;...
    const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';')

    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordString}`)
    url.searchParams.set('access_token', mapboxToken)
    url.searchParams.set('geometries', 'geojson')
    url.searchParams.set('overview', 'full')
    url.searchParams.set('steps', 'false')

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Mapbox Directions API error:', response.status, errorData)
      return Response.json({
        error: errorData.message || 'Directions service error',
        code: errorData.code || 'unknown'
      }, { status: response.status })
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return Response.json({
        error: data.message || 'No route found',
        code: data.code || 'NoRoute'
      }, { status: 404 })
    }

    // Return simplified response
    const route = data.routes[0]
    const result: DirectionsResponse = {
      routes: [{
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        legs: route.legs.map((leg: { distance: number; duration: number }) => ({
          distance: leg.distance,
          duration: leg.duration,
        })),
      }],
      code: 'Ok',
    }

    return Response.json(result)
  } catch (error) {
    console.error('Directions error:', error)
    return Response.json({ error: 'Failed to get directions' }, { status: 500 })
  }
}
