import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { submittedDemoProfile } from '@/app/demo/demoProfile.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field } from '@/components/grab/Field.tsx'
import { inputClass } from '@/components/grab/inputClass.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { checkEmail, checkPassword } from '@/lib/account.ts'

const SIGN_IN_MS = 600
const FORM_ID = 'login-form'

/** A returning merchant: typed email and password only. Lands on Home with the sample shop already submitted. */
export function L1Login() {
  const { dispatch } = useJourney()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [tried, setTried] = useState(false)
  const [inPassword, setInPassword] = useState(false)
  const [working, setWorking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const emailProblem = checkEmail(email)
  const passwordProblem = checkPassword(password, false)
  const emailError = tried && emailProblem ? (emailProblem === 'empty' ? th.account.emailEmpty : th.account.emailInvalid) : null
  const passwordError = tried && passwordProblem ? th.account.passwordEmpty : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (emailProblem || passwordProblem) return
    setWorking(true)
    // Prototype: no real account service. The password stays in this screen and is dropped here.
    timer.current = window.setTimeout(() => {
      const profile = submittedDemoProfile()
      dispatch({ type: 'LOGGED_IN', email: email.trim(), profile, at: Date.now() })
    }, SIGN_IN_MS)
  }

  return (
    <StepShell
      heading={th.login.title}
      title={th.login.title}
      subtitle={th.login.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={emailError ?? passwordError ?? (inPassword ? th.account.bubblePrivate : th.login.helper)} mic={inPassword ? 'private' : 'idle'} />
          <Button type="submit" form={FORM_ID} fullWidth loading={working}>
            {working ? th.account.working : th.login.submit}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Field id="login-email" label={th.account.email} required error={emailError}>
          <input id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
            placeholder={th.account.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass(Boolean(emailError))} />
        </Field>
        <Field id="login-password" label={th.account.password} required error={passwordError}>
          <div className="relative">
            <input id="login-password" type={shown ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} onFocus={() => setInPassword(true)} onBlur={() => setInPassword(false)}
              className={`${inputClass(Boolean(passwordError))} pr-14`} />
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShown((value) => !value)}
              aria-label={shown ? th.account.hidePassword : th.account.showPassword} aria-pressed={shown}
              className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center text-ink-muted">
              {shown ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
            </button>
          </div>
        </Field>
      </form>
    </StepShell>
  )
}
