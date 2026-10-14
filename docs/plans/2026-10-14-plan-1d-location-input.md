# Plan 1d — Shop location, four ways — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On step 3/7 a merchant can place their shop anywhere in Thailand by GPS, a full Thai address (with postcode help), a pin on a real map, or a pasted map link, with no Google key needed.

**Architecture:** Every input goes through one resolver (`getPlaces()` in `src/services/places/places.ts`) that combines local data (≈15 sample places plus all 7,438 Thai sub-districts), OpenStreetMap's Nominatim and, when a key is set, Google. Pure parsing (Thai addresses, map links) is unit-tested. The screen gets an OpenStreetMap map (Leaflet) that is lazy-loaded with the address data, so the first page does not grow.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Tailwind 4, Vitest 5, oxlint, lucide-react; new: `leaflet@1.9.4` and `@types/leaflet@1.9.22`. Thai address data is copied from `thai-address-database@0.0.33` (ISC); the package itself is **not** installed, because it lists Babel, Mocha and ESLint as runtime dependencies.

**Spec:** `docs/specs/2026-10-14-location-input-design.md`

## Global Constraints

- Code style: no semicolons, single quotes, `.ts`/`.tsx` extensions in imports, `@/` alias for `src/`. Match the comment style around you: a short doc comment on exports, plain-English comments that say *why*.
- `npm test`, `npm run lint` (0 warnings) and `npm run build` (`tsc -b` type-checks tests too) must pass at the end of every task.
- oxlint rejects: a component file that also exports non-components (`react/only-export-components`), and calling a state setter synchronously in an effect body. Set state from event handlers, timers or promise callbacks only.
- `src/ai/**` must not import React.
- Only `src/ai/onboarding/submit.ts` imports `merchantApi.write.ts`; only `S7Confirm.tsx`, `H2Menu.tsx` and `H3Hours.tsx` import `submit.ts` (`src/architecture.test.ts`).
- Everything the AI fills is a draft (`status: 'heard'`). Below `CHECK_THRESHOLD` (0.8) it shows amber. A location always needs "หมุดถูกแล้ว" (`needsPinCheck`), except when the merchant placed the pin themselves in the pin sheet.
- On-screen and spoken text lives in `src/copy/th.ts`. The companion speaks as หนู…ค่ะ. Touch targets are at least 48px (`min-h-12`), body text at least 16px.
- Nominatim usage policy: never call it per keystroke; at most one request per second; cache answers.
- Sample place coordinates are approximate (checked against OpenStreetMap on 2026-10-14). The merchant always confirms the pin.
- Commit after each task, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/types/domain.ts` | modify | `ThaiAddress`; `GeoPoint.parts`; `Landmark.parts`; `ChipKind` adds `'pinOnMap'` |
| `src/ai/onboarding/parsers/thaiAddress.ts` | create | Spoken/typed Thai address → parts; parts → one line; province names |
| `src/data/thai-address.json` | create (copied) | Thai sub-district, district, province, postcode data (compact format) |
| `src/services/places/thaiAddressDb.ts` | create | Decode and lazy-load that data; area search, postcode checks, address-box completions |
| `src/data/landmarks.json` | modify | 15 sample places across Thailand, with address parts |
| `src/services/places/bounds.ts` | create | Thailand box, centre, distance, `MapView` |
| `src/services/places/localPlaces.ts` | create (replaces `samplePlaces.ts`) | Offline places: sample places + areas, nearest place for a point |
| `src/services/places/linkCoords.ts` | create | Coordinates from a pasted map link or "lat, lng" |
| `src/services/places/nominatim.ts` | create | OpenStreetMap search and reverse lookup |
| `src/services/places/places.ts` | modify | `Places` interface and the resolver that combines all sources |
| `src/services/places/googlePlaces.ts` | modify | Becomes one source of the resolver (no own fallback) |
| `src/services/places/geolocation.ts` | create | Browser GPS, or the presenter's simulated location |
| `src/services/places/tiles.ts` | create | OpenStreetMap tile URL and credit |
| `src/ai/onboarding/addressFields.ts` | modify | Building/address drafts from a place; re-drafting rule |
| `src/ai/onboarding/parsers/location.ts` | modify | Sample-place matches carry the place's address |
| `src/ai/onboarding/businessTalk.ts` | modify | A spoken full address fills the address box |
| `src/ai/onboarding/followUp.ts`, `src/ai/commands/phrases.ts` | modify | Location chips; "ใช้ตำแหน่งนี้" / "ปักหมุด" phrases |
| `src/components/map/*` | create | `leafletMap.ts`, `DrawnMap.tsx`, `PinMap.tsx`, `PinSheet.tsx` |
| `src/components/ui/MapPinConfirm.tsx` | delete | Replaced by `PinMap` |
| `src/components/ui/PlaceSuggestions.tsx` | modify | Row kinds (place, area, search) |
| `src/screens/signup/s3/LocationField.tsx`, `AddressField.tsx` | create | The two location fields of 3/7 |
| `src/screens/signup/S3Business.tsx` | modify | Wires GPS, links, pin sheet, areas, voice |
| `src/services/demoFlags.ts`, `src/app/demo/DemoPanel.tsx` | modify | "ตำแหน่งจำลอง" switch |
| `src/copy/th.ts`, `README.md`, `.env.example` | modify | Copy, demo steps, credits |

---

### Task 1: Thai address parts — parse and format

**Files:**
- Modify: `src/types/domain.ts` (the `GeoPoint` interface at the top, `Landmark` near line 110)
- Create: `src/ai/onboarding/parsers/thaiAddress.ts`
- Test: `src/ai/onboarding/parsers/thaiAddress.test.ts`

**Interfaces:**
- Consumes: `numbersToDigits`, `normalizeThaiDigits` from `./thaiNumber.ts`; `stripParticles` from `./particles.ts`.
- Produces: `interface ThaiAddress`; `GeoPoint.parts?: ThaiAddress`; `Landmark.parts?: ThaiAddress`; `BANGKOK: string`; `PROVINCES: string[]`; `findProvince(word: string): string | null`; `parseThaiAddress(text: string): ThaiAddress | null`; `streetLine(parts: ThaiAddress): string`; `formatThaiAddress(parts: ThaiAddress): string`.

- [ ] **Step 1: Add the types**

In `src/types/domain.ts`, add above `GeoPoint` and extend `GeoPoint` and `Landmark`:

```ts
/** A Thai postal address in parts. The merchant sees it as one line (formatThaiAddress). */
export interface ThaiAddress {
  houseNo?: string // "12/3"
  moo?: string // หมู่ "4"
  soi?: string
  road?: string
  subdistrict?: string // ตำบล, or แขวง in Bangkok
  district?: string // อำเภอ, or เขต in Bangkok
  province?: string
  postcode?: string // 5 digits
}

export interface GeoPoint {
  text: string
  address?: string // the full address on one line, when known
  parts?: ThaiAddress // the same address in parts, when known
  lat: number
  lng: number
}
```

and in `Landmark` add, after `lng: number`:

```ts
  parts?: ThaiAddress // the sample place's address, so it drafts a full address offline
```

(Keep the existing `address?` comment wording only if it still fits; "the full address on one line, when known" replaces "the map's own full address".)

- [ ] **Step 2: Write the failing tests**

Create `src/ai/onboarding/parsers/thaiAddress.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BANGKOK, findProvince, formatThaiAddress, parseThaiAddress, PROVINCES, streetLine } from './thaiAddress.ts'

describe('findProvince', () => {
  it('knows all 77 provinces and the names people say', () => {
    expect(PROVINCES).toHaveLength(77)
    expect(findProvince('ขอนแก่น')).toBe('ขอนแก่น')
    expect(findProvince('จ.เชียงใหม่')).toBe('เชียงใหม่')
    expect(findProvince('กทม.')).toBe(BANGKOK)
    expect(findProvince('โคราช')).toBe('นครราชสีมา')
    expect(findProvince('ลาดพร้าว')).toBeNull()
  })
})

describe('parseThaiAddress', () => {
  it('reads a spoken address with spoken numbers and a province without its label', () => {
    expect(parseThaiAddress('สิบสองทับสาม หมู่สี่ ตำบลในเมือง อำเภอเมือง ขอนแก่น')).toEqual({
      houseNo: '12/3',
      moo: '4',
      subdistrict: 'ในเมือง',
      district: 'เมืองขอนแก่น',
      province: 'ขอนแก่น',
    })
  })

  it('reads a written address with abbreviations and a postcode', () => {
    expect(parseThaiAddress('99 ม.5 ถ.มิตรภาพ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')).toEqual({
      houseNo: '99',
      moo: '5',
      road: 'มิตรภาพ',
      subdistrict: 'ช้างม่อย',
      district: 'เมืองเชียงใหม่',
      province: 'เชียงใหม่',
      postcode: '50300',
    })
  })

  it('reads a Bangkok address, a soi with a spoken number and a postcode said digit by digit', () => {
    expect(parseThaiAddress('บ้านเลขที่ 45 ซอยลาดพร้าวเจ็ดสิบเอ็ด แขวงลาดพร้าว เขตลาดพร้าว กทม หนึ่งศูนย์สองสามศูนย์ค่ะ')).toEqual({
      houseNo: '45',
      soi: 'ลาดพร้าว71',
      subdistrict: 'ลาดพร้าว',
      district: 'ลาดพร้าว',
      province: BANGKOK,
      postcode: '10230',
    })
  })

  it('takes แขวง and เขต as Bangkok when no province is said', () => {
    expect(parseThaiAddress('แขวงสามเสนใน เขตพญาไท')).toEqual({ subdistrict: 'สามเสนใน', district: 'พญาไท', province: BANGKOK })
  })

  it('reads Thai digits and a house number after อยู่', () => {
    expect(parseThaiAddress('อยู่ ๑๒/๓ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น')?.houseNo).toBe('12/3')
  })

  it('accepts a province and a postcode on their own', () => {
    expect(parseThaiAddress('ขอนแก่น 40000')).toEqual({ province: 'ขอนแก่น', postcode: '40000' })
  })

  it('does not take หมู่บ้าน (a village name) for หมู่', () => {
    expect(parseThaiAddress('หมู่บ้านสุขใจ ต.ในเมือง อ.เมืองขอนแก่น')?.moo).toBeUndefined()
  })

  it('returns null for talk that is not an address', () => {
    expect(parseThaiAddress('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น')).toBeNull()
    expect(parseThaiAddress('อยู่เชียงใหม่')).toBeNull()
    expect(parseThaiAddress('ถนนลาดพร้าวค่ะ')).toBeNull()
  })
})

describe('formatThaiAddress', () => {
  const khonKaen = { houseNo: '12/3', moo: '4', road: 'มิตรภาพ', subdistrict: 'ในเมือง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น', postcode: '40000' }
  const latPhrao = { soi: 'ลาดพร้าว 71', road: 'ลาดพร้าว', subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: BANGKOK, postcode: '10230' }

  it('writes ต. อ. จ. outside Bangkok', () => {
    expect(formatThaiAddress(khonKaen)).toBe('12/3 หมู่ 4 ถนนมิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น 40000')
  })

  it('writes แขวง and เขต in Bangkok, with no จ.', () => {
    expect(formatThaiAddress(latPhrao)).toBe('ซอยลาดพร้าว 71 ถนนลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230')
  })

  it('never doubles ซอย or ถนน', () => {
    expect(streetLine({ soi: 'ซอย 7', road: 'ถนนนิมมานเหมินท์' })).toBe('ซอย 7 ถนนนิมมานเหมินท์')
  })

  it('reads back what it writes', () => {
    expect(parseThaiAddress(formatThaiAddress(khonKaen))).toEqual(khonKaen)
    expect(parseThaiAddress(formatThaiAddress(latPhrao))).toEqual(latPhrao)
  })
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/ai/onboarding/parsers/thaiAddress.test.ts`
Expected: FAIL — `Failed to resolve import "./thaiAddress.ts"`.

- [ ] **Step 4: Write the parser**

Create `src/ai/onboarding/parsers/thaiAddress.ts`:

```ts
import type { ThaiAddress } from '@/types/domain.ts'
import { stripParticles } from './particles.ts'
import { normalizeThaiDigits, numbersToDigits } from './thaiNumber.ts'

export const BANGKOK = 'กรุงเทพมหานคร'

/** The 77 provinces, spelled as the Thai address data spells them. */
export const PROVINCES = [
  'กระบี่', 'กรุงเทพมหานคร', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช',
  'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี',
  'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'ยะลา',
  'ยโสธร', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ร้อยเอ็ด', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'ศรีสะเกษ', 'สกลนคร',
  'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระบุรี', 'สระแก้ว', 'สิงห์บุรี', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'สุโขทัย', 'หนองคาย', 'หนองบัวลำภู', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี', 'อ่างทอง',
  'เชียงราย', 'เชียงใหม่', 'เพชรบุรี', 'เพชรบูรณ์', 'เลย', 'แพร่', 'แม่ฮ่องสอน',
]

// Short names people say for a province.
const PROVINCE_NICKNAMES: Record<string, string> = {
  กทม: BANGKOK,
  กรุงเทพ: BANGKOK,
  'กรุงเทพฯ': BANGKOK,
  โคราช: 'นครราชสีมา',
  อยุธยา: 'พระนครศรีอยุธยา',
  อุบล: 'อุบลราชธานี',
  อุดร: 'อุดรธานี',
  สุราษฎร์: 'สุราษฎร์ธานี',
  นครศรี: 'นครศรีธรรมราช',
}

/** "ขอนแก่น", "จ.ขอนแก่น", "กทม." → the province's full name, or null. */
export function findProvince(word: string): string | null {
  const name = word.trim().replace(/^(?:จังหวัด|จ\.)/, '').replace(/\.$/, '')
  if (PROVINCES.includes(name)) return name
  return PROVINCE_NICKNAMES[name] ?? null
}

type Part = keyof ThaiAddress

// Words that name the part after them. Within one start letter the longer word comes first,
// so "หมู่ที่" wins over "หมู่"; the earliest match in the text wins over a later one.
const LABELS: [string, Part][] = [
  ['รหัสไปรษณีย์', 'postcode'],
  ['บ้านเลขที่', 'houseNo'],
  ['เลขที่', 'houseNo'],
  ['หมู่ที่', 'moo'],
  ['หมู่', 'moo'],
  ['ม.', 'moo'],
  ['ซอย', 'soi'],
  ['ซ.', 'soi'],
  ['ถนน', 'road'],
  ['ถ.', 'road'],
  ['ตำบล', 'subdistrict'],
  ['แขวง', 'subdistrict'],
  ['ต.', 'subdistrict'],
  ['อำเภอ', 'district'],
  ['เขต', 'district'],
  ['อ.', 'district'],
  ['จังหวัด', 'province'],
  ['จ.', 'province'],
]
const PART_OF = new Map(LABELS)
// หมู่บ้าน (a village's name) is not หมู่ (the village number).
const LABEL = new RegExp(LABELS.map(([word]) => (word === 'หมู่' ? 'หมู่(?!บ้าน)' : word.replace(/\./g, '\\.'))).join('|'), 'g')

// Where an address ends and the merchant moves on: a landmark, opening hours, dishes, a phone number.
const STOP = /\s(?:ตรงข้าม|ข้างๆ|ข้าง|ใกล้|หน้า|ติดกับ|เปิด|ขาย|เมนู|เบอร์|โทร|ร้าน)/

// Postcodes are read digit by digit: "สี่ศูนย์ศูนย์ศูนย์ศูนย์".
const DIGIT_WORDS: [string, string][] = [
  ['ศูนย์', '0'], ['หนึ่ง', '1'], ['สอง', '2'], ['สาม', '3'], ['สี่', '4'],
  ['ห้า', '5'], ['หก', '6'], ['เจ็ด', '7'], ['แปด', '8'], ['เก้า', '9'],
]
const SPELLED_POSTCODE = new RegExp(`(?:(?:${DIGIT_WORDS.map(([word]) => word).join('|')})\\s*){5}`, 'g')
const spellOut = (words: string) => DIGIT_WORDS.reduce((text, [word, digit]) => text.split(word).join(digit), words).replace(/\s+/g, '')

const NUMBER = /^\d+(?:\/\d+)?/
// "สิบสองทับสาม" → "12/3"
const toNumber = (value: string) => numbersToDigits(value).replace(/\s*ทับ\s*/g, '/').replace(/\s+/g, '')

// "ลาดพร้าวเจ็ดสิบเอ็ด" → "ลาดพร้าว71", but "สามเสน" stays: only a number at the end of a name is a number.
function nameWithNumber(value: string): string {
  const converted = numbersToDigits(value)
  return /^\D*\d+$/.test(converted.replace(/\s+/g, '')) ? converted : value
}

function takePostcode(text: string): { rest: string; postcode?: string } {
  const cut = (match: RegExpMatchArray) => `${text.slice(0, match.index)} ${text.slice(match.index! + match[0].length)}`
  const digits = [...text.matchAll(/(?<!\d)\d{5}(?!\d)/g)].at(-1)
  if (digits) return { rest: cut(digits), postcode: digits[0] }
  const spelled = [...text.matchAll(SPELLED_POSTCODE)].at(-1)
  if (spelled) return { rest: cut(spelled), postcode: spellOut(spelled[0]) }
  return { rest: text }
}

/**
 * A Thai address said or typed ("12/3 หมู่ 4 ต.ในเมือง อ.เมือง ขอนแก่น 40000") in parts, or null when the words
 * are not an address: at least two parts, one of them a sub-district, district, province or postcode. Pure.
 */
export function parseThaiAddress(input: string): ThaiAddress | null {
  const { rest, postcode } = takePostcode(normalizeThaiDigits(stripParticles(input)).replace(/\s+/g, ' '))
  const text = rest.replace(/\s+/g, ' ').trim()
  const parts: ThaiAddress = postcode ? { postcode } : {}
  const labels = [...text.matchAll(LABEL)]
  const spare: string[] = [] // words after a place name that may be the province ("อำเภอเมือง ขอนแก่น")

  labels.forEach((label, index) => {
    const part = PART_OF.get(label[0])!
    const end = labels[index + 1]?.index ?? text.length
    const value = text.slice(label.index! + label[0].length, end).split(STOP)[0].trim()
    if (!value || parts[part]) return
    const [first, ...others] = value.split(' ')
    if (part === 'houseNo' || part === 'moo') {
      const number = NUMBER.exec(toNumber(value))?.[0]
      if (number) parts[part] = number
    } else if (part === 'postcode') {
      const number = toNumber(value)
      if (/^\d{5}$/.test(number)) parts.postcode = number
    } else if (part === 'soi' || part === 'road') {
      parts[part] = nameWithNumber(value)
    } else if (part === 'province') {
      const province = findProvince(first)
      if (province) parts.province = province
    } else {
      parts[part] = first
      spare.push(...others)
    }
  })

  if (!parts.houseNo) {
    const head = text.slice(0, labels[0]?.index ?? text.length).replace(/^(?:ที่อยู่|อยู่ที่|อยู่)\s*/, '')
    const number = NUMBER.exec(toNumber(head))?.[0]
    if (number) parts.houseNo = number
  }
  if (!parts.province) {
    const province = [...spare, ...text.split(' ')].map(findProvince).find((name) => name !== null)
    if (province) parts.province = province
  }
  if (!parts.province && labels.some((label) => label[0] === 'แขวง' || label[0] === 'เขต')) parts.province = BANGKOK
  if (parts.district === 'เมือง' && parts.province && parts.province !== BANGKOK) parts.district = `เมือง${parts.province}`

  const hasArea = Boolean(parts.subdistrict || parts.district || parts.province || parts.postcode)
  return hasArea && Object.keys(parts).length >= 2 ? parts : null
}

/** "ซอยลาดพร้าว 71 ถนนลาดพร้าว": the street part of an address, for the "ชื่ออาคาร/ถนน" box. */
export function streetLine(parts: ThaiAddress): string {
  const soi = parts.soi && (parts.soi.startsWith('ซอย') ? parts.soi : `ซอย${parts.soi}`)
  const road = parts.road && (parts.road.startsWith('ถนน') ? parts.road : `ถนน${parts.road}`)
  return [soi, road].filter(Boolean).join(' ')
}

/** The address on one line, as Thais write it: แขวง/เขต in Bangkok, ต./อ./จ. elsewhere. */
export function formatThaiAddress(parts: ThaiAddress): string {
  const bangkok = parts.province === BANGKOK
  return [
    parts.houseNo,
    parts.moo && `หมู่ ${parts.moo}`,
    streetLine(parts),
    parts.subdistrict && `${bangkok ? 'แขวง' : 'ต.'}${parts.subdistrict}`,
    parts.district && `${bangkok ? 'เขต' : 'อ.'}${parts.district}`,
    parts.province && (bangkok ? BANGKOK : `จ.${parts.province}`),
    parts.postcode,
  ]
    .filter(Boolean)
    .join(' ')
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/ai/onboarding/parsers/thaiAddress.test.ts`
Expected: PASS (11 tests). If one example fails because of how `numbersToDigits` splits a word, adjust the **parser** (not the expected parts), and keep the example. The only allowed test change is a clearer input sentence with the same meaning.

- [ ] **Step 6: Check the whole suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: all pass, 0 lint warnings.

- [ ] **Step 7: Commit**

```bash
git add src/types/domain.ts src/ai/onboarding/parsers/thaiAddress.ts src/ai/onboarding/parsers/thaiAddress.test.ts
git commit -m "Read and write Thai addresses in parts, for the address box and the map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Thai address data — areas, postcodes, completions

**Files:**
- Create: `src/data/thai-address.json` (copied, not hand-written)
- Create: `src/services/places/thaiAddressDb.ts`
- Test: `src/services/places/thaiAddressDb.test.ts`

**Interfaces:**
- Consumes: `ThaiAddress` (Task 1); `formatThaiAddress`, `parseThaiAddress` from `@/ai/onboarding/parsers/thaiAddress.ts`; `normalizeThaiDigits` from `@/ai/onboarding/parsers/thaiNumber.ts`.
- Produces: `interface Area { subdistrict: string; district: string; province: string; postcode: string }`; `interface CompactDb`; `decodeAreas(db: CompactDb): Area[]`; `loadAreas(): Promise<Area[]>`; `loadedAreas(): Area[] | null`; `areaParts(area: Area): ThaiAddress`; `searchAreas(areas: Area[], query: string, limit?: number): Area[]`; `fixPostcode(areas: Area[], parts: ThaiAddress): ThaiAddress` (returns the **same object** when nothing changes); `postcodeMismatch(areas: Area[], address: string): { postcode: string; said: string; actual: string } | null`; `areaCompletions(areas: Area[], text: string, limit?: number): Area[]`; `applyCompletion(text: string, area: Area): string`.

- [ ] **Step 1: Copy the data file**

Run from the repo root (Git Bash):

```bash
mkdir -p "$TEMP/thai-address" && cd "$TEMP/thai-address" && npm pack thai-address-database@0.0.33 && tar xzf thai-address-database-0.0.33.tgz && cd - && cp "$TEMP/thai-address/package/database/db.json" src/data/thai-address.json && wc -c src/data/thai-address.json
```

Expected: `204635 src/data/thai-address.json`. The file is JSON with top-level keys `data`, `lookup`, `words`. Do not edit it.

- [ ] **Step 2: Write the failing tests**

Create `src/services/places/thaiAddressDb.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import raw from '@/data/thai-address.json'
import {
  applyCompletion,
  areaCompletions,
  decodeAreas,
  fixPostcode,
  loadAreas,
  postcodeMismatch,
  searchAreas,
  type CompactDb,
} from './thaiAddressDb.ts'

const areas = decodeAreas(raw as unknown as CompactDb)
const CHANG_MOI = { subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '50300' }

describe('decodeAreas', () => {
  it('unpacks every sub-district of Thailand with its postcode', () => {
    expect(areas).toHaveLength(7438)
    expect(areas).toContainEqual(CHANG_MOI)
    expect(areas).toContainEqual({ subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: 'กรุงเทพมหานคร', postcode: '10230' })
  })

  it('loads the same data on first use', async () => {
    expect(await loadAreas()).toHaveLength(7438)
  })
})

describe('searchAreas', () => {
  it('finds areas by the start of a postcode', () => {
    const found = searchAreas(areas, '40000', 50)
    expect(found.every((area) => area.postcode === '40000')).toBe(true)
    expect(found).toContainEqual({ subdistrict: 'ในเมือง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น', postcode: '40000' })
  })

  it('finds a sub-district by name, with or without ต.', () => {
    expect(searchAreas(areas, 'ช้างม่อย')[0]).toEqual(CHANG_MOI)
    expect(searchAreas(areas, 'ต.ช้างม่อย')[0]).toEqual(CHANG_MOI)
  })

  it('narrows a common name with the district or province after it', () => {
    const found = searchAreas(areas, 'ในเมือง ขอนแก่น', 10)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((area) => area.province === 'ขอนแก่น')).toBe(true)
  })

  it('needs at least two letters or three digits', () => {
    expect(searchAreas(areas, 'ก')).toEqual([])
    expect(searchAreas(areas, '40')).toEqual([])
  })
})

describe('fixPostcode', () => {
  it('replaces a postcode that does not belong to the sub-district', () => {
    expect(fixPostcode(areas, { ...CHANG_MOI, postcode: '55520' }).postcode).toBe('50300')
  })

  it('returns the same parts when they are right or unknown', () => {
    const parts = { ...CHANG_MOI }
    expect(fixPostcode(areas, parts)).toBe(parts)
    const unknown = { road: 'ไม่มีจริง' }
    expect(fixPostcode(areas, unknown)).toBe(unknown)
  })
})

describe('postcodeMismatch', () => {
  it('notices a postcode from another province', () => {
    expect(postcodeMismatch(areas, '12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 40000')).toEqual({ postcode: '40000', said: 'เชียงใหม่', actual: 'ขอนแก่น' })
  })

  it('is quiet when the postcode fits, or when there is nothing to compare', () => {
    expect(postcodeMismatch(areas, '12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')).toBeNull()
    expect(postcodeMismatch(areas, '12 ถนนลาดพร้าว')).toBeNull()
  })
})

describe('areaCompletions and applyCompletion', () => {
  it('offers areas for the last word typed', () => {
    expect(areaCompletions(areas, '12/3 หมู่ 4 ช้างม่')[0]).toEqual(CHANG_MOI)
  })

  it('offers nothing once the address already has its area and postcode', () => {
    expect(areaCompletions(areas, '12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')).toEqual([])
  })

  it('replaces the last word, and a ต. typed before it, with the whole area', () => {
    expect(applyCompletion('12/3 หมู่ 4 ต. ช้างม่', CHANG_MOI)).toBe('12/3 หมู่ 4 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')
  })
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/services/places/thaiAddressDb.test.ts`
Expected: FAIL — cannot resolve `./thaiAddressDb.ts`.

- [ ] **Step 4: Write the module**

Create `src/services/places/thaiAddressDb.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/services/places/thaiAddressDb.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 6: Check the whole suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: all pass. `vite build` prints a separate chunk for `thai-address` (lazy import).

- [ ] **Step 7: Commit**

```bash
git add src/data/thai-address.json src/services/places/thaiAddressDb.ts src/services/places/thaiAddressDb.test.ts
git commit -m "Add Thailand's sub-districts and postcodes for address search and checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Sample places across Thailand, offline place source, address drafts

**Files:**
- Modify: `src/data/landmarks.json` (replace)
- Create: `src/services/places/bounds.ts`
- Create: `src/services/places/localPlaces.ts`; Delete: `src/services/places/samplePlaces.ts`
- Modify: `src/services/places/places.ts` (types and `getPlaces`)
- Modify: `src/services/places/googlePlaces.ts` (row kind, temporary `reverse`)
- Modify: `src/ai/onboarding/parsers/location.ts` (matches carry the place's address)
- Modify: `src/ai/onboarding/addressFields.ts` (+ `redraftAddress`, constants)
- Modify: `src/screens/signup/S3Business.tsx:81` (one call), `src/copy/th.ts` (`places` section)
- Tests: create `src/services/places/localPlaces.test.ts`; update `src/ai/onboarding/addressFields.test.ts`, `src/ai/onboarding/parsers/location.test.ts`, `src/ai/onboarding/businessTalk.test.ts`, `src/services/places/googlePlaces.test.ts`

**Interfaces:**
- Consumes: Task 1 (`formatThaiAddress`, `streetLine`, `ThaiAddress`), Task 2 (`Area`, `areaParts`, `searchAreas`, `loadedAreas`).
- Produces:
  - `bounds.ts`: `interface MapView { lat: number; lng: number; zoom: number }`; `THAILAND_CENTER: { lat: number; lng: number }`; `isInThailand(lat: number, lng: number): boolean`; `distanceKm(a: {lat,lng}, b: {lat,lng}): number`; `PIN_ZOOM = 17`; `AREA_ZOOM = 15`; `COUNTRY_ZOOM = 6`.
  - `places.ts`: `type SuggestionKind = 'place' | 'area' | 'search'`; `PlaceSuggestion { id; kind; title; subtitle; area?: Area; query?: string }`; `PlaceMatch { value: GeoPoint; confidence: number; zoom?: number }`; `Places` gains `reverse(lat: number, lng: number): Promise<PlaceMatch | null>`.
  - `localPlaces.ts`: `createLocalPlaces(landmarks: Landmark[], areas: () => Area[] | null): Places`; `landmarkPoint(landmark: Landmark): GeoPoint`; `PICKED_CONFIDENCE = 0.9`; `NEAREST_CONFIDENCE = 0.5`; `ROUGH_CONFIDENCE = 0.3`; `NEAR_KM = 2`.
  - `addressFields.ts`: `addressFromLocation(point: GeoPoint, heardFrom: string, sure?: boolean): ProfileUpdates`; `redraftAddress(profile: OnboardingProfile, point: GeoPoint, heardFrom: string, sure?: boolean): ProfileUpdates`; `GPS_CONFIDENCE = 0.75`; `LINK_CONFIDENCE = 0.85`; existing `DERIVED_CONFIDENCE = 0.7`, `MAP_ADDRESS_CONFIDENCE = 0.9`.
  - `th.places`: `fromLocal`, `pinnedHere`, `areaHint`, `searchRow(query)`.

- [ ] **Step 1: Replace the sample places**

Replace `src/data/landmarks.json` with (one place per line; keep this order — tests rely on ตลาดวโรรส being the first เชียงใหม่ place):

```json
[
  { "label": "ลาดพร้าว 71", "match": ["ลาดพร้าว 71", "ลาดพร้าวซอย 71", "ซอยลาดพร้าว 71"], "lat": 13.8016, "lng": 100.6033, "parts": { "soi": "ลาดพร้าว 71", "road": "ลาดพร้าว", "subdistrict": "ลาดพร้าว", "district": "ลาดพร้าว", "province": "กรุงเทพมหานคร", "postcode": "10230" } },
  { "label": "อารีย์", "match": ["อารีย์", "พหลโยธิน 7"], "lat": 13.7797, "lng": 100.5446, "parts": { "road": "พหลโยธิน", "subdistrict": "พญาไท", "district": "พญาไท", "province": "กรุงเทพมหานคร", "postcode": "10400" } },
  { "label": "สามย่าน", "match": ["สามย่าน"], "lat": 13.7325, "lng": 100.5293, "parts": { "road": "พระรามที่ 4", "subdistrict": "ปทุมวัน", "district": "ปทุมวัน", "province": "กรุงเทพมหานคร", "postcode": "10330" } },
  { "label": "ตลาดพลู", "match": ["ตลาดพลู"], "lat": 13.7208, "lng": 100.478, "parts": { "subdistrict": "ตลาดพลู", "district": "ธนบุรี", "province": "กรุงเทพมหานคร", "postcode": "10600" } },
  { "label": "ตลาดต้นตาล ขอนแก่น", "match": ["ตลาดต้นตาล", "ต้นตาล"], "lat": 16.4183, "lng": 102.8184, "parts": { "subdistrict": "ในเมือง", "district": "เมืองขอนแก่น", "province": "ขอนแก่น", "postcode": "40000" } },
  { "label": "อนุสาวรีย์ย่าโม โคราช", "match": ["ย่าโม", "อนุสาวรีย์ย่าโม", "อนุสาวรีย์ท้าวสุรนารี"], "lat": 14.9747, "lng": 102.0984, "parts": { "subdistrict": "ในเมือง", "district": "เมืองนครราชสีมา", "province": "นครราชสีมา", "postcode": "30000" } },
  { "label": "ยูดีทาวน์ อุดรธานี", "match": ["ยูดีทาวน์", "ยูดี ทาวน์", "UD Town"], "lat": 17.4036, "lng": 102.8046, "parts": { "road": "ทองใหญ่", "subdistrict": "หมากแข้ง", "district": "เมืองอุดรธานี", "province": "อุดรธานี", "postcode": "41000" } },
  { "label": "ทุ่งศรีเมือง อุบลราชธานี", "match": ["ทุ่งศรีเมือง"], "lat": 15.2299, "lng": 104.8575, "parts": { "subdistrict": "ในเมือง", "district": "เมืองอุบลราชธานี", "province": "อุบลราชธานี", "postcode": "34000" } },
  { "label": "ตลาดวโรรส เชียงใหม่", "match": ["ตลาดวโรรส", "วโรรส", "กาดหลวง"], "lat": 18.7902, "lng": 99.0005, "parts": { "road": "ข่วงเมรุ", "subdistrict": "ช้างม่อย", "district": "เมืองเชียงใหม่", "province": "เชียงใหม่", "postcode": "50300" } },
  { "label": "นิมมานเหมินท์ เชียงใหม่", "match": ["นิมมานเหมินท์", "นิมมานเหมินทร์", "นิมมาน"], "lat": 18.7981, "lng": 98.9705, "parts": { "road": "นิมมานเหมินท์", "subdistrict": "สุเทพ", "district": "เมืองเชียงใหม่", "province": "เชียงใหม่", "postcode": "50200" } },
  { "label": "หอนาฬิกาเชียงราย", "match": ["หอนาฬิกาเชียงราย"], "lat": 19.9072, "lng": 99.831, "parts": { "road": "บรรพปราการ", "subdistrict": "เวียง", "district": "เมืองเชียงราย", "province": "เชียงราย", "postcode": "57000" } },
  { "label": "กาดกองต้า ลำปาง", "match": ["กาดกองต้า", "กองต้า"], "lat": 18.2914, "lng": 99.4991, "parts": { "road": "ตลาดเก่า", "subdistrict": "หัวเวียง", "district": "เมืองลำปาง", "province": "ลำปาง", "postcode": "52000" } },
  { "label": "ตลาดกิมหยง หาดใหญ่", "match": ["ตลาดกิมหยง", "กิมหยง"], "lat": 7.0084, "lng": 100.47, "parts": { "subdistrict": "หาดใหญ่", "district": "หาดใหญ่", "province": "สงขลา", "postcode": "90110" } },
  { "label": "ถนนถลาง ภูเก็ต", "match": ["ถนนถลาง", "เมืองเก่าภูเก็ต"], "lat": 7.8848, "lng": 98.3891, "parts": { "road": "ถลาง", "subdistrict": "ตลาดเหนือ", "district": "เมืองภูเก็ต", "province": "ภูเก็ต", "postcode": "83000" } },
  { "label": "ตลาดศาลเจ้า สุราษฎร์ธานี", "match": ["ตลาดศาลเจ้า"], "lat": 9.1458, "lng": 99.3259, "parts": { "road": "ต้นโพธิ์", "subdistrict": "ตลาด", "district": "เมืองสุราษฎร์ธานี", "province": "สุราษฎร์ธานี", "postcode": "84000" } }
]
```

Match words are deliberately specific: no bare province or city names (a test checks that "อยู่เชียงใหม่" finds nothing).

- [ ] **Step 2: Add `bounds.ts`**

Create `src/services/places/bounds.ts`:

```ts
/** Where a map opens: a point and how close (17 = a street, 15 = a sub-district, 6 = all of Thailand). */
export interface MapView {
  lat: number
  lng: number
  zoom: number
}

export const PIN_ZOOM = 17
export const AREA_ZOOM = 15
export const COUNTRY_ZOOM = 6

// A box around Thailand. It also covers corners of its neighbours; map answers are checked by country as well.
const BOX = { south: 5.6, north: 20.5, west: 97.3, east: 105.7 }

export const THAILAND_CENTER = { lat: 13.0, lng: 101.0 }

export const isInThailand = (lat: number, lng: number): boolean => lat >= BOX.south && lat <= BOX.north && lng >= BOX.west && lng <= BOX.east

const EARTH_KM = 6371
const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Straight-line distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}
```

- [ ] **Step 3: Update the place types in `places.ts`**

In `src/services/places/places.ts`, replace the `PlaceSuggestion`, `PlaceMatch` and `Places` declarations with:

```ts
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
```

Add `import type { Area } from './thaiAddressDb.ts'` at the top, and change `getPlaces` to use the new local source (Task 6 replaces it again):

```ts
import { getLandmarks } from '@/services/merchantApi.ts'
import { createLocalPlaces } from './localPlaces.ts'
import { loadedAreas, type Area } from './thaiAddressDb.ts'
// …
export function getPlaces(): Places {
  const local = createLocalPlaces(getLandmarks(), loadedAreas)
  places ??= GOOGLE_MAPS_KEY ? createGooglePlaces(GOOGLE_MAPS_KEY, local) : local
  return places
}
```

Remove the `createSamplePlaces` import.

- [ ] **Step 4: Keep Google compiling**

In `src/services/places/googlePlaces.ts`:
- In `suggest`, return rows with a kind: `return [{ id: place.placeId, kind: 'place' as const, title, subtitle: withoutCountry(place.structuredFormat?.secondaryText?.text ?? '') }]`.
- In the returned object, add a reverse lookup that uses the offline source for now: `return { live: true, suggest, pick, find, reverse: (lat, lng) => offline.reverse(lat, lng) }`.

In `src/services/places/googlePlaces.test.ts`:
- Give the `offline` fake a reverse: `const offline: Places = { live: false, suggest: vi.fn(async () => []), pick: vi.fn(async () => null), find: vi.fn(async () => null), reverse: vi.fn(async () => null) }`.
- The suggestion expectation becomes `[{ id: 'soi71', kind: 'place', title: 'ซอย ลาดพร้าว 71', subtitle: 'เขตวังทองหลาง กรุงเทพมหานคร' }]`.
- The `pick` call passes `{ id: 'soi71', kind: 'place', title: 'ซอย ลาดพร้าว 71', subtitle: '' }`.

- [ ] **Step 5: Sample-place matches carry the place's address**

In `src/ai/onboarding/parsers/location.ts`, import `formatThaiAddress` from `./thaiAddress.ts` and change the return of `parseLocation`:

```ts
  const address = landmark.parts ? { address: formatThaiAddress(landmark.parts), parts: landmark.parts } : {}
  return { value: { text: label, ...address, lat: landmark.lat, lng: landmark.lng }, confidence: LOCATION_CONFIDENCE }
```

In `src/ai/onboarding/parsers/location.test.ts`, the first test's expectation becomes:

```ts
    expect(result).toEqual({
      value: {
        text: 'ลาดพร้าว 71 ตรงข้ามเซเว่น',
        address: 'ซอยลาดพร้าว 71 ถนนลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230',
        parts: landmarks[0].parts,
        lat: 13.8016,
        lng: 100.6033,
      },
      confidence: LOCATION_CONFIDENCE,
    })
```

and add:

```ts
  it('finds sample places outside Bangkok', () => {
    expect(parseLocation('ร้านอยู่ในตลาดวโรรสค่ะ', landmarks)?.value.parts?.province).toBe('เชียงใหม่')
    expect(parseLocation('อยู่ข้างตลาดกิมหยง', landmarks)?.value.parts?.postcode).toBe('90110')
  })
```

- [ ] **Step 6: Address drafts from parts, and the re-drafting rule — failing tests first**

Replace `src/ai/onboarding/addressFields.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { addressFromLocation, DERIVED_CONFIDENCE, MAP_ADDRESS_CONFIDENCE, redraftAddress } from './addressFields.ts'
import { applyUpdates, confirmField, createEmptyProfile } from './profile.ts'

const BARE = { text: 'ลาดพร้าว 71', lat: 13.8, lng: 100.6 }
const WITH_PARTS = {
  text: 'ตลาดวโรรส เชียงใหม่',
  parts: { road: 'ข่วงเมรุ', subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '50300' },
  address: 'ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300',
  lat: 18.79,
  lng: 99.0,
}

describe('addressFromLocation', () => {
  it('drafts both boxes from the place name when nothing more is known', () => {
    expect(addressFromLocation(BARE, 'x')).toEqual({
      building: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
      address: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
    })
  })

  it('uses the street for the building box and the full address, amber unless the merchant picked the place', () => {
    expect(addressFromLocation(WITH_PARTS, 'x')).toEqual({
      building: { value: 'ถนนข่วงเมรุ', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
      address: { value: WITH_PARTS.address, confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
    })
    expect(addressFromLocation(WITH_PARTS, 'x', true).address?.confidence).toBe(MAP_ADDRESS_CONFIDENCE)
  })
})

describe('redraftAddress', () => {
  it('replaces drafts but keeps what the merchant typed or confirmed', () => {
    const drafted = applyUpdates(createEmptyProfile(), addressFromLocation(BARE, 'x'))
    expect(redraftAddress(drafted, WITH_PARTS, 'pin').address?.value).toBe(WITH_PARTS.address)

    const typed = applyUpdates(createEmptyProfile(), { address: { value: '99 ถนนลาดพร้าว', confidence: 1, heardFrom: th.sources.typed } })
    expect(redraftAddress(typed, WITH_PARTS, 'pin').address).toBeUndefined()

    const confirmed = confirmField(drafted, 'building')
    expect(redraftAddress(confirmed, WITH_PARTS, 'pin').building).toBeUndefined()
  })
})
```

Run: `npx vitest run src/ai/onboarding/addressFields.test.ts` — Expected: FAIL (`redraftAddress` is not exported; building expectation differs).

- [ ] **Step 7: Write the address drafts**

Replace `src/ai/onboarding/addressFields.ts` with:

```ts
import { th } from '@/copy/th.ts'
import type { GeoPoint, OnboardingProfile, ProfileUpdates } from '@/types/domain.ts'
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
  const street = point.parts ? streetLine(point.parts) : ''
  const full = point.address ?? (point.parts ? formatThaiAddress(point.parts) : '')
  return {
    building: { value: street || point.text, confidence: DERIVED_CONFIDENCE, heardFrom },
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
```

- [ ] **Step 8: Update the business-talk expectations**

In `src/ai/onboarding/businessTalk.test.ts`, the demo-sentence test now drafts from the sample place's parts:

```ts
    expect(updates.building).toEqual({ value: 'ซอยลาดพร้าว 71 ถนนลาดพร้าว', confidence: DERIVED_CONFIDENCE, heardFrom: line1 })
    expect(updates.address?.value).toBe('ซอยลาดพร้าว 71 ถนนลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230')
```

- [ ] **Step 9: Copy for places**

In `src/copy/th.ts`, `places` section: delete `sampleArea` and `fromSamples` (keep `mapTitle`; Task 8 removes it), and add:

```ts
    fromLocal: 'สถานที่ตัวอย่างและข้อมูลตำบลในเครื่อง · ค้นต่อได้ด้วย OpenStreetMap',
    pinnedHere: 'ตำแหน่งที่ปักหมุดไว้',
    areaHint: 'ตำบล/แขวง · แตะแล้วปักหมุดหน้าร้านต่อ',
    searchRow: (query: string) => `ค้นหา “${query}” บนแผนที่`,
```

In `src/components/ui/PlaceSuggestions.tsx`, the footer uses `th.places.fromLocal` instead of `th.places.fromSamples`.

- [ ] **Step 10: The offline place source — failing tests first**

Create `src/services/places/localPlaces.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import raw from '@/data/thai-address.json'
import landmarks from '@/data/landmarks.json'
import { COUNTRY_ZOOM, AREA_ZOOM, THAILAND_CENTER } from './bounds.ts'
import { createLocalPlaces, NEAREST_CONFIDENCE, PICKED_CONFIDENCE } from './localPlaces.ts'
import { decodeAreas, type CompactDb } from './thaiAddressDb.ts'

const areas = decodeAreas(raw as unknown as CompactDb)
const local = createLocalPlaces(landmarks, () => areas)

describe('createLocalPlaces', () => {
  it('suggests sample places with their district and province', async () => {
    const [first] = await local.suggest('วโรรส')
    expect(first).toMatchObject({ kind: 'place', title: 'ตลาดวโรรส เชียงใหม่', subtitle: 'อ.เมืองเชียงใหม่ จ.เชียงใหม่' })
  })

  it('suggests sub-districts once the address data is loaded, and only places before', async () => {
    const rows = await local.suggest('ช้างม่อย')
    expect(rows).toContainEqual(expect.objectContaining({ kind: 'area', title: 'ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300' }))
    const early = createLocalPlaces(landmarks, () => null)
    expect((await early.suggest('ช้างม่อย')).every((row) => row.kind === 'place')).toBe(true)
  })

  it('turns a picked place into a point with its address', async () => {
    const [row] = await local.suggest('วโรรส')
    const match = await local.pick(row)
    expect(match?.confidence).toBe(PICKED_CONFIDENCE)
    expect(match?.value.address).toBe('ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')
  })

  it('opens a picked area near a sample place in the same province, else over all of Thailand', async () => {
    const [chiangMai] = (await local.suggest('ช้างม่อย')).filter((row) => row.kind === 'area')
    expect(await local.pick(chiangMai)).toMatchObject({ value: { lat: 18.7902, lng: 99.0005 }, zoom: AREA_ZOOM })
    const [pai] = (await local.suggest('เวียงใต้ ปาย')).filter((row) => row.kind === 'area')
    expect(await local.pick(pai)).toMatchObject({ value: { lat: THAILAND_CENTER.lat, lng: THAILAND_CENTER.lng }, zoom: COUNTRY_ZOOM })
  })

  it('finds a spoken sample place', async () => {
    expect((await local.find('อยู่ตรงข้ามตลาดวโรรส เชียงใหม่'))?.value.text.startsWith('ตลาดวโรรส')).toBe(true)
  })

  it('names a point by the sample place next to it, keeping the exact point', async () => {
    const match = await local.reverse(18.7905, 99.001)
    expect(match).toMatchObject({ value: { text: 'ตลาดวโรรส เชียงใหม่', lat: 18.7905, lng: 99.001 }, confidence: NEAREST_CONFIDENCE })
  })

  it('still gives a point far from every sample place, without an address', async () => {
    const match = await local.reverse(15, 100)
    expect(match?.value).toEqual({ text: th.places.pinnedHere, lat: 15, lng: 100 })
  })
})
```

Run: `npx vitest run src/services/places/localPlaces.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 11: Write the offline source and delete the old one**

Create `src/services/places/localPlaces.ts`:

```ts
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
```

Delete `src/services/places/samplePlaces.ts` (`git rm`).

In `src/screens/signup/S3Business.tsx` `pickPlace`, pass `true` for a picked place: `addressFromLocation(match.value, th.sources.map, true)`.

- [ ] **Step 12: Run everything**

Run: `npx vitest run src/services/places src/ai/onboarding` then `npm test && npm run lint && npm run build`
Expected: all pass. If `demoProfile`-based tests or `followUp.test.ts` compare a whole location or address value, update the expected value to the new drafted text (the meaning of the test must stay the same).

- [ ] **Step 13: Commit**

```bash
git add -A src/data/landmarks.json src/services/places src/ai/onboarding src/screens/signup/S3Business.tsx src/copy/th.ts src/components/ui/PlaceSuggestions.tsx
git commit -m "Sample places across Thailand with full addresses, and an offline place source with areas and nearest place

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Coordinates from a pasted map link

**Files:**
- Create: `src/services/places/linkCoords.ts`
- Test: `src/services/places/linkCoords.test.ts`

**Interfaces:**
- Produces: `type LinkReading = { kind: 'point'; lat: number; lng: number } | { kind: 'unreadable' }`; `readLink(text: string): LinkReading | null` (null = the text is not a link or coordinates at all). It does **not** check Thailand; callers use `isInThailand`.

- [ ] **Step 1: Write the failing tests**

Create `src/services/places/linkCoords.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readLink } from './linkCoords.ts'

describe('readLink', () => {
  it('reads a Google Maps place link', () => {
    expect(readLink('https://www.google.com/maps/place/ตลาดวโรรส/@18.7902357,99.000535,17z/data=!3m1!4b1')).toEqual({ kind: 'point', lat: 18.7902357, lng: 99.000535 })
  })

  it('reads the !3d…!4d… form', () => {
    expect(readLink('https://www.google.com/maps/place/X/data=!4m6!3m5!1s0x0:0x0!8m2!3d18.79!4d99.0005')).toEqual({ kind: 'point', lat: 18.79, lng: 99.0005 })
  })

  it('reads ?q= and ?query= links, as LINE and map apps share them', () => {
    expect(readLink('https://maps.google.com/?q=13.8016,100.6033')).toEqual({ kind: 'point', lat: 13.8016, lng: 100.6033 })
    expect(readLink('https://www.google.com/maps/search/?api=1&query=7.0084%2C100.47')).toEqual({ kind: 'point', lat: 7.0084, lng: 100.47 })
    expect(readLink('ร้านอยู่นี่ค่ะ https://maps.google.com/maps?q=16.4183,102.8184&z=17')).toEqual({ kind: 'point', lat: 16.4183, lng: 102.8184 })
  })

  it('reads coordinates copied from a map', () => {
    expect(readLink('13.8016, 100.6033')).toEqual({ kind: 'point', lat: 13.8016, lng: 100.6033 })
  })

  it('says a short link or another link cannot be read', () => {
    expect(readLink('https://maps.app.goo.gl/AbCdEf123')).toEqual({ kind: 'unreadable' })
    expect(readLink('https://www.facebook.com/kruapadaeng')).toEqual({ kind: 'unreadable' })
  })

  it('returns null for ordinary words and numbers', () => {
    expect(readLink('ร้านอยู่ลาดพร้าว 71')).toBeNull()
    expect(readLink('12.5')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/services/places/linkCoords.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Write `linkCoords.ts`**

```ts
export type LinkReading = { kind: 'point'; lat: number; lng: number } | { kind: 'unreadable' }

// Where map links keep the point. Short links (maps.app.goo.gl) hide it behind a redirect only a server can follow.
const IN_LINK = [
  /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // google.com/maps/…/@13.80,100.60,17z
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // …/data=…!3d13.80!4d100.60
  /[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i,
]
const BARE = /^\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})\s*$/ // "13.8016, 100.6033" copied from a map
const LINK = /https?:\/\/\S+/i

const point = (lat: string, lng: string): LinkReading => ({ kind: 'point', lat: Number(lat), lng: Number(lng) })

function decoded(link: string): string {
  try {
    return decodeURIComponent(link)
  } catch {
    return link
  }
}

/** The point in a pasted map link or "lat, lng"; `unreadable` for a link without one; null when the text is neither. */
export function readLink(text: string): LinkReading | null {
  const bare = BARE.exec(text)
  if (bare) return point(bare[1], bare[2])
  const link = LINK.exec(text)?.[0]
  if (!link) return null
  for (const pattern of IN_LINK) {
    const found = pattern.exec(decoded(link)) ?? pattern.exec(link)
    if (found) return point(found[1], found[2])
  }
  return { kind: 'unreadable' }
}
```

- [ ] **Step 4: Run to see it pass, then the whole suite**

Run: `npx vitest run src/services/places/linkCoords.test.ts` → PASS (6 tests). Then `npm test && npm run lint && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/services/places/linkCoords.ts src/services/places/linkCoords.test.ts
git commit -m "Read the shop's point from a pasted Google Maps or LINE location link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: OpenStreetMap search and reverse lookup (Nominatim)

**Files:**
- Create: `src/services/places/nominatim.ts`
- Test: `src/services/places/nominatim.test.ts`

**Interfaces:**
- Consumes: `BANGKOK`, `formatThaiAddress`, `streetLine` (Task 1); `isInThailand` (Task 3); `th.places.pinnedHere` (Task 3).
- Produces: `interface Nominatim { search(text: string): Promise<GeoPoint | null>; reverse(lat: number, lng: number): Promise<GeoPoint | null> }`; `createNominatim(deps?: { fetchImpl?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void> }): Nominatim`; `toThaiParts(address: Record<string, string>): ThaiAddress`. Postcodes are **not** corrected here (the resolver does it in Task 6).

- [ ] **Step 1: Write the failing tests**

Create `src/services/places/nominatim.test.ts` (fixtures are real Nominatim answers from 2026-10-14, trimmed):

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { th } from '@/copy/th.ts'
import { BANGKOK } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { createNominatim, toThaiParts } from './nominatim.ts'

const WAROROT = {
  lat: '18.7902357',
  lon: '99.0005350',
  name: 'ตลาดวโรรส',
  address: { amenity: 'ตลาดวโรรส', road: 'ถนนข่วงเมรุ', suburb: 'แขวงนครพิงค์', city_district: 'ตำบลช้างม่อย', city: 'เทศบาลนครเชียงใหม่', county: 'อำเภอเมืองเชียงใหม่', province: 'จังหวัดเชียงใหม่', postcode: '55520', country: 'ประเทศไทย', country_code: 'th' },
}
const KHON_KAEN = {
  lat: '16.4210595',
  lon: '102.8378045',
  name: 'อะเมซอน',
  address: { amenity: 'อะเมซอน', road: 'ถนนรอบบึง', city_district: 'ตำบลในเมือง', county: 'อำเภอเมืองขอนแก่น', province: 'จังหวัดขอนแก่น', postcode: '40000', country_code: 'th' },
}
const LAT_PHRAO = { lat: '13.8013650', lon: '100.6033158', name: '', address: { quarter: 'แขวงลาดพร้าว', suburb: 'เขตลาดพร้าว', city: 'กรุงเทพมหานคร', postcode: '10230', country_code: 'th' } }
const VIENTIANE = { lat: '17.9667', lon: '102.6', name: 'ตลาดเช้า', address: { country_code: 'la' } }

function answer(...bodies: { status?: number; body?: unknown; fail?: boolean }[]) {
  const fetchImpl = vi.fn(async () => {
    const next = bodies.shift() ?? { body: [] }
    if (next.fail) throw new Error('offline')
    return { ok: (next.status ?? 200) === 200, status: next.status ?? 200, json: async () => next.body } as Response
  })
  const sleep = vi.fn(async () => {})
  let clock = 1_000_000
  const now = () => clock
  const nominatim = createNominatim({ fetchImpl: fetchImpl as unknown as typeof fetch, now, sleep })
  return { nominatim, fetchImpl, sleep, tick: (ms: number) => (clock += ms), url: (call = 0) => String((fetchImpl.mock.calls[call] as unknown[])[0]) }
}

afterEach(() => vi.restoreAllMocks())

describe('toThaiParts', () => {
  it('reads ตำบล, อำเภอ and จังหวัด by their prefixes, preferring ตำบล over a city แขวง', () => {
    expect(toThaiParts(WAROROT.address)).toEqual({ road: 'ข่วงเมรุ', subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '55520' })
  })

  it('reads Bangkok’s แขวง and เขต', () => {
    expect(toThaiParts(LAT_PHRAO.address)).toEqual({ subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: BANGKOK, postcode: '10230' })
  })
})

describe('createNominatim', () => {
  it('searches in Thai, in Thailand only, and names the place', async () => {
    const { nominatim, url } = answer({ body: [WAROROT] })
    const point = await nominatim.search('ตลาดวโรรส')
    expect(point).toMatchObject({ text: 'ตลาดวโรรส', lat: 18.7902357, lng: 99.000535, address: 'ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 55520' })
    expect(url()).toContain('https://nominatim.openstreetmap.org/search?')
    expect(url()).toContain('countrycodes=th')
    expect(url()).toContain('accept-language=th')
  })

  it('skips answers outside Thailand', async () => {
    const { nominatim } = answer({ body: [VIENTIANE] })
    expect(await nominatim.search('ตลาดเช้า')).toBeNull()
  })

  it('names a point by its street, keeping the exact point asked about', async () => {
    const { nominatim } = answer({ body: KHON_KAEN }, { body: LAT_PHRAO })
    expect(await nominatim.reverse(16.42106, 102.83781)).toMatchObject({ text: 'ถนนรอบบึง', lat: 16.42106, lng: 102.83781 })
    expect((await nominatim.reverse(13.8014, 100.6033))?.text).toBe('แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร')
  })

  it('waits a second between calls and remembers answers', async () => {
    const { nominatim, fetchImpl, sleep } = answer({ body: [WAROROT] }, { body: [KHON_KAEN] })
    await nominatim.search('ตลาดวโรรส')
    await nominatim.search('ตลาดวโรรส')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await nominatim.search('ขอนแก่น')
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('stops asking for a minute after "too many requests"', async () => {
    const { nominatim, fetchImpl, tick } = answer({ status: 429 }, { body: [WAROROT] })
    expect(await nominatim.search('ก')).toBeNull()
    tick(30_000)
    expect(await nominatim.search('ข')).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    tick(31_000)
    expect(await nominatim.search('ค')).not.toBeNull()
  })

  it('gives null when the network fails, and tries again next time', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { nominatim } = answer({ fail: true }, { body: [WAROROT] })
    expect(await nominatim.search('ตลาดวโรรส')).toBeNull()
    expect(await nominatim.search('ตลาดวโรรส')).not.toBeNull()
  })

  it('falls back to "pinned here" when a point has no address at all', async () => {
    const { nominatim } = answer({ body: { lat: '15', lon: '100', address: { country_code: 'th' } } })
    expect((await nominatim.reverse(15, 100))?.text).toBe(th.places.pinnedHere)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/services/places/nominatim.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Write `nominatim.ts`**

```ts
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
```

- [ ] **Step 4: Run to see it pass, then the whole suite**

Run: `npx vitest run src/services/places/nominatim.test.ts` → PASS (9 tests). Then `npm test && npm run lint && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/services/places/nominatim.ts src/services/places/nominatim.test.ts
git commit -m "Look places up on OpenStreetMap (Nominatim), politely: one call a second, cached, paused after 429

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The resolver, Google as one source, and the device location

**Files:**
- Modify: `src/services/places/places.ts` (resolver)
- Modify: `src/services/places/googlePlaces.ts`, `src/services/places/googlePlaces.test.ts`
- Create: `src/services/places/geolocation.ts`, `src/services/places/geolocation.test.ts`
- Create: `src/services/places/places.test.ts`
- Modify: `src/services/demoFlags.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
  - `places.ts`: `type PlaceSource = Pick<Places, 'suggest' | 'pick' | 'find'>`; `createPlaces(deps: { local: Places; nominatim: Nominatim; google?: PlaceSource | null; areas: () => Area[] | null }): Places`; `getPlaces(): Places`; `SEARCH_CONFIDENCE = 0.7`; `REVERSE_CONFIDENCE = 0.7`; `AREA_CONFIDENCE = 0.5`.
  - `googlePlaces.ts`: `createGooglePlaces(apiKey: string): PlaceSource` (no offline argument; `find` returns null on failure).
  - `geolocation.ts`: `interface DeviceFix { lat: number; lng: number; accuracy: number }`; `type LocateFailure = 'denied' | 'unavailable'`; `locateDevice(geo?: Geolocation | null): Promise<DeviceFix | LocateFailure>`; `SIMULATED_ACCURACY = 15`; `ROUGH_FIX_M = 100`.
  - `demoFlags.simulateLocation: boolean` (default false).

- [ ] **Step 1: Failing tests for the resolver**

Create `src/services/places/places.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import raw from '@/data/thai-address.json'
import type { GeoPoint } from '@/types/domain.ts'
import { AREA_ZOOM } from './bounds.ts'
import type { Nominatim } from './nominatim.ts'
import { AREA_CONFIDENCE, createPlaces, REVERSE_CONFIDENCE, SEARCH_CONFIDENCE, type PlaceSource, type Places } from './places.ts'
import { decodeAreas, type Area, type CompactDb } from './thaiAddressDb.ts'

const areas = decodeAreas(raw as unknown as CompactDb)
const WAROROT: GeoPoint = {
  text: 'ตลาดวโรรส',
  parts: { road: 'ข่วงเมรุ', subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '55520' },
  address: 'ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 55520',
  lat: 18.79,
  lng: 99.0,
}
const HERE = { value: { text: 'ลาดพร้าว 71', lat: 13.8, lng: 100.6 }, confidence: 0.62 }
const CHANG_MOI: Area = { subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '50300' }

function setUp({ ownFind = null, mapFind = null, osm = null }: { ownFind?: typeof HERE | null; mapFind?: typeof HERE | null; osm?: GeoPoint | null } = {}) {
  const local: Places = {
    live: false,
    suggest: vi.fn(async () => [{ id: 'local:x', kind: 'place' as const, title: 'x', subtitle: '' }]),
    pick: vi.fn(async () => HERE),
    find: vi.fn(async () => ownFind),
    reverse: vi.fn(async (lat: number, lng: number) => ({ value: { text: 'near', lat, lng }, confidence: 0.5 })),
  }
  const nominatim: Nominatim = { search: vi.fn(async () => osm), reverse: vi.fn(async () => osm) }
  const google: PlaceSource = { suggest: vi.fn(async () => []), pick: vi.fn(async () => null), find: vi.fn(async () => mapFind) }
  return { local, nominatim, google, places: createPlaces({ local, nominatim, google, areas: () => areas }) }
}

describe('createPlaces', () => {
  it('finds with the sample places first, then Google, then OpenStreetMap', async () => {
    const own = setUp({ ownFind: HERE })
    expect(await own.places.find('ลาดพร้าว 71')).toBe(HERE)
    expect(own.nominatim.search).not.toHaveBeenCalled()

    const map = setUp({ mapFind: HERE })
    expect(await map.places.find('x')).toBe(HERE)

    const osm = setUp({ osm: WAROROT })
    const found = await osm.places.find('ตลาดวโรรส')
    expect(found?.confidence).toBe(SEARCH_CONFIDENCE)
    expect(found?.value.parts?.postcode).toBe('50300') // corrected from the Thai address data
    expect(found?.value.address).toBe('ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')
  })

  it('adds a "search the map" row from three letters, without calling OpenStreetMap', async () => {
    const { places, nominatim } = setUp()
    const rows = await places.suggest('ตลาดต้นพยอม')
    expect(rows.at(-1)).toMatchObject({ kind: 'search', query: 'ตลาดต้นพยอม' })
    expect(nominatim.search).not.toHaveBeenCalled()
    expect((await places.suggest('ตล')).some((row) => row.kind === 'search')).toBe(false)
  })

  it('searches when the search row is picked', async () => {
    const { places } = setUp({ osm: WAROROT })
    expect((await places.pick({ id: 'search:ตลาดวโรรส', kind: 'search', title: '', subtitle: '', query: 'ตลาดวโรรส' }))?.value.text).toBe('ตลาดวโรรส')
  })

  it('centres a picked area on OpenStreetMap’s answer, or the offline guess', async () => {
    const row = { id: 'area:x', kind: 'area' as const, title: '', subtitle: '', area: CHANG_MOI }
    const online = setUp({ osm: WAROROT })
    expect(await online.places.pick(row)).toMatchObject({ value: { lat: 18.79, lng: 99.0, parts: CHANG_MOI }, confidence: AREA_CONFIDENCE, zoom: AREA_ZOOM })
    expect(online.nominatim.search).toHaveBeenCalledWith('ช้างม่อย เมืองเชียงใหม่ เชียงใหม่')
    const offline = setUp()
    await offline.places.pick(row)
    expect(offline.local.pick).toHaveBeenCalledWith(row)
  })

  it('names a point with OpenStreetMap, else with the nearest sample place', async () => {
    const online = setUp({ osm: WAROROT })
    expect(await online.places.reverse(18.79, 99.0)).toMatchObject({ confidence: REVERSE_CONFIDENCE, value: { parts: { postcode: '50300' } } })
    const offline = setUp()
    expect((await offline.places.reverse(15, 100))?.value.text).toBe('near')
  })

  it('is live only with Google', () => {
    expect(setUp().places.live).toBe(true)
    const { local, nominatim } = setUp()
    expect(createPlaces({ local, nominatim, areas: () => null }).live).toBe(false)
  })
})
```

Run: `npx vitest run src/services/places/places.test.ts` — Expected: FAIL (`createPlaces` not exported).

- [ ] **Step 2: Write the resolver**

Replace the bottom of `src/services/places/places.ts` (after the interfaces from Task 3) so the whole file reads:

```ts
import { formatThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { th } from '@/copy/th.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import type { GeoPoint } from '@/types/domain.ts'
import { AREA_ZOOM } from './bounds.ts'
import { createGooglePlaces } from './googlePlaces.ts'
import { createLocalPlaces } from './localPlaces.ts'
import { createNominatim, type Nominatim } from './nominatim.ts'
import { fixPostcode, loadedAreas, type Area } from './thaiAddressDb.ts'

// (SuggestionKind, PlaceSuggestion, PlaceMatch and Places from Task 3 stay here, unchanged.)

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
```

- [ ] **Step 3: Google becomes a plain source**

In `src/services/places/googlePlaces.ts`:
- Signature: `export function createGooglePlaces(apiKey: string): PlaceSource` and import `PlaceSource` (type) instead of `Places`.
- Update the doc comment: "Shop addresses from Google Maps. Any failure gives an empty answer; the resolver then asks the next source."
- In `find`'s `catch`, `console.warn('Google Maps search is unavailable:', problem)` and `return null`.
- Return `{ suggest, pick, find }`.

In `src/services/places/googlePlaces.test.ts`:
- Delete the `offline` fake and the `Places` import; call `createGooglePlaces('test-key')` everywhere.
- Replace the last test with:

```ts
  it('finds nothing when Google refuses the request', async () => {
    answer({}, false)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await createGooglePlaces('test-key').find('ลาดพร้าว 71')).toBeNull()
  })
```

- [ ] **Step 4: Failing tests for the device location**

Add to `src/services/demoFlags.ts`:

```ts
/** Presenter switches, flipped from the DemoPanel. */
export const demoFlags = {
  simulateApiFailure: false,
  simulateLocation: false, // "ใช้ตำแหน่งตอนนี้" answers with the sample account's shop: stage laptops locate badly
}
```

Create `src/services/places/geolocation.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { demoFlags } from '@/services/demoFlags.ts'
import { getAccount } from '@/services/merchantApi.ts'
import { locateDevice, SIMULATED_ACCURACY } from './geolocation.ts'

function device(outcome: { fix?: { latitude: number; longitude: number; accuracy: number }; code?: number }): Geolocation {
  return {
    getCurrentPosition: (ok: PositionCallback, fail?: PositionErrorCallback | null) => {
      if (outcome.fix) ok({ coords: outcome.fix } as GeolocationPosition)
      else fail?.({ code: outcome.code ?? 2 } as GeolocationPositionError)
    },
  } as Geolocation
}

afterEach(() => {
  demoFlags.simulateLocation = false
})

describe('locateDevice', () => {
  it('gives the phone’s point and how sure it is', async () => {
    expect(await locateDevice(device({ fix: { latitude: 16.42, longitude: 102.83, accuracy: 30 } }))).toEqual({ lat: 16.42, lng: 102.83, accuracy: 30 })
  })

  it('tells a refusal from a failure', async () => {
    expect(await locateDevice(device({ code: 1 }))).toBe('denied')
    expect(await locateDevice(device({ code: 3 }))).toBe('unavailable')
    expect(await locateDevice(null)).toBe('unavailable')
  })

  it('answers with the sample shop when the presenter simulates the location', async () => {
    demoFlags.simulateLocation = true
    const { lat, lng } = getAccount().deviceLocation
    expect(await locateDevice(device({ code: 1 }))).toEqual({ lat, lng, accuracy: SIMULATED_ACCURACY })
  })
})
```

Run: `npx vitest run src/services/places/geolocation.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 5: Write `geolocation.ts`**

```ts
import { demoFlags } from '@/services/demoFlags.ts'
import { getAccount } from '@/services/merchantApi.ts'

export interface DeviceFix {
  lat: number
  lng: number
  accuracy: number // metres
}

export type LocateFailure = 'denied' | 'unavailable'

export const SIMULATED_ACCURACY = 15
/** Worse than this, the merchant is asked to move the pin to the shop's door. */
export const ROUGH_FIX_M = 100
const PERMISSION_DENIED = 1

const browserGeolocation = (): Geolocation | null => (typeof navigator === 'undefined' ? null : (navigator.geolocation ?? null))

/** Where the phone is (null = a device without GPS). The browser asks the merchant first; a refusal is just another answer. */
export function locateDevice(geo: Geolocation | null = browserGeolocation()): Promise<DeviceFix | LocateFailure> {
  if (demoFlags.simulateLocation) {
    const { lat, lng } = getAccount().deviceLocation
    return Promise.resolve({ lat, lng, accuracy: SIMULATED_ACCURACY })
  }
  if (!geo) return Promise.resolve('unavailable')
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }),
      (problem) => resolve(problem.code === PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
```

Calling `locateDevice()` with no argument uses the browser's GPS; passing `null` means "this device has none" (the tests use that).

- [ ] **Step 6: Run everything**

Run: `npx vitest run src/services/places` then `npm test && npm run lint && npm run build`
Expected: all pass. (S3 still uses `places.live` for the voice search gate; Task 9 changes it.)

- [ ] **Step 7: Commit**

```bash
git add src/services/places src/services/demoFlags.ts
git commit -m "One place resolver: local first, then Google, then OpenStreetMap; plus the phone's location

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The companion understands location talk

**Files:**
- Modify: `src/ai/commands/phrases.ts`
- Modify: `src/types/domain.ts` (`ChipKind`)
- Modify: `src/ai/onboarding/followUp.ts`, `src/copy/th.ts` (`followUp.location`, `chips`)
- Modify: `src/ai/onboarding/businessTalk.ts`
- Tests: create `src/ai/commands/locationPhrases.test.ts`; extend `src/ai/onboarding/businessTalk.test.ts`, `src/ai/onboarding/followUp.test.ts`

**Interfaces:**
- Consumes: `parseThaiAddress`, `formatThaiAddress`, `streetLine` (Task 1); `addressFromLocation`, `DERIVED_CONFIDENCE` (Task 3).
- Produces: `SAY.here: string[]`, `SAY.pin: string[]`; `ChipKind` includes `'pinOnMap'`; the location question has chips `[{ kind: 'useDeviceLocation' }, { kind: 'pinOnMap' }]`; `th.chips.pinOnMap`; `SPOKEN_ADDRESS_CONFIDENCE = 0.75` exported from `businessTalk.ts`; `businessUpdates` fills `address` (and `building` from the street) from a spoken full address.

- [ ] **Step 1: Failing tests**

Create `src/ai/commands/locationPhrases.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import script from '@/data/onboarding-script.json'
import { matchCommand } from './matchCommand.ts'
import { SAY } from './phrases.ts'

// The same commands, in the same order, as 3/7 (S3Business).
const STEP3 = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
  { id: 'here' as const, phrases: SAY.here },
  { id: 'pin' as const, phrases: SAY.pin },
]

describe('location commands on 3/7', () => {
  it('hears "use where I am"', () => {
    expect(matchCommand('ใช้ตำแหน่งนี้เลยค่ะ', STEP3)).toBe('here')
    expect(matchCommand('ร้านอยู่ตรงนี้', STEP3)).toBe('here')
    expect(matchCommand('อยู่ที่ร้านตอนนี้ค่ะ', STEP3)).toBe('here')
  })

  it('hears "let me pin it"', () => {
    expect(matchCommand('ปักหมุดเองค่ะ', STEP3)).toBe('pin')
    expect(matchCommand('ขอเลือกบนแผนที่', STEP3)).toBe('pin')
  })

  it('leaves shop talk and other commands alone', () => {
    expect(matchCommand(script.lines[0].say, STEP3)).toBeNull()
    expect(matchCommand('ต่อไป', STEP3)).toBe('next')
  })
})
```

In `src/ai/onboarding/businessTalk.test.ts` add (and import `SPOKEN_ADDRESS_CONFIDENCE` from `./businessTalk.ts`):

```ts
  it('fills the address box from a spoken full address', () => {
    const said = 'อยู่สิบสองทับสาม หมู่สี่ ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง ขอนแก่น'
    const updates = businessUpdates(said, { landmarks, profile: createEmptyProfile() })
    expect(updates.address).toEqual({ value: '12/3 หมู่ 4 ถนนมิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น', confidence: SPOKEN_ADDRESS_CONFIDENCE, heardFrom: said })
    expect(updates.building?.value).toBe('ถนนมิตรภาพ')
  })

  it('keeps the spoken address even when the map found the pin', () => {
    const said = 'สิบสองทับสาม ตำบลในเมือง อำเภอเมือง ขอนแก่น'
    const place = { value: { text: 'ในเมือง', address: 'ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น 40000', lat: 16.43, lng: 102.83 }, confidence: 0.7 }
    const updates = businessUpdates(said, { landmarks, profile: createEmptyProfile(), place })
    expect(updates.location?.value.lat).toBe(16.43)
    expect(updates.address?.value).toBe('12/3 ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น')
  })
```

In `src/ai/onboarding/followUp.test.ts` add (reuse the file's existing `account` and profile helpers; `afterName` = a profile with only `storeName` filled):

```ts
  it('offers "use where I am" and "pin on the map" with the location question', () => {
    const afterName = applyUpdates(createEmptyProfile(), { storeName: { value: 'ครัวป้าแดง', confidence: 1, heardFrom: 'x' } })
    const question = pickFollowUp(afterName, ['storeName', 'location', 'category', 'building'], account)
    expect(question?.field).toBe('location')
    expect(question?.chips.map((chip) => chip.kind)).toEqual(['useDeviceLocation', 'pinOnMap'])
  })
```

(Add `applyUpdates`/`createEmptyProfile` imports from `./profile.ts` if the file does not import them yet.)

Run: `npx vitest run src/ai` — Expected: FAIL (`SAY.here` undefined; address not filled; one chip only).

- [ ] **Step 2: Phrases, chip kind and copy**

`src/ai/commands/phrases.ts`, add to `SAY`:

```ts
  here: ['ใช้ตำแหน่งนี้', 'ใช้ตำแหน่งปัจจุบัน', 'ตำแหน่งปัจจุบัน', 'อยู่ที่ร้านตอนนี้', 'อยู่ที่ร้าน', 'ตรงนี้', 'ที่นี่'],
  pin: ['ปักหมุด', 'ปักหมุดเอง', 'เลือกบนแผนที่', 'เปิดแผนที่', 'จิ้มแผนที่'],
```

`src/types/domain.ts`: `export type ChipKind = 'say' | 'startMic' | 'useAccountPhone' | 'useDeviceLocation' | 'pinOnMap' | 'scanMenu'`

`src/copy/th.ts`:
- `followUp.location: 'ร้านอยู่ตรงไหนคะ? บอกที่อยู่หรือจุดสังเกต หรือกดใช้ตำแหน่งตอนนี้ก็ได้'`
- `chips.useDeviceLocation: 'ใช้ตำแหน่งตอนนี้'`, and add `chips.pinOnMap: 'ปักหมุดบนแผนที่'`

`src/ai/onboarding/followUp.ts`, the `location` question:

```ts
  location: () => ({
    field: 'location',
    text: th.followUp.location,
    chips: [
      { label: th.chips.useDeviceLocation, kind: 'useDeviceLocation' },
      { label: th.chips.pinOnMap, kind: 'pinOnMap' },
    ],
  }),
```

- [ ] **Step 3: A spoken address fills the address box**

In `src/ai/onboarding/businessTalk.ts`, import `formatThaiAddress`, `parseThaiAddress`, `streetLine` from `./parsers/thaiAddress.ts` and `DERIVED_CONFIDENCE` from `./addressFields.ts`, then:

```ts
/** A full address the merchant said: their own words, but heard, so it is checked. */
export const SPOKEN_ADDRESS_CONFIDENCE = 0.75
```

and make the body of `businessUpdates` after `if (location) updates.location = location`:

```ts
  const spoken = parseThaiAddress(text)
  if (spoken) updates.address = { value: formatThaiAddress(spoken), confidence: SPOKEN_ADDRESS_CONFIDENCE, heardFrom: text }

  const named = parseBuilding(text)
  if (named) updates.building = { ...named, heardFrom: text }
  else if (ctx.expecting === 'building' && stripParticles(text)) {
    updates.building = { value: stripParticles(text), confidence: BUILDING_CONFIDENCE, heardFrom: text }
  } else if (spoken && streetLine(spoken)) {
    updates.building = { value: streetLine(spoken), confidence: DERIVED_CONFIDENCE, heardFrom: text }
  }

  if (location) {
    const drafted = onlyEmptyFields(ctx.profile, addressFromLocation(location.value, text))
    if (drafted.building && !updates.building) updates.building = drafted.building
    if (drafted.address && !updates.address) updates.address = drafted.address
  }
  return updates
```

Update the `place` comment in `BusinessTalkContext`: "the resolver's match for the words (map or sample place), when there is one".

- [ ] **Step 4: Run, then the whole suite**

Run: `npx vitest run src/ai` → PASS. Then `npm test && npm run lint && npm run build`. (S3 still filters chips to `'say'`, so nothing changes on screen yet.)

- [ ] **Step 5: Commit**

```bash
git add src/ai src/types/domain.ts src/copy/th.ts
git commit -m "Hear 'use where I am', 'pin it' and a full spoken address on 3/7

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: OpenStreetMap map and the pin sheet

**Files:**
- Run: `npm install leaflet@1.9.4 && npm install -D @types/leaflet@1.9.22`
- Create: `src/services/places/tiles.ts`
- Create: `src/components/map/leafletMap.ts`, `src/components/map/DrawnMap.tsx`, `src/components/map/PinMap.tsx`, `src/components/map/PinSheet.tsx`
- Delete: `src/components/ui/MapPinConfirm.tsx`
- Modify: `src/screens/signup/S3Business.tsx` (use `PinMap` lazily), `src/copy/th.ts`, `src/architecture.test.ts`, `.env.example`

**Interfaces:**
- Consumes: `MapView`, `PIN_ZOOM` (Task 3); `PlaceMatch` (Task 3); `th.places.pinnedHere`.
- Produces: `OSM_TILES`, `OSM_CREDIT`, `OSM_MAX_ZOOM` (tiles.ts); `createLeafletMap(element, view, { still, onTilesFailed }): L.Map`, `PIN_SVG: string` (leafletMap.ts); `<DrawnMap label />`; `<PinMap point />`; `<PinSheet open start describe onUse onLocate onClose />` where `describe: (lat: number, lng: number) => Promise<PlaceMatch | null>`, `onUse: (match: PlaceMatch) => void`, `onLocate: () => Promise<{ lat: number; lng: number } | null>`.
- Copy added: `th.places.pinTitle`, `pinHint`, `pinUse`, `pinLooking`, `pinNoAddress`, `pinLocate`, `mapFailed`. Removed: `th.places.mapTitle`.

No unit tests: these are Leaflet views (no DOM test setup in this repo, see Plan 1c ruling 1). The architecture test gains a rule, and Task 10 checks them in the browser.

- [ ] **Step 1: Install Leaflet and add the tiles constant**

Run: `npm install leaflet@1.9.4 && npm install -D @types/leaflet@1.9.22`

Create `src/services/places/tiles.ts`:

```ts
// OpenStreetMap's own map pictures: fine for a prototype's light use. Every map must show the credit.
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
export const OSM_MAX_ZOOM = 19
```

- [ ] **Step 2: Architecture rule (failing)**

In `src/architecture.test.ts` add:

```ts
// Map services (Google, OpenStreetMap) are called only from the places services, which know their rules.
const MAP_HOSTS = /googleapis\.com|openstreetmap\.org|google\.com\/maps/
```

and inside `describe('architecture', …)`:

```ts
  it('keeps map services inside src/services/places', () => {
    const offenders = appFiles
      .filter(([path, source]) => !path.startsWith('/src/services/places/') && MAP_HOSTS.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
```

Run: `npx vitest run src/architecture.test.ts` — Expected: FAIL, offender `/src/components/ui/MapPinConfirm.tsx` (the Google embed URL).

- [ ] **Step 3: Copy**

In `src/copy/th.ts` `places`: delete `mapTitle`; add:

```ts
    pinTitle: 'ปักหมุดร้าน',
    pinHint: 'เลื่อนแผนที่ให้หมุดอยู่ตรงหน้าร้าน',
    pinUse: 'ใช้ตำแหน่งนี้',
    pinLooking: 'กำลังหาที่อยู่…',
    pinNoAddress: 'ยังไม่รู้ที่อยู่ตรงนี้ ไม่เป็นไรค่ะ กรอกเองได้',
    pinLocate: 'ไปที่ตำแหน่งตอนนี้',
    mapFailed: 'โหลดแผนที่ไม่ได้ ยังปักหมุดได้ แต่ภาพแผนที่อาจไม่ขึ้นนะคะ',
```

- [ ] **Step 4: Map helpers**

Create `src/components/map/leafletMap.ts`:

```ts
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapView } from '@/services/places/bounds.ts'
import { OSM_CREDIT, OSM_MAX_ZOOM, OSM_TILES } from '@/services/places/tiles.ts'

// A few failed pictures can be a blip; this many means the map is not loading (offline, blocked).
const FAILED_TILES = 3

/** An OpenStreetMap map in `element`. A `still` map cannot be moved (the filled field); the pin sheet's can. */
export function createLeafletMap(element: HTMLElement, view: MapView, { still, onTilesFailed }: { still: boolean; onTilesFailed: () => void }): L.Map {
  const map = L.map(element, {
    center: [view.lat, view.lng],
    zoom: view.zoom,
    zoomControl: !still,
    dragging: !still,
    touchZoom: !still,
    scrollWheelZoom: !still,
    doubleClickZoom: !still,
    boxZoom: false,
    keyboard: !still,
  })
  map.attributionControl.setPrefix(false)
  const tiles = L.tileLayer(OSM_TILES, { maxZoom: OSM_MAX_ZOOM, attribution: OSM_CREDIT })
  let failed = 0
  tiles.on('tileerror', () => {
    failed += 1
    if (failed === FAILED_TILES) onTilesFailed()
  })
  tiles.addTo(map)
  return map
}

/** The shop pin as SVG (Leaflet's own marker images break when bundled). Its tip is at the bottom centre. */
export const PIN_SVG =
  '<svg viewBox="-24 -42 48 66" width="48" height="66" aria-hidden="true"><path d="M0 -40 C-15 -40 -24 -29 -24 -17 C-24 0 0 22 0 22 C0 22 24 0 24 -17 C24 -29 15 -40 0 -40 Z" fill="currentColor"/><circle cx="0" cy="-17" r="8" fill="white"/></svg>'
```

Create `src/components/map/DrawnMap.tsx` (the old drawing from `MapPinConfirm.tsx`, unchanged):

```tsx
import { th } from '@/copy/th.ts'

/** A drawn stand-in for the map, when the real map pictures cannot load. */
export function DrawnMap({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label={th.review.mapAlt(label)} className="block h-40 w-full bg-canvas">
      <path d="M0 60 H320 M0 120 H320 M110 0 V160 M230 0 V160" className="stroke-line" strokeWidth="14" fill="none" />
      <path d="M110 60 L230 120" className="stroke-line" strokeWidth="8" fill="none" />
      <rect x="248" y="18" width="48" height="30" rx="6" className="fill-grab/30" />
      <g transform="translate(160 86)">
        <path d="M0 -40 C-15 -40 -24 -29 -24 -17 C-24 0 0 22 0 22 C0 22 24 0 24 -17 C24 -29 15 -40 0 -40 Z" className="fill-action" />
        <circle cx="0" cy="-17" r="8" className="fill-surface" />
      </g>
    </svg>
  )
}
```

- [ ] **Step 5: `PinMap` — the filled field's map**

Create `src/components/map/PinMap.tsx`:

```tsx
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { th } from '@/copy/th.ts'
import { PIN_ZOOM } from '@/services/places/bounds.ts'
import type { GeoPoint } from '@/types/domain.ts'
import { DrawnMap } from './DrawnMap.tsx'
import { createLeafletMap, PIN_SVG } from './leafletMap.ts'

/** The shop pin on OpenStreetMap, with the place under it. A drawn map stands in when the pictures cannot load. */
export function PinMap({ point }: { point: GeoPoint }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const pin = useRef<L.Marker | null>(null)
  const [failed, setFailed] = useState(false)

  // Made once; the effect below moves it when the point changes.
  useEffect(() => {
    if (!box.current || failed) return
    const made = createLeafletMap(box.current, { lat: point.lat, lng: point.lng, zoom: PIN_ZOOM }, { still: true, onTilesFailed: () => setFailed(true) })
    const icon = L.divIcon({ html: PIN_SVG, className: 'text-action', iconSize: [48, 66], iconAnchor: [24, 64] })
    pin.current = L.marker([point.lat, point.lng], { icon, interactive: false, keyboard: false }).addTo(made)
    map.current = made
    return () => {
      made.remove()
      map.current = null
      pin.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the point is followed by the next effect
  }, [failed])

  useEffect(() => {
    map.current?.setView([point.lat, point.lng], PIN_ZOOM)
    pin.current?.setLatLng([point.lat, point.lng])
  }, [point.lat, point.lng])

  return (
    <figure className="relative isolate overflow-hidden rounded-2xl ring-1 ring-line">
      {failed ? <DrawnMap label={point.text} /> : <div ref={box} role="img" aria-label={th.review.mapAlt(point.text)} className="h-48 w-full bg-canvas" />}
      <figcaption className="px-4 py-2 text-base">
        {point.text}
        {point.address && point.address !== point.text && <span className="block text-ink-muted">{point.address}</span>}
      </figcaption>
    </figure>
  )
}
```

If oxlint reports the `eslint-disable` comment as unused, delete that comment line (oxlint does not run `exhaustive-deps` in this repo).

`isolate` keeps Leaflet's high z-index panes under the bottom sheets.

- [ ] **Step 6: `PinSheet` — move the map under a fixed pin**

Create `src/components/map/PinSheet.tsx`:

```tsx
import type L from 'leaflet'
import { LocateFixed, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { PIN_ZOOM, type MapView } from '@/services/places/bounds.ts'
import type { PlaceMatch } from '@/services/places/places.ts'
import { createLeafletMap, PIN_SVG } from './leafletMap.ts'

const DESCRIBE_AFTER_MS = 600
const keyOf = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`

interface PinSheetProps {
  open: boolean
  start: MapView
  describe: (lat: number, lng: number) => Promise<PlaceMatch | null> // the address under the pin
  onUse: (match: PlaceMatch) => void
  onLocate: () => Promise<{ lat: number; lng: number } | null> // the phone's location, to jump there
  onClose: () => void
}

/** Full screen: the pin stays in the middle and the merchant moves the map until it sits on the shop. */
export function PinSheet({ open, ...props }: PinSheetProps) {
  return open ? <PinSheetBody {...props} /> : null // mounted fresh each time, so it starts where it is told
}

function PinSheetBody({ start, describe, onUse, onLocate, onClose }: Omit<PinSheetProps, 'open'>) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const latest = useRef({ describe })
  useEffect(() => {
    latest.current = { describe }
  })
  const [centre, setCentre] = useState({ lat: start.lat, lng: start.lng })
  const [found, setFound] = useState<{ at: string; match: PlaceMatch | null } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!box.current) return
    const made = createLeafletMap(box.current, start, { still: false, onTilesFailed: () => setFailed(true) })
    map.current = made
    let alive = true
    let waiting: number | undefined
    const lookUp = (lat: number, lng: number) => {
      window.clearTimeout(waiting)
      waiting = window.setTimeout(async () => {
        const match = await latest.current.describe(lat, lng)
        if (alive) setFound({ at: keyOf(lat, lng), match })
      }, DESCRIBE_AFTER_MS)
    }
    made.on('moveend', () => {
      const { lat, lng } = made.getCenter()
      setCentre({ lat, lng })
      lookUp(lat, lng)
    })
    lookUp(start.lat, start.lng)
    const sizing = requestAnimationFrame(() => made.invalidateSize())
    return () => {
      alive = false
      window.clearTimeout(waiting)
      cancelAnimationFrame(sizing)
      made.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is made once; `start` only places it
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const here = found && found.at === keyOf(centre.lat, centre.lng) ? found : null
  const bare: PlaceMatch = { value: { text: th.places.pinnedHere, lat: centre.lat, lng: centre.lng }, confidence: 1 }
  const line = here === null ? th.places.pinLooking : (here.match?.value.address ?? here.match?.value.text ?? th.places.pinNoAddress)

  const jumpToPhone = async () => {
    const fix = await onLocate()
    if (fix) map.current?.setView([fix.lat, fix.lng], PIN_ZOOM)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={th.places.pinTitle} className="absolute inset-0 z-30 flex flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <h2 className="text-lg font-bold">{th.places.pinTitle}</h2>
        <button type="button" onClick={onClose} aria-label={th.grab.close} className="flex size-12 cursor-pointer items-center justify-center rounded-full active:bg-canvas">
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <p className="px-4 pb-2 text-base text-ink-muted">{th.places.pinHint}</p>
      <div className="relative isolate min-h-0 flex-1">
        <div ref={box} className="absolute inset-0 bg-canvas" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[500] -translate-x-1/2 -translate-y-full text-action" dangerouslySetInnerHTML={{ __html: PIN_SVG }} />
        {failed && <p className="absolute inset-x-4 top-4 z-[500] rounded-xl bg-warn-bg p-3 text-base text-warn-ink">{th.places.mapFailed}</p>}
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-6">
        <p aria-live="polite" className="min-h-14 text-base">
          {line}
        </p>
        <Button variant="secondary" icon={<LocateFixed className="size-5" aria-hidden />} onClick={() => void jumpToPhone()}>
          {th.places.pinLocate}
        </Button>
        <Button fullWidth onClick={() => onUse(here?.match ? { ...here.match, value: { ...here.match.value, lat: centre.lat, lng: centre.lng } } : bare)}>
          {th.places.pinUse}
        </Button>
      </div>
    </div>
  )
}
```

The same note about the `eslint-disable` comment applies.

- [ ] **Step 7: Use `PinMap` on 3/7, delete the old map**

In `src/screens/signup/S3Business.tsx`:
- Remove the `MapPinConfirm` import; add `import { lazy, Suspense } from 'react'` (merge with the existing React import) and `import { DrawnMap } from '@/components/map/DrawnMap.tsx'`.
- Below the imports: `const PinMap = lazy(() => import('@/components/map/PinMap.tsx').then((module) => ({ default: module.PinMap })))`
- Replace `<MapPinConfirm point={fields.location.value} />` with:

```tsx
            <Suspense fallback={<DrawnMap label={fields.location.value.text} />}>
              <PinMap point={fields.location.value} />
            </Suspense>
```

Delete `src/components/ui/MapPinConfirm.tsx` (`git rm`).

In `.env.example`, step 1 becomes `Enable "Places API (New)" (address search).` and step 3 `API restriction: only that API.`; add a line under the key comment: `# Without a key, places come from the built-in sample places, Thai sub-district data and OpenStreetMap.`

- [ ] **Step 8: Run everything**

Run: `npm test && npm run lint && npm run build`
Expected: all pass, including the new architecture rule. `vite build` shows separate chunks for `PinMap` (with Leaflet) and the address data.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/services/places/tiles.ts src/components/map src/components/ui src/screens/signup/S3Business.tsx src/copy/th.ts src/architecture.test.ts .env.example
git commit -m "Show the shop on an OpenStreetMap map, and add the pin sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Step 3/7 — the four ways, wired

**Files:**
- Create: `src/screens/signup/s3/LocationField.tsx`, `src/screens/signup/s3/AddressField.tsx`
- Modify: `src/screens/signup/S3Business.tsx` (replace the whole file with Step 3's version)
- Modify: `src/components/ui/PlaceSuggestions.tsx`, `src/copy/th.ts`

**Interfaces:**
- Consumes: everything above. `useVoiceInput(interpret, { autoListen })` returns `{ mic, transcript, notice, toggleMic, hear, onSpoken }`; `interpret(text, isCurrent)` returns `true` (handled), `false` (not understood) or a string (a reply to say) — sync or async.
- Copy added: `th.sources.gps: 'จากตำแหน่งเครื่อง'`, `th.sources.link: 'จากลิงก์แผนที่'`, `th.sources.pin: 'ปักหมุดเอง'`; `th.places.locating: 'กำลังหาตำแหน่ง…'`, `gpsFailed: 'หาตำแหน่งไม่ได้ ลองพิมพ์ชื่อสถานที่หรือปักหมุดแทนนะคะ'`, `outsideThailand: 'ตำแหน่งนี้อยู่นอกประเทศไทยค่ะ'`, `linkUnreadable: 'ลิงก์นี้อ่านตำแหน่งไม่ได้ค่ะ ลองเปิดในแผนที่แล้วคัดลอกลิงก์เต็ม หรือปักหมุดแทน'`, `postcodeMismatch: (postcode: string, actual: string, said: string) => \`รหัสไปรษณีย์ ${postcode} เป็นของ${actual} ไม่ใช่${said} ช่วยเช็คหน่อยนะคะ\``, `areaChoices: 'เลือกตำบลให้ครบ'`, `useHere: 'ใช้ตำแหน่งตอนนี้'`, `pinOnMap: 'ปักหมุดบนแผนที่'`; `th.s3.locationPlaceholder: 'พิมพ์สถานที่ ที่อยู่ รหัสไปรษณีย์ หรือวางลิงก์'`, `th.s3.pinChange: 'เลื่อนหมุด'`, `th.s3.pinSearchAgain: 'ค้นหาที่ใหม่'`.

Spec check (§4–§6): the sources `gps`, `link`, `pin` join `th.sources`, so `fieldMark` shows "ที่มา: …" for them automatically.

- [ ] **Step 1: Row kinds in `PlaceSuggestions`**

In `src/components/ui/PlaceSuggestions.tsx`, choose the icon by kind and key rows by `id`:

```tsx
import { MapPin, MapPinned, Search } from 'lucide-react'
// …
const ICONS = { place: MapPin, area: MapPinned, search: Search }
// …inside the map:
        {suggestions.map((suggestion) => {
          const Icon = ICONS[suggestion.kind]
          return (
            <li key={suggestion.id}>
              <button type="button" onClick={() => onPick(suggestion)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-ok-bg">
                <Icon className="size-6 shrink-0 text-action" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-bold">{suggestion.title}</span>
                  {suggestion.subtitle && <span className="block text-base text-ink-muted">{suggestion.subtitle}</span>}
                </span>
              </button>
            </li>
          )
        })}
```

Update its doc comment: "Rows for what was typed: known places, sub-districts, and "search the map". `live` says whether Google Maps is connected."

- [ ] **Step 2: The two field components**

Create `src/screens/signup/s3/LocationField.tsx`:

```tsx
import { LocateFixed, MapPin, MapPinned } from 'lucide-react'
import { lazy, Suspense, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Field } from '@/components/grab/Field.tsx'
import { fieldMark } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { DrawnMap } from '@/components/map/DrawnMap.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { PlaceSuggestions } from '@/components/ui/PlaceSuggestions.tsx'
import { th } from '@/copy/th.ts'
import type { PlaceSuggestion } from '@/services/places/places.ts'
import type { ProfileFields } from '@/types/domain.ts'

const PinMap = lazy(() => import('@/components/map/PinMap.tsx').then((module) => ({ default: module.PinMap })))

interface LocationFieldProps {
  field: ProfileFields['location']
  search: string
  onSearch: (text: string) => void
  onPasteText: (text: string) => boolean // true when the text was a map link or coordinates (then it is handled)
  onEnter: () => void
  suggestions: PlaceSuggestion[]
  live: boolean
  locating: boolean
  onPick: (suggestion: PlaceSuggestion) => void
  onHere: () => void
  onPin: () => void
  onConfirmPin: () => void
  onClear: () => void
}

/** 3/7 "ที่ตั้ง": search, paste a link, use the phone's location or pin it; once filled, the map with its checks. */
export function LocationField(props: LocationFieldProps) {
  const { field } = props
  const point = field.value
  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (props.onPasteText(event.clipboardData.getData('text'))) event.preventDefault()
  }
  const enter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') props.onEnter()
  }
  return (
    <Field id="s3-location" label={th.store.location} required mark={fieldMark(field)} onCheck={null}>
      {point ? (
        <div className="flex flex-col gap-2">
          <Suspense fallback={<DrawnMap label={point.text} />}>
            <PinMap point={point} />
          </Suspense>
          <div className="flex flex-wrap gap-2">
            {field.needsPinCheck && (
              <Button variant="secondary" className="min-h-12!" icon={<MapPin className="size-5" aria-hidden />} onClick={props.onConfirmPin}>
                {th.s3.pinConfirm}
              </Button>
            )}
            <Button variant="ghost" className="min-h-12!" icon={<MapPinned className="size-5" aria-hidden />} onClick={props.onPin}>
              {th.s3.pinChange}
            </Button>
            <Button variant="ghost" className="min-h-12! px-0!" onClick={props.onClear}>
              {th.s3.pinSearchAgain}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-action" aria-hidden />
            <input
              id="s3-location"
              autoComplete="off"
              enterKeyHint="search"
              placeholder={th.s3.locationPlaceholder}
              value={props.search}
              onChange={(event) => props.onSearch(event.target.value)}
              onPaste={paste}
              onKeyDown={enter}
              className={`${inputClass()} pl-11`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-12!" disabled={props.locating} icon={<LocateFixed className="size-5" aria-hidden />} onClick={props.onHere}>
              {props.locating ? th.places.locating : th.places.useHere}
            </Button>
            <Button variant="secondary" className="min-h-12!" icon={<MapPinned className="size-5" aria-hidden />} onClick={props.onPin}>
              {th.places.pinOnMap}
            </Button>
          </div>
          <PlaceSuggestions suggestions={props.suggestions} live={props.live} onPick={props.onPick} />
        </div>
      )}
    </Field>
  )
}
```

Create `src/screens/signup/s3/AddressField.tsx`:

```tsx
import { MapPinned } from 'lucide-react'
import { formatThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { Field } from '@/components/grab/Field.tsx'
import { fieldMark, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { th } from '@/copy/th.ts'
import { applyCompletion, areaCompletions, areaParts, type Area } from '@/services/places/thaiAddressDb.ts'
import type { ProfileFields } from '@/types/domain.ts'

interface AddressFieldProps {
  field: ProfileFields['address']
  areas: Area[] | null // null while the address data loads: no completions yet
  mismatch: string | null // what is wrong with the postcode, to show under the box
  onType: (value: string) => void
  onCheck: (() => void) | null
}

/** 3/7 "ที่อยู่ร้านค้า": one box as in GrabMerchant; typing a postcode or ตำบล offers the rest of the address. */
export function AddressField({ field, areas, mismatch, onType, onCheck }: AddressFieldProps) {
  const value = field.value ?? ''
  const typedHere = field.status !== 'empty' && field.heardFrom === TYPED
  const completions = areas && typedHere ? areaCompletions(areas, value) : []
  return (
    <Field id="s3-address" label={th.fields.address} required mark={fieldMark(field)} onCheck={onCheck} error={mismatch}>
      <textarea id="s3-address" rows={2} value={value} onChange={(event) => onType(event.target.value)} className={`${inputClass(mismatch !== null)} py-3`} />
      {completions.length > 0 && (
        <ul aria-label={th.places.areaChoices} className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          {completions.map((area) => (
            <li key={`${area.subdistrict}|${area.district}|${area.postcode}`}>
              <button type="button" onClick={() => onType(applyCompletion(value, area))} className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-ok-bg">
                <MapPinned className="size-5 shrink-0 text-action" aria-hidden />
                {formatThaiAddress(areaParts(area))}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
```

- [ ] **Step 3: Replace `S3Business.tsx`**

Replace `src/screens/signup/S3Business.tsx` with:

```tsx
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { DERIVED_CONFIDENCE, GPS_CONFIDENCE, LINK_CONFIDENCE, redraftAddress } from '@/ai/onboarding/addressFields.ts'
import { businessUpdates, STEP3_TALK } from '@/ai/onboarding/businessTalk.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { CATEGORY_LABELS } from '@/ai/onboarding/parsers/category.ts'
import { locationPhrase } from '@/ai/onboarding/parsers/locationPhrase.ts'
import { formatThaiAddress, parseThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { COUNTRY_ZOOM, isInThailand, PIN_ZOOM, THAILAND_CENTER, type MapView } from '@/services/places/bounds.ts'
import { locateDevice, ROUGH_FIX_M } from '@/services/places/geolocation.ts'
import { readLink } from '@/services/places/linkCoords.ts'
import { getPlaces, type PlaceMatch, type PlaceSuggestion } from '@/services/places/places.ts'
import { loadAreas, loadedAreas, postcodeMismatch, type Area } from '@/services/places/thaiAddressDb.ts'
import type { ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'
import { AddressField } from './s3/AddressField.tsx'
import { LocationField } from './s3/LocationField.tsx'

const PinSheet = lazy(() => import('@/components/map/PinSheet.tsx').then((module) => ({ default: module.PinSheet })))

const SUGGEST_AFTER_MS = 300
const account = getAccount()
const landmarks = getLandmarks()
const places = getPlaces()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
  { id: 'here' as const, phrases: SAY.here },
  { id: 'pin' as const, phrases: SAY.pin },
]

const pointAt = (lat: number, lng: number) => ({ text: th.places.pinnedHere, lat, lng })

/** 3/7 ข้อมูลธุรกิจ: name, building/street, map pin, address and food type. Tell the companion, or type. */
export function S3Business() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const [talking, setTalking] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [areas, setAreas] = useState<Area[] | null>(loadedAreas)
  const [placeNotice, setPlaceNotice] = useState<string | null>(null)
  const [pinView, setPinView] = useState<MapView | null>(null) // the pin sheet is open while set
  const [locating, setLocating] = useState(false)
  const question = useMemo(() => pickFollowUp(state.profile, STEP3_TALK, account), [state.profile])
  const status = stepStatus(state.profile, 3)

  // Close the talk sheet by itself once there is nothing left to ask (only on that change, so the merchant can reopen it).
  const [hadQuestion, setHadQuestion] = useState(question !== null)
  if (hadQuestion !== (question !== null)) {
    setHadQuestion(question !== null)
    if (question === null) setTalking(false)
  }

  // The Thai address data (sub-districts and postcodes) loads in the background the first time 3/7 opens.
  useEffect(() => {
    let current = true
    loadAreas()
      .then((loaded) => {
        if (current) setAreas(loaded)
      })
      .catch((problem: unknown) => console.warn('Thai address data did not load:', problem))
    return () => {
      current = false
    }
  }, [])

  const fill = (updates: ProfileUpdates) => {
    if (Object.keys(updates).length > 0) dispatch({ type: 'FILL', updates, at: Date.now() })
  }
  const type = (key: ProfileFieldKey) => (value: string) => {
    if (!value.trim()) return dispatch({ type: 'CLEAR_FIELD', field: key })
    fill({ [key]: { value, confidence: 1, heardFrom: TYPED } } as ProfileUpdates)
  }

  /** A new location from anywhere: the box drafts follow it unless the merchant wrote them. */
  const placeAt = (match: PlaceMatch, heardFrom: string, { sure = false, placedByMerchant = false } = {}) => {
    setPlaceNotice(null)
    fill({ location: { ...match, heardFrom }, ...redraftAddress(state.profile, match.value, heardFrom, sure) })
    if (placedByMerchant) dispatch({ type: 'CONFIRM_FIELD', field: 'location' })
  }

  const openPin = () => {
    setTalking(false)
    const point = fields.location.value
    setPinView(point ? { lat: point.lat, lng: point.lng, zoom: PIN_ZOOM } : { ...THAILAND_CENTER, zoom: COUNTRY_ZOOM })
  }

  const locateHere = async () => {
    setLocating(true)
    const fix = await locateDevice()
    setLocating(false)
    if (typeof fix === 'string') return setPlaceNotice(th.places.gpsFailed)
    if (!isInThailand(fix.lat, fix.lng)) return setPlaceNotice(th.places.outsideThailand)
    const found = await places.reverse(fix.lat, fix.lng)
    placeAt({ value: found?.value ?? pointAt(fix.lat, fix.lng), confidence: GPS_CONFIDENCE }, th.sources.gps)
    if (fix.accuracy > ROUGH_FIX_M) setPinView({ lat: fix.lat, lng: fix.lng, zoom: PIN_ZOOM })
  }

  /** A pasted or said map link (or "lat, lng"). False when the text is not one. */
  const takeLink = (text: string): boolean => {
    const link = readLink(text)
    if (!link) return false
    setSearch('')
    if (link.kind === 'unreadable') {
      setPlaceNotice(th.places.linkUnreadable)
      return true
    }
    if (!isInThailand(link.lat, link.lng)) {
      setPlaceNotice(th.places.outsideThailand)
      return true
    }
    void places.reverse(link.lat, link.lng).then((found) => placeAt({ value: found?.value ?? pointAt(link.lat, link.lng), confidence: LINK_CONFIDENCE }, th.sources.link))
    return true
  }

  // Offer places a moment after the merchant stops typing in the location search (never for a link).
  useEffect(() => {
    let current = true
    const waiting = window.setTimeout(async () => {
      const typed = search.trim()
      const found = typed && !readLink(typed) ? await places.suggest(typed) : []
      if (current) setSuggestions(found)
    }, SUGGEST_AFTER_MS)
    return () => {
      current = false
      window.clearTimeout(waiting)
    }
  }, [search])

  const pickPlace = async (suggestion: PlaceSuggestion) => {
    setSearch('')
    setSuggestions([])
    const match = await places.pick(suggestion)
    if (!match) return setPlaceNotice(th.places.notFound)
    if (suggestion.kind === 'area') {
      // A sub-district is not a shop: draft the address, then let the merchant place the pin.
      if (fields.address.status === 'empty') fill({ address: { value: match.value.address ?? match.value.text, confidence: DERIVED_CONFIDENCE, heardFrom: th.sources.map } })
      setPinView({ lat: match.value.lat, lng: match.value.lng, zoom: match.zoom ?? PIN_ZOOM })
      return
    }
    placeAt(match, th.sources.map, { sure: suggestion.kind === 'place' })
  }

  const searchNow = () => {
    const typed = search.trim()
    if (!typed || takeLink(typed)) return
    void pickPlace({ id: `search:${typed}`, kind: 'search', title: typed, subtitle: '', query: typed })
  }

  // A postcode from another province stops ต่อไป until the merchant fixes or confirms the address.
  const address = fields.address.value
  const wrongPostcode = areas && address && fields.address.status !== 'confirmed' ? postcodeMismatch(areas, address) : null
  const mismatch = wrongPostcode ? th.places.postcodeMismatch(wrongPostcode.postcode, wrongPostcode.actual, wrongPostcode.said) : null
  const canGoOn = status.valid && mismatch === null

  const { mic, transcript, notice, toggleMic, hear, onSpoken } = useVoiceInput(
    async (text, isCurrent) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'next') {
        if (canGoOn) dispatch({ type: 'NEXT' })
        return true
      }
      if (command === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      if (command === 'typeInstead') {
        setTalking(true)
        return true
      }
      if (command === 'here') {
        void locateHere()
        return true
      }
      if (command === 'pin') {
        openPin()
        return true
      }
      if (takeLink(text)) return true
      const expecting = question?.field ?? undefined
      const spoken = parseThaiAddress(text)
      const wantsPlace = expecting === 'location' || expecting === undefined || spoken !== null
      const phrase = spoken ? formatThaiAddress(spoken) : wantsPlace ? locationPhrase(text, expecting === 'location') : null
      const place = phrase ? await places.find(phrase) : null
      if (!isCurrent()) return false // the screen was left or reset while the map was answering
      const updates = businessUpdates(text, { expecting, landmarks, profile: state.profile, place })
      if (phrase && !place && Object.keys(updates).length === 0) return th.places.notFound
      fill(updates)
      return Object.keys(updates).length > 0
    },
    { autoListen: talking && pinView === null },
  )

  const line = question
    ? question.field === null
      ? th.s3.helperStart
      : question.text
    : (mismatch ?? (status.valid ? th.s3.helperDone : problemText(status.issues[0])))
  const amber = (key: ProfileFieldKey) => (needsAmber(fields[key]) ? () => dispatch({ type: 'CONFIRM_FIELD', field: key }) : null)
  const chips = (question?.chips ?? []).flatMap((chip) => {
    if (chip.kind === 'say') return [{ label: chip.label, onPress: () => hear(chip.label) }]
    if (chip.kind === 'useDeviceLocation') return [{ label: chip.label, onPress: () => void locateHere() }]
    if (chip.kind === 'pinOnMap') return [{ label: chip.label, onPress: openPin }]
    return []
  })

  return (
    <StepShell
      step={3}
      title={th.s3.title}
      subtitle={th.s3.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar
            text={line}
            notice={placeNotice ?? notice}
            mic={mic}
            onAvatar={toggleMic}
            onSpoken={onSpoken}
            action={{ kind: 'mic', label: th.s3.talk, onPress: () => setTalking(true) }}
          />
          <Button fullWidth disabled={!canGoOn} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <h2 className="text-lg font-bold">{th.s3.section}</h2>
      <Field id="s3-name" label={th.s3.storeName} required mark={fieldMark(fields.storeName)} onCheck={amber('storeName')}>
        <input id="s3-name" autoComplete="organization" value={fields.storeName.value ?? ''} onChange={(event) => type('storeName')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s3-building" label={th.fields.building} required mark={fieldMark(fields.building)} onCheck={amber('building')}>
        <input id="s3-building" autoComplete="address-line1" value={fields.building.value ?? ''} onChange={(event) => type('building')(event.target.value)} className={inputClass()} />
      </Field>
      <LocationField
        field={fields.location}
        search={search}
        onSearch={setSearch}
        onPasteText={takeLink}
        onEnter={searchNow}
        suggestions={suggestions}
        live={places.live}
        locating={locating}
        onPick={(suggestion) => void pickPlace(suggestion)}
        onHere={() => void locateHere()}
        onPin={openPin}
        onConfirmPin={() => dispatch({ type: 'CONFIRM_FIELD', field: 'location' })}
        onClear={() => dispatch({ type: 'CLEAR_FIELD', field: 'location' })}
      />
      <AddressField field={fields.address} areas={areas} mismatch={mismatch} onType={type('address')} onCheck={amber('address')} />
      <Field id="s3-category" label={th.fields.category} required mark={fieldMark(fields.category)} onCheck={amber('category')}>
        <Select
          id="s3-category"
          value={fields.category.value ?? ''}
          placeholder={th.s3.categoryPlaceholder}
          options={[...new Set([...CATEGORY_LABELS, ...(fields.category.value ? [fields.category.value] : [])])].map((label) => ({ value: label, label }))}
          onChange={type('category')}
        />
      </Field>

      <TalkSheet
        open={talking}
        onClose={() => setTalking(false)}
        question={line}
        chips={chips}
        transcript={transcript}
        mic={mic}
        onMic={toggleMic}
        onType={hear}
      />
      {pinView && (
        <Suspense fallback={null}>
          <PinSheet
            open
            start={pinView}
            describe={(lat, lng) => places.reverse(lat, lng)}
            onLocate={async () => {
              const fix = await locateDevice()
              return typeof fix === 'string' ? null : fix
            }}
            onUse={(match) => {
              setPinView(null)
              placeAt(match, th.sources.pin, { placedByMerchant: true })
            }}
            onClose={() => setPinView(null)}
          />
        </Suspense>
      )}
    </StepShell>
  )
}
```

Note for the implementer: the voice "ต่อไป" now checks `canGoOn` first, so a wrong postcode cannot be skipped by voice either. The link helper is named `takeLink`, not `useLink`, so the hooks lint rule does not take it for a hook.

- [ ] **Step 4: Copy**

Add the copy listed under **Interfaces** to `src/copy/th.ts` (`sources`, `places`, `s3`). Remove `th.places.picked` if nothing uses it (`npx oxlint` / search to confirm).

- [ ] **Step 5: Run everything**

Run: `npm test && npm run lint && npm run build`
Expected: all pass, 0 warnings.

- [ ] **Step 6: Quick look in the browser**

Run `npm run dev`, open http://localhost:5173, use the presenter panel jump "3/7 ข้อมูลธุรกิจ" and check, in this order:
1. Type `40000` in the location box → area rows and a "ค้นหา … บนแผนที่" row appear; tap an area row → the pin sheet opens near Khon Kaen and the address box shows "ต.… จ.ขอนแก่น 40000".
2. In the pin sheet, drag the map; the line under it changes to an address within about a second; tap **ใช้ตำแหน่งนี้** → the map shows, there is **no** "หมุดถูกแล้ว" button.
3. Tap **ค้นหาที่ใหม่**, paste `https://maps.google.com/?q=18.7902,99.0005` → the location fills near ตลาดวโรรส with "หมุดถูกแล้ว".
4. Type `12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 40000` in the address box → the box is amber-bordered with the postcode message and **ต่อไป** is disabled; change `40000` to `50300` → the message goes.

Fix anything broken before committing. (The full check list is Task 10.)

- [ ] **Step 7: Commit**

```bash
git add src/screens/signup src/components/ui/PlaceSuggestions.tsx src/copy/th.ts
git commit -m "3/7: place the shop by GPS, a pin, a pasted link, an area or a full address, by touch or voice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Presenter switch, README, and the full browser check

**Files:**
- Modify: `src/app/demo/DemoPanel.tsx`, `README.md`

**Interfaces:**
- Consumes: `demoFlags.simulateLocation` (Task 6).

- [ ] **Step 1: The "ตำแหน่งจำลอง" switch**

In `src/app/demo/DemoPanel.tsx`, next to `failApi` state add `const [fakeLocation, setFakeLocation] = useState(demoFlags.simulateLocation)`, and in the section with the "จำลองระบบล่ม" checkbox add, before it:

```tsx
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={fakeLocation}
            onChange={(event) => {
              demoFlags.simulateLocation = event.target.checked
              setFakeLocation(event.target.checked)
            }}
          />
          ตำแหน่งจำลอง (ใช้ตำแหน่งตอนนี้ = ลาดพร้าว 71)
        </label>
```

- [ ] **Step 2: README**

In `README.md`:
- Add `[docs/specs/2026-10-14-location-input-design.md](docs/specs/2026-10-14-location-input-design.md)` to the "Design:" line.
- After the **3/7** bullet, add:

```markdown
- **Shop location, other ways (3/7):** tap **ใช้ตำแหน่งตอนนี้** (tick "ตำแหน่งจำลอง" in the panel on a laptop), **ปักหมุดบนแผนที่** (move the map under the pin), paste a Google Maps / LINE location link, or type a postcode such as `40000` and pick the ตำบล. Saying "ใช้ตำแหน่งนี้" or "ปักหมุด" works too, and so does a full spoken address.
```

- Add a section at the end:

```markdown
### Credits

- Map pictures and place search: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), via Nominatim, within its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Thai sub-district and postcode data: [thai-address-database](https://github.com/Sellsuki/thai-address-database) 0.0.33 (ISC), copied as `src/data/thai-address.json`.
- Map view: [Leaflet](https://leafletjs.com) (BSD-2-Clause).
```

- [ ] **Step 3: Run everything**

Run: `npm test && npm run lint && npm run build` — Expected: all pass.

- [ ] **Step 4: Full browser check**

With `npm run dev` and the presenter panel, on 3/7 confirm each, and note any failure:
1. Demo line 1 still fills name, food type, location (Lat Phrao 71) and drafts building "ซอยลาดพร้าว 71 ถนนลาดพร้าว" and the full Bangkok address.
2. Tick ตำแหน่งจำลอง → **ใช้ตำแหน่งตอนนี้** → location filled from the device, source "จากตำแหน่งเครื่อง", pin check required.
3. Untick it; in the browser deny the location permission → helper line says it could not find the location.
4. **ปักหมุดบนแผนที่** with nothing filled → the sheet opens over Thailand; **ไปที่ตำแหน่งตอนนี้** (with the switch on) jumps to Lat Phrao; **ใช้ตำแหน่งนี้** → confirmed pin.
5. Paste `https://maps.app.goo.gl/AbC` → the "ลิงก์นี้อ่านตำแหน่งไม่ได้" line; paste `48.8584, 2.2945` → "อยู่นอกประเทศไทย".
6. Type `ตลาดต้นพยอม` → tap the search row → a place in เชียงใหม่ from OpenStreetMap.
7. Talk sheet, type: `สิบสองทับสาม หมู่สี่ ตำบลในเมือง อำเภอเมือง ขอนแก่น` → the address box fills (amber) and a pin near Khon Kaen appears.
8. DevTools → Network → Offline, reload, jump to 3/7: type `วโรรส` → sample row works and fills; the map shows the drawn stand-in.
9. Phone width (375px): the pin sheet fills the phone frame, buttons are reachable, nothing scrolls sideways.
10. Go on to 7/7 with a filled location: the summary shows the address; submit still works.

- [ ] **Step 5: Commit**

```bash
git add src/app/demo/DemoPanel.tsx README.md
git commit -m "Presenter location switch, README steps and credits for the new location tools

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (done while writing)

- **Spec coverage:** §2 data → Tasks 1, 3; §3 modules → Tasks 2–6, 8; §4 screen → Tasks 8–9; §4 confidence table → Task 3 (`addressFromLocation`, `GPS_CONFIDENCE`, `LINK_CONFIDENCE`), Task 6 (`SEARCH`/`REVERSE`/`AREA`), Task 7 (`SPOKEN_ADDRESS_CONFIDENCE`), Task 9 (pin sheet = confirmed); §5 voice → Tasks 7, 9; §6 failures → Task 5 (timeout, 429), Task 6 (fallbacks), Task 8 (tiles), Task 9 (link, outside Thailand, GPS); §7 presenter → Tasks 6, 10; §8 testing → each task + Task 10; §9 out of scope respected.
- **Deliberate deviations from the spec, to raise in review:** the spec table lists "Spoken / typed place found by search 0.62": sample-place matches keep 0.62, while OpenStreetMap matches use 0.7 (`SEARCH_CONFIDENCE`); both are amber and both need the pin check. `react-leaflet` is not used (one small effect per map is simpler and avoids a dependency).
- **Type names used across tasks:** `ThaiAddress`, `Area`, `CompactDb`, `PlaceSuggestion.kind/area/query`, `PlaceMatch.zoom`, `Places.reverse`, `PlaceSource`, `Nominatim`, `MapView`, `DeviceFix`, `LocateFailure`, `redraftAddress`, `SPOKEN_ADDRESS_CONFIDENCE` — each defined once, in the task named in its Interfaces block.
