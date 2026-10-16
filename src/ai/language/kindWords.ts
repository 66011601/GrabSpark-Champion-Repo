import { th } from '@/copy/th.ts'

/**
 * "ขอบคุณนะหนู", "เก่งมากเลย", "ขอบใจหลายเด้อ": a merchant thanking or praising the companion gets a warm reply
 * instead of "หนูยังไม่เข้าใจ". Only when the whole sentence is thanks or praise: "ขอบคุณค่ะ ต่อไปเลย" is a command,
 * and plain "ดี" or "ได้" is a yes, so they are left to the screen.
 */

const THANKS = 'ขอบคุณ|ขอบใจ|แต๊งกิ้ว|แต๊งกิว|แตงกิ้ว'
const PRAISE = 'เก่ง|เยี่ยม|สุดยอด|น่ารัก|เจ๋ง|เริ่ด|ปัง'
// Words that may come with them: who is thanked, how much (central and regional), what for, and the endings.
const ALONG = [
  'หนู', 'น้อง', 'ลูก', 'นะคะ', 'นะครับ', 'ค่ะ', 'คะ', 'ค่า', 'ครับ', 'คับ', 'จ้า', 'จ้ะ', 'ฮะ', 'นะ', 'เด้อ', 'เน้อ', 'เจ้า', 'เนาะ', 'หนา', 'เด้',
  'มากๆ', 'มาก', 'จังเลย', 'จัง', 'เลย', 'หลายๆ', 'หลาย', 'คัก', 'นัก', 'แท้', 'ขนาด', 'แต๊', 'ฮู้', 'เหลือเกิน', 'จริงๆ', 'จริง', 'ๆ',
  'ที่ช่วย', 'ช่วยได้เยอะ', 'ช่วยได้มาก', 'สำหรับความช่วยเหลือ', 'ด้วย', 'อีกแล้ว', 'อีก', 'นะจ๊ะ', 'จ๊ะ',
].join('|')
const KIND = new RegExp(`^(?:${THANKS}|${PRAISE}|${ALONG})+$`)
const SAYS_THANKS = new RegExp(THANKS)
const SAYS_PRAISE = new RegExp(PRAISE)
// Thanked again, she answers a little differently each time.
let turns = 0

/** A warm reply when the whole sentence (after the language layer) is thanks or praise; otherwise null. */
export function kindReply(understood: string, turn?: number): string | null {
  const said = understood.replace(/\s+/g, '')
  if (!KIND.test(said)) return null
  const thanked = SAYS_THANKS.test(said)
  if (!thanked && !SAYS_PRAISE.test(said)) return null
  const lines = thanked ? th.language.thanked : th.language.praised
  return lines[(turn ?? turns++) % lines.length]
}
