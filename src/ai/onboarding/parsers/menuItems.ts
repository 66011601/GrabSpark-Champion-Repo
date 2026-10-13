import type { MenuEntry } from '@/types/domain.ts'
import { scanNumbers, type NumberMatch } from './thaiNumber.ts'

const MIN_PRICE = 5
const MAX_PRICE = 5000

// A price must be followed by a pause, "บาท", a particle or the end. This keeps number
// words inside other words ("แปดริ้ว", "แสนอร่อย") from being read as prices.
const AFTER_PRICE = /^(?:\s|$|บาท|ค่ะ|ครับ|คะ|นะ|[,.!?])/

// The unit and polite particle after a price belong to that price, not to the next dish.
// Without "บาท", a particle only counts when a pause follows ("50 คะน้า…" is a dish, not "50 คะ").
const PRICE_TAIL = /^\s*(?:บาท\s*(?:นะ)?(?:ค่ะ|ครับ|คะ|จ้ะ|จ้า)?|(?:นะ)?(?:ค่ะ|ครับ|คะ|จ้ะ|จ้า)(?=\s|$))?/

// Connectors that can open a dish phrase. กับ/และ also start real dishes ("กับแกล้ม"),
// so they only count when a pause follows.
const LEADING_FILLERS = ['แล้วก็', 'เมนู', 'ราคา', 'แล้ว', 'ขาย', 'มี', 'ก็']
const SPACED_FILLERS = ['กับ', 'และ']
const TRAILING_FILLERS = ['ราคา', 'นะคะ', 'นะครับ', 'ครับ', 'ค่ะ', 'คะ']

function isPrice(text: string, match: NumberMatch): boolean {
  return match.value >= MIN_PRICE && match.value <= MAX_PRICE && AFTER_PRICE.test(text.slice(match.end))
}

function stripFiller(name: string): string | null {
  const leading = LEADING_FILLERS.find((filler) => name.startsWith(filler)) ?? SPACED_FILLERS.find((filler) => name.startsWith(`${filler} `))
  if (leading) return name.slice(leading.length).trim()
  const trailing = TRAILING_FILLERS.find((filler) => name.endsWith(filler))
  return trailing ? name.slice(0, -trailing.length).trim() : null
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
