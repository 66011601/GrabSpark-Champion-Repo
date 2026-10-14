import type { FormStep } from '@/ai/onboarding/steps.ts'
import { th } from '@/copy/th.ts'
import { formatPhone, lastFour, maskAccount, maskIdNumber } from '@/lib/format.ts'
import type { OnboardingProfile } from '@/types/domain.ts'

export interface ConfirmRow {
  step: FormStep
  title: string
  lines: string[]
}

/** 7/7's summary card: one row per step, numbers masked. */
export function confirmRows(profile: OnboardingProfile): ConfirmRow[] {
  const { fields } = profile
  const owner = fields.owner.value
  const payout = fields.payout.value
  const present = (lines: (string | null | undefined)[]) => lines.filter((line): line is string => Boolean(line))
  return [
    { step: 3, title: th.s7.rows[3], lines: present([fields.storeName.value, fields.address.value, fields.category.value]) },
    {
      step: 4,
      title: th.s7.rows[4],
      lines: present([
        fields.businessType.value ? th.s4.types[fields.businessType.value] : null,
        fields.phone.value ? formatPhone(fields.phone.value) : null,
        fields.contactEmail.value,
      ]),
    },
    { step: 5, title: th.s7.rows[5], lines: present([owner ? `${owner.title} ${owner.name} · ${maskIdNumber(owner.idNumber)}` : null]) },
    { step: 6, title: th.s7.rows[6], lines: present([payout ? `${payout.bankName} · ${maskAccount(payout.accountNumber)}` : null, payout?.accountName]) },
  ]
}

/** What "ฟังสรุป" reads aloud: the shop, the owner and the bank, numbers only by their last four digits. */
export function confirmSpeech(profile: OnboardingProfile): string {
  const { fields } = profile
  const owner = fields.owner.value
  const payout = fields.payout.value
  return th.s7.speech(
    [
      fields.storeName.value,
      fields.address.value,
      owner ? th.s7.idEnding(owner.name, lastFour(owner.idNumber)) : null,
      payout ? th.s7.accountEnding(payout.bankName, lastFour(payout.accountNumber)) : null,
    ].filter((part): part is string => Boolean(part)),
  )
}
