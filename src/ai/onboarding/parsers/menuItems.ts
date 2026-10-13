import type { MenuEntry } from '@/types/domain.ts'
import { scanNumbers, type NumberMatch } from './thaiNumber.ts'

const MIN_PRICE = 5
const MAX_PRICE = 5000

// A price must be followed by a pause, "บาท", a particle or the end. This keeps number
// words inside other words ("พันธุ์", "ห้าง", "แสนอร่อย") from being read as prices.
const AFTER_PRICE = /^(?:\s|$|บาท|ค่ะ|ครับ|คะ|[,.!?])/

const FILLERS = ['แล้วก็', 'เมนู', 'ราคา', 'บาท', 'ครับ', 'ค่ะ', 'คะ', 'แล้ว', 'ขาย', 'กับ', 'และ', 'มี', 'ก็']

function isPrice(text: string, match: NumberMatch): boolean {
  return match.value >= MIN_PRICE && match.value <= MAX_PRICE && AFTER_PRICE.test(text.slice(match.end))
}

function cleanName(raw: string): string {
  let name = raw.replace(/[\s,.!?]+/g, ' ').trim()
  let changed = true
  while (changed) {
    changed = false
    for (const filler of FILLERS) {
      if (name.startsWith(filler)) {
        name = name.slice(filler.length).trim()
        changed = true
      }
      if (name.endsWith(filler)) {
        name = name.slice(0, -filler.length).trim()
        changed = true
      }
    }
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
    cursor = price.end
  }
  return items
}
