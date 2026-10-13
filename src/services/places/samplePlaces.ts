import { normalizePlace, parseLocation } from '@/ai/onboarding/parsers/location.ts'
import { th } from '@/copy/th.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import type { Places } from './places.ts'

const PICKED_CONFIDENCE = 0.9
const MIN_INPUT = 2

/** The prototype's own small table of Bangkok places, for running without a Google Maps key. */
export function createSamplePlaces(): Places {
  const landmarks = getLandmarks()
  return {
    live: false,
    suggest: async (input) => {
      const typed = normalizePlace(input)
      if (typed.length < MIN_INPUT) return []
      return landmarks
        .filter((landmark) => [landmark.label, ...landmark.match].some((name) => normalizePlace(name).includes(typed)))
        .map((landmark) => ({ id: landmark.label, title: landmark.label, subtitle: th.places.sampleArea }))
    },
    pick: async (suggestion) => {
      const landmark = landmarks.find((candidate) => candidate.label === suggestion.id)
      return landmark ? { value: { text: landmark.label, lat: landmark.lat, lng: landmark.lng }, confidence: PICKED_CONFIDENCE } : null
    },
    find: async (text) => parseLocation(text, landmarks),
  }
}
