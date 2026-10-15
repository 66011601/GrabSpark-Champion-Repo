import { describe, expect, it } from 'vitest'
import { FAQ_BANK } from './bank/faq.ts'
import { BLOCKED, FAQ_LABELS, faqAnswer, SCREEN_LABELS } from './labels.ts'
import { labelName } from './labelNames.ts'

describe('FAQ (D2)', () => {
  it('answers every FAQ label with a fixed line and names it for the ask-back', () => {
    for (const label of FAQ_LABELS) {
      expect(faqAnswer(label), label).toMatch(/ค่ะ|คะ/)
      expect(labelName(label), label).not.toBe(label)
      expect(BLOCKED.has(label)).toBe(false)
    }
    expect(faqAnswer('next')).toBeNull()
  })

  it('is asked on every screen', () => {
    for (const labels of Object.values(SCREEN_LABELS)) expect(labels).toEqual(expect.arrayContaining(FAQ_LABELS))
  })

  it('has bank sentences for every FAQ label and nothing else', () => {
    expect(new Set(FAQ_BANK.map((entry) => entry.label))).toEqual(new Set(FAQ_LABELS))
  })
})
