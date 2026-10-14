import { BookOpen, CheckCircle2, Info, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { ScanSheet } from '@/components/scan/ScanSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import type { PayoutAccount } from '@/types/domain.ts'

const EMPTY_PAYOUT: PayoutAccount = { bankName: '', accountNumber: '', accountName: '', bookPhoto: null }
const COMMANDS = [
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 6/7 ข้อมูลธนาคาร: one photo of the bank book fills the account and attaches the photo. */
export function S6Bank() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.payout
  const payout = field.value ?? EMPTY_PAYOUT
  const mark = fieldMark(field)
  const [scanning, setScanning] = useState(false)
  const status = stepStatus(state.profile, 6)

  const edit = (part: keyof PayoutAccount) => (value: string | null) =>
    dispatch({ type: 'FILL', updates: { payout: { value: { ...payout, [part]: value }, confidence: 1, heardFrom: TYPED } }, at: Date.now() })

  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'shoot') setScanning(true)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true },
  )

  const nameError = status.issues.some((issue) => issue.problem === 'nameMismatch') ? th.grab.problems.nameMismatch : null
  const helper = field.status === 'empty' ? th.s6.helper : status.valid ? th.s3.helperDone : problemText(status.issues[0])

  return (
    <StepShell
      step={6}
      title={th.s6.title}
      subtitle={th.s6.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} action={{ kind: 'camera', label: th.s6.scan, onPress: () => setScanning(true) }} />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      {needsAmber(field) && (
        <Button variant="secondary" onClick={() => dispatch({ type: 'CONFIRM_FIELD', field: 'payout' })}>
          {th.grab.looksRight}
        </Button>
      )}
      <Field id="s6-name" label={th.s6.accountName} required mark={mark} error={nameError}>
        <input id="s6-name" value={payout.accountName} onChange={(event) => edit('accountName')(event.target.value)} className={inputClass(Boolean(nameError))} />
      </Field>
      <Field id="s6-bank" label={th.s6.bank} required mark={mark}>
        <Select id="s6-bank" value={payout.bankName} placeholder={th.s6.bankPlaceholder} options={th.s6.banks.map((bank) => ({ value: bank, label: bank }))} onChange={edit('bankName')} />
      </Field>
      <Field id="s6-number" label={th.s6.accountNumber} required mark={mark}>
        <input id="s6-number" inputMode="numeric" value={payout.accountNumber} onChange={(event) => edit('accountNumber')(event.target.value.replace(/\D/g, '').slice(0, 15))} className={inputClass()} />
      </Field>

      <h2 className="text-lg font-bold">{th.s6.documents}</h2>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-bold">
          {th.s6.bookPhoto}
          <span className="text-red-700"> *</span>
        </p>
        {payout.bookPhoto ? (
          <div className="flex min-h-16 items-center gap-3 rounded-xl border border-line p-2">
            {payout.bookPhoto === 'sample' ? (
              <span className="flex size-12 items-center justify-center rounded-lg bg-amber-50 text-warn-ink">
                <BookOpen className="size-6" aria-hidden />
              </span>
            ) : (
              <img src={payout.bookPhoto} alt={th.s6.bookPhoto} className="size-12 rounded-lg object-cover" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block">{th.s6.bookPhoto}</span>
              <span className="flex items-center gap-1 text-sm text-action">
                <CheckCircle2 className="size-4" aria-hidden />
                {th.s6.uploaded}
              </span>
            </span>
            <button type="button" aria-label={th.s6.removePhoto} onClick={() => edit('bookPhoto')(null)} className="flex size-12 cursor-pointer items-center justify-center rounded-full text-ink-muted active:bg-canvas">
              <Trash2 className="size-5" aria-hidden />
            </button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setScanning(true)}>
            {th.s6.addPhoto}
          </Button>
        )}
      </div>
      <p className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-base">
        <Info className="mt-0.5 size-5 shrink-0 text-action" aria-hidden />
        {th.s6.note}
      </p>

      <ScanSheet
        open={scanning}
        doc="bankBook"
        onClose={() => setScanning(false)}
        onUse={(scan, photo) => {
          const updates = scanToUpdates(scan)
          if (updates.payout) updates.payout = { ...updates.payout, value: { ...updates.payout.value, bookPhoto: photo } }
          dispatch({ type: 'FILL', updates, at: Date.now() })
          setScanning(false)
        }}
      />
    </StepShell>
  )
}
