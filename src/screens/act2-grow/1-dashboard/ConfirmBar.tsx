import { useState } from 'react'
import { ActionBlockedError, confirmDraft, stopPromo } from '@/ai/guardrail/confirmAndExecute.ts'
import { draftChecks } from '@/ai/guardrail/checks.ts'
import type { Draft } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'

type State = 'idle' | 'working' | 'failed' | 'blocked'

/**
 * The one place Act 2 sends anything. The AI prepares the draft; only this tap confirms it.
 * It stays disabled while a safety check fails, and nothing changes until the tap.
 */
export function ConfirmBar({ draft, label, highlight, onDone }: { draft: Draft; label: string; highlight: string | null; onDone: () => void }) {
  const [state, setState] = useState<State>('idle')
  const blocked = draftChecks(draft, getMerchant()).some((check) => !check.pass)

  const confirm = async () => {
    setState('working')
    try {
      await confirmDraft(draft, getMerchant())
      onDone()
    } catch (error) {
      setState(error instanceof ActionBlockedError ? 'blocked' : 'failed')
    }
  }

  return (
    <div data-nav="confirm" className={`sticky bottom-0 mt-3 flex flex-col gap-2 border-t border-line bg-surface px-4 pt-3 pb-3 ${mark(highlight, 'confirm')}`}>
      <p className="text-center text-ink-muted">{th.act2.confirm.note}</p>
      {(state === 'failed' || state === 'blocked') && (
        <p role="alert" className="rounded-xl bg-warn-bg p-3 text-warn-ink">
          {state === 'failed' ? th.act2.confirm.failed : th.act2.confirm.blocked}
        </p>
      )}
      <Button fullWidth disabled={blocked} loading={state === 'working'} onClick={confirm}>
        {state === 'working' ? th.act2.confirm.working : label}
      </Button>
    </div>
  )
}

/** "หยุดโปรนี้": always one tap away, as the spec promises. */
export function StopPromoButton({ promoId, onStopped }: { promoId: string; onStopped: () => void }) {
  const [working, setWorking] = useState(false)
  return (
    <Button
      variant="secondary"
      fullWidth
      loading={working}
      onClick={async () => {
        setWorking(true)
        try {
          await stopPromo(promoId)
          onStopped()
        } finally {
          setWorking(false)
        }
      }}
    >
      {th.act2.promo.stop}
    </Button>
  )
}
