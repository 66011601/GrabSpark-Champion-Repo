import { describe, expect, it } from 'vitest'
import { buildRainPromo } from '@/ai/navigator/drafts.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import type { Merchant } from '@/types/domain.ts'
import { promoChecks, soldOutChecks } from './checks.ts'

const shop = getMerchant()
const failed = (checks: { id: string; pass: boolean }[]) => checks.filter((check) => !check.pass).map((check) => check.id)

describe('promoChecks', () => {
  it('passes the rain bundle of spec 6.6', () => {
    const checks = promoChecks(buildRainPromo(shop), shop)
    expect(failed(checks)).toEqual([])
    expect(checks.find((check) => check.id === 'MARGIN_FLOOR')?.message).toContain('29')
  })

  it('blocks a price that loses money', () => {
    expect(failed(promoChecks({ ...buildRainPromo(shop), bundlePrice: 60 }, shop))).toEqual(['MARGIN_FLOOR', 'BUDGET_CAP'])
  })

  it('blocks a discount bill over the daily limit', () => {
    expect(failed(promoChecks({ ...buildRainPromo(shop), dailyCap: 40 }, shop))).toEqual(['BUDGET_CAP'])
  })

  it('blocks a window outside opening hours', () => {
    expect(failed(promoChecks({ ...buildRainPromo(shop), window: ['08:00', '11:00'] }, shop))).toEqual(['SCHEDULE_VALID'])
  })

  it('blocks a second promotion on the same items at the same time', () => {
    const busy: Merchant = { ...shop, activePromotions: [{ itemIds: ['D01'], window: ['15:00', '16:00'] }] }
    expect(failed(promoChecks(buildRainPromo(busy), busy))).toEqual(['NO_OVERLAP'])
  })
})

describe('soldOutChecks', () => {
  it('needs a known item and a reopening time inside opening hours', () => {
    expect(failed(soldOutChecks({ kind: 'soldOut', itemId: 'M04', backAt: 'วันนี้ 14:00' }, shop))).toEqual([])
    expect(failed(soldOutChecks({ kind: 'soldOut', itemId: 'M04', backAt: null }, shop))).toEqual(['BACK_TIME_VALID'])
    expect(failed(soldOutChecks({ kind: 'soldOut', itemId: 'M04', backAt: 'วันนี้ 22:00' }, shop))).toEqual(['BACK_TIME_VALID'])
    expect(failed(soldOutChecks({ kind: 'soldOut', itemId: 'X99', backAt: 'พรุ่งนี้ 10:00' }, shop))).toEqual(['ITEM_EXISTS'])
  })
})
