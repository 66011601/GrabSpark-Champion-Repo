import { describe, expect, it } from 'vitest'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { profileSummary, summarizeField } from './summarizeField.ts'

describe('summarizeField', () => {
  const profile = demoProfile()

  it('formats each field for the checklist', () => {
    expect(summarizeField(profile, 'storeName')).toBe('ครัวป้าแดง')
    expect(summarizeField(profile, 'hours')).toBe('10:00 – 20:00 น. · เปิดทุกวัน')
    expect(summarizeField(profile, 'menu')).toBe('5 รายการ')
    expect(summarizeField(profile, 'phone')).toBe('081-234-4217')
  })

  it('builds one paragraph for read-aloud', () => {
    expect(profileSummary(profile)).toBe(
      'ชื่อร้าน ครัวป้าแดง ประเภทอาหาร อาหารไทย ที่ตั้ง ลาดพร้าว 71 ตรงข้ามเซเว่น เวลาเปิด-ปิด 10:00 – 20:00 น. · เปิดทุกวัน เมนู 5 รายการ เบอร์ติดต่อ 081-234-4217',
    )
  })
})
