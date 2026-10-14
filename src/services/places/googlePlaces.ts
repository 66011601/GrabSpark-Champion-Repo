import type { GeoPoint } from '@/types/domain.ts'
import type { PlaceMatch, PlaceSource, PlaceSuggestion } from './places.ts'

// Google Maps Platform, Places API (New), called straight from the browser with a referrer-restricted key.
// Everything is limited to Thailand twice: in the request, and again on what comes back.
const BASE = 'https://places.googleapis.com/v1'
const PLACE_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents']
const TIMEOUT_MS = 5000
const MIN_INPUT = 3

// A box around Thailand. It also covers corners of its neighbours, which `isInThailand` then removes.
const THAILAND_BOX = { low: { latitude: 5.6, longitude: 97.3 }, high: { latitude: 20.5, longitude: 105.7 } }

export const PICKED_CONFIDENCE = 0.95 // the merchant chose it from the list
export const FOUND_CONFIDENCE = 0.85 // the map's best match for spoken or typed words

export interface GooglePlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  addressComponents?: { shortText?: string; types?: string[] }[]
}

interface AutocompleteResponse {
  suggestions?: {
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
    }
  }[]
}

export function isInThailand(place: GooglePlace): boolean {
  return (place.addressComponents ?? []).some((part) => part.types?.includes('country') && part.shortText === 'TH')
}

/** "… กรุงเทพมหานคร 10310 ประเทศไทย" → without the country, which is always Thailand here. */
const withoutCountry = (address: string) => address.replace(/,?\s*(?:ประเทศไทย|Thailand)\s*$/, '').trim()

export function toGeoPoint(place: GooglePlace): GeoPoint | null {
  if (!place.location || !isInThailand(place)) return null
  const address = place.formattedAddress ? withoutCountry(place.formattedAddress) : undefined
  const text = place.displayName?.text ?? address
  if (!text) return null
  return { text, address: address === text ? undefined : address, lat: place.location.latitude, lng: place.location.longitude }
}

/**
 * Shop addresses from Google Maps. Any failure gives an empty answer; the resolver then asks the next source.
 */
export function createGooglePlaces(apiKey: string): PlaceSource {
  let session = crypto.randomUUID() // groups the keystrokes of one address search into one billed session

  async function call<T>(path: string, fieldMask: string | null, body?: unknown): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`Google Places ${response.status}`)
    return (await response.json()) as T
  }

  const suggest = async (input: string): Promise<PlaceSuggestion[]> => {
    const typed = input.trim()
    if (typed.length < MIN_INPUT) return []
    try {
      const data = await call<AutocompleteResponse>('/places:autocomplete', null, {
        input: typed,
        includedRegionCodes: ['th'],
        languageCode: 'th',
        regionCode: 'th',
        sessionToken: session,
      })
      return (data.suggestions ?? []).flatMap(({ placePrediction: place }) => {
        const title = place?.structuredFormat?.mainText?.text ?? place?.text?.text
        if (!place?.placeId || !title) return []
        return [{ id: place.placeId, kind: 'place' as const, title, subtitle: withoutCountry(place.structuredFormat?.secondaryText?.text ?? '') }]
      })
    } catch (problem) {
      console.warn('Google Maps suggestions are unavailable:', problem)
      return []
    }
  }

  const pick = async (suggestion: PlaceSuggestion): Promise<PlaceMatch | null> => {
    try {
      const query = new URLSearchParams({ languageCode: 'th', regionCode: 'th', sessionToken: session })
      const place = await call<GooglePlace>(`/places/${encodeURIComponent(suggestion.id)}?${query}`, PLACE_FIELDS.join(','))
      session = crypto.randomUUID()
      const value = toGeoPoint(place)
      return value ? { value, confidence: PICKED_CONFIDENCE } : null
    } catch (problem) {
      console.warn('Google Maps place details are unavailable:', problem)
      return null
    }
  }

  const find = async (text: string): Promise<PlaceMatch | null> => {
    try {
      const data = await call<{ places?: GooglePlace[] }>('/places:searchText', PLACE_FIELDS.map((field) => `places.${field}`).join(','), {
        textQuery: text,
        languageCode: 'th',
        regionCode: 'TH',
        locationRestriction: { rectangle: THAILAND_BOX },
        pageSize: 5,
      })
      const value = (data.places ?? []).map(toGeoPoint).find((point) => point !== null)
      return value ? { value, confidence: FOUND_CONFIDENCE } : null
    } catch (problem) {
      console.warn('Google Maps search is unavailable:', problem)
      return null
    }
  }

  return { suggest, pick, find }
}
