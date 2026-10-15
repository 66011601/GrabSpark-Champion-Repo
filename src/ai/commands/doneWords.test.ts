import { describe, expect, it } from 'vitest'
import { saysDone } from './doneWords.ts'

describe('saysDone', () => {
  it('hears the merchant finish a list', () => {
    for (const said of ['ครบแล้วค่ะ', 'เสร็จแล้ว', 'มีแค่นี้แหละ', 'ไม่มีแล้วจ้า', 'ข้าวผัด 50 บาท แค่นี้']) expect(saysDone(said), said).toBe(true)
    for (const said of ['น้ำส้มแก้วละ 20 บาท', 'หมูกรอบหมดแล้ว', 'เพิ่มเมนู']) expect(saysDone(said), said).toBe(false)
  })
})
