import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { BACK_TIMES, buildRainPromo, findItem } from './drafts.ts'

const shop = getMerchant()

describe('drafts', () => {
  it('builds the bundle of spec 6.6: น้ำพริก + ชาไทยเย็น at 109, window 14:00-17:00', () => {
    const promo = buildRainPromo(shop)
    expect(promo.itemIds).toEqual(['M01', 'D01'])
    expect([promo.normalPrice, promo.bundlePrice]).toEqual([124, 109])
    expect(promo.window).toEqual(['14:00', '17:00'])
    expect(promo.dailyCap).toBe(20)
  })

  it.each([
    ['หมูกรอบหมดแล้ว', 'M04'],
    ['หมู กรอบ หมดแล้วค่ะ', 'M04'],
    ['ชาไทยหมด', 'D01'],
    ['กะเพราหมดเกลี้ยง', 'M02'],
    ['หมูกอบหมดแล้ว', 'M04'], // the ร dropped, as many say it and the recogniser writes it
    ['กะเพาหมดแล้ว', 'M02'],
  ])('finds the item in "%s"', (said, id) => {
    expect(findItem(said, shop)?.id).toBe(id)
  })

  it('finds nothing when no menu item is named', () => {
    expect(findItem('ของหมดแล้ว', shop)).toBeNull()
  })

  // GrabMerchant's own choice when a dish is switched off: 'วันนี้' (back tomorrow by itself) or 'ไม่มีกำหนด'.
  it.each([
    ['วันนี้', 'today'],
    ['แค่วันนี้ค่ะ', 'today'],
    ['ไม่มีกำหนด', 'indefinite'],
    ['ยังไม่รู้', 'indefinite'],
    ['ปิดไว้ก่อน', 'indefinite'],
  ])('hears "%s" as how long the dish stays off', (said, id) => {
    expect(matchCommand(said, BACK_TIMES)).toBe(id)
  })
})
