import { describe, expect, it } from 'vitest'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import { applyUpdates, createEmptyProfile } from '../profile.ts'
import { scanToUpdates } from './scanToUpdates.ts'

describe('scanToUpdates', () => {
  it('turns an ID card into the owner', () => {
    expect(scanToUpdates(sampleScan('idCard'))).toEqual({
      owner: { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'รูปบัตรประชาชน' },
    })
  })

  it('turns a bank book into the payout account', () => {
    expect(scanToUpdates(sampleScan('bankBook'))).toEqual({
      payout: {
        value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' },
        confidence: 0.95,
        heardFrom: 'รูปสมุดบัญชี',
      },
    })
  })

  it('takes the store name, a guessed category and every dish from a menu', () => {
    const updates = scanToUpdates(sampleScan('menu'))
    expect(updates.storeName).toEqual({ value: 'ครัวป้าแดง', confidence: 0.9, heardFrom: 'รูปเมนู' })
    expect(updates.category).toEqual({ value: 'อาหารไทย', confidence: 0.75, heardFrom: 'รูปเมนู' })
    expect(updates.menu?.value.map((item) => item.priceTHB)).toEqual([89, 65, 75, 35, 30])
  })

  it('rates the whole menu by its least readable price', () => {
    expect(scanToUpdates(sampleScan('menu')).menu?.confidence).toBe(0.6)
  })

  it('leaves out the menu when no dish was read', () => {
    const blank = { ...sampleScan('menu'), items: [] }
    expect(scanToUpdates(blank).menu).toBeUndefined()
  })

  it('only drafts values: nothing is confirmed by a photo', () => {
    const profile = applyUpdates(createEmptyProfile(), scanToUpdates(sampleScan('idCard')))
    expect(profile.fields.owner.status).toBe('heard')
  })
})
