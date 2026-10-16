import { afterEach, describe, expect, it, vi } from 'vitest'
import { addStretch, otherGuesses, QUIET_AFTER_SPEECH_MS, startListening } from './speechToText.ts'

type ResultLike = { isFinal: boolean; length?: number; [guess: number]: { transcript: string } }

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  interimResults = false
  continuous = false
  maxAlternatives = 1
  onresult: ((event: { resultIndex: number; results: ArrayLike<ResultLike> }) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()

  constructor() {
    FakeRecognition.last = this
  }
}

const handlers = () => ({ onInterim: vi.fn(), onFinal: vi.fn(), onError: vi.fn(), onEnd: vi.fn() })

function listen() {
  vi.stubGlobal('window', { webkitSpeechRecognition: FakeRecognition })
  const h = handlers()
  startListening(h)
  return { h, recognition: FakeRecognition.last! }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startListening', () => {
  it('listens once, in Thai', () => {
    const { recognition } = listen()
    expect(recognition.lang).toBe('th-TH')
    expect(recognition.start).toHaveBeenCalledTimes(1)
  })

  it('reports the final transcript, then ends', () => {
    const { h, recognition } = listen()
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: ' สิบโมงเช้า ' } }] })
    recognition.onend?.()
    expect(h.onFinal).toHaveBeenCalledWith('สิบโมงเช้า', [])
    expect(h.onError).not.toHaveBeenCalled()
    expect(h.onEnd).toHaveBeenCalledTimes(1)
  })

  it('keeps listening through a pause', () => {
    const { recognition } = listen()
    expect(recognition.continuous).toBe(true)
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'ร้านชื่อครัวป้าแดง' } }] })
    expect(recognition.stop).not.toHaveBeenCalled()
    recognition.onend?.()
  })

  it('closes the turn when the merchant says "จ้า", without waiting for a pause', () => {
    const { h, recognition } = listen()
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'ร้านชื่อครัวป้าแดงจ้า' } }] })
    expect(recognition.stop).toHaveBeenCalledTimes(1)
    // Whatever the recogniser adds while it shuts down is ignored.
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'ร้านชื่อครัวป้าแดงจ้า แล้วก็' } }] })
    recognition.onend?.()
    expect(h.onFinal).toHaveBeenCalledWith('ร้านชื่อครัวป้าแดง', [])
  })

  it('closes the turn for a merchant who goes quiet', () => {
    vi.useFakeTimers()
    const { h, recognition } = listen()
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'สิบโมงเช้า' } }] })
    vi.advanceTimersByTime(QUIET_AFTER_SPEECH_MS - 1)
    expect(recognition.stop).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(recognition.stop).toHaveBeenCalledTimes(1)
    recognition.onend?.()
    expect(h.onFinal).toHaveBeenCalledWith('สิบโมงเช้า', [])
    vi.useRealTimers()
  })

  it('reports no-speech when it ends without hearing anything', () => {
    const { h, recognition } = listen()
    recognition.onend?.()
    expect(h.onError).toHaveBeenCalledWith('no-speech')
    expect(h.onFinal).not.toHaveBeenCalled()
    expect(h.onEnd).toHaveBeenCalledTimes(1)
  })

  it('does not add no-speech after a real error', () => {
    const { h, recognition } = listen()
    recognition.onerror?.({ error: 'not-allowed' })
    recognition.onend?.()
    expect(h.onError).toHaveBeenCalledTimes(1)
    expect(h.onError).toHaveBeenCalledWith('not-allowed')
  })

  it('passes on the recogniser\'s other guesses', () => {
    const { h, recognition } = listen()
    expect(recognition.maxAlternatives).toBe(3)
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, length: 3, 0: { transcript: 'เห็ดจั่งได๋' }, 1: { transcript: 'เฮ็ดจั่งใด๋' }, 2: { transcript: 'เห็ดจั่งได๋' } }] })
    recognition.onend?.()
    expect(h.onFinal).toHaveBeenCalledWith('เห็ดจั่งได๋', ['เฮ็ดจั่งใด๋'])
  })

  it('ends the other guesses with the words still unsettled when "จ้า" closed the turn', () => {
    const { h, recognition } = listen()
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, length: 2, 0: { transcript: 'ร้านชื่อ' }, 1: { transcript: 'ร้านชือ' } }] })
    recognition.onresult?.({ resultIndex: 1, results: [{ isFinal: true, 0: { transcript: 'ร้านชื่อ' } }, { isFinal: false, 0: { transcript: 'ครัวป้าแดงจ้า' } }] })
    recognition.onend?.()
    expect(h.onFinal).toHaveBeenCalledWith('ร้านชื่อครัวป้าแดง', ['ร้านชือครัวป้าแดง'])
  })

  it('hears a stretch Android sends twice only once', () => {
    const { h, recognition } = listen()
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'ถัดไป' } }] })
    recognition.onresult?.({ resultIndex: 1, results: [{ isFinal: true, 0: { transcript: 'ถัดไป' } }, { isFinal: true, 0: { transcript: 'ถัดไป' } }] })
    recognition.onend?.()
    expect(h.onFinal).toHaveBeenCalledWith('ถัดไป', [])
  })

  it('reports unsupported browsers', () => {
    vi.stubGlobal('window', {})
    const h = handlers()
    startListening(h)
    expect(h.onError).toHaveBeenCalledWith('unsupported')
    expect(h.onEnd).toHaveBeenCalledTimes(1)
  })
})

describe('stretches of speech', () => {
  it('drops a repeat and lets a stretch that repeats all before it replace them', () => {
    expect(addStretch([['ร้านชื่อ']], ['ร้านชื่อ'])).toEqual([['ร้านชื่อ']])
    expect(addStretch([['ร้านชื่อ']], ['ร้านชื่อ ครัวป้าแดง'])).toEqual([['ร้านชื่อ ครัวป้าแดง']])
    expect(addStretch([['ร้านชื่อ']], ['ครัวป้าแดง'])).toEqual([['ร้านชื่อ'], ['ครัวป้าแดง']])
    expect(addStretch([['ร้านชื่อ']], [])).toEqual([['ร้านชื่อ']])
  })

  it('builds other whole sentences, one stretch changed at a time, two at most', () => {
    expect(otherGuesses([['ขอ'], ['เบิ้งยอดขาย', 'เบิ่งยอดขาย']])).toEqual(['ขอเบิ่งยอดขาย'])
    expect(otherGuesses([['ก', 'ข', 'ค'], ['ง', 'จ']])).toEqual(['ขง', 'คง'])
    expect(otherGuesses([['ถัดไป']])).toEqual([])
  })
})
