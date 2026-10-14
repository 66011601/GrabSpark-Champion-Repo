import { describe, expect, it } from 'vitest'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { confirmRows, confirmSpeech } from './confirmSummary.ts'

describe('confirmRows', () => {
  const rows = confirmRows(demoProfile())

  it('has one row per form step with an edit target', () => {
    expect(rows.map((row) => row.step)).toEqual([3, 4, 5, 6])
  })

  it('masks the ID and account numbers', () => {
    expect(rows[2].lines).toContain('นาง แดง ใจดี · x-xxxx-xxxx0-12-1')
    expect(rows[3].lines).toContain('ธนาคารกสิกรไทย · xxx-x-xx789-0')
    expect(JSON.stringify(rows)).not.toContain('1234567890')
  })
})

describe('confirmSpeech', () => {
  it('says only the last four digits', () => {
    const said = confirmSpeech(demoProfile())
    expect(said).toContain('บัตรลงท้ายด้วย 0121')
    expect(said).toContain('บัญชีลงท้ายด้วย 7890')
    expect(said).not.toContain('1234567890')
  })
})
