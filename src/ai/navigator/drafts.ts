import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import { th } from '@/copy/th.ts'
import type { Merchant, ShopItem } from '@/types/domain.ts'
import type { PromoDraft } from './types.ts'

const squash = (text: string) => stripParticles(text).toLowerCase().replace(/\s+/g, '')

/** The rain-day bundle of spec 6.6: the best-selling main with the best-margin drink that already sells. */
export function buildRainPromo(shop: Merchant): PromoDraft {
  const mains = shop.menu.filter((item) => item.type === 'main')
  const drinks = shop.menu.filter((item) => item.type === 'drink' && item.sold28d >= 200)
  const margin = (item: ShopItem) => (item.priceTHB - item.costTHB) / item.priceTHB
  const main = mains.reduce((top, item) => (item.sold28d > top.sold28d ? item : top))
  const drink = drinks.reduce((top, item) => (margin(item) > margin(top) ? item : top))
  const normalPrice = main.priceTHB + drink.priceTHB
  return { kind: 'promo', name: th.act2.promo.name, itemIds: [main.id, drink.id], normalPrice, bundlePrice: normalPrice - 15, window: ['14:00', '17:00'], days: 7, dailyCap: 20 }
}

/** The menu item a sentence names ("หมูกรอบหมดแล้ว"), by its name or what owners call it. */
export function findItem(text: string, shop: Merchant): ShopItem | null {
  const said = squash(text)
  return shop.menu.find((item) => [item.name, ...item.aliases].some((name) => said.includes(squash(name)))) ?? null
}

/** When a sold-out dish comes back. The chips and the spoken answers share these. */
export const BACK_TIMES = [
  { id: 'two', label: th.act2.soldOut.times.two, backAt: 'วันนี้ 14:00', phrases: ['บ่ายสอง', 'สิบสี่นาฬิกา', 'บ่ายสองโมง', '14:00'] },
  { id: 'five', label: th.act2.soldOut.times.five, backAt: 'วันนี้ 17:00', phrases: ['บ่ายห้า', 'ห้าโมงเย็น', 'ห้าโมง', '17:00'] },
  { id: 'tomorrow', label: th.act2.soldOut.times.tomorrow, backAt: 'พรุ่งนี้ 10:00', phrases: ['พรุ่งนี้', 'พรุ่งนี้เช้า', 'วันพรุ่งนี้', 'ไว้พรุ่งนี้'] },
]
