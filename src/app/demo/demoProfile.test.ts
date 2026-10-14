import { describe, expect, it } from 'vitest'
import { ALL_FIELDS, SETUP_FIELDS, SUBMIT_FIELDS } from '@/ai/onboarding/profile.ts'
import { STEP_FIELDS } from '@/ai/onboarding/steps.ts'
import { demoProfile, step4DemoProfile, submittedDemoProfile } from './demoProfile.ts'

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

describe('step4DemoProfile', () => {
  // The presenter's jump to 4/7: the earlier step is done, the later ones are still the companion's to show.
  const profile = step4DemoProfile()

  it('confirms the step 3 fields and the pin', () => {
    expect(STEP_FIELDS[3].map((key) => profile.fields[key].status)).toEqual(Array(STEP_FIELDS[3].length).fill('confirmed'))
    expect(profile.fields.location.needsPinCheck).toBe(false)
  })

  it('leaves steps 4 to 6 heard', () => {
    expect(profile.fields.owner.status).toBe('heard')
    expect(profile.fields.payout.status).toBe('heard')
  })
})
