import type { GeoPoint, ProfileUpdates } from '@/types/domain.ts'

/** A value guessed from where the shop is: shown amber so the merchant checks it. */
export const DERIVED_CONFIDENCE = 0.7
export const MAP_ADDRESS_CONFIDENCE = 0.9

/** From where the shop is, draft the "ชื่ออาคาร/ถนน" and "ที่อยู่ร้านค้า" boxes the merchant would otherwise type. */
export function addressFromLocation(point: GeoPoint, heardFrom: string): ProfileUpdates {
  return {
    building: { value: point.text, confidence: DERIVED_CONFIDENCE, heardFrom },
    address: point.address
      ? { value: point.address, confidence: MAP_ADDRESS_CONFIDENCE, heardFrom }
      : { value: point.text, confidence: DERIVED_CONFIDENCE, heardFrom },
  }
}
