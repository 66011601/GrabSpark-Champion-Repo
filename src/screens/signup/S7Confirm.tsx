import { Pencil, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { SubmissionBlockedError, submitProfile } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { SCREEN_FOR_STEP } from '@/app/journey/journeyMachine.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { speak } from '@/services/speech/textToSpeech.ts'
import type { Consents, GuardrailCheck } from '@/types/domain.ts'
import { confirmRows, confirmSpeech } from './confirmSummary.ts'

const READ_AFTER_MS = 150
const COMMANDS = [
  { id: 'listen' as const, phrases: SAY.listenSummary },
  { id: 'submit' as const, phrases: SAY.submit },
  { id: 'tick' as const, phrases: SAY.consentTick },
  { id: 'back' as const, phrases: SAY.back },
]

/** 7/7 คำยืนยัน: check the summary, tick both boxes and press ส่งใบสมัคร, all by the merchant's own hand. */
export function S7Confirm() {
  const { state, dispatch } = useJourney()
  const { profile, consents } = state
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<GuardrailCheck[]>([])
  const [apiError, setApiError] = useState(false)
  const mounted = useRef(true)
  const reading = useRef<number | undefined>(undefined)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(reading.current)
    }
  }, [])

  const readSummary = () => {
    reading.current = window.setTimeout(() => speak(confirmSpeech(profile)), READ_AFTER_MS)
  }
  const tick = (consent: keyof Consents) => (value: boolean) => dispatch({ type: 'SET_CONSENT', consent, value })

  // By voice the companion reads the summary; ticking and sending take the merchant's own tap.
  const { mic, notice, toggleMic } = useVoiceInput((text) => {
    const command = matchCommand(text, COMMANDS)
    if (command === 'listen') {
      readSummary()
      return true
    }
    if (command === 'submit' || command === 'tick') return th.s7.mustTap
    if (command === 'back') {
      dispatch({ type: 'BACK' })
      return true
    }
    return false
  })

  const send = async () => {
    setSending(true)
    setFailed([])
    setApiError(false)
    try {
      await submitProfile(profile, { phoneVerified: state.phoneVerified, consents, today: new Date().toISOString().slice(0, 10) })
      // Carries the profile that was sent: if it changed meanwhile, the journey ignores this.
      dispatch({ type: 'SUBMITTED', at: Date.now(), profile })
    } catch (caught) {
      if (!mounted.current) return
      if (caught instanceof SubmissionBlockedError) setFailed(caught.failed)
      else setApiError(true)
    }
    if (mounted.current) setSending(false)
  }

  return (
    <StepShell
      step={7}
      title={th.s7.title}
      subtitle={th.s7.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={th.s7.helper} notice={apiError ? th.s7.apiError : notice} mic={mic} onAvatar={toggleMic} />
          {failed.length > 0 && (
            <ul role="alert" className="flex flex-col gap-1 rounded-2xl bg-warn-bg p-3 text-base text-warn-ink">
              {failed.map((check) => (
                <li key={check.id}>{check.message}</li>
              ))}
            </ul>
          )}
          <Button fullWidth disabled={!consents.terms || !consents.accurate} loading={sending} onClick={send}>
            {sending ? th.s7.submitting : th.s7.submit}
          </Button>
        </>
      }
    >
      <section className="rounded-2xl ring-1 ring-line">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
          <h2 className="font-bold">{th.s7.summaryTitle}</h2>
          <Button variant="ghost" className="min-h-12! px-2!" icon={<Volume2 className="size-5" aria-hidden />} onClick={readSummary}>
            {th.s7.listen}
          </Button>
        </div>
        <ul className="divide-y divide-line">
          {confirmRows(profile).map((row) => (
            <li key={row.step} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-muted">{row.title}</p>
                {row.lines.map((line) => (
                  <p key={line} className="text-base">
                    {line}
                  </p>
                ))}
              </div>
              <Button variant="ghost" className="min-h-12! px-2!" aria-label={`${th.s7.edit} ${row.title}`} icon={<Pencil className="size-4" aria-hidden />} onClick={() => dispatch({ type: 'GO', screen: SCREEN_FOR_STEP[row.step] })}>
                {th.s7.edit}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {(['terms', 'accurate'] as const).map((consent) => (
        <label key={consent} className="flex min-h-12 cursor-pointer items-start gap-3 text-base">
          <input type="checkbox" checked={consents[consent]} onChange={(event) => tick(consent)(event.target.checked)} className="mt-1 size-6 shrink-0 accent-action" />
          <span>
            {consent === 'terms'
              ? th.s7.termsParts.map((part) =>
                  part.link ? (
                    <span key={part.text} className="text-action underline underline-offset-2">
                      {part.text}
                    </span>
                  ) : (
                    part.text
                  ),
                )
              : th.s7.accurate}
          </span>
        </label>
      ))}
    </StepShell>
  )
}
