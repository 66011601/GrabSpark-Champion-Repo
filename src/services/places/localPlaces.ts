import { formatThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { normalizePlace, parseLocation } from '@/ai/onboarding/parsers/location.ts'
import { th } from '@/copy/th.ts'
import type { GeoPoint, Landmark } from '@/types/domain.ts'
import { AREA_ZOOM, COUNTRY_ZOOM, distanceKm, THAILAND_CENTER } from './bounds.ts'
import type { Places, PlaceSuggestion } from './places.ts'
import { areaParts, searchAreas, type Area } from './thaiAddressDb.ts'

export const PICKED_CONFIDENCE = 0.9 // the merchant chose it from the list
export const NEAREST_CONFIDENCE = 0.5 // a point named after the sample place next to it
export const ROUGH_CONFIDENCE = 0.3 // only the sub-district is known: the pin still has to be placed
export const NEAR_KM = 2
const MIN_INPUT = 2
const AREA_ROWS = 4

export function landmarkPoint(landmark: Landmark): GeoPoint {
  const address = landmark.parts ? { address: formatThaiAddress(landmark.parts), parts: landmark.parts } : {}
  return { text: landmark.label, ...address, lat: landmark.lat, lng: landmark.lng }
}

/** Places that work with no network: the prototype's sample places and every Thai sub-district (once loaded). */
export function createLocalPlaces(landmarks: Landmark[], areas: () => Area[] | null): Places {
  const placeRow = (landmark: Landmark): PlaceSuggestion => ({
    id: `local:${landmark.label}`,
    kind: 'place',
    title: landmark.label,
    subtitle: landmark.parts ? formatThaiAddress({ district: landmark.parts.district, province: landmark.parts.province }) : '',
  })
  const areaRow = (area: Area): PlaceSuggestion => ({
    id: `area:${area.subdistrict}|${area.district}|${area.province}|${area.postcode}`,
    kind: 'area',
    title: formatThaiAddress(areaParts(area)),
    subtitle: th.places.areaHint,
    area,
  })

  return {
    live: false,
    suggest: async (input) => {
      const typed = normalizePlace(input)
      if (typed.length < MIN_INPUT) return []
      const places = landmarks.filter((landmark) => [landmark.label, ...landmark.match].some((name) => normalizePlace(name).includes(typed)))
      return [...places.map(placeRow), ...searchAreas(areas() ?? [], input, AREA_ROWS).map(areaRow)]
    },
    pick: async (suggestion) => {
      if (suggestion.kind === 'area' && suggestion.area) {
        const parts = areaParts(suggestion.area)
        const line = formatThaiAddress(parts)
        const nearby = landmarks.find((landmark) => landmark.parts?.province === suggestion.area!.province)
        const centre = nearby ?? THAILAND_CENTER
        return { value: { text: line, address: line, parts, lat: centre.lat, lng: centre.lng }, confidence: ROUGH_CONFIDENCE, zoom: nearby ? AREA_ZOOM : COUNTRY_ZOOM }
      }
      const landmark = landmarks.find((candidate) => `local:${candidate.label}` === suggestion.id)
      return landmark ? { value: landmarkPoint(landmark), confidence: PICKED_CONFIDENCE } : null
    },
    find: async (text) => parseLocation(text, landmarks),
    reverse: async (lat, lng) => {
      const nearest = landmarks
        .map((landmark) => ({ landmark, km: distanceKm(landmark, { lat, lng }) }))
        .sort((a, b) => a.km - b.km)[0]
      if (nearest && nearest.km <= NEAR_KM) return { value: { ...landmarkPoint(nearest.landmark), lat, lng }, confidence: NEAREST_CONFIDENCE }
      return { value: { text: th.places.pinnedHere, lat, lng }, confidence: NEAREST_CONFIDENCE }
    },
  }
}
