import { th } from '@/copy/th.ts'

// "หน้านี้ทำอะไรได้บ้าง", "ช่วยอะไรได้บ้าง", "ใช้ยังไง": the owner wants a tour, not a page. Isan เฮ็ดหยัง, Northern ยะหยัง and
// Southern ทำไหร are kept in case the language layer leaves them.
const ASKS_WHAT = /ทำอะไรได้|ทำไรได้|ช่วยอะไรได้|ช่วยไรได้|ใช้ยังไง|ใช้งานยังไง|ใช้อย่างไร|มีอะไรให้ทำ|ทำอะไรดี|เริ่มยังไง|หน้านี้(?:คือ|มี)?อะไร|มีฟีเจอร์อะไร|เฮ็ดหยัง|ยะหยัง|ทำไหร/

// "แนะนำระบบหน่อย", "แนะนำป้าหน่อย ป้าต้องทำอะไร", "ไม่รู้จะเริ่มตรงไหน": a new owner wants somewhere to start.
const WANTS_INTRO = /แนะนำ|ต้องทำอะไร|ทำอะไรก่อน|เริ่มตรงไหน|เริ่มจากอะไร|เริ่มยังไง|ไม่รู้จะทำอะไร|ใช้ไม่เป็น|สอนหน่อย|สอนใช้/

/** True when the owner asks to be introduced to the app. */
export const wantsIntro = (text: string): boolean => WANTS_INTRO.test(text.replace(/\s+/g, ''))

export type Feature = (typeof th.act2.guide.features)[number]

/**
 * Introduces two or three features, alternating, each time continuing round the list where the last one stopped,
 * so asking again never gives the same suggestions back to back.
 */
export function createIntroducer(features: readonly Feature[] = th.act2.guide.features) {
  let next = 0
  let three = true
  return (): Feature[] => {
    const count = three ? 3 : 2
    const picked = Array.from({ length: count }, (_, step) => features[(next + step) % features.length])
    next = (next + count) % features.length
    three = !three
    return picked
  }
}

/** The app's introducer: one rotation for the whole visit. */
export const introduce = createIntroducer()

/** True when the owner asks what they can do here. */
export const asksWhatToDo = (text: string): boolean => ASKS_WHAT.test(text.replace(/\s+/g, ''))

export type GuideTopic = (typeof th.act2.guide.topics)[number]

/** The three to five things the companion offers to explain. */
export const GUIDE_TOPICS: readonly GuideTopic[] = th.act2.guide.topics
