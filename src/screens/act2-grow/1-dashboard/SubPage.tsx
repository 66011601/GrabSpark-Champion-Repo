import { ChevronRight, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import type { NavButton } from '@/ai/navigator/buttons.ts'
import type { NavState, SubId } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { AppHeader } from './AppHeader.tsx'

/** A page's buttons as GrabMerchant lists them, under their headings. A tap changes the same state a spoken press does. */
export function ButtonList({ buttons, highlight, change }: { buttons: NavButton[]; highlight: string | null; change: (patch: Partial<NavState>) => void }) {
  return (
    <div className="flex w-full flex-col gap-2 text-left">
      {buttons.map((button, index) => (
        <div key={button.id} className="flex flex-col gap-2">
          {button.group && button.group !== buttons[index - 1]?.group && <h3 className="mt-2 font-bold text-ink-muted">{button.group}</h3>}
          <button
            type="button"
            data-nav={button.id}
            onClick={() => change(button.set)}
            className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-surface px-4 text-left text-lg font-bold ring-1 ring-line active:bg-ok-bg ${mark(highlight, button.id)}`}
          >
            <span className="flex-1">{button.label}</span>
            <ChevronRight className="size-5 text-ink-muted" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * The mock page behind a button. A draft that would change the shop waits for the owner's own tap,
 * and even then nothing is sent: it only says it worked.
 */
export function SubPage({ id, back, announce }: { id: SubId; back: () => void; announce: (line: string) => void }) {
  const copy = th.act2.subs[id]
  const [done, setDone] = useState(false)
  return (
    <>
      <AppHeader title={copy.title} onBack={back} />
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas px-4 py-3">
        <p className="text-lg">{copy.about}</p>
        {done && copy.done && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok-bg p-4 font-bold ring-1 ring-action">
            <CircleCheck className="size-6 shrink-0 text-action" aria-hidden />
            {copy.done}
          </p>
        )}
        <ul className="divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
          {copy.rows.map((row) => (
            <li key={row} className="py-3">
              {row}
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted">{th.act2.subNote}</p>
      </main>
      {copy.confirm && !done && (
        <footer className="flex flex-col gap-2 border-t border-line bg-surface px-4 pt-3 pb-3">
          <p className="text-sm text-ink-muted">{th.act2.confirm.note}</p>
          <Button
            fullWidth
            onClick={() => {
              setDone(true)
              announce(copy.done ?? '')
            }}
          >
            {copy.confirm}
          </Button>
        </footer>
      )}
    </>
  )
}
