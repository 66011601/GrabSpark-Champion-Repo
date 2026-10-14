import type { Merchant, ShopItem } from '@/types/domain.ts'

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Figures behind "ขอดูยอดขายหน่อย". Rounded to whole percent; nothing here is a Grab figure. */
export function salesSummary(shop: Merchant): { totalTHB: number; lastWeekTHB: number; changePct: number; best: ShopItem } {
  const totalTHB = sum(shop.sales.thisWeekTHB)
  const lastWeekTHB = sum(shop.sales.lastWeekTHB)
  const best = shop.menu.reduce((top, item) => (item.sold28d > top.sold28d ? item : top))
  return { totalTHB, lastWeekTHB, changePct: Math.round(((totalTHB - lastWeekTHB) / lastWeekTHB) * 100), best }
}

/** A day's orders if tomorrow is rainy: a range, never a single promise. */
export function rainForecast(shop: Merchant): { normal: number; range: [number, number]; prepPct: [number, number] } {
  const normal = sum(Object.values(shop.baselineOrdersByHour))
  const [low, high] = shop.rainLiftPct
  return { normal, range: [Math.round((normal * (100 + low)) / 100), Math.round((normal * (100 + high)) / 100)], prepPct: [low, high] }
}

/** Unhappy reviews (3 stars or fewer) grouped by topic, most common first. */
export function complaintTopics(shop: Merchant): { topic: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const review of shop.reviews) if (review.stars <= 3 && review.topic) counts.set(review.topic, (counts.get(review.topic) ?? 0) + 1)
  return [...counts].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count)
}
