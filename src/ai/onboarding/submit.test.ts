import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitApplication } from '@/services/merchantApi.write.ts'
import type { OnboardingProfile, ProfileUpdates } from '@/types/domain.ts'
import { applyUpdates, confirmField, createEmptyProfile, PROFILE_FIELDS } from './profile.ts'
import { runSubmissionChecks, SubmissionBlockedError, submitProfile } from './submit.ts'

vi.mock('@/services/merchantApi.write.ts', () => ({
  submitApplication: vi.fn(async () => ({ applicationId: 'APP-TEST', submittedAt: '2026-10-13T06:30:00.000Z' })),
}))

const VALID: ProfileUpdates = {
  storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
  category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
  location: { value: { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }, confidence: 0.62, heardFrom: 'x' },
  hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
  menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
  phone: { value: '0812344217', confidence: 1, heardFrom: 'x' },
}

function confirmedProfile(overrides: ProfileUpdates = {}): OnboardingProfile {
  const heard = applyUpdates(createEmptyProfile(), { ...VALID, ...overrides })
  return PROFILE_FIELDS.reduce((profile, key) => confirmField(profile, key), heard)
}

const check = (profile: OnboardingProfile, id: string) => runSubmissionChecks(profile).find((c) => c.id === id)

beforeEach(() => {
  vi.mocked(submitApplication).mockClear()
})

describe('runSubmissionChecks', () => {
  it('passes every check for a fully confirmed, valid profile', () => {
    expect(runSubmissionChecks(confirmedProfile()).every((c) => c.pass)).toBe(true)
  })

  it('counts unconfirmed fields', () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    const twoLeft = PROFILE_FIELDS.slice(0, 4).reduce((profile, key) => confirmField(profile, key), heardOnly)
    expect(check(twoLeft, 'ALL_CONFIRMED')).toEqual({ id: 'ALL_CONFIRMED', pass: false, message: 'ยังมีข้อมูลที่ต้องยืนยัน 2 ข้อ' })
  })

  it('requires the map pin to be confirmed', () => {
    const pinNotChecked = applyUpdates(createEmptyProfile(), VALID)
    expect(check(pinNotChecked, 'PIN_CONFIRMED')?.pass).toBe(false)
  })

  it('rejects a menu item without a price', () => {
    const free = confirmedProfile({ menu: { value: [{ name: 'น้ำเปล่า', priceTHB: 0 }], confidence: 0.9, heardFrom: 'x' } })
    expect(check(free, 'MENU_VALID')?.pass).toBe(false)
  })

  it('rejects identical open and close times', () => {
    const same = confirmedProfile({ hours: { value: { open: '10:00', close: '10:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' } })
    expect(check(same, 'HOURS_VALID')?.pass).toBe(false)
  })

  it('rejects a phone number that is not 10 digits', () => {
    const short = confirmedProfile({ phone: { value: '12345', confidence: 0.9, heardFrom: 'x' } })
    expect(check(short, 'PHONE_VALID')?.pass).toBe(false)
  })
})

describe('submitProfile', () => {
  it('never calls the API when a check fails', async () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    await expect(submitProfile(heardOnly)).rejects.toBeInstanceOf(SubmissionBlockedError)
    expect(submitApplication).not.toHaveBeenCalled()
  })

  it('reports which checks failed', async () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    const error = await submitProfile(heardOnly).catch((e: unknown) => e)
    expect((error as SubmissionBlockedError).failed.map((c) => c.id)).toEqual(['ALL_CONFIRMED', 'PIN_CONFIRMED'])
  })

  it('submits once every check passes', async () => {
    await expect(submitProfile(confirmedProfile())).resolves.toEqual({ applicationId: 'APP-TEST', submittedAt: '2026-10-13T06:30:00.000Z' })
    expect(submitApplication).toHaveBeenCalledTimes(1)
  })
})
