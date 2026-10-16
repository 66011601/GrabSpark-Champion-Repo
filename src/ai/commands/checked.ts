import type { StepStatus } from '@/ai/onboarding/steps.ts'
import type { ProfileFieldKey } from '@/types/domain.ts'
import { matchCommand } from './matchCommand.ts'

// What a merchant says after looking at a field the companion filled: the same as tapping its "ถูกแล้ว".
const CHECKED = [{ id: 'checked' as const, phrases: ['ถูกแล้ว', 'ถูกต้อง', 'ถูกต้องแล้ว', 'ถูก', 'ใช่', 'ใช่แล้ว', 'โอเค', 'เช็คแล้ว', 'เช็กแล้ว', 'ตรวจแล้ว'] }]

/**
 * The field the merchant just said is right: the one the helper line asks them to check (the step's first issue),
 * when they answer "ถูกแล้ว" / "ใช่" to it. Null for anything else.
 */
export function checkedField(text: string, status: StepStatus): ProfileFieldKey | null {
  const first = status.issues[0]
  if (first?.problem !== 'unchecked') return null
  return matchCommand(text, CHECKED) ? first.field : null
}
