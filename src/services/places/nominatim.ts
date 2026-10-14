import { BANGKOK, formatThaiAddress, streetLine } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { th } from '@/copy/th.ts'
import type { GeoPoint, ThaiAddress } from '@/types/domain.ts'
import { isInThailand } from './bounds.ts'

// OpenStreetMap's free geocoder. Its policy: no searching per keystroke, at most one request a second,
// keep answers. Browsers send the page as Referer, which is how the service knows who is asking.
const BASE = 'https://nominatim.openstreetmap.org'
const MIN_GAP_MS = 1000
const TIMEOUT_MS = 4000
const PAUSE_AFTER_429_MS = 60_000

interface NominatimPlace {
  lat?: string
  lon?: string
  name?: string
  address?: Record<string, string>
}

export interface Nominatim {
  search: (text: string) => Promise<GeoPoint | null>
  reverse: (lat: number, lng: number) => Promise<GeoPoint | null>
}

const NOT_PLACES = new Set(['country', 'country_code', 'ISO3166-2-lvl4', 'postcode', 'house_number', 'road'])

/** Nominatim's Thai address → parts, by each value's own prefix (ตำบล…, อำเภอ…), since the keys differ from town to town. */
export function toThaiParts(address: Record<string, string>): ThaiAddress {
  const values = Object.entries(address)
    .filter(([key]) => !NOT_PLACES.has(key))
    .map(([, value]) => value)
  const named = (prefix: RegExp) => values.find((value) => prefix.test(value))?.replace(prefix, '').trim()
  const bangkok = values.some((value) => value.includes('กรุงเทพ'))
  const parts: ThaiAddress = {
    houseNo: address.house_number,
    road: address.road?.replace(/^ถนน\s*/, ''),
    // A city may also have its own แขวง (เชียงใหม่'s แขวงนครพิงค์); outside Bangkok ตำบล is the sub-district.
    subdistrict: named(/^ตำบล/) ?? (bangkok ? named(/^แขวง/) : undefined),
    district: named(/^อำเภอ/) ?? (bangkok ? named(/^เขต/) : undefined),
    province: bangkok ? BANGKOK : (address.province ?? address.state)?.replace(/^จังหวัด/, '').trim(),
    postcode: /^\d{5}$/.test(address.postcode ?? '') ? address.postcode : undefined,
  }
  return Object.fromEntries(Object.entries(parts).filter(([, value]) => value)) as ThaiAddress
}

function toPoint(place: NominatimPlace, useName: boolean): GeoPoint | null {
  const lat = Number(place.lat)
  const lng = Number(place.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInThailand(lat, lng)) return null
  if (place.address?.country_code && place.address.country_code !== 'th') return null
  const parts = place.address ? toThaiParts(place.address) : {}
  const known = Object.keys(parts).length > 0
  const area = formatThaiAddress({ subdistrict: parts.subdistrict, district: parts.district, province: parts.province })
  const text = (useName && place.name) || streetLine(parts) || area || th.places.pinnedHere
  return { text, ...(known ? { address: formatThaiAddress(parts), parts } : {}), lat, lng }
}

export function createNominatim({
  fetchImpl = (...args: Parameters<typeof fetch>) => fetch(...args),
  now = () => Date.now(),
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}: { fetchImpl?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void> } = {}): Nominatim {
  const remembered = new Map<string, GeoPoint>()
  let queue: Promise<unknown> = Promise.resolve()
  let lastCall = Number.NEGATIVE_INFINITY
  let pausedUntil = 0

  // One request at a time, a second apart.
  function call(path: string, params: Record<string, string>): Promise<unknown> {
    const run = async () => {
      if (now() < pausedUntil) return null
      const wait = lastCall + MIN_GAP_MS - now()
      if (wait > 0) await sleep(wait)
      lastCall = now()
      const query = new URLSearchParams({ ...params, format: 'jsonv2', 'accept-language': 'th', addressdetails: '1' })
      try {
        const response = await fetchImpl(`${BASE}${path}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (response.status === 429) {
          pausedUntil = now() + PAUSE_AFTER_429_MS
          return null
        }
        return response.ok ? await response.json() : null
      } catch (problem) {
        console.warn('OpenStreetMap is unavailable:', problem)
        return null
      }
    }
    const result = queue.then(run)
    queue = result.catch(() => null)
    return result
  }

  // Only real answers are kept, so a failed call is tried again next time.
  async function rememberedAs(key: string, load: () => Promise<GeoPoint | null>): Promise<GeoPoint | null> {
    const known = remembered.get(key)
    if (known) return known
    const point = await load()
    if (point) remembered.set(key, point)
    return point
  }

  return {
    search: (text) =>
      rememberedAs(`search:${text.trim()}`, async () => {
        const data = await call('/search', { q: text.trim(), countrycodes: 'th', limit: '3' })
        if (!Array.isArray(data)) return null
        return (data as NominatimPlace[]).map((place) => toPoint(place, true)).find((point) => point !== null) ?? null
      }),
    reverse: (lat, lng) =>
      rememberedAs(`reverse:${lat.toFixed(5)},${lng.toFixed(5)}`, async () => {
        const data = (await call('/reverse', { lat: String(lat), lon: String(lng), zoom: '18' })) as NominatimPlace | null
        if (!data || typeof data !== 'object' || 'error' in data) return null
        const point = toPoint(data, false)
        return point ? { ...point, lat, lng } : null
      }),
  }
}
