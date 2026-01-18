import { getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/api.geocode'
import { canUserCreateEvent } from '~/utils/permissions.server'

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has permission (authors and admins only)
  const cookieHeader = args.request.headers.get('Cookie')
  const canGeocode = await canUserCreateEvent(userId, cookieHeader)
  if (!canGeocode) {
    return Response.json({ error: 'Only authors and admins can use geocoding' }, { status: 403 })
  }

  const formData = await args.request.formData()
  const address = formData.get('address') as string | null
  const city = formData.get('city') as string | null
  const region = formData.get('region') as string | null

  if (!address) {
    return Response.json({ error: 'Address is required' }, { status: 400 })
  }

  // Build the search query
  const queryParts = [address]
  if (city) queryParts.push(city)
  if (region) queryParts.push(region)
  // Add NC as default state for the 919 area
  queryParts.push('NC')
  const searchQuery = queryParts.join(', ')

  const mapboxToken = process.env.VITE_MAPBOX_TOKEN
  if (!mapboxToken) {
    return Response.json({ error: 'Mapbox token not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
    url.searchParams.set('q', searchQuery)
    url.searchParams.set('access_token', mapboxToken)
    url.searchParams.set('limit', '1')
    // Bias towards North Carolina
    url.searchParams.set('proximity', '-78.6382,35.7796')
    url.searchParams.set('country', 'US')

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText)
      return Response.json({ error: 'Geocoding service error' }, { status: 500 })
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return Response.json({ error: 'Address not found' }, { status: 404 })
    }

    const feature = data.features[0]
    const [longitude, latitude] = feature.geometry.coordinates
    const fullAddress = feature.properties.full_address || feature.properties.name

    return Response.json({
      latitude,
      longitude,
      fullAddress,
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return Response.json({ error: 'Failed to geocode address' }, { status: 500 })
  }
}
