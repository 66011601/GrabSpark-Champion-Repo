import { describe, expect, it } from 'vitest'
import { applyUpdates } from '@/ai/onboarding/profile.ts'
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
      'ชื่อร้าน ครัวป้าแดง ประเภทอาหาร อาหารไทย ที่ตั้ง ลาดพร้าว 71 ตรงข้ามเซเว่น เวลาเปิด-ปิด 10:00 – 20:00 น. · เปิดทุกวัน เมนู 5 รายการ เบอร์ติดต่อ 081-234-4217 เจ้าของร้าน แดง ใจดี บัญชีรับเงิน ธนาคารกสิกรไทย ลงท้ายด้วย 7890',
    )
  })
})

describe('document fields', () => {
  const profile = applyUpdates(demoProfile(), {
    owner: { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'x' },
    payout: { value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' }, confidence: 0.95, heardFrom: 'x' },
  })

  it('names the owner and only the last four digits of the account', () => {
    expect(summarizeField(profile, 'owner')).toBe('แดง ใจดี')
    expect(summarizeField(profile, 'payout')).toBe('ธนาคารกสิกรไทย ลงท้ายด้วย 7890')
  })

  it('never reads a full ID or account number aloud', () => {
    const said = profileSummary(profile)
    expect(said).toContain('เจ้าของร้าน แดง ใจดี บัญชีรับเงิน ธนาคารกสิกรไทย ลงท้ายด้วย 7890')
    expect(said).not.toContain('1234567890')
  })
})
