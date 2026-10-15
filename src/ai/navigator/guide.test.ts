import { describe, expect, it } from 'vitest'
import { asksWhatToDo, GUIDE_TOPICS } from './guide.ts'
import { matchIntent } from './matchIntent.ts'
import { SCRIPTS } from './scripts.ts'

describe('the Act 2 guide', () => {
  it('hears "what can I do here"', () => {
    for (const said of ['หน้านี้ทำอะไรได้บ้าง', 'ช่วยอะไรได้บ้างคะ', 'แอปนี้ใช้ยังไง', 'มีอะไรให้ทำบ้าง']) expect(asksWhatToDo(said), said).toBe(true)
    for (const said of ['ขอดูยอดขายหน่อย', 'หมูกรอบหมดแล้ว', 'เปิดเมนู']) expect(asksWhatToDo(said), said).toBe(false)
  })

  it('offers three to five topics, each with something to try', () => {
    expect(GUIDE_TOPICS.length).toBeGreaterThanOrEqual(3)
    expect(GUIDE_TOPICS.length).toBeLessThanOrEqual(5)
    for (const topic of GUIDE_TOPICS) expect(topic.tries.length).toBeGreaterThanOrEqual(1)
  })

  it('tries feature phrases that really start their feature', () => {
    const tries = GUIDE_TOPICS.filter((topic) => ['sales', 'promo', 'feedback'].includes(topic.id)).map((topic) => topic.tries[0])
    expect(tries.map((said) => matchIntent(said, SCRIPTS))).toEqual(['sales', 'promo', 'feedback'])
  })
})
