import { th } from '@/copy/th.ts'
import type { GuardrailCheck, Merchant } from '@/types/domain.ts'
import type { AddMenuDraft, Draft, PromoDraft, SoldOutDraft } from '@/ai/navigator/types.ts'
import { profitPerUnit } from './promoMath.ts'

const result = (id: string, pass: boolean, ok: string, fail: string): GuardrailCheck => ({ id, pass, message: pass ? ok : fail })
const c = th.act2.checks

/** Spec 6.5, "Act 2 promotion". Deterministic: the AI never decides money or validity. */
export function promoChecks(draft: PromoDraft, shop: Merchant): GuardrailCheck[] {
  const items = shop.menu.filter((item) => draft.itemIds.includes(item.id))
  const cost = items.reduce((total, item) => total + item.costTHB, 0)
  const profit = profitPerUnit(draft.bundlePrice, cost, shop.commissionRate)
  const spend = draft.dailyCap * (draft.normalPrice - draft.bundlePrice)
  const [from, to] = draft.window
  const overlaps = shop.activePromotions.some((promo) => promo.itemIds.some((id) => draft.itemIds.includes(id)) && promo.window[0] < to && from < promo.window[1])
  return [
    result('MARGIN_FLOOR', profit > 0, c.marginOk(Math.floor(profit)), c.marginFail),
    result('BUDGET_CAP', spend <= shop.maxDailyPromoSpendTHB, c.budgetOk(spend), c.budgetFail(spend, shop.maxDailyPromoSpendTHB)),
    result('NO_OVERLAP', !overlaps, c.overlapOk, c.overlapFail),
    result('SCHEDULE_VALID', from < to && from >= shop.hours.open && to <= shop.hours.close, c.scheduleOk, c.scheduleFail),
    result('REVERSIBLE', true, c.reversible, c.reversible),
  ]
}

/** The dish must be on the menu, and the merchant must have chosen how long it stays off. */
export function soldOutChecks(draft: SoldOutDraft, shop: Merchant): GuardrailCheck[] {
  return [
    result('ITEM_EXISTS', shop.menu.some((item) => item.id === draft.itemId), c.itemOk, c.itemFail),
    result('UNTIL_CHOSEN', draft.until !== null, c.untilOk, c.untilMissing),
  ]
}

const MIN_PRICE = 5
const MAX_PRICE = 5000

/** Every new dish has a name and a sensible price, and is not already on the menu. */
export function addMenuChecks(draft: AddMenuDraft, shop: Merchant): GuardrailCheck[] {
  const named = draft.items.length > 0 && draft.items.every((item) => item.name.trim() !== '')
  const priced = draft.items.every((item) => Number.isInteger(item.priceTHB) && item.priceTHB >= MIN_PRICE && item.priceTHB <= MAX_PRICE)
  const known = new Set(shop.menu.map((item) => item.name))
  const twin = draft.items.find((item) => known.has(item.name.trim()))
  return [
    result('ITEMS_NAMED', named, c.addNamed, c.addEmpty),
    result('PRICE_RANGE', priced, c.addPriceOk, c.addPriceFail),
    result('NOT_ON_MENU', twin === undefined, c.addNewOk, c.addDuplicate(twin?.name ?? '')),
  ]
}

export function draftChecks(draft: Draft, shop: Merchant): GuardrailCheck[] {
  if (draft.kind === 'promo') return promoChecks(draft, shop)
  return draft.kind === 'soldOut' ? soldOutChecks(draft, shop) : addMenuChecks(draft, shop)
}
