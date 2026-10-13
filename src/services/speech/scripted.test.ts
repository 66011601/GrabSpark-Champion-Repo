import { afterEach, describe, expect, it, vi } from 'vitest'
import { playScripted } from './scripted.ts'

afterEach(() => {
  vi.useRealTimers()
})

describe('playScripted', () => {
  it('shows the line word by word, then reports it as final', () => {
    vi.useFakeTimers()
    const line = 'สิบโมงเช้าถึงสองทุ่ม'
    const interim: string[] = []
    const onFinal = vi.fn()
    playScripted(line, (partial) => interim.push(partial), onFinal, 1000)
    vi.advanceTimersByTime(1050)
    expect(onFinal).toHaveBeenCalledWith(line)
    expect(interim.length).toBeGreaterThan(1)
    expect(interim.every((partial) => line.startsWith(partial))).toBe(true)
  })

  it('can be cancelled', () => {
    vi.useFakeTimers()
    const onFinal = vi.fn()
    const cancel = playScripted('สิบโมงเช้าถึงสองทุ่ม', () => {}, onFinal, 1000)
    cancel()
    vi.advanceTimersByTime(2000)
    expect(onFinal).not.toHaveBeenCalled()
  })
})
