import { describe, expect, it, vi } from 'vitest'
import type { MicState } from './companionState.ts'
import { createSessionGate, runTap, type TapParts } from './tapTurn.ts'
import { createTurnGuard } from './turnGuard.ts'
import type { Turn } from './understandingStep.ts'

const turn: Turn = { reply: 'did pin', pending: null, offers: [] }

/** A fake hook: the mic state lives here, and every call is recorded in order. */
function hook(mic: MicState) {
  const calls: string[] = []
  let now = mic
  const parts: TapParts = {
    guard: createTurnGuard(),
    mic: () => now,
    cancelPending: () => calls.push('cancelPending'),
    closeMic: () => calls.push('closeMic'),
    setMic: (next) => {
      now = next
      calls.push(`mic:${next}`)
    },
    clearChoices: () => calls.push('clearChoices'),
    show: () => calls.push('show'),
  }
  return { parts, calls, mic: () => now }
}

describe('runTap', () => {
  it('frees the mic a spoken turn left thinking', async () => {
    const { parts, calls, mic } = hook('processing')
    const spoken = parts.guard.begin() // the voice turn that was thinking when the button was tapped
    await runTap(parts, async () => turn)
    expect(mic()).toBe('idle')
    expect(spoken()).toBe(false) // its late answer is dropped
    expect(calls).toEqual(['cancelPending', 'clearChoices', 'mic:idle', 'show'])
  })

  it('closes a mic that reopened after an ask-back before the tap is answered', async () => {
    const { parts, calls, mic } = hook('listening')
    await runTap(parts, async () => turn)
    expect(mic()).toBe('idle')
    expect(calls).toEqual(['cancelPending', 'closeMic', 'clearChoices', 'mic:idle', 'show'])
  })

  it('leaves an idle mic and a mic error alone', async () => {
    for (const state of ['idle', 'error'] as const) {
      const { parts, calls, mic } = hook(state)
      await runTap(parts, async () => turn)
      expect(mic()).toBe(state)
      expect(calls).toEqual(['cancelPending', 'clearChoices', 'show'])
    }
  })

  it('shows nothing when a newer turn began while the tap worked', async () => {
    const { parts, calls } = hook('idle')
    await runTap(parts, async () => {
      parts.guard.begin()
      return turn
    })
    expect(calls).not.toContain('show')
  })

  it('does nothing once the screen is gone', async () => {
    const { parts, calls } = hook('processing')
    parts.guard.unmount()
    const work = vi.fn(async () => turn)
    await runTap(parts, work)
    expect(work).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })
})

describe('createSessionGate', () => {
  it('ignores a closed session, so its late final words never start a turn', () => {
    const gate = createSessionGate()
    const live = gate.open()
    expect(live()).toBe(true)
    gate.close()
    expect(live()).toBe(false)
  })

  it('hears only the newest session', () => {
    const gate = createSessionGate()
    const first = gate.open()
    const second = gate.open()
    expect(first()).toBe(false)
    expect(second()).toBe(true)
  })
})
