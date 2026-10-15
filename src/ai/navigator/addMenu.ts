import { parseMenuItems } from '@/ai/onboarding/parsers/menuItems.ts'
import { th } from '@/copy/th.ts'
import type { MenuEntry } from '@/types/domain.ts'
import type { Script } from './types.ts'

// "เพิ่มเมนู", "ใส่เมนูใหม่ น้ำส้มแก้วละ 20", "ลงรายการอาหารเพิ่ม": the owner wants new dishes on the menu.
const ADD = /(?:เพิ่ม|ใส่|ลง|สร้าง)(?:เมนู|รายการอาหาร)|เมนูใหม่/
const ADD_WORDS = /(?:ขอ|ช่วย)?(?:เพิ่ม|ใส่|ลง|สร้าง)?(?:เมนู|รายการอาหาร)(?:ใหม่|เพิ่ม)?(?:ว่า|ชื่อ)?/g

/** True when the owner asks to add dishes to the menu. */
export const wantsToAddMenu = (text: string): boolean => ADD.test(text.replace(/\s+/g, ''))

/** The dishes and prices said, without the "เพิ่มเมนู" words: "เพิ่มเมนู น้ำส้มแก้วละ 20 บาท" → น้ำส้ม, 20. */
export const dishesIn = (text: string): MenuEntry[] => parseMenuItems(text.replace(ADD_WORDS, ' '))

/** "น้ำส้ม 20 บาท, ชาเย็น 25 บาท", for the companion to read back. */
export const listOf = (items: MenuEntry[]): string => items.map((item) => `${item.name} ${item.priceTHB} บาท`).join(', ')

/** Opens the menu (from wherever the owner is) and the add sheet, with the dishes already drafted when they were said. */
export function addMenuScript(items: MenuEntry[]): Script {
  const t = th.act2
  return {
    id: 'addMenu',
    title: t.grid[1],
    phrases: [],
    keywords: [],
    steps: [
      { screen: 'HOME', target: 'grid-menu', say: t.goTo(t.grid[1]) },
      {
        screen: 'MENU',
        target: 'add-menu',
        set: { adding: { kind: 'addMenu', items: items.length > 0 ? items : [{ name: '', priceTHB: 0 }] }, soldOut: null, done: null },
        say: items.length > 0 ? t.addMenu.ready(listOf(items)) : t.addMenu.ask,
      },
    ],
  }
}
