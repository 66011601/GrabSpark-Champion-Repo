import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { REVIEW_FIELDS } from '@/ai/onboarding/profile.ts'
import { runSubmissionChecks, SubmissionBlockedError, submitProfile } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { ListenButton } from '@/components/assistant/ListenButton.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatHours, formatPhone, formatTHB, maskAccount, maskIdNumber } from '@/lib/format.ts'
import { speak } from '@/services/speech/textToSpeech.ts'
import type { ProfileFieldKey } from '@/types/domain.ts'
import { profileSummary } from '../summarizeField.ts'
import { MapPinConfirm } from './MapPinConfirm.tsx'
import { ReviewFieldCard } from './ReviewFieldCard.tsx'
import { StorePreviewCard } from './StorePreviewCard.tsx'

const READ_AFTER_MS = 150
const COMMANDS = [
  { id: 'listenSummary' as const, phrases: SAY.listenSummary },
  { id: 'submit' as const, phrases: SAY.submit },
]

export function ReviewScreen() {
  const { state, dispatch } = useJourney()
  const { profile } = state
  const { fields } = profile
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = runSubmissionChecks(profile).every((check) => check.pass)
  const remaining = REVIEW_FIELDS.filter((key) => fields[key].status !== 'confirmed').length

  const reading = useRef<number | undefined>(undefined)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(reading.current)
    }
  }, [])

  // By voice the companion will read the summary back, but sending the application takes the merchant's own tap.
  const { mic, transcript, notice, toggleMic } = useVoiceInput((text) => {
    const command = matchCommand(text, COMMANDS)
    if (command === 'submit') return th.review.mustTap
    if (command !== 'listenSummary') return false
    // After this turn has settled, so the summary is not cut off by the bubble updating.
    reading.current = window.setTimeout(() => speak(profileSummary(profile)), READ_AFTER_MS)
    return true
  })

  const said =
    remaining === REVIEW_FIELDS.length ? th.review.subtitle : remaining > 0 ? th.review.confirmedSoFar(remaining) : th.review.allConfirmed

  const card = (key: ProfileFieldKey) => ({
    label: th.fields[key],
    field: fields[key],
    onConfirm: () => dispatch({ type: 'CONFIRM_FIELD', field: key }),
    onEdit: () => dispatch({ type: 'REASK_FIELD', field: key }),
    disabled: submitting,
  })

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await submitProfile(profile)
      // Carries the profile that was sent: if the merchant changed it meanwhile, the journey ignores this.
      dispatch({ type: 'SUBMITTED', at: Date.now(), profile })
      if (mounted.current) setSubmitting(false)
    } catch (caught) {
      setError(caught instanceof SubmissionBlockedError ? caught.failed.map((check) => check.message).join(' · ') : th.review.apiError)
      if (mounted.current) setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      title={th.review.title}
      progress={remaining > 0 ? th.review.remaining(remaining) : th.checks.allConfirmed}
      dock={
        <CompanionDock
          text={said}
          notice={error ?? notice}
          hint={mic === 'idle' || mic === 'error' ? th.review.nothingSentYet : MIC_LABELS[mic]}
          heard={transcript}
          state={mic}
          onPress={toggleMic}
          actions={
            <Button fullWidth disabled={!canSubmit} loading={submitting} onClick={submit}>
              {submitting ? th.review.submitting : th.review.submit}
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <StorePreviewCard profile={profile} />
        <ListenButton text={profileSummary(profile)} />

        <ReviewFieldCard {...card('storeName')}>{fields.storeName.value}</ReviewFieldCard>
        <ReviewFieldCard {...card('category')}>{fields.category.value}</ReviewFieldCard>
        <ReviewFieldCard {...card('location')}>
          <p className="mb-2 font-bold">{th.review.pinQuestion}</p>
          {fields.location.value && <MapPinConfirm point={fields.location.value} />}
          {state.building && (
            <p className="mt-2 text-base text-ink-muted">
              {th.review.building}: {state.building}
            </p>
          )}
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
        <ReviewFieldCard {...card('phone')}>{fields.phone.value && formatPhone(fields.phone.value)}</ReviewFieldCard>
        <ReviewFieldCard {...card('owner')} editLabel={fields.owner.value ? th.review.rescan : th.review.scanNow}>
          {fields.owner.value ? (
            <>
              <p>{`${fields.owner.value.title} ${fields.owner.value.name}`}</p>
              <p className="text-base text-ink-muted">
                {th.review.idNumber} {maskIdNumber(fields.owner.value.idNumber)}
              </p>
            </>
          ) : (
            <p className="text-ink-muted">{th.review.notScanned}</p>
          )}
        </ReviewFieldCard>
        <ReviewFieldCard {...card('payout')} editLabel={fields.payout.value ? th.review.rescan : th.review.scanNow}>
          {fields.payout.value ? (
            <>
              <p>{fields.payout.value.bankName}</p>
              <p className="text-base text-ink-muted">
                {th.review.accountNumber} {maskAccount(fields.payout.value.accountNumber)} · {th.review.accountName} {fields.payout.value.accountName}
              </p>
            </>
          ) : (
            <p className="text-ink-muted">{th.review.notScanned}</p>
          )}
        </ReviewFieldCard>
      </div>
    </OnboardingShell>
  )
}
