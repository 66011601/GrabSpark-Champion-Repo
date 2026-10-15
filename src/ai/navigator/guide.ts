import { th } from '@/copy/th.ts'

// "หน้านี้ทำอะไรได้บ้าง", "ช่วยอะไรได้บ้าง", "ใช้ยังไง": the owner wants a tour, not a page. Isan เฮ็ดหยัง, Northern ยะหยัง and
// Southern ทำไหร are kept in case the language layer leaves them.
const ASKS_WHAT = /ทำอะไรได้|ทำไรได้|ช่วยอะไรได้|ช่วยไรได้|ใช้ยังไง|ใช้งานยังไง|ใช้อย่างไร|มีอะไรให้ทำ|ทำอะไรดี|เริ่มยังไง|หน้านี้(?:คือ|มี)?อะไร|มีฟีเจอร์อะไร|เฮ็ดหยัง|ยะหยัง|ทำไหร/

/** True when the owner asks what they can do here. */
export const asksWhatToDo = (text: string): boolean => ASKS_WHAT.test(text.replace(/\s+/g, ''))

export type GuideTopic = (typeof th.act2.guide.topics)[number]

/** The three to five things the companion offers to explain. */
export const GUIDE_TOPICS: readonly GuideTopic[] = th.act2.guide.topics
