import { markSoldOut, openPromotion, stopPromotion, type ActionReceipt } from '@/services/merchantApi.write.ts'
import type { GuardrailCheck, Merchant } from '@/types/domain.ts'
import type { Draft } from '@/ai/navigator/types.ts'
import { draftChecks } from './checks.ts'

export class ActionBlockedError extends Error {
  readonly failed: GuardrailCheck[]

  constructor(failed: GuardrailCheck[]) {
    super(`Action blocked: ${failed.map((check) => check.id).join(', ')}`)
    this.name = 'ActionBlockedError'
    this.failed = failed
  }
}

/** The only path from an AI-prepared draft to the (mock) Grab API, and only the merchant's confirm tap calls it. */
export async function confirmDraft(draft: Draft, shop: Merchant): Promise<ActionReceipt> {
  const failed = draftChecks(draft, shop).filter((check) => !check.pass)
  if (failed.length > 0) throw new ActionBlockedError(failed)
  return draft.kind === 'promo' ? openPromotion(draft) : markSoldOut(draft)
}

/** "หยุดโปรนี้": always one tap, so it needs no checks. */
export const stopPromo = (promoId: string) => stopPromotion(promoId)
