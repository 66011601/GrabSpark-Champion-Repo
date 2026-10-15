import { describe, expect, it, vi } from 'vitest'
import { ASK_SCORE, SURE_MARGIN, SURE_SCORE, type Match } from '@/ai/understanding/matcher.ts'
import { th } from '@/copy/th.ts'
import { answerOf, answerPending, decide, takeTurn, type TurnParts } from './understandingStep.ts'

const match = (label: string, score: number, margin: number, ranked = [label, 'back', 'next']): Match => ({ label, score, margin, ranked })

describe('decide', () => {
  it('acts when sure', () => {
    expect(decide(match('next', SURE_SCORE, SURE_MARGIN))).toEqual({ kind: 'act', label: 'next' })
  })

  it('never acts on a blocked label, however sure', () => {
    expect(decide(match('submit', 1, 1))).toEqual({ kind: 'blocked', label: 'submit' })
    expect(decide(match('act2:confirm', ASK_SCORE, 0))).toEqual({ kind: 'blocked', label: 'act2:confirm' })
  })

  it('is lost, not blocked, when a blocked guess is weak', () => {
    expect(decide(match('consentTick', ASK_SCORE - 0.01, 1, ['consentTick', 'back']))).toEqual({ kind: 'lost', options: ['back'] })
  })

  it('asks back when unsure, keeping the next two as the fallback', () => {
    expect(decide(match('pin', SURE_SCORE - 0.01, 0.1, ['pin', 'here', 'none', 'back']))).toEqual({ kind: 'ask', label: 'pin', rest: ['here', 'back'] })
  })

  it('keeps two labels for "ไม่ใช่" even when every voter agreed (ranked holds every label)', () => {
    expect(decide(match('pin', SURE_SCORE - 0.01, 1, ['pin', 'none', 'here', 'back', 'next']))).toEqual({ kind: 'ask', label: 'pin', rest: ['here', 'back'] })
    expect(decide(match('register', SURE_SCORE - 0.01, 1, ['register', 'login', 'none']))).toEqual({ kind: 'ask', label: 'register', rest: ['login'] })
  })

  it('offers the two best real labels when lost', () => {
    expect(decide(match('none', 0.9, 0.9, ['none', 'here', 'pin']))).toEqual({ kind: 'lost', options: ['here', 'pin'] })
    expect(decide({ label: 'none', score: 0, margin: 0, ranked: [] })).toEqual({ kind: 'lost', options: [] })
  })

  it('keeps blocked labels off the buttons', () => {
    expect(decide(match('none', 0.9, 0.9, ['none', 'submit', 'back']))).toEqual({ kind: 'lost', options: ['back'] })
  })
})

describe('answerOf', () => {
  it('hears yes and no, central and regional (already through the language layer)', () => {
    for (const said of ['ใช่', 'ใช่ค่ะ', 'ได้', 'โอเค', 'ถูกแล้ว']) expect(answerOf(said), said).toBe('yes')
    for (const said of ['ไม่ใช่', 'ไม่', 'ไม่ใช่ค่ะ', 'ผิด']) expect(answerOf(said), said).toBe('no')
    expect(answerOf('ขอดูยอดขาย')).toBeNull()
  })

  it('hears a polite particle or a grunt said on its own as yes', () => {
    for (const said of ['ค่ะ', 'ครับ', 'เจ้าค่ะ', 'อือ ค่ะ', 'จ้า', 'คับ', 'ฮะ', 'อื้อ', 'เออ', 'ค่ะ ค่ะ', 'จ้ะจ้ะ']) expect(answerOf(said), said).toBe('yes')
    expect(answerOf('ไม่ใช่ค่ะ')).toBe('no')
    expect(answerOf('ค่ะ ร้านชื่อป้าแดง')).toBeNull()
    expect(answerOf('')).toBeNull()
  })
})

const heard = (text: string) => ({ text, onlyRude: false })
const parts = (over: Partial<TurnParts> = {}): TurnParts => ({
  heard: heard('อะไรสักอย่าง'),
  pending: null,
  screen: 'S4',
  rules: vi.fn(() => false as const),
  perform: vi.fn(async (label: string) => `did ${label}`),
  matchOn: vi.fn(async () => match('next', SURE_SCORE, SURE_MARGIN)),
  isCurrent: () => true,
  ...over,
})

describe('answerPending', () => {
  it('performs the asked label on yes', async () => {
    const perform = vi.fn(async () => true as const)
    expect(await answerPending({ label: 'pin', rest: ['here'] }, 'yes', perform)).toEqual({ reply: true, pending: null, offers: [] })
    expect(perform).toHaveBeenCalledWith('pin')
  })

  it('apologises and offers the rest on no', async () => {
    const perform = vi.fn()
    expect(await answerPending({ label: 'pin', rest: ['here', 'back'] }, 'no', perform)).toEqual({
      reply: th.understanding.declined,
      pending: null,
      offers: ['here', 'back'],
    })
    expect(perform).not.toHaveBeenCalled()
  })

  it('only apologises on no when there is nothing else to offer: no line pointing at missing buttons', async () => {
    const perform = vi.fn()
    expect(await answerPending({ label: 'pin', rest: [] }, 'no', perform)).toEqual({ reply: th.understanding.declinedRetry, pending: null, offers: [] })
    expect(th.understanding.declinedRetry).not.toContain('ปุ่ม')
  })
})

describe('takeTurn', () => {
  it('lets the rules answer first, and never wakes the matcher', async () => {
    const p = parts({ rules: vi.fn(() => true as const) })
    expect(await takeTurn(p)).toEqual({ reply: true, pending: null, offers: [] })
    expect(p.matchOn).not.toHaveBeenCalled()
  })

  it('does nothing extra on a screen without understanding', async () => {
    const p = parts({ screen: null })
    expect(await takeTurn(p)).toEqual({ reply: false, pending: null, offers: [] })
    expect(p.matchOn).not.toHaveBeenCalled()
  })

  it('does not ask the matcher about an empty or swear-only sentence', async () => {
    const p = parts({ heard: heard('') })
    expect((await takeTurn(p)).reply).toBe(false)
    const rude = parts({ heard: { text: '', onlyRude: true } })
    expect((await takeTurn(rude)).reply).toBe(th.language.calm)
    expect(p.matchOn).not.toHaveBeenCalled()
    expect(rude.matchOn).not.toHaveBeenCalled()
  })

  it('acts on a sure guess', async () => {
    const p = parts()
    expect(await takeTurn(p)).toEqual({ reply: 'did next', pending: null, offers: [] })
    expect(p.matchOn).toHaveBeenCalledWith('S4', 'อะไรสักอย่าง')
  })

  it('gives the tap-only line for a blocked guess without performing it', async () => {
    const p = parts({ matchOn: vi.fn(async () => match('submit', 1, 1)) })
    expect(await takeTurn(p)).toEqual({ reply: th.s7.mustTap, pending: null, offers: [] })
    expect(p.perform).not.toHaveBeenCalled()
  })

  it('asks back when unsure and remembers the question', async () => {
    const p = parts({ matchOn: vi.fn(async () => match('pin', SURE_SCORE - 0.01, 0.1, ['pin', 'here', 'back'])) })
    const turn = await takeTurn(p)
    expect(turn.reply).toBe(th.understanding.ask('ปักหมุดบนแผนที่'))
    expect(turn.pending).toEqual({ label: 'pin', rest: ['here', 'back'] })
    expect(p.perform).not.toHaveBeenCalled()
  })

  it('offers buttons when lost, or the usual not-understood when there are none', async () => {
    const lost = parts({ matchOn: vi.fn(async () => match('none', 0.9, 0.9, ['none', 'here', 'pin'])) })
    expect(await takeTurn(lost)).toEqual({ reply: th.understanding.unsure, pending: null, offers: ['here', 'pin'] })
    const nothing = parts({ matchOn: vi.fn(async () => ({ label: 'none', score: 0, margin: 0, ranked: [] })) })
    expect(await takeTurn(nothing)).toEqual({ reply: false, pending: null, offers: [] })
  })

  it('treats a failing matcher as no step', async () => {
    const p = parts({ matchOn: vi.fn(() => Promise.reject(new Error('import failed'))) })
    expect(await takeTurn(p)).toEqual({ reply: false, pending: null, offers: [] })
  })

  it('drops a guess when a newer turn began while the matcher worked', async () => {
    let current = true
    const p = parts({
      isCurrent: () => current,
      matchOn: vi.fn(async () => {
        current = false
        return match('next', 1, 1)
      }),
    })
    expect((await takeTurn(p)).reply).toBe(false)
    expect(p.perform).not.toHaveBeenCalled()
  })

  describe('with a question waiting', () => {
    const waiting = { label: 'pin', rest: ['here'] }

    it('performs the label on yes, without asking the rules', async () => {
      const p = parts({ pending: waiting, heard: heard('ใช่') })
      expect(await takeTurn(p)).toEqual({ reply: 'did pin', pending: null, offers: [] })
      expect(p.rules).not.toHaveBeenCalled()
    })

    it('performs the label on a lone polite particle', async () => {
      const p = parts({ pending: waiting, heard: heard('ค่ะ') })
      expect(await takeTurn(p)).toEqual({ reply: 'did pin', pending: null, offers: [] })
    })

    it('declines on no and offers the rest', async () => {
      const p = parts({ pending: waiting, heard: heard('ไม่ใช่') })
      expect(await takeTurn(p)).toEqual({ reply: th.understanding.declined, pending: null, offers: ['here'] })
    })

    it('treats anything else as a fresh sentence, and the old question is gone', async () => {
      const p = parts({ pending: waiting, heard: heard('ขอดูยอดขาย'), rules: vi.fn(() => true as const) })
      expect(await takeTurn(p)).toEqual({ reply: true, pending: null, offers: [] })
      expect(p.rules).toHaveBeenCalledWith('ขอดูยอดขาย')
    })
  })
})
