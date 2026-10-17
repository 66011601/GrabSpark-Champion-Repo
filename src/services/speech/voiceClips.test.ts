import { describe, expect, it } from 'vitest'
import { clipsFor, lineKey } from './voiceClips.ts'

const manifest = {
  'เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ': 'a1',
  'หนูยังไม่เข้าใจค่ะ': 'b2',
  'ลองพูดใหม่นะคะ': 'c3',
  'หนูยังไม่เข้าใจค่ะ ลองพูดใหม่นะคะ': 'bc',
}

describe('recorded voice', () => {
  it('keys a line with its spaces tidied', () => {
    expect(lineKey('  หนู   ยัง\nไม่เข้าใจ ')).toBe('หนู ยัง ไม่เข้าใจ')
  })

  it('plays the whole line when it was recorded', () => {
    expect(clipsFor('หนูยังไม่เข้าใจค่ะ  ลองพูดใหม่นะคะ', manifest)).toEqual(['bc'])
  })

  it('joins recorded pieces when the line was not recorded whole: a reply then the page line', () => {
    expect(clipsFor('หนูยังไม่เข้าใจค่ะ เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ', manifest)).toEqual(['b2', 'a1'])
  })

  it('uses the fewest pieces', () => {
    expect(clipsFor('หนูยังไม่เข้าใจค่ะ ลองพูดใหม่นะคะ เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ', manifest)).toEqual(['bc', 'a1'])
  })

  it('has nothing to play when any part was not recorded, so one voice says it all', () => {
    expect(clipsFor('ได้ น้ำส้ม 20 บาท แล้วค่ะ', manifest)).toBeNull()
    expect(clipsFor('หนูยังไม่เข้าใจค่ะ น้ำส้ม', manifest)).toBeNull()
    expect(clipsFor('', manifest)).toBeNull()
  })
})
