/** Where a map opens: a point and how close (17 = a street, 15 = a sub-district, 6 = all of Thailand). */
export interface MapView {
  lat: number
  lng: number
  zoom: number
}

export const PIN_ZOOM = 17
export const AREA_ZOOM = 15
export const COUNTRY_ZOOM = 6

// A box around Thailand. It also covers corners of its neighbours; map answers are checked by country as well.
const BOX = { south: 5.6, north: 20.5, west: 97.3, east: 105.7 }

export const THAILAND_CENTER = { lat: 13.0, lng: 101.0 }

export const isInThailand = (lat: number, lng: number): boolean => lat >= BOX.south && lat <= BOX.north && lng >= BOX.west && lng <= BOX.east

const EARTH_KM = 6371
const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Straight-line distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}
