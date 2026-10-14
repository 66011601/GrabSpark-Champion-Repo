import { th } from '@/copy/th.ts'
import type { GuardrailCheck, Merchant } from '@/types/domain.ts'
import type { Draft, PromoDraft, SoldOutDraft } from '@/ai/navigator/types.ts'
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

export const draftChecks = (draft: Draft, shop: Merchant): GuardrailCheck[] => (draft.kind === 'promo' ? promoChecks(draft, shop) : soldOutChecks(draft, shop))
