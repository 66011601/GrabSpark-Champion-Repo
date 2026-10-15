import { CheckCircle2, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field } from '@/components/grab/Field.tsx'
import { inputClass } from '@/components/grab/inputClass.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatPhone } from '@/lib/format.ts'
import { getAccount } from '@/services/merchantApi.ts'
import { isValidPhone, MOCK_OTP, OTP_LENGTH, RESEND_SECONDS, SMS_ARRIVES_MS, verifyOtp } from '@/services/otp.ts'

const account = getAccount()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'yes' as const, phrases: SAY.yes },
]

/** 2/7 (continued): phone number, then the 6-digit OTP the companion reads from the mock SMS. */
export function S2Phone() {
  const { state, dispatch } = useJourney()
  const [stage, setStage] = useState<'phone' | 'otp'>(state.phoneVerified ? 'otp' : 'phone')
  const [phone, setPhone] = useState(state.profile.fields.phone.value ?? '')
  const [fromAccount, setFromAccount] = useState(false)
  const [code, setCode] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState(RESEND_SECONDS)
  const sms = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(sms.current), [])
  useEffect(() => {
    if (stage !== 'otp' || state.phoneVerified || left <= 0) return
    const tick = window.setTimeout(() => setLeft((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(tick)
  }, [stage, left, state.phoneVerified])

  const sendCode = () => {
    if (!isValidPhone(phone)) return setError(th.s2phone.phoneInvalid)
    setError(null)
    setStage('otp')
    setCode('')
    setAutoFilled(false)
    setLeft(RESEND_SECONDS)
    window.clearTimeout(sms.current)
    sms.current = window.setTimeout(() => {
      setCode(MOCK_OTP)
      setAutoFilled(true)
    }, SMS_ARRIVES_MS)
  }
  const takeAccountPhone = () => {
    setPhone(account.phone)
    setFromAccount(true)
    setError(null)
  }
  const next = () => {
    if (state.phoneVerified) return dispatch({ type: 'NEXT' })
    if (stage === 'phone') return sendCode()
    if (!verifyOtp(code)) return setError(th.s2phone.wrongCode)
    dispatch({ type: 'PHONE_VERIFIED', phone, heardFrom: fromAccount ? th.sources.account : th.sources.typed })
  }

  const { mic, notice, choices, toggleMic } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'yes' && stage === 'phone') takeAccountPhone()
      if (command === 'next') next()
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { understanding: { screen: 'S2_PHONE' } },
  )

  const helper = state.phoneVerified
    ? th.s2phone.helperVerified
    : stage === 'phone'
      ? th.s2phone.helperPhone
      : autoFilled
        ? th.s2phone.helperFilled
        : th.s2phone.helperWaiting

  return (
    <StepShell
      step={2}
      title={stage === 'phone' ? th.s2phone.title : th.s2phone.otpTitle}
      subtitle={stage === 'phone' ? th.s2phone.subtitle : th.s2phone.otpSubtitle(formatPhone(phone))}
      onBack={() => (stage === 'otp' && !state.phoneVerified ? setStage('phone') : dispatch({ type: 'BACK' }))}
      footer={
        <>
          <AiHelperBar text={error ?? helper} notice={notice} mic={mic} onAvatar={toggleMic} choices={choices} />
          <Button fullWidth disabled={stage === 'otp' && !state.phoneVerified && code.length !== OTP_LENGTH} onClick={next}>
            {stage === 'phone' ? th.s2phone.sendCode : th.common.next}
          </Button>
        </>
      }
    >
      {stage === 'phone' ? (
        <>
          <Field id="phone" label={th.s2phone.phone} required error={error}>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, ''))
                setFromAccount(false)
              }}
              className={inputClass(Boolean(error))}
            />
          </Field>
          <Chip onClick={takeAccountPhone}>
            <span className="flex items-center gap-2">
              <Smartphone className="size-5" aria-hidden />
              {th.s2phone.useThisPhone(account.maskedPhone)}
            </span>
          </Chip>
        </>
      ) : state.phoneVerified ? (
        <p className="flex items-center gap-2 text-lg font-bold text-action">
          <CheckCircle2 className="size-6" aria-hidden />
          {th.s2phone.verified}: {formatPhone(phone)}
        </p>
      ) : (
        <>
          <Field id="otp" label={th.s2phone.otpLabel} required error={error} mark={autoFilled ? { source: th.sources.sms, spoken: false } : null}>
            <div className="relative">
              <div className="flex justify-between gap-2" aria-hidden>
                {Array.from({ length: OTP_LENGTH }, (_, index) => (
                  <span
                    key={index}
                    className={`flex h-14 w-12 items-center justify-center rounded-xl border text-2xl font-bold ${code[index] ? 'border-action' : 'border-field'}`}
                  >
                    {code[index] ?? ''}
                  </span>
                ))}
              </div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''))
                  setAutoFilled(false)
                  setError(null)
                }}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
              />
            </div>
          </Field>
          {left > 0 ? (
            <p className="text-base text-ink-muted">{th.s2phone.resendIn(left)}</p>
          ) : (
            <Button variant="ghost" className="self-start px-0!" onClick={sendCode}>
              {th.s2phone.resend}
            </Button>
          )}
        </>
      )}
    </StepShell>
  )
}
