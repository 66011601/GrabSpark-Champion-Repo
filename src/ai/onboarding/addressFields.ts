import { th } from '@/copy/th.ts'
import type { GeoPoint, OnboardingProfile, ProfileUpdates, ThaiAddress } from '@/types/domain.ts'
import { formatThaiAddress, streetLine } from './parsers/thaiAddress.ts'

/** A value guessed from where the shop is: shown amber so the merchant checks it. */
export const DERIVED_CONFIDENCE = 0.7
/** The address of a place the merchant chose from the list. */
export const MAP_ADDRESS_CONFIDENCE = 0.9
/** Where the phone says it is, and where a pasted map link points. Both still need the pin checked. */
export const GPS_CONFIDENCE = 0.75
export const LINK_CONFIDENCE = 0.85

/** From where the shop is, draft the "ชื่ออาคาร/ถนน" and "ที่อยู่ร้านค้า" boxes. `sure` = the merchant picked this place. */
export function addressFromLocation(point: GeoPoint, heardFrom: string, sure = false): ProfileUpdates {
  // A bare dropped pin has nothing to say about the address; its label is not an address.
  if (!point.address && !point.parts && point.text === th.places.pinnedHere) return {}
  const street = point.parts ? streetLine(point.parts) : ''
  const full = point.address ?? (point.parts ? formatThaiAddress(point.parts) : '')
  return {
    // The "pinned here" label is not a street, and a bare name is the only other thing to show.
    ...(street || point.text !== th.places.pinnedHere ? { building: { value: street || point.text, confidence: DERIVED_CONFIDENCE, heardFrom } } : {}),
    address: full
      ? { value: full, confidence: sure ? MAP_ADDRESS_CONFIDENCE : DERIVED_CONFIDENCE, heardFrom }
      : { value: point.text, confidence: DERIVED_CONFIDENCE, heardFrom },
  }
}

/** Drafts for a new location that never replace the merchant's own words: a typed or confirmed box is kept. */
export function redraftAddress(profile: OnboardingProfile, point: GeoPoint, heardFrom: string, sure = false): ProfileUpdates {
  const drafts = addressFromLocation(point, heardFrom, sure)
  const kept: ProfileUpdates = {}
  for (const key of ['building', 'address'] as const) {
    const field = profile.fields[key]
    const merchants = field.status === 'confirmed' || (field.status === 'heard' && field.heardFrom === th.sources.typed)
    if (!merchants && drafts[key]) kept[key] = drafts[key]
  }
  return kept
}

/**
 * A pin placed after picking a sub-district: the map's own answer may know only the district and province,
 * so the ตำบล and postcode of the picked area fill in what it lacks. Left alone when the pin is somewhere else.
 */
export function withArea(point: GeoPoint, area: ThaiAddress): GeoPoint {
  const parts = point.parts
  if (!parts) return { ...point, parts: { ...area }, address: formatThaiAddress(area) }
  const elsewhere =
    (parts.province && parts.province !== area.province) || (parts.district && parts.district !== area.district) || (parts.subdistrict && parts.subdistrict !== area.subdistrict)
  if (elsewhere || (parts.subdistrict && parts.postcode)) return point
  const merged: ThaiAddress = { ...parts, subdistrict: parts.subdistrict ?? area.subdistrict, postcode: parts.postcode ?? area.postcode }
  return { ...point, parts: merged, address: formatThaiAddress(merged) }
}
