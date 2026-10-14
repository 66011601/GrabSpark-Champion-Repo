import { describe, expect, it } from 'vitest'
import { getMerchant } from '@/services/merchantApi.ts'
import { complaintTopics, rainForecast, salesSummary } from './insights.ts'

const shop = getMerchant()

describe('insights', () => {
  it('sums the week and compares with the one before', () => {
    const summary = salesSummary(shop)
    expect(summary.totalTHB).toBe(16880)
    expect(summary.changePct).toBe(8)
    expect(summary.best.id).toBe('M01')
  })

  it('forecasts a rainy day as a range around the normal day', () => {
    expect(rainForecast(shop)).toEqual({ normal: 46, range: [51, 58], prepPct: [10, 25] })
  })

  it('counts unhappy reviews by topic', () => {
    expect(complaintTopics(shop)).toEqual([
      { topic: 'ส่งช้า', count: 2 },
      { topic: 'หวานเกินไป', count: 1 },
    ])
  })
})
