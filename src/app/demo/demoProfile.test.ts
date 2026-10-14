import { describe, expect, it } from 'vitest'
import { ALL_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoProfile } from './demoProfile.ts'

describe('demoProfile', () => {
  // The presenter's "ข้อมูลตัวอย่าง": the demo script, the account and both sample documents.
  const profile = demoProfile()

  it('hears every field, confirming none', () => {
    expect(ALL_FIELDS.map((key) => profile.fields[key].status)).toEqual(Array(ALL_FIELDS.length).fill('heard'))
  })

  it('matches the story told in the demo', () => {
    const { fields } = profile
    expect(fields.storeName.value).toBe('ครัวป้าแดง')
    expect(fields.location.value?.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
    expect(fields.businessType.value).toBe('personal')
    expect(fields.phone.value).toBe('0812344217')
    expect(fields.contactEmail.value).toBe('padaeng@example.com')
    expect(fields.owner.value?.name).toBe('แดง ใจดี')
    expect(fields.payout.value?.bookPhoto).toBe('sample')
    expect(fields.hours.value).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
    expect(fields.menu.value?.map((item) => item.priceTHB)).toEqual([89, 65, 75, 35, 30])
  })
})
