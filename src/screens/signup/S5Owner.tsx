import { Info } from 'lucide-react'
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
import { formatIdNumber, formatThaiDate } from '@/lib/format.ts'
import type { OwnerIdentity } from '@/types/domain.ts'

const EMPTY_OWNER: OwnerIdentity = { title: '', name: '', idNumber: '', birthDate: '', idExpiry: '' }
const COMMANDS = [
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 5/7 ข้อมูลของคุณ: one photo of the ID card fills the page. Numbers are never taken by ear. */
export function S5Owner() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.owner
  const owner = field.value ?? EMPTY_OWNER
  const mark = fieldMark(field)
  const [scanning, setScanning] = useState(false)
  const status = stepStatus(state.profile, 5)

  // Editing any box keeps the rest; the owner is one field in the profile.
  const edit = (part: keyof OwnerIdentity) => (value: string) =>
    dispatch({ type: 'FILL', updates: { owner: { value: { ...owner, [part]: value }, confidence: 1, heardFrom: TYPED } }, at: Date.now() })

  const { mic, notice, choices, toggleMic, stop, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'shoot') setScanning(true)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    // The sheet speaks its own lines: keep the mic shut, and shut it again on its own, while it is up.
    { autoListen: !scanning, understanding: { screen: 'S5' } },
  )

  const openScan = () => {
    stop()
    setScanning(true)
  }

  const idError = status.issues.some((issue) => issue.problem === 'idInvalid') ? th.grab.problems.idInvalid : null
  const helper = field.status === 'empty' ? th.s5.helper : status.valid ? th.s3.helperDone : problemText(status.issues[0])

  return (
    <StepShell
      step={5}
      title={th.s5.title}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} choices={choices} action={{ kind: 'camera', label: th.s5.scan, onPress: openScan }} />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <p className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-base">
        <Info className="mt-0.5 size-5 shrink-0 text-action" aria-hidden />
        {th.s5.note}
      </p>
      {needsAmber(field) && (
        <Button variant="secondary" onClick={() => dispatch({ type: 'CONFIRM_FIELD', field: 'owner' })}>
          {th.grab.looksRight}
        </Button>
      )}
      <Field id="s5-id" label={th.s5.idNumber} required mark={mark} error={idError}>
        <input
          id="s5-id"
          inputMode="numeric"
          autoComplete="off"
          value={owner.idNumber.length === 13 ? formatIdNumber(owner.idNumber) : owner.idNumber}
          onChange={(event) => edit('idNumber')(event.target.value.replace(/\D/g, '').slice(0, 13))}
          className={inputClass(Boolean(idError))}
        />
      </Field>
      <Field id="s5-title" label={th.s5.title_} required mark={mark}>
        <Select id="s5-title" value={owner.title} placeholder={th.s5.titlePlaceholder} options={th.s5.titles.map((title) => ({ value: title, label: title }))} onChange={edit('title')} />
      </Field>
      <Field id="s5-name" label={th.s5.name} required hint={th.s5.nameHint} mark={mark}>
        <input id="s5-name" autoComplete="name" value={owner.name} onChange={(event) => edit('name')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s5-birth" label={th.s5.birthDate} required mark={mark}>
        <input id="s5-birth" type="date" value={owner.birthDate} onChange={(event) => edit('birthDate')(event.target.value)} className={inputClass()} />
        {owner.birthDate && <p className="mt-1 text-base">{th.s5.asThai(formatThaiDate(owner.birthDate))}</p>}
      </Field>
      <Field id="s5-expiry" label={th.s5.idExpiry} required mark={mark}>
        <input id="s5-expiry" type="date" value={owner.idExpiry} onChange={(event) => edit('idExpiry')(event.target.value)} className={inputClass()} />
        {owner.idExpiry && <p className="mt-1 text-base">{th.s5.asThai(formatThaiDate(owner.idExpiry))}</p>}
      </Field>

      <ScanSheet
        open={scanning}
        doc="idCard"
        onClose={() => setScanning(false)}
        onUse={(scan) => {
          dispatch({ type: 'FILL', updates: scanToUpdates(scan), at: Date.now() })
          setScanning(false)
        }}
      />
    </StepShell>
  )
}
