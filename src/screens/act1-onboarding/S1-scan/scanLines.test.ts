import { describe, expect, it } from 'vitest'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import { scanLines, scanSummary } from './scanLines.ts'

describe('scanLines', () => {
  it('shows the full ID number right after the photo, for the merchant to compare', () => {
    expect(scanLines(sampleScan('idCard'))).toEqual([
      { label: 'ชื่อ-นามสกุล', value: 'นาง แดง ใจดี', confidence: 0.97 },
      { label: 'เลขบัตรประชาชน', value: '1-2345-67890-12-1', confidence: 0.97 },
    ])
  })

  it('lists the bank, account number and account name', () => {
    expect(scanLines(sampleScan('bankBook')).map((line) => line.value)).toEqual(['ธนาคารกสิกรไทย', '123-4-56789-0', 'นาง แดง ใจดี'])
  })

  it('lists the store, the category and one row per dish with its own confidence', () => {
    const lines = scanLines(sampleScan('menu'))
    expect(lines).toHaveLength(7)
    expect(lines[2]).toEqual({ label: 'น้ำพริกกะปิปลาทู', value: '฿89', confidence: 0.6 })
  })
})

describe('scanSummary', () => {
  it('says only the last four digits', () => {
    expect(scanSummary(sampleScan('idCard'))).toBe('อ่านได้แล้วค่ะ คุณแดง ใจดี บัตรลงท้ายด้วย 0121')
    expect(scanSummary(sampleScan('bankBook'))).toBe('บัญชีธนาคารกสิกรไทย ลงท้ายด้วย 7890 ค่ะ')
  })

  it('points out the price it could not read clearly', () => {
    expect(scanSummary(sampleScan('menu'))).toBe('อ่านเมนูได้ 5 รายการค่ะ ราคาน้ำพริกกะปิปลาทูไม่ค่อยชัด ช่วยดูอีกทีตอนตรวจนะคะ')
  })
})
