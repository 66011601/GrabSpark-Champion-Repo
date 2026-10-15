import { stripParticles } from './particles.ts'

// A question word at the end ("ใส่ได้หมดไหม", "ต้องตั้งยังไง") or a "why/what/how" at the start. After the language
// layer, Isan บ่ and Southern ม่าย already read as ไหม/ไม่, and อะหยัง/ไหร as อะไร.
const ASKING_END = /(?:ไหม|มั้ย|ไม่|หรือเปล่า|รึเปล่า|หรือยัง|อะไร|อะไรบ้าง|ยังไง|อย่างไร|ไง|เท่าไหร่|เท่าไร|ไหน|ตรงไหน|อันไหน|แบบไหน|บ้าง|กี่(?:โมง|วัน|บาท|คน|อัน|ที่|เปอร์เซ็นต์))\s*$/
const ASKING_START = /^(?:ทำไม|อะไร|ยังไง|อย่างไร|ช่วยบอก|ขอถาม|ถามหน่อย)/

/** True when the merchant is asking something rather than answering: their words must not become a field's value. */
export function isQuestion(text: string): boolean {
  const said = stripParticles(text).trim()
  return said.length > 0 && (ASKING_END.test(said) || ASKING_START.test(said))
}
