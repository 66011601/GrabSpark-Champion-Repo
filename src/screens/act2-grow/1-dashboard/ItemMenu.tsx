import { CircleCheck, UtensilsCrossed } from 'lucide-react'
import { BACK_TIMES } from '@/ai/navigator/drafts.ts'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { mark } from '@/components/navigator/mark.ts'
import { Switch } from '@/components/ui/Switch.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import { ConfirmBar } from './ConfirmBar.tsx'
import type { PanelProps } from './props.ts'

const t = th.act2.soldOut

/**
 * GrabMerchant's menu: a green switch on each dish. Sliding it off asks how long ('วันนี้' or 'ไม่มีกำหนด'),
 * and nothing changes until the merchant taps ยืนยัน in that sheet.
 */
export function ItemMenu({ nav, highlight, change, pick, announce, home }: PanelProps) {
  const shop = getMerchant()
  const draft = nav.soldOut
  const item = shop.menu.find((entry) => entry.id === draft?.itemId)
  const done = nav.done === 'soldOut'
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas px-4 py-3">
        {done && item && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok-bg p-4 font-bold ring-1 ring-action">
            <CircleCheck className="size-6 shrink-0 text-action" aria-hidden />
            {t.done(item.name)}
          </p>
        )}
        <ul className="divide-y divide-line rounded-2xl bg-surface px-3 ring-1 ring-line">
          {shop.menu.map((entry) => {
            const drafting = draft?.itemId === entry.id
            const confirmed = nav.off[entry.id]
            const off = drafting || confirmed !== undefined
            const offLabel = BACK_TIMES.find((time) => time.id === (drafting && done ? draft?.until : confirmed))?.label
            return (
              <li key={entry.id} data-nav={`item-${entry.id}`} className={`flex items-center gap-3 py-2 ${mark(highlight, `item-${entry.id}`)}`}>
                <span className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${off ? 'bg-canvas text-field' : 'bg-ok-bg text-action'}`}>
                  <UtensilsCrossed className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`line-clamp-2 leading-snug font-bold ${off ? 'text-ink-muted' : ''}`}>{entry.name}</p>
                  <p className="text-sm">
                    <span className="tabular-nums">{formatTHB(entry.priceTHB)}</span>
                    {off && <span className="font-bold text-warn-ink"> · {offLabel ? `${t.out} ${offLabel}` : t.out}</span>}
                  </p>
                </div>
                <Switch
                  on={!off}
                  label={t.toggle(entry.name)}
                  disabled={drafting && !done}
                  // Off and confirmed: the merchant's own tap puts the dish back on sale.
                  onChange={() => (confirmed !== undefined ? change({ off: Object.fromEntries(Object.entries(nav.off).filter(([id]) => id !== entry.id)), soldOut: drafting ? null : draft, done: drafting ? null : nav.done }) : change({ soldOut: { kind: 'soldOut', itemId: entry.id, until: null }, done: null }))}
                  data-nav={`soldout-${entry.id}`}
                />
              </li>
            )
          })}
        </ul>
      </main>
      <BottomSheet open={Boolean(draft && item && !done)} title={t.sheetTitle} onClose={() => change({ soldOut: null })}>
        {draft && item && (
          <div className="flex flex-col gap-3">
            <p className="font-bold">{item.name}</p>
            <div role="radiogroup" aria-label={t.ask} data-nav="back-times" className={`flex flex-col gap-2 rounded-2xl ${mark(highlight, 'back-times')}`}>
              {BACK_TIMES.map((time) => {
                const on = draft.until === time.id
                return (
                  <button
                    key={time.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(time.id)}
                    className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-4 text-left ring-2 ${on ? 'bg-ok-bg ring-action' : 'bg-surface ring-line'}`}
                  >
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ring-2 ${on ? 'ring-action' : 'ring-field'}`}>{on && <span className="size-3 rounded-full bg-action" />}</span>
                    <span>
                      <span className="block font-bold">{time.label}</span>
                      <span className="block text-sm text-ink-muted">{time.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="-mx-4 -mb-6">
              <ConfirmBar
                draft={draft}
                label={t.confirm}
                highlight={highlight}
                onDone={() => {
                  change({ done: 'soldOut', off: { ...nav.off, [draft.itemId]: draft.until ?? 'indefinite' } })
                  announce(t.done(item.name))
                }}
              />
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
