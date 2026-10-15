import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field } from '@/components/grab/Field.tsx'
import { inputClass } from '@/components/grab/inputClass.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { checkEmail, checkPassword, MIN_PASSWORD_LENGTH } from '@/lib/account.ts'

const FORM_ID = 'account-form'
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 2/7 ตั้งค่าอีเมลและรหัสผ่าน. Typed only: the companion never takes these by ear, and looks away from the password. */
export function S2Account() {
  const { state, dispatch } = useJourney()
  const [email, setEmail] = useState(state.email ?? '')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [remember, setRemember] = useState(true)
  const [tried, setTried] = useState(false)
  const [inPassword, setInPassword] = useState(false)

  const emailProblem = checkEmail(email)
  const passwordProblem = checkPassword(password, true)
  const emailError = tried && emailProblem ? (emailProblem === 'empty' ? th.account.emailEmpty : th.account.emailInvalid) : null
  const passwordError = tried && passwordProblem ? (passwordProblem === 'empty' ? th.account.passwordEmpty : th.account.passwordShort(MIN_PASSWORD_LENGTH)) : null

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    setTried(true)
    if (emailProblem || passwordProblem) return
    dispatch({ type: 'ACCOUNT_SET', email: email.trim(), at: Date.now() })
  }

  // Once both boxes are right the page is done: say so instead of repeating how to fill it.
  const line =
    emailError ?? passwordError ?? (!emailProblem && !passwordProblem ? th.s2.done : inPassword ? th.account.bubblePrivate : !emailProblem ? th.s2.passwordLeft : th.s2.helper)

  const { mic, notice, choices, toggleMic } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'next') submit()
      if (command === 'back') dispatch({ type: 'BACK' })
      return command ? true : th.s2.typeItYourself
    },
    // Inert by design: interpret never returns false (unmatched speech gets the type-it-yourself line), so the matcher does not run here.
    { understanding: { screen: 'S2_ACCOUNT' } },
  )

  return (
    <StepShell
      step={2}
      title={th.s2.title}
      subtitle={th.s2.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar
            text={line}
            notice={notice}
            mic={inPassword ? 'private' : mic}
            onAvatar={inPassword ? undefined : toggleMic}
            choices={choices}
          />
          <Button type="submit" form={FORM_ID} fullWidth>
            {th.common.next}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Field id="account-email" label={th.account.email} required error={emailError}>
          <input
            id="account-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={th.account.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass(Boolean(emailError))}
          />
        </Field>
        <Field id="account-password" label={th.account.password} required hint={th.account.passwordHint(MIN_PASSWORD_LENGTH)} error={passwordError}>
          <div className="relative">
            <input
              id="account-password"
              type={shown ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setInPassword(true)}
              onBlur={() => setInPassword(false)}
              className={`${inputClass(Boolean(passwordError))} pr-14`}
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShown((value) => !value)}
              aria-label={shown ? th.account.hidePassword : th.account.showPassword}
              aria-pressed={shown}
              className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center text-ink-muted"
            >
              {shown ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
            </button>
          </div>
        </Field>
        <label className="flex min-h-12 items-center justify-between gap-3 text-base">
          {th.s2.remember}
          <input type="checkbox" role="switch" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-7 w-12 accent-action" />
        </label>
      </form>
    </StepShell>
  )
}
