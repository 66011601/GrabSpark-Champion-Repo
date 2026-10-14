import { CircleCheck } from 'lucide-react'
import { BACK_TIMES } from '@/ai/navigator/drafts.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import { ConfirmBar } from './ConfirmBar.tsx'
import type { PanelProps } from './props.ts'

const t = th.act2.soldOut

export function ItemMenu({ nav, highlight, change, pick, announce, home }: PanelProps) {
  const shop = getMerchant()
  const draft = nav.soldOut
  const item = shop.menu.find((entry) => entry.id === draft?.itemId)
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        {nav.done === 'soldOut' && item && (
          <p className="flex items-center gap-2 rounded-2xl bg-ok-bg p-4 text-lg font-bold ring-1 ring-action">
            <CircleCheck className="size-6 shrink-0 text-action" aria-hidden />
            {t.done(item.name)}
          </p>
        )}
        <ul className="divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
          {shop.menu.map((entry) => {
            const out = draft?.itemId === entry.id
            return (
              <li key={entry.id} data-nav={`item-${entry.id}`} className={`flex min-h-16 items-center gap-3 py-2 ${mark(highlight, `item-${entry.id}`)}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{entry.name}</p>
                  <p className={out ? 'font-bold text-warn-ink' : 'text-ink-muted'}>
                    {formatTHB(entry.priceTHB)} · {out ? t.out : t.available}
                  </p>
                </div>
                <button
                  type="button"
                  data-nav={`soldout-${entry.id}`}
                  disabled={out}
                  onClick={() => change({ soldOut: { kind: 'soldOut', itemId: entry.id, backAt: null }, done: null })}
                  className="min-h-14 shrink-0 cursor-pointer rounded-xl px-3 font-bold text-action ring-2 ring-action disabled:cursor-default disabled:text-ink-muted disabled:ring-line"
                >
                  {t.setSoldOut}
                </button>
              </li>
            )
          })}
        </ul>
        {draft && !draft.backAt && (
          <section data-nav="back-times" className={`flex flex-col gap-2 rounded-2xl bg-surface p-4 ring-1 ring-line ${mark(highlight, 'back-times')}`}>
            <p className="font-bold">{t.ask}</p>
            <div className="flex flex-wrap gap-2">
              {BACK_TIMES.map((time) => (
                <Chip key={time.id} onClick={() => pick(time.backAt)}>
                  {time.label}
                </Chip>
              ))}
            </div>
          </section>
        )}
        {draft?.backAt && nav.done !== 'soldOut' && (
          <>
            <p className="rounded-2xl bg-warn-bg p-4 text-warn-ink">{t.backAt(draft.backAt)}</p>
            <ConfirmBar draft={draft} label={t.confirm} highlight={highlight} onDone={() => {
                change({ done: 'soldOut' })
                announce(t.done(item?.name ?? ''))
              }} />
          </>
        )}
      </main>
    </>
  )
}
