import type { GeoPoint } from '@/types/domain.ts'
import { createGooglePlaces } from './googlePlaces.ts'
import { createSamplePlaces } from './samplePlaces.ts'

export interface PlaceSuggestion {
  id: string
  title: string
  subtitle: string
}

export interface PlaceMatch {
  value: GeoPoint
  confidence: number // below 0.8 the merchant is asked to check it in A2; the pin is always confirmed there
}

/** Where shop addresses come from. Every answer is inside Thailand. */
export interface Places {
  live: boolean // true = Google Maps; false = the built-in sample places
  /** Places to offer while the merchant types an address. */
  suggest: (input: string) => Promise<PlaceSuggestion[]>
  /** The merchant chose one of the suggestions. */
  pick: (suggestion: PlaceSuggestion) => Promise<PlaceMatch | null>
  /** Free words ("ลาดพร้าวซอย 71 ตรงข้ามเซเว่น") → the best matching place, or null. */
  find: (text: string) => Promise<PlaceMatch | null>
}

/** The browser key for Google Maps, from `.env.local`. Empty means the sample places are used. */
export const GOOGLE_MAPS_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()

let places: Places | undefined

export function getPlaces(): Places {
  places ??= GOOGLE_MAPS_KEY ? createGooglePlaces(GOOGLE_MAPS_KEY, createSamplePlaces()) : createSamplePlaces()
  return places
}
