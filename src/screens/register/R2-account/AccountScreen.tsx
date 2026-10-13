import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { TextField } from '@/components/ui/TextField.tsx'
import { th } from '@/copy/th.ts'
import { checkEmail, checkPassword, MIN_PASSWORD_LENGTH } from '@/lib/account.ts'

const SIGN_IN_MS = 600
const FORM_ID = 'account-form'
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** Email and password, for both new and returning merchants. The companion looks away from the password. */
export function AccountScreen() {
  const { state, dispatch } = useJourney()
  const isNew = state.authMode === 'register'
  const [email, setEmail] = useState(state.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [inPassword, setInPassword] = useState(false)
  const [working, setWorking] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const signingIn = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(signingIn.current), [])

  const emailProblem = checkEmail(email)
  const passwordProblem = checkPassword(password, isNew)
  const emailError = !touched.email || !emailProblem ? null : emailProblem === 'empty' ? th.account.emailEmpty : th.account.emailInvalid
  const passwordError =
    !touched.password || !passwordProblem
      ? null
      : passwordProblem === 'empty'
        ? th.account.passwordEmpty
        : th.account.passwordShort(MIN_PASSWORD_LENGTH)

  // The companion never takes an email or password by ear; it only presses the buttons.
  const { mic, transcript, notice, toggleMic } = useVoiceInput((text) => {
    const command = matchCommand(text, COMMANDS)
    if (command === 'next') form.current?.requestSubmit()
    if (command === 'back') dispatch({ type: 'GO', screen: 'R1_WELCOME' })
    return command ? true : th.account.typeItYourself
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (emailProblem) return emailInput.current?.focus()
    if (passwordProblem) return passwordInput.current?.focus()
    setWorking(true)
    // Prototype: there is no real account service. The password stays in this screen and is dropped here.
    signingIn.current = window.setTimeout(() => dispatch({ type: 'AUTHENTICATED', email: email.trim() }), SIGN_IN_MS)
  }

  return (
    <OnboardingShell
      title={isNew ? th.account.registerTitle : th.account.loginTitle}
      progress={isNew ? th.common.step(1, 2) : undefined}
      onBack={() => dispatch({ type: 'GO', screen: 'R1_WELCOME' })}
      dock={
        <CompanionDock
          text={emailError ?? passwordError ?? (inPassword ? th.account.bubblePrivate : isNew ? th.account.bubbleRegister : th.account.bubbleLogin)}
          notice={notice}
          hint={inPassword || mic === 'error' ? undefined : MIC_LABELS[mic]}
          heard={transcript}
          state={inPassword ? 'private' : mic}
          onPress={toggleMic}
          actions={
            <Button type="submit" form={FORM_ID} fullWidth loading={working}>
              {working ? th.account.working : isNew ? th.common.next : th.account.signIn}
            </Button>
          }
        />
      }
    >
      <form ref={form} id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <TextField
          ref={emailInput}
          id="account-email"
          label={th.account.email}
          type="email"
          inputMode="email"
          autoComplete={isNew ? 'email' : 'username'}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={th.account.emailPlaceholder}
          value={email}
          error={emailError}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched((seen) => ({ ...seen, email: true }))}
        />
        <TextField
          ref={passwordInput}
          id="account-password"
          label={th.account.password}
          type={showPassword ? 'text' : 'password'}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          value={password}
          hint={isNew ? th.account.passwordHint(MIN_PASSWORD_LENGTH) : undefined}
          error={passwordError}
          onChange={(event) => setPassword(event.target.value)}
          onFocus={() => setInPassword(true)}
          onBlur={() => {
            setInPassword(false)
            setTouched((seen) => ({ ...seen, password: true }))
          }}
          trailing={
            <button
              type="button"
              // Keep the caret in the password box while toggling.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? th.account.hidePassword : th.account.showPassword}
              aria-pressed={showPassword}
              className="flex size-12 cursor-pointer items-center justify-center rounded-xl text-ink-muted active:bg-canvas"
            >
              {showPassword ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
            </button>
          }
        />
        <Button variant="ghost" className="self-start px-0!" onClick={() => dispatch({ type: 'CHOOSE_AUTH', mode: isNew ? 'login' : 'register' })}>
          {isNew ? th.account.haveAccount : th.account.noAccount}
        </Button>
      </form>
    </OnboardingShell>
  )
}
