import { getLandmarks } from '@/services/merchantApi.ts'
import type { GeoPoint } from '@/types/domain.ts'
import { createGooglePlaces } from './googlePlaces.ts'
import { createLocalPlaces } from './localPlaces.ts'
import { loadedAreas, type Area } from './thaiAddressDb.ts'

/** A row under the location search: a known place, a sub-district (needs a pin after), or "search the map for …". */
export type SuggestionKind = 'place' | 'area' | 'search'

export interface PlaceSuggestion {
  id: string
  kind: SuggestionKind
  title: string
  subtitle: string
  area?: Area // for kind 'area'
  query?: string // for kind 'search'
}

export interface PlaceMatch {
  value: GeoPoint
  confidence: number // below 0.8 the merchant is asked to check it; the pin is always confirmed
  zoom?: number // how close a map should open on it (an area is not a shop)
}

/** Where shop addresses come from. Every answer is inside Thailand. */
export interface Places {
  live: boolean // true = Google Maps is connected
  /** Rows to offer while the merchant types. Never calls a rate-limited service. */
  suggest: (input: string) => Promise<PlaceSuggestion[]>
  /** The merchant chose one of the rows. */
  pick: (suggestion: PlaceSuggestion) => Promise<PlaceMatch | null>
  /** Free words ("ลาดพร้าวซอย 71 ตรงข้ามเซเว่น") → the best matching place, or null. */
  find: (text: string) => Promise<PlaceMatch | null>
  /** A point (GPS, a pin, a link) → the place and address there. */
  reverse: (lat: number, lng: number) => Promise<PlaceMatch | null>
}

/** The browser key for Google Maps, from `.env.local`. Empty means the sample places are used. */
export const GOOGLE_MAPS_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()

let places: Places | undefined

export function getPlaces(): Places {
  const local = createLocalPlaces(getLandmarks(), loadedAreas)
  places ??= GOOGLE_MAPS_KEY ? createGooglePlaces(GOOGLE_MAPS_KEY, local) : local
  return places
}
