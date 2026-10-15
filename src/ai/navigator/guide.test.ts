import { describe, expect, it } from 'vitest'
import { asksWhatToDo, createIntroducer, GUIDE_TOPICS, wantsIntro } from './guide.ts'
import { matchIntent } from './matchIntent.ts'
import { SCRIPTS } from './scripts.ts'

describe('the Act 2 guide', () => {
  it('hears "what can I do here"', () => {
    for (const said of ['หน้านี้ทำอะไรได้บ้าง', 'ช่วยอะไรได้บ้างคะ', 'แอปนี้ใช้ยังไง', 'มีอะไรให้ทำบ้าง']) expect(asksWhatToDo(said), said).toBe(true)
    for (const said of ['ขอดูยอดขายหน่อย', 'หมูกรอบหมดแล้ว', 'เปิดเมนู']) expect(asksWhatToDo(said), said).toBe(false)
  })

  it('hears a request to be introduced', () => {
    for (const said of ['แนะนำระบบหน่อย', 'แนะนำป้าหน่อย ป้าต้องทำอะไร', 'ไม่รู้จะเริ่มตรงไหน', 'สอนใช้หน่อย']) expect(wantsIntro(said), said).toBe(true)
    for (const said of ['ขอดูยอดขายหน่อย', 'หมูกรอบหมดแล้ว']) expect(wantsIntro(said), said).toBe(false)
  })

  it('introduces two or three features, never the same set twice in a row', () => {
    const introduce = createIntroducer()
    const sets = Array.from({ length: 8 }, () => introduce().map((feature) => feature.tryIt).join('|'))
    for (const [index, set] of sets.entries()) {
      const size = set.split('|').length
      expect(size === 2 || size === 3).toBe(true)
      if (index > 0) expect(set).not.toBe(sets[index - 1])
    }
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
