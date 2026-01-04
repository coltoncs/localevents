export interface ApiEvent {
  recId: string
  name: string
  teaser?: string
  location: string
  coordinates: [number, number]
  date: string
  times?: string
  cost?: string
  categories?: Array<{ catName: string; catId: string }>
  media_raw?: Array<{ mediaurl: string; sortorder: number; mediatype: string }>
  url?: string
  listing?: {
    address1?: string
    region?: string
  }
  recurrence?: string
  endDate?: string
  city?: string
}

interface TransformedEvent {
  id: string
  title: string
  description: string
  location: string
  coordinates?: {
    lat: number
    lng: number
  }
  date: string
  imageUrl?: string
  categories?: string[]
  cost?: string
  times?: string
  address?: string
  url?: string
  region?: string
  recurrence?: string
  endDate?: string
  city?: string
  createdBy: string
}

/**
 * Transforms API event data into the app's event format
 */
export function transformApiEvent(apiEvent: ApiEvent): TransformedEvent {
  // Extract latitude and longitude from coordinates array
  const [lat, lng] = apiEvent.coordinates

  // Get the first image URL if available
  const imageUrl = apiEvent.media_raw?.[0]?.mediaurl

  // Extract and adjust the date (subtract 1 day)
  // The API sends dates that are logged a day after the actual event
  const apiDate = new Date(apiEvent.date)
  apiDate.setDate(apiDate.getDate() - 1)
  const formattedDate = apiDate.toISOString().split('T')[0]

  // Extract category names
  const categories = apiEvent.categories?.map(cat => cat.catName) || []

  return {
    id: apiEvent.recId,
    title: apiEvent.name,
    description: apiEvent.teaser || `${apiEvent.name} at ${apiEvent.location}`,
    location: apiEvent.location,
    coordinates: {
      lat,
      lng
    },
    date: formattedDate,
    imageUrl,
    categories,
    cost: apiEvent.cost,
    times: apiEvent.times,
    address: apiEvent.listing?.address1,
    url: apiEvent.url,
    region: apiEvent.listing?.region,
    recurrence: apiEvent.recurrence,
    endDate: apiEvent.endDate,
    city: apiEvent.city,
    createdBy: 'system'
  }
}

/**
 * Transforms an array of API events
 */
export function transformApiEvents(apiEvents: ApiEvent[]): TransformedEvent[] {
  return apiEvents.map(transformApiEvent)
}
