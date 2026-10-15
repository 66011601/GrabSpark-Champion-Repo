import { describe, expect, it } from 'vitest'
import { learnable, ngrams, prepare } from './features.ts'
import { ASK_SCORE, buildIndex, classify, levelOf, SURE_MARGIN, SURE_SCORE } from './matcher.ts'

const examples = [
  { text: learnable('ขอดูยอดขายหน่อย'), label: 'intent:sales' },
  { text: learnable('วันนี้ขายได้เท่าไหร่คะ'), label: 'intent:sales' },
  { text: learnable('ยอดขายเป็นยังไงบ้าง'), label: 'intent:sales' },
  { text: learnable('ลูกค้าบ่นอะไรบ้าง'), label: 'intent:feedback' },
  { text: learnable('มีรีวิวไม่ดีไหม'), label: 'intent:feedback' },
  { text: learnable('อากาศร้อนจังเลยวันนี้'), label: 'none' },
  { text: learnable('อืม'), label: 'none' },
]
const index = buildIndex(examples)

describe('features', () => {
  it('prepares understood text: no particles, no spaces, lower case', () => {
    expect(prepare('ต่อไป เลย ค่ะ')).toBe('ต่อไปเลย')
    expect(prepare('GrabFood ค่ะ')).toBe('grabfood')
  })

  it('learns bank sentences through the language layer', () => {
    expect(learnable('เบิ่งยอดขายแหน่')).toBe('ดูยอดขายหน่อย')
  })

  it('counts 2- to 4-character grams', () => {
    const grams = ngrams('ขาย')
    expect(grams.get('ขา')).toBe(1)
    expect(grams.get('ขาย')).toBe(1)
    expect(ngrams('ก').get('ก')).toBe(1)
  })
})

describe('classify', () => {
  it('finds the label of a sentence it has never seen', () => {
    const match = classify(index, prepare('อยากรู้ยอดขายวันนี้'))
    expect(match.label).toBe('intent:sales')
    expect(match.ranked[0]).toBe('intent:sales')
  })

  it('gives an exact training sentence a top score', () => {
    expect(classify(index, prepare('ลูกค้าบ่นอะไรบ้าง')).score).toBeGreaterThan(0.99)
  })

  it('says none with score 0 for text with nothing in common', () => {
    expect(classify(index, prepare('qqqq'))).toMatchObject({ label: 'none', score: 0, ranked: [] })
  })

  // "ไม่ใช่" and the lost state offer the next best labels, so ranked must go past the 5 voters (spec D1 §2).
  it('ranks every label: the voters by vote, then the rest by their closest sentence', () => {
    const many = buildIndex([
      ...examples,
      ...['ยอดขายรวม', 'ขอดูยอดขายเดือนนี้', 'ยอดขายเมื่อวาน', 'ยอดขายทั้งหมด'].map((say) => ({ text: learnable(say), label: 'intent:sales' })),
      { text: learnable('ยอดเยี่ยมมาก'), label: 'intent:promo' },
      { text: learnable('ปิดร้านก่อน'), label: 'control:stop' },
    ])
    const match = classify(many, prepare('ยอดขาย'))
    // All five nearest are sales sentences: the other labels are ranked, but they do not vote, so the margin stays 1.
    expect(match).toMatchObject({ label: 'intent:sales', margin: 1 })
    // ยอดเยี่ยมมาก shares ยอด, so promo leads the labels that share nothing (kept in index order).
    expect(match.ranked).toEqual(['intent:sales', 'intent:promo', 'intent:feedback', 'none', 'control:stop'])
  })
})

describe('levelOf', () => {
  it('is sure only with a high score and a clear lead', () => {
    expect(levelOf({ label: 'intent:sales', score: SURE_SCORE, margin: SURE_MARGIN, ranked: [] })).toBe('sure')
    expect(levelOf({ label: 'intent:sales', score: SURE_SCORE, margin: SURE_MARGIN - 0.01, ranked: [] })).toBe('unsure')
    expect(levelOf({ label: 'intent:sales', score: SURE_SCORE - 0.01, margin: 1, ranked: [] })).toBe('unsure')
    expect(levelOf({ label: 'intent:sales', score: ASK_SCORE, margin: 1, ranked: [] })).toBe('unsure')
    expect(levelOf({ label: 'intent:sales', score: ASK_SCORE - 0.01, margin: 1, ranked: [] })).toBe('lost')
    expect(levelOf({ label: 'none', score: 1, margin: 1, ranked: [] })).toBe('lost')
  })
})
