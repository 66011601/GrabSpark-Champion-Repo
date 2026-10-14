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
