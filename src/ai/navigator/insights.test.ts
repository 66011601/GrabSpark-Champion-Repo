import { describe, expect, it } from 'vitest'
import { getMerchant } from '@/services/merchantApi.ts'
import { complaintTopics, menuShare, rainForecast, ratingSummary, salesSummary } from './insights.ts'

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

  it('averages the stars to one decimal, rounded down so it never flatters the shop', () => {
    expect(ratingSummary(shop)).toEqual({ average: 3.7, count: 7 })
  })

  it('gives each dish its share of 28-day sales in whole percent, best first', () => {
    const shares = menuShare(shop)
    expect(shares[0]).toEqual({ id: 'M01', name: 'น้ำพริกกะปิ ปลาทูทอด ผักลวก', sold: 530, pct: 28 })
    expect(shares.map((share) => share.id)).toEqual(['M01', 'M02', 'D01', 'M04', 'M03', 'D02'])
  })
})
