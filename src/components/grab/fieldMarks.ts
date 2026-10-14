import { needsCheck } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import type { FieldStatus } from '@/types/domain.ts'

/** The source of a value the merchant typed: it gets no AI mark. */
export const TYPED = th.sources.typed

// Sources that are not someone's words: shown as "ที่มา: …", not "ได้ยินว่า …".
const NAMED_SOURCES: string[] = [...Object.values(th.sources), ...Object.values(th.scan.source)]

export interface FieldMark {
  source: string
  spoken: boolean
}

/** The ✨ "AI กรอกให้" mark for a field the companion filled (by voice, photo, map or suggestion). */
export function fieldMark(field: { status: FieldStatus; heardFrom?: string }): FieldMark | null {
  if (field.status === 'empty' || !field.heardFrom || field.heardFrom === TYPED) return null
  return { source: field.heardFrom, spoken: !NAMED_SOURCES.includes(field.heardFrom) }
}

/** An unsure draft: amber, with a ✓ the merchant must press. */
export const needsAmber = (field: { status: FieldStatus; confidence?: number }) => needsCheck(field)
