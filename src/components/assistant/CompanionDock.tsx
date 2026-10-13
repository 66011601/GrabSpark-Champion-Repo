import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '@/copy/th.ts'
import { CompanionAvatar } from './CompanionAvatar.tsx'
import type { CompanionState } from './companionState.ts'

interface CompanionDockProps {
  text: string
  notice?: string | null // something went wrong; shown above the text, amber, with an icon
  hint?: string // a short line under the text, e.g. what pressing the avatar does
  state?: CompanionState
  onPress?: () => void
  extras?: ReactNode // answer chips, between the bubble and the bottom row
  actions?: ReactNode // the screen's main button(s), left of the avatar
  bare?: boolean // no top border, for screens that are not scrolled
}

function Bubble({ text, notice, hint, tail }: Pick<CompanionDockProps, 'text' | 'notice' | 'hint'> & { tail: 'down' | 'right' }) {
  return (
    <div className={`relative rounded-3xl rounded-br-md bg-ok-bg px-4 py-3 ${tail === 'right' ? 'max-w-full' : ''}`}>
      {notice && (
        <p role="status" className="mb-2 flex items-start gap-2 rounded-2xl bg-warn-bg px-3 py-2 text-base text-warn-ink">
          <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
          {notice}
        </p>
      )}
      <p key={text} aria-live="polite" className="animate-rise text-lg">
        <span className="sr-only">{th.companion.name}: </span>
        {text}
      </p>
      {hint && <p className="mt-1 text-sm font-medium text-action">{hint}</p>}
      <span
        className={`absolute size-4 rotate-45 bg-ok-bg ${tail === 'down' ? 'right-7 -bottom-1.5' : '-right-1.5 bottom-5'}`}
        aria-hidden
      />
    </div>
  )
}

/**
 * The bottom of every screen: what the companion is saying, and the companion itself,
 * always in the bottom-right corner. The screen's main button sits to its left.
 */
export function CompanionDock({ text, notice, hint, state, onPress, extras, actions, bare = false }: CompanionDockProps) {
  const avatar = <CompanionAvatar state={state} onPress={onPress} />
  return (
    <footer className={`flex flex-col gap-3 px-4 pt-3 pb-4 ${bare ? '' : 'border-t border-line bg-surface'}`}>
      {actions && <Bubble text={text} notice={notice} hint={hint} tail="down" />}
      {extras}
      <div className="flex items-end justify-end gap-3">
        {actions ? <div className="min-w-0 flex-1">{actions}</div> : <Bubble text={text} notice={notice} hint={hint} tail="right" />}
        {avatar}
      </div>
    </footer>
  )
}
