import { describe, expect, it } from 'vitest'
import { createTurnGuard } from './turnGuard.ts'

describe('createTurnGuard', () => {
  it('counts the latest turn as current while mounted', () => {
    const guard = createTurnGuard()
    expect(guard.begin()()).toBe(true)
  })

  it('makes an older turn stale once a newer one begins', () => {
    const guard = createTurnGuard()
    const first = guard.begin()
    const second = guard.begin()
    expect(first()).toBe(false)
    expect(second()).toBe(true)
  })

  it('makes every turn stale after unmount, even one that began before', () => {
    const guard = createTurnGuard()
    const turn = guard.begin()
    guard.unmount()
    expect(turn()).toBe(false)
    expect(guard.mounted()).toBe(false)
  })

  it('counts turns again after a remount (strict-mode effect replay)', () => {
    const guard = createTurnGuard()
    guard.unmount()
    guard.mount()
    expect(guard.mounted()).toBe(true)
    expect(guard.begin()()).toBe(true)
  })
})
