import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import { th } from '@/copy/th.ts'
import type { GridId, NavScreen, Script } from './types.ts'

/**
 * The 13 items on GrabMerchant's home, in the app's order. `opens` is the demo screen built for it;
 * the others open a page that only says what the item is for (from Grab's merchant guide).
 * `names` are other ways owners say it, or how the recogniser spells it.
 */
export const GRID: { id: GridId; label: string; names: string[]; opens?: NavScreen }[] = (
  [
    { id: 'orders', names: ['ออเดอร์', 'รายการสั่งซื้อ'] },
    { id: 'menu', names: ['รายการอาหาร'], opens: 'MENU' },
    { id: 'shop', names: ['ร้านค้า', 'ข้อมูลร้าน'] },
    { id: 'boost', names: ['การตลาด'], opens: 'BOOST' },
    { id: 'staff', names: ['ลูกจ้าง'] },
    { id: 'grabshop', names: ['แกร็บชอป', 'กร็อบช้อป', 'แกรบช้อป'] },
    { id: 'ai', names: ['ผู้ช่วยเอไอ', 'ผู้ช่วยAI'] },
    { id: 'insights', names: ['อินไซต์', 'อินไซท์'], opens: 'INSIGHTS' },
    { id: 'feedback', names: ['ฟีดแบ็ก', 'ฟีดแบ็ค', 'ฟีดแบค'], opens: 'FEEDBACK' },
    { id: 'cashier', names: ['แคชเชีย'] },
    { id: 'express', names: ['ส่งของด่วน'] },
    { id: 'smartlink', names: ['สมาร์ทลิงก์', 'สมาร์ทลิงค์', 'สมาร์ตลิงก์'] },
    { id: 'help', names: ['ช่วยเหลือ', 'ศูนย์ช่วยเหลือ'] },
  ] as const
).map((item, index) => ({ ...item, names: [...item.names], label: th.act2.grid[index] }))

const VERBS = ['', 'เปิด', 'ไป', 'ไปที่', 'ไปหน้า', 'เปิดหน้า', 'เข้า', 'เข้าไป', 'เข้าไปที่']
// Polite padding around a command: "ช่วยเปิดเมนูให้หน่อยค่ะ" is "เปิดเมนู". Applied to both sides, so a name
// that happens to contain one ("ความช่วยเหลือ") still compares equal.
const PADDING = /กด|ช่วย|ขอ|เลย|หน่อย|ด้วย|แล้ว|ให้|นะ/g
const plain = (text: string) => stripParticles(text).toLowerCase().replace(/\s+/g, '').replace(PADDING, '')

const SAYINGS = new Map<string, GridId>()
for (const item of GRID) for (const name of [item.label, ...item.names]) for (const verb of VERBS) SAYINGS.set(plain(verb + name), item.id)

/**
 * "เปิดเมนู", "ไปที่ข้อมูลเชิงลึก", "ส่งด่วน": which home item to open, or null.
 * Only a plain "open X" counts (the whole sentence must be the command), so questions such as
 * "ขอดูยอดขายหน่อย" still go to the five scripts.
 */
export function matchOpen(utterance: string): GridId | null {
  const said = plain(utterance)
  return said ? (SAYINGS.get(said) ?? null) : null
}

/** Tap the tile on the home grid, then show its screen and say what it is for. */
export function openScript(id: GridId): Script {
  const item = GRID.find((entry) => entry.id === id) as (typeof GRID)[number]
  const about = th.act2.pages[id]
  return {
    id: `open-${id}`,
    phrases: [],
    keywords: [],
    steps: [
      // The tap picks the page, so the screen is already right the moment it switches.
      { screen: 'HOME', target: `grid-${id}`, set: { page: id }, say: th.act2.goTo(item.label) },
      { screen: item.opens ?? 'PAGE', say: th.act2.pageSay(item.label, about) },
    ],
  }
}
