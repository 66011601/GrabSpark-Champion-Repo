import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveStoreSetup, submitApplication } from '@/services/merchantApi.write.ts'
import type { OnboardingProfile, ProfileUpdates } from '@/types/domain.ts'
import { applyUpdates, confirmField, createEmptyProfile, SUBMIT_FIELDS } from './profile.ts'
import { runSetupChecks, runSubmissionChecks, saveSetup, SubmissionBlockedError, submitProfile, type SubmitContext } from './submit.ts'

vi.mock('@/services/merchantApi.write.ts', () => ({
  submitApplication: vi.fn(async () => ({ applicationId: 'APP-TEST', submittedAt: '2026-10-14T06:30:00.000Z' })),
  saveStoreSetup: vi.fn(async (part: string) => ({ part, savedAt: '2026-10-14T06:40:00.000Z' })),
}))

const OWNER = { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121', birthDate: '1970-01-01', idExpiry: '2031-01-01' }
const PAYOUT = { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี', bookPhoto: 'sample' }
const sure = <T,>(value: T) => ({ value, confidence: 1, heardFrom: 'x' })

const VALID: ProfileUpdates = {
  storeName: sure('ครัวป้าแดง'),
  building: sure('ลาดพร้าว 71'),
  location: sure({ text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }),
  address: sure('ลาดพร้าว 71 กรุงเทพฯ'),
  category: sure('อาหารไทย'),
  businessType: sure('personal' as const),
  phone: sure('0812344217'),
  contactEmail: sure('padaeng@example.com'),
  owner: sure(OWNER),
  payout: sure(PAYOUT),
}
const CTX: SubmitContext = { phoneVerified: true, consents: { terms: true, accurate: true }, today: '2026-10-14' }

function confirmedProfile(overrides: ProfileUpdates = {}): OnboardingProfile {
  const heard = applyUpdates(createEmptyProfile(), { ...VALID, ...overrides })
  return SUBMIT_FIELDS.reduce((profile, key) => confirmField(profile, key), heard)
}
const check = (profile: OnboardingProfile, id: string, ctx = CTX) => runSubmissionChecks(profile, ctx).find((c) => c.id === id)

beforeEach(() => {
  vi.mocked(submitApplication).mockClear()
  vi.mocked(saveStoreSetup).mockClear()
})

describe('runSubmissionChecks', () => {
  it('passes every check for a confirmed, valid application', () => {
    expect(runSubmissionChecks(confirmedProfile(), CTX).every((c) => c.pass)).toBe(true)
  })

  it('lists the checks in a fixed order', () => {
    expect(runSubmissionChecks(confirmedProfile(), CTX).map((c) => c.id)).toEqual([
      'ALL_CONFIRMED', 'PIN_CONFIRMED', 'PHONE_VALID', 'PHONE_VERIFIED', 'EMAIL_VALID', 'ID_VALID', 'ID_NOT_EXPIRED', 'PAYOUT_NAME_MATCH', 'BOOK_PHOTO_ATTACHED', 'CONSENTS_GIVEN',
    ])
  })

  it('counts unconfirmed sign-up fields, ignoring menu and hours', () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    expect(check(heardOnly, 'ALL_CONFIRMED')?.message).toBe('ยังมีข้อมูลที่ต้องยืนยัน 10 ข้อ')
    expect(check(confirmedProfile(), 'ALL_CONFIRMED')?.pass).toBe(true)
  })

  it('needs the OTP, both consents and a card that has not expired', () => {
    expect(check(confirmedProfile(), 'PHONE_VERIFIED', { ...CTX, phoneVerified: false })?.pass).toBe(false)
    expect(check(confirmedProfile(), 'CONSENTS_GIVEN', { ...CTX, consents: { terms: true, accurate: false } })?.pass).toBe(false)
    expect(check(confirmedProfile({ owner: sure({ ...OWNER, idExpiry: '2026-10-13' }) }), 'ID_NOT_EXPIRED')?.pass).toBe(false)
  })

  it('rejects a bad ID, another person’s account, a missing bank book photo and a bad email', () => {
    expect(check(confirmedProfile({ owner: sure({ ...OWNER, idNumber: '1234567890122' }) }), 'ID_VALID')?.pass).toBe(false)
    expect(check(confirmedProfile({ payout: sure({ ...PAYOUT, accountName: 'นาย สมชาย ขายดี' }) }), 'PAYOUT_NAME_MATCH')?.pass).toBe(false)
    expect(check(confirmedProfile({ payout: sure({ ...PAYOUT, bookPhoto: null }) }), 'BOOK_PHOTO_ATTACHED')?.pass).toBe(false)
    expect(check(confirmedProfile({ contactEmail: sure('padaeng') }), 'EMAIL_VALID')?.pass).toBe(false)
  })
})

describe('submitProfile', () => {
  it('never calls the API when a check fails, and says which', async () => {
    const error = await submitProfile(confirmedProfile(), { ...CTX, consents: { terms: false, accurate: false } }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SubmissionBlockedError)
    expect((error as SubmissionBlockedError).failed.map((c) => c.id)).toEqual(['CONSENTS_GIVEN'])
    expect(submitApplication).not.toHaveBeenCalled()
  })

  it('submits once every check passes', async () => {
    await expect(submitProfile(confirmedProfile(), CTX)).resolves.toMatchObject({ applicationId: 'APP-TEST' })
    expect(submitApplication).toHaveBeenCalledTimes(1)
  })
})

describe('shop set-up', () => {
  const menu = (items: { name: string; priceTHB: number }[], confidence = 1) => applyUpdates(createEmptyProfile(), { menu: { value: items, confidence, heardFrom: 'x' } })

  it('checks the menu: at least one dish, every price above zero, nothing left amber', () => {
    expect(runSetupChecks('menu', menu([{ name: 'ชาไทยเย็น', priceTHB: 35 }]))[0]).toEqual({ id: 'MENU_VALID', pass: true, message: 'เมนูมีราคาครบ' })
    expect(runSetupChecks('menu', menu([{ name: 'น้ำเปล่า', priceTHB: 0 }]))[0].pass).toBe(false)
    expect(runSetupChecks('menu', menu([{ name: 'ชาไทยเย็น', priceTHB: 35 }], 0.6))[0].message).toBe('ช่วยเช็คเมนูที่ขึ้นสีส้มก่อนนะคะ')
    expect(runSetupChecks('menu', createEmptyProfile())[0].pass).toBe(false)
  })

  it('checks the hours: open and close must differ', () => {
    const hours = (open: string, close: string) => applyUpdates(createEmptyProfile(), { hours: sure({ open, close, closedDays: [] }) })
    expect(runSetupChecks('hours', hours('10:00', '20:00'))[0].pass).toBe(true)
    expect(runSetupChecks('hours', hours('10:00', '10:00'))[0].pass).toBe(false)
  })

  it('saves only after its check passes', async () => {
    await expect(saveSetup('menu', createEmptyProfile())).rejects.toBeInstanceOf(SubmissionBlockedError)
    expect(saveStoreSetup).not.toHaveBeenCalled()
    await expect(saveSetup('menu', menu([{ name: 'ชาไทยเย็น', priceTHB: 35 }]))).resolves.toMatchObject({ part: 'menu' })
    expect(saveStoreSetup).toHaveBeenCalledTimes(1)
  })
})
