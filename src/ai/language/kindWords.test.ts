import { describe, expect, it } from 'vitest'
import { fixHeard } from '@/ai/language/heard.ts'
import { th } from '@/copy/th.ts'
import { kindReply } from './kindWords.ts'
import { understandThai } from './understand.ts'

const reply = (said: string, turn = 0) => kindReply(understandThai(fixHeard(said)).text, turn)

describe('kindReply', () => {
  it('thanks back when the merchant says thank you, in any region', () => {
    for (const said of ['ขอบคุณค่ะ', 'ขอบคุณมากนะหนู', 'ขอบใจนะหนู', 'ขอบใจหลายเด้อ', 'ขอบใจเจ้า', 'ขอบคุณที่ช่วยนะคะ', 'แต๊งกิ้วจ้า', 'Thank you', 'thanks ค่ะ'])
      expect(reply(said), said).toBe(th.language.thanked[0])
  })

  it('answers praise, including thanks and praise together as thanks', () => {
    for (const said of ['เก่งมาก', 'เก่งจังเลยหนู', 'เก่งคักหนู', 'น่ารักจัง', 'สุดยอดเลย', 'เยี่ยมมากค่ะ']) expect(reply(said), said).toBe(th.language.praised[0])
    expect(reply('ขอบใจเจ้า หนูเก่งนัก')).toBe(th.language.thanked[0])
  })

  it('says something a little different each time', () => {
    const lines = [0, 1, 2].map((turn) => reply('ขอบคุณค่ะ', turn))
    expect(new Set(lines).size).toBe(3)
    expect(kindReply('ขอบคุณ')).not.toBe(kindReply('ขอบคุณ'))
  })

  it('leaves commands, yes answers and shop talk to the screen', () => {
    for (const said of ['ขอบคุณค่ะ ต่อไปเลย', 'ดี', 'ได้', 'ดีมาก', 'ร้านชื่อน่ารักคาเฟ่', 'หมู่เสี่ยวมาเยี่ยมจากโคราช', 'ใช่', 'ค่ะ', '']) expect(reply(said), said).toBeNull()
  })
})
