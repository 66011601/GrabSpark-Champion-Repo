import type { GeoPoint, Landmark } from '@/types/domain.ts'
import { numbersToDigits } from './thaiNumber.ts'
import { stripParticles } from './particles.ts'

/** Landmark lookups are approximate, so the merchant always checks the pin in A2. */
export const LOCATION_CONFIDENCE = 0.62

// A landmark phrase starts a word ("…71 ตรงข้ามเซเว่น", "อยู่ใกล้ตลาด"); inside words such as
// "หน้าร้าน" or "ติดต่อ" the same letters mean something else.
const NEAR = /(?:^|\s|อยู่)(ตรงข้าม|ข้างๆ|ข้าง|ใกล้|หน้า|ติดกับ|ติด)\s*([^\s,]+)/

function nearPhrase(text: string): string | null {
  const near = NEAR.exec(text)
  if (!near) return null
  const object = stripParticles(near[2])
  return object ? `${near[1]}${object}` : null
}

/** "ลาดพร้าวซอยเจ็ดสิบเอ็ด" → "ลาดพร้าว71", so spoken and written addresses compare equal. */
export function normalizePlace(text: string): string {
  return numbersToDigits(text).replace(/\s+/g, '').replace(/ซอย|ซ\.|ถนน|ถ\./g, '')
}

export function parseLocation(text: string, landmarks: Landmark[]): { value: GeoPoint; confidence: number } | null {
  const place = normalizePlace(text)
  const landmark = landmarks.find((candidate) => candidate.match.some((name) => place.includes(normalizePlace(name))))
  if (!landmark) return null
  const phrase = nearPhrase(text)
  const label = phrase ? `${landmark.label} ${phrase}` : landmark.label
  return { value: { text: label, lat: landmark.lat, lng: landmark.lng }, confidence: LOCATION_CONFIDENCE }
}
