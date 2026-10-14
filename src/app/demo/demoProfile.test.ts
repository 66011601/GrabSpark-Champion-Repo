import { describe, expect, it } from 'vitest'
import { ALL_FIELDS, SETUP_FIELDS, SUBMIT_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoProfile, submittedDemoProfile } from './demoProfile.ts'

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

describe('submittedDemoProfile', () => {
  // What the real flow produces at 7/7, so ส่งใบสมัคร can submit on stage.
  const profile = submittedDemoProfile()

  it('confirms every field the application is sent with, including the pin', () => {
    expect(SUBMIT_FIELDS.map((key) => profile.fields[key].status)).toEqual(Array(SUBMIT_FIELDS.length).fill('confirmed'))
    expect(profile.fields.location.needsPinCheck).toBe(false)
  })

  it('leaves the menu and hours as drafts for Home to set up', () => {
    expect(SETUP_FIELDS.map((key) => profile.fields[key].status)).toEqual(['heard', 'heard'])
  })
})
