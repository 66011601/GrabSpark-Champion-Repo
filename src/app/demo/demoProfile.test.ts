import { describe, expect, it } from 'vitest'
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoProfile } from './demoProfile.ts'

describe('demoProfile', () => {
  // End-to-end check of the demo script the presenter plays.
  const profile = demoProfile()

  it('hears every field from the script, confirming none', () => {
    expect(PROFILE_FIELDS.map((key) => profile.fields[key].status)).toEqual(Array(6).fill('heard'))
  })

  it('matches the story told in Act 2', () => {
    expect(profile.fields.storeName.value).toBe('ครัวป้าแดง')
    expect(profile.fields.location.value?.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
    expect(profile.fields.hours.value).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
    expect(profile.fields.menu.value?.map((item) => item.priceTHB)).toEqual([89, 65, 75, 35, 30])
    expect(profile.fields.phone.value).toBe('0812344217')
  })
})
