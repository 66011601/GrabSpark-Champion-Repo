import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { demoFlags } from './demoFlags.ts'
import { ApiUnavailableError, saveStoreSetup, submitApplication } from './merchantApi.write.ts'

afterEach(() => {
  vi.useRealTimers()
  demoFlags.simulateApiFailure = false
})

describe('submitApplication (mock)', () => {
  it('resolves with a receipt after the simulated delay', async () => {
    vi.useFakeTimers()
    const result = submitApplication(createEmptyProfile('onb_test'))
    await vi.advanceTimersByTimeAsync(800)
    await expect(result).resolves.toMatchObject({ applicationId: 'APP-ONB_TEST' })
  })

  it('fails when the presenter simulates an outage', async () => {
    vi.useFakeTimers()
    demoFlags.simulateApiFailure = true
    const assertion = expect(submitApplication(createEmptyProfile())).rejects.toBeInstanceOf(ApiUnavailableError)
    await vi.advanceTimersByTimeAsync(800)
    await assertion
  })
})

describe('saveStoreSetup (mock)', () => {
  it('resolves with what was saved after the simulated delay', async () => {
    vi.useFakeTimers()
    const result = saveStoreSetup('hours', createEmptyProfile())
    await vi.advanceTimersByTimeAsync(800)
    await expect(result).resolves.toMatchObject({ part: 'hours' })
  })
})
