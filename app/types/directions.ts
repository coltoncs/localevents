export interface Coordinate {
  lng: number
  lat: number
}

export interface DirectionsRequest {
  coordinates: Coordinate[]
  profile: 'walking' | 'cycling' | 'driving'
}

export interface RouteLeg {
  distance: number // meters
  duration: number // seconds
}

export interface Route {
  geometry: GeoJSON.LineString
  distance: number // meters
  duration: number // seconds
  legs: RouteLeg[]
}

export interface DirectionsResponse {
  routes: Route[]
  code: string
  message?: string
}

export type RouteGeoJSON = GeoJSON.Feature<GeoJSON.LineString>

export type TransportMode = 'walking' | 'cycling' | 'driving'
