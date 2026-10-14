import { formatThaiAddress, parseThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { normalizeThaiDigits } from '@/ai/onboarding/parsers/thaiNumber.ts'
import type { ThaiAddress } from '@/types/domain.ts'

// Thailand's sub-districts and postcodes, from thai-address-database 0.0.33 (ISC licence, Sellsuki),
// itself from jquery.Thailand.js. Copied as src/data/thai-address.json and loaded only when 3/7 needs it.

/** One sub-district and its postcode. */
export interface Area {
  subdistrict: string
  district: string
  province: string
  postcode: string
}

/** The data's packed format: [province, [[district, [[subdistrict, postcode | postcode[]]…]]…]]…, with common words packed into letters. */
export interface CompactDb {
  data: unknown[]
  lookup: string
  words: string
}

type Name = string | number
type Packed = [Name, [Name, [Name, string | string[]][]][]][]

export function decodeAreas(db: CompactDb): Area[] {
  const lookup = db.lookup.split('|')
  const words = db.words.split('|')
  const unpack = (name: Name) =>
    (typeof name === 'number' ? lookup[name] : name).replace(/[A-Za-z]/g, (letter) => {
      const code = letter.charCodeAt(0)
      return words[code < 97 ? code - 65 : 26 + code - 97]
    })
  const areas: Area[] = []
  for (const [province, districts] of db.data as Packed) {
    for (const [district, subdistricts] of districts) {
      for (const [subdistrict, postcodes] of subdistricts) {
        for (const postcode of Array.isArray(postcodes) ? postcodes : [postcodes]) {
          areas.push({ subdistrict: unpack(subdistrict), district: unpack(district), province: unpack(province), postcode: String(postcode) })
        }
      }
    }
  }
  return areas
}

let loading: Promise<Area[]> | undefined
let loaded: Area[] | null = null

/** Loads the data once (about 50 KB zipped), the first time an address is looked up. */
export function loadAreas(): Promise<Area[]> {
  loading ??= import('@/data/thai-address.json')
    .then((module) => {
      loaded = decodeAreas(module.default as unknown as CompactDb)
      return loaded
    })
    .catch((problem: unknown) => {
      loading = undefined // let a later visit try again
      throw problem
    })
  return loading
}

/** The data if it has finished loading, else null. */
export const loadedAreas = (): Area[] | null => loaded

export const areaParts = (area: Area): ThaiAddress => ({ ...area })

const LABEL_PREFIX = /^(?:ตำบล|แขวง|ต\.|อำเภอ|เขต|อ\.|จังหวัด|จ\.)/

/** Areas whose postcode starts with the digits typed, or whose sub-district name matches the first word; later words narrow by district or province. */
export function searchAreas(areas: Area[], query: string, limit = 5): Area[] {
  const [first = '', ...rest] = normalizeThaiDigits(query).trim().split(/\s+/)
  const typed = first.replace(LABEL_PREFIX, '')
  if (/^\d{3,5}$/.test(typed)) return areas.filter((area) => area.postcode.startsWith(typed)).slice(0, limit)
  if (typed.length < 2 || /\d/.test(typed)) return []
  const narrowed = (area: Area) => rest.every((word) => `${area.district}${area.province}`.includes(word.replace(LABEL_PREFIX, '')))
  const exact = areas.filter((area) => area.subdistrict === typed && narrowed(area))
  const starts = areas.filter((area) => area.subdistrict !== typed && area.subdistrict.startsWith(typed) && narrowed(area))
  const inside = areas.filter((area) => !area.subdistrict.startsWith(typed) && area.subdistrict.includes(typed) && narrowed(area))
  return [...exact, ...starts, ...inside].slice(0, limit)
}

/** Map services sometimes give the wrong postcode; the data knows the sub-district's own. Same object back when unchanged. */
export function fixPostcode(areas: Area[], parts: ThaiAddress): ThaiAddress {
  const match = areas.filter((area) => area.subdistrict === parts.subdistrict && area.district === parts.district && area.province === parts.province)
  if (match.length === 0 || match.some((area) => area.postcode === parts.postcode)) return parts
  return { ...parts, postcode: match[0].postcode }
}

/** A postcode that belongs to another province than the one written, e.g. 40000 (ขอนแก่น) with จ.เชียงใหม่. */
export function postcodeMismatch(areas: Area[], address: string): { postcode: string; said: string; actual: string } | null {
  const parts = parseThaiAddress(address)
  if (!parts?.postcode || !parts.province) return null
  const owners = [...new Set(areas.filter((area) => area.postcode === parts.postcode).map((area) => area.province))]
  if (owners.length === 0 || owners.includes(parts.province)) return null
  return { postcode: parts.postcode, said: parts.province, actual: owners[0] }
}

/** Areas to finish the address box with, from its last word; none once the address already has its area and postcode. */
export function areaCompletions(areas: Area[], text: string, limit = 4): Area[] {
  const parts = parseThaiAddress(text)
  if (parts?.subdistrict && parts.district && parts.province && parts.postcode) return []
  const last = text.trim().split(/\s+/).at(-1) ?? ''
  return last ? searchAreas(areas, last, limit) : []
}

/** The address with its last word (and a ต./แขวง just before it) replaced by the whole area. */
export function applyCompletion(text: string, area: Area): string {
  const words = text.trim().split(/\s+/)
  const before = words.slice(0, -1).join(' ').replace(/\s*(?:ตำบล|แขวง|ต\.|รหัสไปรษณีย์)$/, '')
  return [before, formatThaiAddress(areaParts(area))].filter(Boolean).join(' ')
}
