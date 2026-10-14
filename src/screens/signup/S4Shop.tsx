import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, Select } from '@/components/grab/Field.tsx'
import { fieldMark, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatPhone } from '@/lib/format.ts'
import type { BusinessType } from '@/types/domain.ts'

const COMMANDS = [
  { id: 'personal' as const, phrases: SAY.personal },
  { id: 'company' as const, phrases: SAY.company },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 4/7 ข้อมูลร้าน: business type and the owner's contact details (phone verified on step 2). */
export function S4Shop() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const status = stepStatus(state.profile, 4)
  const setType = (value: BusinessType, heardFrom: string) => dispatch({ type: 'FILL', updates: { businessType: { value, confidence: 1, heardFrom } }, at: Date.now() })

  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'personal' || command === 'company') setType(command, th.sources.suggested)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true },
  )

  return (
    <StepShell
      step={4}
      title={th.s4.title}
      subtitle={th.s4.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={status.valid || fields.businessType.status === 'empty' ? th.s4.helper : problemText(status.issues[0])} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <h2 className="text-lg font-bold">{th.s4.business}</h2>
      <Field id="s4-type" label={th.fields.businessType} required mark={fieldMark(fields.businessType)}>
        <Select
          id="s4-type"
          value={fields.businessType.value ?? ''}
          placeholder={th.s4.typePlaceholder}
          options={(['personal', 'company'] as const).map((value) => ({ value, label: th.s4.types[value] }))}
          onChange={(value) => setType(value as BusinessType, TYPED)}
        />
      </Field>
      {fields.businessType.status === 'empty' && <Chip onClick={() => setType('personal', th.sources.suggested)}>{th.s4.suggest}</Chip>}

      <h2 className="text-lg font-bold">{th.s4.contact}</h2>
      <p className="-mt-3 text-base text-ink-muted">{th.s4.contactNote}</p>
      <Field id="s4-phone" label={th.s4.ownerPhone} required>
        <p id="s4-phone" className="flex min-h-14 items-center justify-between rounded-xl border border-line bg-canvas px-4 text-lg">
          {fields.phone.value ? formatPhone(fields.phone.value) : '—'}
          {state.phoneVerified && (
            <span className="flex items-center gap-1 text-base text-action">
              <CheckCircle2 className="size-5" aria-hidden />
              {th.s4.verified}
            </span>
          )}
        </p>
      </Field>
      <Field id="s4-email" label={th.fields.contactEmail} required mark={fieldMark(fields.contactEmail)}>
        <input
          id="s4-email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={fields.contactEmail.value ?? ''}
          onChange={(event) =>
            event.target.value.trim()
              ? dispatch({ type: 'FILL', updates: { contactEmail: { value: event.target.value, confidence: 1, heardFrom: TYPED } }, at: Date.now() })
              : dispatch({ type: 'CLEAR_FIELD', field: 'contactEmail' })
          }
          className={inputClass()}
        />
      </Field>
      <p className="flex items-start gap-2 text-base text-ink-muted">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        {th.s4.privacy}
      </p>
    </StepShell>
  )
}
