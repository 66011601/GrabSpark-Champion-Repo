import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRainPromo } from '@/ai/navigator/drafts.ts'
import { demoFlags } from '@/services/demoFlags.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { ActionBlockedError, confirmDraft } from './confirmAndExecute.ts'

const shop = getMerchant()

describe('confirmDraft', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    demoFlags.simulateApiFailure = false
  })

  it('sends a draft that passes every check', async () => {
    const sent = confirmDraft(buildRainPromo(shop), shop)
    await vi.advanceTimersByTimeAsync(1000)
    expect((await sent).id).toBe('PROMO-M01-D01')
  })

  it('never sends a draft that fails a check', async () => {
    await expect(confirmDraft({ kind: 'soldOut', itemId: 'M04', until: null }, shop)).rejects.toBeInstanceOf(ActionBlockedError)
  })

  it('reports a failed API call', async () => {
    demoFlags.simulateApiFailure = true
    const sent = confirmDraft({ kind: 'soldOut', itemId: 'M04', until: 'today' }, shop)
    const caught = sent.catch((error: Error) => error.name)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await caught).toBe('ApiUnavailableError')
  })
})
