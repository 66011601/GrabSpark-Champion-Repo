import { describe, expect, it } from 'vitest'
import { applyUpdates, confirmField, createEmptyProfile } from './profile.ts'
import { confirmStep, STEP_FIELDS, stepStatus } from './steps.ts'

const PIN = { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }
const OWNER = { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121', birthDate: '1970-01-01', idExpiry: '2031-01-01' }
const PAYOUT = { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี', bookPhoto: 'sample' }
const sure = <T,>(value: T) => ({ value, confidence: 1, heardFrom: 'x' })

const step3 = applyUpdates(createEmptyProfile(), {
  storeName: { value: 'ครัวป้าแดง', confidence: 1, heardFrom: 'x' },
  building: { value: 'ลาดพร้าว 71', confidence: 1, heardFrom: 'x' },
  location: { value: PIN, confidence: 0.9, heardFrom: 'x' },
  address: { value: 'ลาดพร้าว 71 กรุงเทพฯ', confidence: 1, heardFrom: 'x' },
  category: { value: 'อาหารไทย', confidence: 1, heardFrom: 'x' },
})

describe('STEP_FIELDS', () => {
  it('follows the GrabMerchant form', () => {
    expect(STEP_FIELDS).toEqual({
      3: ['storeName', 'building', 'location', 'address', 'category'],
      4: ['businessType', 'phone', 'contactEmail'],
      5: ['owner'],
      6: ['payout'],
    })
  })
})

describe('stepStatus', () => {
  it('lists every missing field', () => {
    expect(stepStatus(createEmptyProfile(), 4)).toEqual({
      valid: false,
      issues: [
        { field: 'businessType', problem: 'missing' },
        { field: 'phone', problem: 'missing' },
        { field: 'contactEmail', problem: 'missing' },
      ],
    })
  })

  it('needs the map pin confirmed on 3/7', () => {
    expect(stepStatus(step3, 3).issues).toEqual([{ field: 'location', problem: 'pinNotConfirmed' }])
    expect(stepStatus(confirmField(step3, 'location'), 3)).toEqual({ valid: true, issues: [] })
  })

  it('flags an unsure value until the merchant checks it', () => {
    const unsure = applyUpdates(confirmField(step3, 'location'), { category: { value: 'อาหารไทย', confidence: 0.6, heardFrom: 'x' } })
    expect(stepStatus(unsure, 3).issues).toEqual([{ field: 'category', problem: 'unchecked' }])
  })

  it('treats a half-typed owner as missing and a wrong ID number as invalid', () => {
    const half = applyUpdates(createEmptyProfile(), { owner: sure({ ...OWNER, birthDate: '' }) })
    expect(stepStatus(half, 5).issues).toEqual([{ field: 'owner', problem: 'missing' }])
    const typo = applyUpdates(createEmptyProfile(), { owner: sure({ ...OWNER, idNumber: '1234567890122' }) })
    expect(stepStatus(typo, 5).issues).toEqual([{ field: 'owner', problem: 'idInvalid' }])
    expect(stepStatus(applyUpdates(createEmptyProfile(), { owner: sure(OWNER) }), 5).valid).toBe(true)
  })

  it('needs the bank book photo and an account in the owner’s name on 6/7', () => {
    const withOwner = applyUpdates(createEmptyProfile(), { owner: sure(OWNER) })
    const noPhoto = applyUpdates(withOwner, { payout: sure({ ...PAYOUT, bookPhoto: null }) })
    expect(stepStatus(noPhoto, 6).issues).toEqual([{ field: 'payout', problem: 'noBookPhoto' }])
    const otherName = applyUpdates(withOwner, { payout: sure({ ...PAYOUT, accountName: 'นาย สมชาย ขายดี' }) })
    expect(stepStatus(otherName, 6).issues).toEqual([{ field: 'payout', problem: 'nameMismatch' }])
    expect(stepStatus(applyUpdates(withOwner, { payout: sure(PAYOUT) }), 6).valid).toBe(true)
  })
})

describe('confirmStep', () => {
  it('confirms that step’s fields only', () => {
    const both = applyUpdates(step3, { businessType: { value: 'personal', confidence: 1, heardFrom: 'x' } })
    const confirmed = confirmStep(confirmField(both, 'location'), 3)
    expect(STEP_FIELDS[3].map((key) => confirmed.fields[key].status)).toEqual(Array(5).fill('confirmed'))
    expect(confirmed.fields.businessType.status).toBe('heard')
  })
})
