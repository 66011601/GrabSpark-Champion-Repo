import { useState } from 'react'
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { runSubmissionChecks, SubmissionBlockedError, submitProfile } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { ListenButton } from '@/components/assistant/ListenButton.tsx'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatHours, formatPhone, formatTHB } from '@/lib/format.ts'
import { getAccount } from '@/services/merchantApi.ts'
import type { ProfileFieldKey } from '@/types/domain.ts'
import { profileSummary } from '../summarizeField.ts'
import { MapPinConfirm } from './MapPinConfirm.tsx'
import { ReviewFieldCard } from './ReviewFieldCard.tsx'
import { StorePreviewCard } from './StorePreviewCard.tsx'

const account = getAccount()

export function ReviewScreen() {
  const { state, dispatch } = useJourney()
  const { profile } = state
  const { fields } = profile
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = runSubmissionChecks(profile).every((check) => check.pass)
  const remaining = PROFILE_FIELDS.filter((key) => fields[key].status !== 'confirmed').length

  const card = (key: ProfileFieldKey) => ({
    label: th.fields[key],
    field: fields[key],
    onConfirm: () => dispatch({ type: 'CONFIRM_FIELD', field: key }),
    onEdit: () => dispatch({ type: 'REASK_FIELD', field: key }),
  })

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await submitProfile(profile)
      dispatch({ type: 'SUBMITTED', at: Date.now() })
    } catch (caught) {
      setError(caught instanceof SubmissionBlockedError ? caught.failed.map((check) => check.message).join(' · ') : th.review.apiError)
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      title={th.review.title}
      progress={remaining > 0 ? th.review.remaining(remaining) : th.checks.allConfirmed}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-warn-ink">
              {error}
            </p>
          )}
          <Button fullWidth disabled={!canSubmit} loading={submitting} onClick={submit}>
            {submitting ? th.review.submitting : th.review.submit}
          </Button>
          <p className="text-center text-sm text-ink-muted">{th.review.nothingSentYet}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p>{th.review.subtitle}</p>
        <StorePreviewCard profile={profile} />
        <ListenButton text={profileSummary(profile)} />

        <ReviewFieldCard {...card('storeName')}>{fields.storeName.value}</ReviewFieldCard>
        <ReviewFieldCard {...card('category')}>{fields.category.value}</ReviewFieldCard>
        <ReviewFieldCard {...card('location')}>
          <p className="mb-2 font-bold">{th.review.pinQuestion}</p>
          {fields.location.value && <MapPinConfirm point={fields.location.value} />}
        </ReviewFieldCard>
        <ReviewFieldCard {...card('hours')}>{fields.hours.value && formatHours(fields.hours.value)}</ReviewFieldCard>
        <ReviewFieldCard {...card('menu')}>
          <ul className="divide-y divide-line">
            {(fields.menu.value ?? []).map((item) => (
              <li key={item.name} className="flex justify-between gap-3 py-2">
                <span>{item.name}</span>
                <span className="font-bold">{formatTHB(item.priceTHB)}</span>
              </li>
            ))}
          </ul>
        </ReviewFieldCard>
        <ReviewFieldCard {...card('phone')}>
          <p>{fields.phone.value && formatPhone(fields.phone.value)}</p>
          <p className="text-base text-ink-muted">
            {th.review.owner}: {account.ownerName} ({th.review.fromAccount})
          </p>
        </ReviewFieldCard>
      </div>
    </OnboardingShell>
  )
}
