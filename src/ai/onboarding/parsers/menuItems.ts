import type { MenuEntry } from '@/types/domain.ts'
import { scanNumbers, type NumberMatch } from './thaiNumber.ts'

const MIN_PRICE = 5
const MAX_PRICE = 5000

// A price must be followed by a pause, "บาท", a particle or the end. This keeps number
// words inside other words ("แปดริ้ว", "แสนอร่อย") from being read as prices.
const AFTER_PRICE = /^(?:\s|$|บาท|ค่ะ|ครับ|คะ|นะ|[,.!?])/

// A number right after an address word is a house or soi number, never a price.
const AFTER_ADDRESS_WORD = /(?:ซอย|ซ\.|ถนน|ถ\.|เลขที่|หมู่(?:ที่)?|เบอร์)\s*$/

// The unit and polite particle after a price belong to that price, not to the next dish.
// Without "บาท", a particle only counts when a pause follows ("50 คะน้า…" is a dish, not "50 คะ").
const PRICE_TAIL = /^\s*(?:บาท\s*(?:นะ)?(?:ค่ะ|ครับ|คะ|จ้ะ|จ้า)?|(?:นะ)?(?:ค่ะ|ครับ|คะ|จ้ะ|จ้า)(?=\s|$))?/

// Connectors that can open a dish phrase. กับ/และ also start real dishes ("กับแกล้ม"),
// so they only count when a pause follows.
const LEADING_FILLERS = ['แล้วก็', 'เมนู', 'ราคา', 'แล้ว', 'ขาย', 'มี', 'ก็']
const SPACED_FILLERS = ['กับ', 'และ']
const TRAILING_FILLERS = ['ราคา', 'นะคะ', 'นะครับ', 'ครับ', 'ค่ะ', 'คะ']

// "ก๋วยเตี๋ยวเรือชามละ 50", "ชาเย็นแก้วละ 25": the unit and ละ say how the price is counted, they are not the dish.
// "น้ำส้ม 1 แก้ว 20 บาท", "น้ำส้มแก้วนึง 20", "หมูปิ้ง 10 ไม้ 100 บาท": a count and its unit say how much the price buys.
const UNITS = 'ชาม|จาน|ถ้วย|แก้ว|ห่อ|กล่อง|ถุง|ไม้|ชิ้น|ลูก|ตัว|อัน|ที่|ชุด|กิโล|โล|ขีด|ขวด|กระป๋อง|ถาด|หม้อ|คู่|พวง|ฟอง|แพ็ค|แพ็ก|ก้อน|แผ่น|ปั้น|ลิตร|จุก|ตับ'
const COUNT = '(?:\\d+|หนึ่ง|นึง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)'
const UNIT_EACH = new RegExp(`\\s*(?:(?:${COUNT}\\s*)?(?:${UNITS})\\s*(?:ละ|ล่ะ)|${COUNT}\\s*(?:${UNITS})|(?:${UNITS})\\s*(?:นึง|หนึ่ง))$`)
// A number followed by a unit is a count, never a price ("10 ไม้"). ที่ is left out: "50 ที่ร้าน" is still a price.
const COUNTED = new RegExp(`^\\s*(?:${UNITS.replace('|ที่', '')})`)

function isPrice(text: string, match: NumberMatch): boolean {
  if (match.value < MIN_PRICE || match.value > MAX_PRICE) return false
  const after = text.slice(match.end)
  return AFTER_PRICE.test(after) && !COUNTED.test(after) && !AFTER_ADDRESS_WORD.test(text.slice(0, match.start))
}

function stripFiller(name: string): string | null {
  const leading = LEADING_FILLERS.find((filler) => name.startsWith(filler)) ?? SPACED_FILLERS.find((filler) => name.startsWith(`${filler} `))
  if (leading) return name.slice(leading.length).trim()
  const trailing = TRAILING_FILLERS.find((filler) => name.endsWith(filler))
  if (trailing) return name.slice(0, -trailing.length).trim()
  const unit = UNIT_EACH.exec(name)
  return unit && unit.index > 0 ? name.slice(0, unit.index).trim() : null
}

function cleanName(raw: string): string {
  let name = raw.replace(/[\s,.!?]+/g, ' ').trim()
  let next = stripFiller(name)
  while (next !== null) {
    name = next
    next = stripFiller(name)
  }
  return name
}

/** "น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้าบาท" → two items with prices. */
export function parseMenuItems(text: string): MenuEntry[] {
  const items: MenuEntry[] = []
  let cursor = 0
  for (const price of scanNumbers(text).filter((match) => isPrice(text, match))) {
    const name = cleanName(text.slice(cursor, price.start))
    if (name) items.push({ name, priceTHB: price.value })
    cursor = price.end + (PRICE_TAIL.exec(text.slice(price.end))?.[0].length ?? 0)
  }
  return items
}
