import { describe, expect, it } from 'vitest'
import { phraseEnd, splitWords } from './words.ts'

const words = (text: string) => splitWords(text).map((piece) => piece.text)

describe('splitWords', () => {
  it('splits Thai into words and gives the sentence back when joined', () => {
    expect(words('บ่เอาเด้อ')).toEqual(['บ่', 'เอา', 'เด้อ'])
    expect(words('ไอ้เหี้ยต่อไป')).toEqual(['ไอ้', 'เหี้ย', 'ต่อ', 'ไป'])
    const sentence = 'ร้านอยู่กาดหลวง เจ้า'
    expect(words(sentence).join('')).toBe(sentence)
  })

  it('keeps whole words whole', () => {
    expect(words('เหี้ยมโหด')).toEqual(['เหี้ยมโหด'])
    expect(words('บ่อน้ำ')).toEqual(['บ่อน้ำ'])
  })

  it('marks gaps as not words', () => {
    expect(splitWords('ต่อไป เลย').map((piece) => piece.word)).toEqual([true, true, false, true])
  })
})

describe('phraseEnd', () => {
  it('matches a phrase over one or more whole pieces', () => {
    const pieces = splitWords('หรอยจังฮู้') // หรอ | ย | จัง | ฮู้
    expect(phraseEnd(pieces, 0, 'หรอย')).toBe(2)
    expect(phraseEnd(splitWords('ร้านอยู่กาดหลวง'), 2, 'กาด')).toBe(3)
  })

  it('never matches part of a piece', () => {
    expect(phraseEnd(splitWords('บ่อน้ำ'), 0, 'บ่')).toBe(-1)
    expect(phraseEnd(splitWords('เหี้ยมโหด'), 0, 'เหี้ย')).toBe(-1)
  })

  it('ignores spaces inside the phrase and between pieces', () => {
    expect(phraseEnd(splitWords('ไอ้ ควาย'), 0, 'ไอ้ควาย')).toBe(3)
  })
})
