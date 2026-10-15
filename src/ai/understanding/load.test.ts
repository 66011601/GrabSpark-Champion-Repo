import { describe, expect, it, vi } from 'vitest'
import { understandThai } from '@/ai/language/understand.ts'
import type { ScreenId } from './bank/types.ts'
import { matchOn } from './load.ts'

/**
 * How long matchOn takes when the screen's index is not built yet. Fresh copies of load.ts and the bank are loaded
 * first (in the browser that is the lazy chunk's download, not index work), so nothing is cached. This file runs after
 * the other test files (TIMED in vite.config.ts); the best of five cold builds is kept, so a garbage collection or a
 * busy moment on the machine fails no build, while code that is slow every time still does.
 */
async function coldBuild(screen: ScreenId): Promise<number> {
  let best = Infinity
  for (let round = 0; round < 5; round += 1) {
    vi.resetModules()
    await import('./bank/index.ts')
    const fresh = await import('./load.ts')
    const started = performance.now()
    await fresh.matchOn(screen, 'ร้านชื่ออะไร')
    best = Math.min(best, performance.now() - started)
  }
  return best
}

describe('matchOn', () => {
  it('reads a sales question on the dashboard', async () => {
    const match = await matchOn('ACT2', understandThai('อยากรู้ว่าวันนี้ขายได้เท่าไหร่').text)
    expect(match.label).toBe('intent:sales')
  })

  // Spec D1 §8: a screen's index is built on the merchant's first sentence the rules did not understand.
  it('builds the dashboard and 3/7 indexes in under 100 ms each', async () => {
    for (const screen of ['ACT2', 'S3'] as const) expect(await coldBuild(screen), screen).toBeLessThan(100)
  })

  it('reuses a built index', async () => {
    await matchOn('S3', 'ร้านชื่ออะไร')
    const started = performance.now()
    await matchOn('S3', 'ร้านชื่ออะไร')
    expect(performance.now() - started).toBeLessThan(50)
  })
})
