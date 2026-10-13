import { CheckCircle2, Circle } from 'lucide-react'
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import type { OnboardingProfile } from '@/types/domain.ts'
import { summarizeField } from '../summarizeField.ts'

/** Rows tick green as soon as the companion hears each field. */
export function LiveProfileChecklist({ profile }: { profile: OnboardingProfile }) {
  return (
    <ul className="divide-y divide-line rounded-3xl ring-1 ring-line">
      {PROFILE_FIELDS.map((key) => {
        const heard = profile.fields[key].status !== 'empty'
        return (
          <li key={key} className="flex min-h-14 items-center gap-3 px-4 py-2">
            {heard ? (
              <CheckCircle2 className="size-7 shrink-0 animate-pop text-action" aria-hidden />
            ) : (
              <Circle className="size-7 shrink-0 text-line" aria-hidden />
            )}
            <span className="w-28 shrink-0 font-bold">{th.fields[key]}</span>
            <span className={`min-w-0 flex-1 ${heard ? 'text-ink' : 'text-ink-muted'}`}>{heard ? summarizeField(profile, key) : '—'}</span>
          </li>
        )
      })}
    </ul>
  )
}
