import { describe, expect, it } from 'vitest'
import { understandThai } from '@/ai/language/understand.ts'
import { matchOn } from './load.ts'

describe('matchOn', () => {
  it('reads a sales question on the dashboard', async () => {
    const match = await matchOn('ACT2', understandThai('อยากรู้ว่าวันนี้ขายได้เท่าไหร่').text)
    expect(match.label).toBe('intent:sales')
  })

  it('builds a screen index quickly the first time, and reuses it after', async () => {
    const started = performance.now()
    await matchOn('S3', 'ร้านชื่ออะไร')
    expect(performance.now() - started).toBeLessThan(500)
    const again = performance.now()
    await matchOn('S3', 'ร้านชื่ออะไร')
    expect(performance.now() - again).toBeLessThan(50)
  })
})
