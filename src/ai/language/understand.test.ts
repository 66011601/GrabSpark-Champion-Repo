import { describe, expect, it } from 'vitest'
import { maskRude, understandThai } from './understand.ts'

describe('understandThai — dialect', () => {
  it('turns Isan function words into central Thai', () => {
    expect(understandThai('เบิ่งยอดขายแหน่').text).toBe('ดูยอดขายหน่อย')
    expect(understandThai('บ่เอาเด้อ').text).toBe('ไม่เอา')
    expect(understandThai('ร้านอยู่ไส').text).toBe('ร้านอยู่ไหน')
  })

  it('turns Northern and Southern words into central Thai', () => {
    expect(understandThai('ร้านอยู่ตี้กาดหลวงเจ้า').text).toBe('ร้านอยู่ที่ตลาดหลวง')
    expect(understandThai('ปิ๊กหน้าหลักเน้อ').text).toBe('กลับหน้าหลัก')
    expect(understandThai('ทำพรือหนิ').text).toBe('ทำอย่างไร')
    expect(understandThai('ต่อเช้าเปิดกี่โมง').text).toBe('พรุ่งนี้เปิดกี่โมง')
  })

  it('reads ซาว and ฮ้อย as numbers', () => {
    expect(understandThai('ข้าวเหนียวมะม่วงซาวห้าบาท').text).toBe('ข้าวเหนียวมะม่วงยี่สิบห้าบาท')
  })

  it('leaves real central words alone', () => {
    for (const said of ['บ่อน้ำ', 'แม่น้ำ', 'เจ้าของร้าน', 'ลำปาง', 'ลำไย']) expect(understandThai(said).text).toBe(said)
  })

  it('keeps names and adjectives as said, but counts them as evidence', () => {
    const heard = understandThai('ร้านครัวนัวคักขายลาบ')
    expect(heard.text).toBe('ร้านครัวนัวคักขายลาบ')
    expect(heard.regionWords.isan).toBe(2)
  })

  it('reads a lone Northern เจ้า as yes', () => {
    expect(understandThai('เจ้า').text).toBe('ใช่')
  })

  it('counts region words but never shared ones', () => {
    expect(understandThai('บ่แม่นเด้อ').regionWords).toEqual({ isan: 2, north: 0, south: 0 })
    expect(understandThai('บ่').regionWords).toEqual({ isan: 0, north: 0, south: 0 })
    expect(understandThai('บ่').dialectWords).toBe(1)
  })
})

describe('understandThai — rude words', () => {
  it('removes them from what the screens read and shows ***', () => {
    const heard = understandThai('แม่งต่อไปเลย')
    expect(heard.shown).toBe('***ต่อไปเลย')
    expect(heard.text).toBe('ต่อไปเลย')
    expect(heard.onlyRude).toBe(false)
  })

  it('flags a sentence that is only rude words', () => {
    expect(understandThai('ไอ้เหี้ย').onlyRude).toBe(true)
    expect(understandThai('เหี้ยเอ๊ย ค่ะ').onlyRude).toBe(false) // เอ๊ย is a word, so there is something left
  })

  it('never masks food or ordinary words', () => {
    for (const said of ['ขายตีนไก่ทอด', 'เนื้อควายย่าง', 'ร้านขายอาหารสัตว์', 'หอยทอดกระทะร้อน', 'เหี้ยมโหดมาก', 'หีบใส่ของ', 'สัดส่วนกำไร', 'กู้เงินมาเปิดร้าน']) {
      const heard = understandThai(said)
      expect(heard.shown, said).toBe(said)
      expect(heard.text, said).toBe(said)
    }
  })

  it('masks insult forms of food words', () => {
    expect(understandThai('ไอ้ควายต่อไป').shown).toBe('***ต่อไป')
  })

  it('masks interim words for the live transcript', () => {
    expect(maskRude('มึงเปิดเมนู')).toBe('***เปิดเมนู')
  })
})
