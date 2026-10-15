import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { extractProfile, HOURS_CONFIDENCE } from '@/ai/onboarding/extractProfile.ts'
import { parseDays } from '@/ai/onboarding/parsers/thaiTime.ts'
import { SubmissionBlockedError, saveSetup } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { withChoices } from '@/components/assistant/companionState.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import type { OpeningHours, Weekday } from '@/types/domain.ts'

const landmarks = getLandmarks()
const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
// Every half hour from 05:00 to 23:30, plus midnight.
const TIMES = [...Array.from({ length: 38 }, (_, index) => {
  const minutes = 5 * 60 + index * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}), '00:00']
const COMMANDS = [{ id: 'back' as const, phrases: SAY.back }]

/** H3 เวลาเปิด-ปิด: said, chosen from chips, or picked. Saved through the set-up guardrail. */
export function H3Hours() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.hours
  const hours: OpeningHours = field.value ?? { open: '', close: '', closedDays: [] }
  const [talking, setTalking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const set = (change: Partial<OpeningHours>) =>
    dispatch({ type: 'FILL', updates: { hours: { value: { ...hours, ...change }, confidence: 1, heardFrom: TYPED } }, at: Date.now() })

  const { mic, transcript, notice, choices, toggleMic, hear } = useVoiceInput(
    (text) => {
      if (matchCommand(text, COMMANDS) === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      const updates = extractProfile(text, { expecting: 'hours', landmarks })
      if (!updates.hours) {
        // Only the days: "เปิดจันทร์ถึงศุกร์ ที่เหลือหยุด" ticks Saturday and Sunday and keeps the times already set.
        const closedDays = parseDays(text)
        if (!closedDays) return false
        dispatch({ type: 'FILL', updates: { hours: { value: { ...hours, closedDays }, confidence: HOURS_CONFIDENCE, heardFrom: text } }, at: Date.now() })
        return th.h3.closedHeard(closedDays.map((day) => th.h3.dayNames[day]).join(' '))
      }
      // Times said on their own keep the days off already set ("…ที่เหลือหยุด", then "แปดโมงถึงห้าโมงเย็น").
      const said = parseDays(text) === null ? { ...updates.hours, value: { ...updates.hours.value, closedDays: hours.closedDays } } : updates.hours
      dispatch({ type: 'FILL', updates: { hours: said }, at: Date.now() })
      return true
    },
    { understanding: { screen: 'H3' } },
  )

  const save = async () => {
    setSaving(true)
    setProblem(null)
    try {
      await saveSetup('hours', state.profile)
      dispatch({ type: 'SETUP_SAVED', part: 'hours', profile: state.profile })
    } catch (caught) {
      if (!mounted.current) return
      setProblem(caught instanceof SubmissionBlockedError ? caught.failed[0].message : th.h3.apiError)
    }
    if (mounted.current) setSaving(false)
  }

  const mark = fieldMark(field)
  const check = needsAmber(field) ? () => dispatch({ type: 'CONFIRM_FIELD', field: 'hours' }) : null
  const timeOptions = TIMES.map((time) => ({ value: time, label: `${time} น.` }))

  return (
    <StepShell
      heading={th.h3.title}
      title={th.h3.title}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={problem ?? th.h3.helper} notice={notice} mic={mic} onAvatar={toggleMic} choices={choices} action={{ kind: 'mic', label: th.h3.talk, onPress: () => setTalking(true) }} />
          <Button fullWidth disabled={!hours.open || !hours.close} loading={saving} onClick={save}>
            {saving ? th.h3.saving : th.h3.save}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field id="h3-open" label={th.h3.open} required mark={mark} onCheck={check}>
          <Select id="h3-open" value={hours.open} placeholder={th.h3.timePlaceholder} options={timeOptions} onChange={(open) => set({ open })} />
        </Field>
        <Field id="h3-close" label={th.h3.close} required mark={mark}>
          <Select id="h3-close" value={hours.close} placeholder={th.h3.timePlaceholder} options={timeOptions} onChange={(close) => set({ close })} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-bold">{th.h3.closedDays}</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const closed = hours.closedDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={closed}
                onClick={() => set({ closedDays: closed ? hours.closedDays.filter((d) => d !== day) : [...hours.closedDays, day] })}
                className={`min-h-12 min-w-12 cursor-pointer rounded-full px-3 font-bold ring-1 ${closed ? 'bg-action text-white ring-action' : 'bg-surface ring-line'}`}
              >
                {th.h3.days[day]}
              </button>
            )
          })}
        </div>
      </fieldset>
      <TalkSheet
        open={talking}
        onClose={() => setTalking(false)}
        notice={notice}
        question={th.h3.helper}
        chips={withChoices(
          [th.chips.hoursFullDay, th.chips.hoursMorning].map((label) => ({ label, onPress: () => hear(label) })),
          choices,
        )}
        transcript={transcript}
        mic={mic}
        onMic={toggleMic}
        onType={hear}
      />
    </StepShell>
  )
}
