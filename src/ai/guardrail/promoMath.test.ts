import { describe, expect, it } from 'vitest'
import { estimateImpact, profitPerUnit } from './promoMath.ts'

describe('promoMath', () => {
  it('earns more per bundle than the dish alone (spec 6.6)', () => {
    // bundle 109 = dish 89 + drink 35 - 15; cost 38 + 9
    expect(profitPerUnit(109, 47, 0.3)).toBeCloseTo(29.3, 5)
    expect(profitPerUnit(89, 38, 0.3)).toBeCloseTo(24.3, 5)
  })

  it('gives a conservative 7-day range from the slow-window orders', () => {
    const baseline = { '14': 3, '15': 2, '16': 2 } // 7 a day
    expect(estimateImpact({ baselineByHour: baseline, window: ['14:00', '17:00'], liftPct: [40, 70], days: 7, price: 109, profitPerBundle: 29.3 })).toEqual({
      extraOrders: [21, 35],
      extraRevenueTHB: [2289, 3815],
      extraProfitTHB: [615, 1025],
    })
  })
})
