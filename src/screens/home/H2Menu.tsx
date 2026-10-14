import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { SubmissionBlockedError, saveSetup } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { ScanSheet } from '@/components/scan/ScanSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getLandmarks } from '@/services/merchantApi.ts'

const landmarks = getLandmarks()
const COMMANDS = [
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'back' as const, phrases: SAY.back },
]

/** H2 เพิ่มเมนู: from a photo of the paper menu, by voice, or typed. Saved through the set-up guardrail. */
export function H2Menu() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.menu
  const items = field.value ?? []
  const [scanning, setScanning] = useState(false)
  const [talking, setTalking] = useState(false)
  const [dish, setDish] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const { mic, transcript, notice, toggleMic, hear, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'shoot') {
        setScanning(true)
        return true
      }
      if (command === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      const updates = extractProfile(text, { expecting: 'menu', landmarks })
      if (!updates.menu) return false
      dispatch({ type: 'FILL', updates: { menu: updates.menu }, at: Date.now() })
      return true
    },
    { autoListen: talking },
  )

  const add = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(price)
    if (!dish.trim() || !(amount > 0)) return
    dispatch({ type: 'FILL', updates: { menu: { value: [{ name: dish.trim(), priceTHB: amount }], confidence: 1, heardFrom: TYPED } }, at: Date.now() })
    setDish('')
    setPrice('')
  }
  const save = async () => {
    setSaving(true)
    setProblem(null)
    try {
      await saveSetup('menu', state.profile)
      dispatch({ type: 'SETUP_SAVED', part: 'menu', profile: state.profile })
    } catch (caught) {
      if (!mounted.current) return
      setProblem(caught instanceof SubmissionBlockedError ? caught.failed[0].message : th.h2.apiError)
    }
    if (mounted.current) setSaving(false)
  }

  return (
    <StepShell
      heading={th.h2.title}
      title={th.h2.title}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={problem ?? th.h2.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} action={{ kind: 'camera', label: th.h2.scan, onPress: () => setScanning(true) }} />
          <div className="flex gap-2">
            <Button variant="secondary" className="px-4!" onClick={() => setTalking(true)}>
              {th.h2.talk}
            </Button>
            <Button className="min-w-0 flex-1" disabled={items.length === 0} loading={saving} onClick={save}>
              {saving ? th.h2.saving : th.h2.save}
            </Button>
          </div>
        </>
      }
    >
      <Field id="h2-menu" label={th.fields.menu} required mark={fieldMark(field)} onCheck={needsAmber(field) ? () => dispatch({ type: 'CONFIRM_FIELD', field: 'menu' }) : null}>
        {items.length === 0 ? (
          <p id="h2-menu" className="text-ink-muted">
            {th.h2.empty}
          </p>
        ) : (
          <ul id="h2-menu" className="divide-y divide-line rounded-xl bg-surface ring-1 ring-line">
            {items.map((item) => (
              <li key={item.name} className="flex min-h-14 items-center gap-3 pl-4">
                <span className="min-w-0 flex-1">{item.name}</span>
                <span className="font-bold">{formatTHB(item.priceTHB)}</span>
                <button type="button" onClick={() => dispatch({ type: 'REMOVE_MENU_ITEM', name: item.name })} aria-label={th.h2.remove(item.name)} className="flex size-12 shrink-0 cursor-pointer items-center justify-center text-ink-muted">
                  <X className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <form onSubmit={add} className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-base font-bold">
          {th.h2.dish}
          <input value={dish} onChange={(event) => setDish(event.target.value)} className={inputClass()} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-base font-bold">
          {th.h2.price}
          <input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))} className={inputClass()} />
        </label>
        <Button type="submit" variant="secondary" aria-label={th.h2.add} icon={<Plus className="size-6" aria-hidden />} className="px-3!" />
      </form>

      <ScanSheet
        open={scanning}
        doc="menu"
        onClose={() => setScanning(false)}
        onUse={(scan) => {
          // The paper menu fills the menu only: the shop's name and food type were settled at sign-up.
          const { menu } = scanToUpdates(scan)
          if (menu) dispatch({ type: 'FILL', updates: { menu }, at: Date.now() })
          setScanning(false)
        }}
      />
      <TalkSheet open={talking} onClose={() => setTalking(false)} question={th.h2.talkQuestion} transcript={transcript} mic={mic} onMic={toggleMic} onType={hear} />
    </StepShell>
  )
}
