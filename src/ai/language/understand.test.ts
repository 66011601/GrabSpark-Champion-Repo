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

  it('turns Northern หื้อ and ข้าเจ้า into central Thai', () => {
    expect(understandThai('ถ่ายบัตรหื้อเจ้า').text).toBe('ถ่ายบัตรให้')
    expect(understandThai('ข้าเจ้ายังบ่เคยสมัครเจ้า').text).toBe('ฉันยังไม่เคยสมัคร')
    expect(understandThai('ข้าเจ้ายังบ่เคยสมัครเจ้า').regionWords.north).toBe(2)
  })

  it('keeps central words that have a dialect word inside them', () => {
    for (const said of ['อยู่ในตลาดศาลเจ้า', 'เจ้าหน้าที่บอกว่าต้องถ่ายบัตร', 'ข้าวซอยเจ้าดังอยู่ตรงนี้', 'ไปหลบฝนก่อน', 'แลเห็นป้ายร้าน', 'ไม่มีตำหนิ']) {
      const heard = understandThai(said)
      expect(heard.text, said).toBe(said)
      expect(heard.dialectWords, said).toBe(0)
    }
    expect(understandThai('อยู่ในตลาดศาลเจ้าหนิ').text).toBe('อยู่ในตลาดศาลเจ้า')
  })

  it('still converts the dialect word when it stands on its own', () => {
    expect(understandThai('หลบไปก่อนหนิ').text).toBe('กลับไปก่อน')
    expect(understandThai('ลูกค้าแลเมนูหนิ').text).toBe('ลูกค้าดูเมนู')
  })

  it('hears a closing particle the word breaker glued to the word before it', () => {
    // The breaker reads "พุ้นเด้อ" and "บนัวเด้อ" as one word each.
    expect(understandThai('ร้านอยู่ตลาดต้นตาลพุ้นเด้อ').text).toBe('ร้านอยู่ตลาดต้นตาลโน้น')
    const named = understandThai('ร้านข้อยชื่อแซ่บนัวเด้อ')
    expect(named.text).toBe('ร้านฉันชื่อแซ่บนัว')
    expect(named.shown).toBe('ร้านข้อยชื่อแซ่บนัวเด้อ')
  })

  it('turns Isan จ่ม and ฮอด and Southern ไหร into central Thai', () => {
    expect(understandThai('ลูกค้าจ่มหยังแหน่').text).toBe('ลูกค้าบ่นอะไรหน่อย')
    expect(understandThai('สี่โมงแลงฮอดเที่ยงคืนเด้อ').text).toBe('สี่โมงเย็นถึงเที่ยงคืน')
    expect(understandThai('ลูกค้าบ่นไหรบ้างหนิ').text).toBe('ลูกค้าบ่นอะไรบ้าง')
    // the same letters inside central words stay as said
    for (const said of ['เท่าไหร่คะ', 'ลูกค้าบ่นอะไรบ้างคะ']) expect(understandThai(said).text, said).toBe(said)
  })

  it('hears a dialect word the word breaker glued to the next word', () => {
    // The breaker reads "ผ่อประวัติ" as "ผ่|อปร|ะ|วัติ".
    expect(understandThai('ผ่อประวัติคำสั่งซื้อหื้อเจ้า').text).toBe('ดูประวัติคำสั่งซื้อให้')
    expect(understandThai('ผ่อบัญชีพนักงานเจ้า').text).toBe('ดูบัญชีพนักงาน')
    expect(understandThai('ลูกค้าบ่นไหรบ้างหนิ').text).toBe('ลูกค้าบ่นอะไรบ้าง') // ไห|รบ้าง
    expect(understandThai('ปิ๊กบ้านก่อนเจ้า').text).toBe('กลับบ้านก่อน') // ปิ๊|กบ้าน
    expect(understandThai('กิ๋นข้าวแล้ว').text).toBe('กินข้าวแล้ว') // กิ๋|นข้าว
    // central words that start with the same letters stay as said
    for (const said of ['ผ่อนจ่ายได้ไหม', 'ผ่อนรถอยู่', 'ข้อยกเว้น', 'แล้วก็มีลาบ']) expect(understandThai(said).text, said).toBe(said)
  })

  it('reads กี่ตังค์ whole, not as Southern กี่ตัง with ค์ left over', () => {
    expect(understandThai('ข้าวยำกี่ตังค์').text).toBe('ข้าวยำกี่บาท')
    expect(understandThai('ข้าวยำกี่ตังค์').regionWords).toEqual({ isan: 0, north: 0, south: 0 })
    expect(understandThai('ข้าวยำกี่ตังหนิ').text).toBe('ข้าวยำกี่บาท')
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

  it('masks a rude word the word breaker glued to the next word', () => {
    // The breaker reads "กูบอก" as "กูบ|อก" and "แม่งบอก" as "แม่|งบ|อก".
    expect(understandThai('กูบอกแล้วว่าห้าสิบบาท').shown).toBe('***บอกแล้วว่าห้าสิบบาท')
    expect(understandThai('กูบอกแล้วว่าห้าสิบบาท').text).toBe('บอกแล้วว่าห้าสิบบาท')
    expect(maskRude('แม่งบอกแล้ว')).toBe('***บอกแล้ว')
    for (const said of ['หีบห่อเรียบร้อย', 'หีบใส่ของ', 'สัดส่วนกำไร', 'เหี้ยมโหดจริง', 'แม่มดใจดี', 'ร้านแม่มณีค่ะ', 'แม่มนัสขายลาบ', 'กู้เงินมาเปิดร้าน', 'กู้ยืมเงิน']) {
      expect(understandThai(said).shown, said).toBe(said)
    }
  })

  it('never masks กูเกิล', () => {
    for (const said of ['กูเกิลแมปหาร้านเจอไหมคะ', 'ใช้กูเกิลหา']) expect(understandThai(said).shown, said).toBe(said)
  })

  it('masks insult forms of food words', () => {
    expect(understandThai('ไอ้ควายต่อไป').shown).toBe('***ต่อไป')
  })

  it('masks interim words for the live transcript', () => {
    expect(maskRude('มึงเปิดเมนู')).toBe('***เปิดเมนู')
  })
})
