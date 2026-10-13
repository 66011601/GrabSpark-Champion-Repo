import type { GeoPoint, Landmark } from '@/types/domain.ts'
import { numbersToDigits } from './thaiNumber.ts'

/** Landmark lookups are approximate, so the merchant always checks the pin in A2. */
export const LOCATION_CONFIDENCE = 0.62

const NEAR = /(ตรงข้าม|ข้างๆ|ข้าง|ใกล้|หน้า|ติดกับ|ติด)\s*([^\s,]+)/

/** "ลาดพร้าวซอยเจ็ดสิบเอ็ด" → "ลาดพร้าว71", so spoken and written addresses compare equal. */
export function normalizePlace(text: string): string {
  return numbersToDigits(text).replace(/\s+/g, '').replace(/ซอย|ซ\.|ถนน|ถ\./g, '')
}

export function parseLocation(text: string, landmarks: Landmark[]): { value: GeoPoint; confidence: number } | null {
  const place = normalizePlace(text)
  const landmark = landmarks.find((candidate) => candidate.match.some((name) => place.includes(normalizePlace(name))))
  if (!landmark) return null
  const near = NEAR.exec(text)
  const label = near ? `${landmark.label} ${near[1]}${near[2]}` : landmark.label
  return { value: { text: label, lat: landmark.lat, lng: landmark.lng }, confidence: LOCATION_CONFIDENCE }
}
