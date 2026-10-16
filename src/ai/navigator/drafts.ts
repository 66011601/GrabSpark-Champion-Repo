import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import { th } from '@/copy/th.ts'
import type { Merchant, ShopItem } from '@/types/domain.ts'
import type { PromoDraft, SoldOutUntil } from './types.ts'

const squash = (text: string) => stripParticles(text).toLowerCase().replace(/\s+/g, '')
// Many merchants drop the ร or ล of a cluster (หมูกรอบ → "หมูกอบ", ปลา → "ปา") and the recogniser writes what it heard,
// so dish names are compared without them, on both sides.
const loose = (text: string) => squash(text).replace(/([กขคตปพผบดฟ])[รล](?=[ก-ฮ\u0E30-\u0E3A\u0E47-\u0E4E])/g, '$1')

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
  const said = loose(text)
  return shop.menu.find((item) => [item.name, ...item.aliases].some((name) => said.includes(loose(name)))) ?? null
}

/** How long a switched-off dish stays off, as GrabMerchant asks it. The chips and the spoken answers share these. */
export const BACK_TIMES: { id: SoldOutUntil; label: string; hint: string; phrases: string[] }[] = [
  { id: 'today', label: th.act2.soldOut.times.today, hint: th.act2.soldOut.hints.today, phrases: ['วันนี้', 'แค่วันนี้', 'ปิดวันนี้', 'เฉพาะวันนี้'] },
  { id: 'indefinite', label: th.act2.soldOut.times.indefinite, hint: th.act2.soldOut.hints.indefinite, phrases: ['ไม่มีกำหนด', 'ยังไม่รู้', 'ไม่รู้', 'ปิดไว้ก่อน', 'จนกว่าจะบอก'] },
]
