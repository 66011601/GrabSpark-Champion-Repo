import { formatThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { th } from '@/copy/th.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import type { GeoPoint } from '@/types/domain.ts'
import { AREA_ZOOM } from './bounds.ts'
import { createGooglePlaces } from './googlePlaces.ts'
import { createLocalPlaces } from './localPlaces.ts'
import { createNominatim, type Nominatim } from './nominatim.ts'
import { fixPostcode, loadedAreas, type Area } from './thaiAddressDb.ts'

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

/** What one outside map service offers (Google): rows, picks and searches. */
export type PlaceSource = Pick<Places, 'suggest' | 'pick' | 'find'>

export const SEARCH_CONFIDENCE = 0.7 // OpenStreetMap's best match for words
export const REVERSE_CONFIDENCE = 0.7 // the address at a point
export const AREA_CONFIDENCE = 0.5 // only the sub-district: the merchant places the pin next
const MIN_SEARCH = 3

/** The browser key for Google Maps, from `.env.local`. Empty means Google is not used. */
export const GOOGLE_MAPS_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()

/**
 * All the ways of finding a shop, in one place. Local data answers first and always works offline;
 * Google (with a key) and OpenStreetMap add the rest of Thailand when online.
 */
export function createPlaces({ local, nominatim, google = null, areas }: { local: Places; nominatim: Nominatim; google?: PlaceSource | null; areas: () => Area[] | null }): Places {
  // OpenStreetMap's postcodes are sometimes wrong; the Thai address data knows each sub-district's own.
  const corrected = (point: GeoPoint): GeoPoint => {
    if (!point.parts) return point
    const parts = fixPostcode(areas() ?? [], point.parts)
    return parts === point.parts ? point : { ...point, parts, address: formatThaiAddress(parts) }
  }

  const find = async (text: string): Promise<PlaceMatch | null> => {
    const own = await local.find(text)
    if (own) return own
    const fromGoogle = google ? await google.find(text) : null
    if (fromGoogle) return fromGoogle
    const found = await nominatim.search(text)
    return found ? { value: corrected(found), confidence: SEARCH_CONFIDENCE } : null
  }

  return {
    live: google !== null,
    suggest: async (input) => {
      const typed = input.trim()
      const [own, fromGoogle] = await Promise.all([local.suggest(typed), google ? google.suggest(typed) : Promise.resolve([])])
      const search: PlaceSuggestion = { id: `search:${typed}`, kind: 'search', title: th.places.searchRow(typed), subtitle: '', query: typed }
      return typed.length >= MIN_SEARCH ? [...own, ...fromGoogle, search] : [...own, ...fromGoogle]
    },
    pick: async (suggestion) => {
      if (suggestion.kind === 'search') return find(suggestion.query ?? suggestion.title)
      if (suggestion.kind === 'area' && suggestion.area) {
        const { subdistrict, district, province } = suggestion.area
        const centre = await nominatim.search(`${subdistrict} ${district} ${province}`)
        if (!centre) return local.pick(suggestion)
        const parts = { ...suggestion.area }
        const line = formatThaiAddress(parts)
        return { value: { text: line, address: line, parts, lat: centre.lat, lng: centre.lng }, confidence: AREA_CONFIDENCE, zoom: AREA_ZOOM }
      }
      return suggestion.id.startsWith('local:') || !google ? local.pick(suggestion) : google.pick(suggestion)
    },
    find,
    reverse: async (lat, lng) => {
      const point = await nominatim.reverse(lat, lng)
      return point ? { value: corrected(point), confidence: REVERSE_CONFIDENCE } : local.reverse(lat, lng)
    },
  }
}

let places: Places | undefined

export function getPlaces(): Places {
  places ??= createPlaces({
    local: createLocalPlaces(getLandmarks(), loadedAreas),
    nominatim: createNominatim(),
    google: GOOGLE_MAPS_KEY ? createGooglePlaces(GOOGLE_MAPS_KEY) : null,
    areas: loadedAreas,
  })
  return places
}
