import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { CONTROLS, matchIntent } from './matchIntent.ts'
import { SCRIPTS } from './scripts.ts'
import type { ScriptId } from './types.ts'

const CASES: Record<ScriptId, string[]> = {
  sales: [
    'ขอดูยอดขายหน่อย',
    'ขอดูยอดขายหน่อยครับ',
    'ยอดขายเป็นยังไงบ้างคะ',
    'วันนี้ขายได้เท่าไหร่',
    'ขอดู ยอด ขาย หน่อย', // the recogniser split the word
    'ช่วยดูรายได้ของร้านให้หน่อยนะ',
    'อยากรู้ยอดขายของสัปดาห์นี้เทียบกับสัปดาห์ที่แล้ว',
  ],
  forecast: [
    'พรุ่งนี้ฝนตก ออเดอร์จะเป็นไง',
    'ถ้าพรุ่งนี้ฝนตก ขายจะเป็นยังไง',
    'ฝนตกพรุ่งนี้ ออเดอร์เยอะไหม',
    'พรุ่งนี้ฝน ตก ยอดขายจะเป็นยังไงบ้าง', // "ยอดขาย" must not win over the rain
    'พยากรณ์ออเดอร์พรุ่งนี้ให้หน่อย',
    'เห็นว่าพรุ่งนี้ฝนจะตกนะ ออเดอร์จะมากขึ้นไหม',
  ],
  promo: [
    'ทำโปรวันฝนตกให้หน่อย',
    'ทำโปรให้หน่อย',
    'สร้างโปรโมชันวันฝนตก',
    'ตั้งโปรโมชั่นให้หน่อยค่ะ',
    'ช่วยจัดโปรสำหรับวันฝนตกหน่อย',
    'อยากทำโปรให้ลูกค้าวันฝนตก',
  ],
  soldOut: [
    'หมูกรอบหมดแล้ว',
    'หมูกรอบหมดแล้วค่ะ',
    'หมู กรอบ หมดแล้ว',
    'ชาไทยหมดเกลี้ยงเลย',
    'ของหมดแล้ว',
    'ตอนนี้กะเพราขายหมดแล้วนะ',
  ],
  feedback: [
    'ลูกค้าบ่นอะไรบ้าง',
    'ลูกค้าไม่พอใจอะไร',
    'ขอดูฟีดแบ็กหน่อย',
    'ฟิตแบ็คลูกค้าเป็นไง', // misheard "ฟีดแบ็ก"
    'ดูรีวิวหน่อย',
    'มีคนร้องเรียนอะไรไหม',
  ],
}

describe('matchIntent', () => {
  for (const [id, said] of Object.entries(CASES)) {
    it.each(said)(`${id}: "%s"`, (text) => {
      expect(matchIntent(text, SCRIPTS)).toBe(id)
    })
  }

  it('says nothing for talk about something else', () => {
    for (const text of ['สวัสดีค่ะ', 'วันนี้อากาศดีนะ', 'ร้านอยู่ลาดพร้าว', '']) expect(matchIntent(text, SCRIPTS)).toBeNull()
  })
})

describe('trust: voice never confirms', () => {
  const confirming = [...SAY.submit, ...SAY.consentTick, 'ยืนยันและเปิดใช้งาน', 'ยืนยันตั้งเป็นหมด', 'ตกลงเปิดโปร']

  it('no confirming word starts a script', () => {
    for (const text of confirming) expect(matchIntent(text, SCRIPTS)).toBeNull()
  })

  it('no confirming word steers the run either', () => {
    for (const text of confirming) expect(matchCommand(text, CONTROLS)).toBeNull()
  })

  it('steers with home and stop', () => {
    expect(matchCommand('กลับหน้าหลักค่ะ', CONTROLS)).toBe('home')
    expect(matchCommand('หยุดก่อน', CONTROLS)).toBe('stop')
  })
})

describe('scripts', () => {
  it('never says the same line twice in a row, or the helper bar would not speak it again', () => {
    for (const script of SCRIPTS) script.steps.slice(1).forEach((step, i) => expect(step.say).not.toBe(script.steps[i].say))
  })

  it('has at least five phrasings for each script', () => {
    for (const script of SCRIPTS) expect(script.phrases.length).toBeGreaterThanOrEqual(5)
  })
})
