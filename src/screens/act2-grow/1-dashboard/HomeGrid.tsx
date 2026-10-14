import { Bell, ChevronRight, Home, ReceiptText, Store, User, UtensilsCrossed } from 'lucide-react'
import { salesSummary } from '@/ai/navigator/insights.ts'
import { GRID } from '@/ai/navigator/openPage.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { GRID_ICONS } from './gridIcons.ts'
import type { PanelProps } from './props.ts'

const EXAMPLES = ['sales', 'forecast', 'promo', 'soldOut', 'feedback'] as const
const NAV_ICONS = [Home, ReceiptText, UtensilsCrossed, User]
const t = th.act2.homeScreen

export function HomeGrid({ highlight, change, ask }: PanelProps) {
  const shop = getMerchant()
  const sales = salesSummary(shop)
  return (
    <>
      <header className="flex min-h-16 items-center gap-3 border-b border-line bg-surface px-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ok-bg text-action">
          <Store className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight font-bold">{shop.storeName}</p>
          <p className="flex items-center gap-1.5 text-sm text-action">
            <span className="size-2 rounded-full bg-grab" aria-hidden />
            {t.open} · {th.act2.sample}
          </p>
        </div>
        <span className="flex size-12 items-center justify-center text-ink" title={t.bell}>
          <Bell className="size-6" aria-hidden />
          <span className="sr-only">{t.bell}</span>
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas pb-3">
        <button type="button" data-nav="see-insights" onClick={() => change({ screen: 'INSIGHTS' })} className="mx-4 mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-line active:bg-ok-bg">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-muted">{t.sales7}</p>
            <p className="text-money font-bold tabular-nums">{formatTHB(sales.totalTHB)}</p>
            <p className="text-sm font-bold text-action">{t.change(sales.changePct)}</p>
          </div>
          <span className="flex items-center gap-0.5 text-sm font-bold text-action">
            {t.seeInsights}
            <ChevronRight className="size-5" aria-hidden />
          </span>
        </button>

        <ul className="mx-4 grid grid-cols-4 gap-x-1 gap-y-2 rounded-2xl bg-surface px-1 py-3 ring-1 ring-line">
          {GRID.map(({ id, label, opens }) => {
            // Every item opens: four are built for the demo, the rest say what they are for (GrabMerchant's own order).
            const Icon = GRID_ICONS[id]
            return (
              <li key={id}>
                <button
                  type="button"
                  data-nav={`grid-${id}`}
                  onClick={() => change({ screen: opens ?? 'PAGE', page: id, sub: null })}
                  className={`flex min-h-22 w-full cursor-pointer flex-col items-center justify-start gap-1 rounded-xl px-0.5 pt-1 text-center text-sm leading-tight text-balance active:bg-ok-bg ${mark(highlight, `grid-${id}`)}`}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-ok-bg">
                    <Icon className="size-6 text-action" aria-hidden />
                  </span>
                  {label}
                </button>
              </li>
            )
          })}
        </ul>

        <section className="mx-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <h2 className="font-bold">{t.aiTitle}</h2>
          <p className="text-sm text-ink-muted">{t.aiBody}</p>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {EXAMPLES.map((id) => (
              <Chip key={id} onClick={() => ask(th.act2.ask[id])}>
                <span className="whitespace-nowrap">{th.act2.chips[id]}</span>
              </Chip>
            ))}
          </div>
        </section>
      </main>

      <nav className="order-last grid grid-cols-4 border-t border-line bg-surface" aria-hidden>
        {th.h1.nav.map((label, index) => {
          const Icon = NAV_ICONS[index]
          return (
            <span key={label} className={`flex min-h-14 flex-col items-center justify-center text-sm ${index === 0 ? 'font-bold text-action' : 'text-ink-muted'}`}>
              <Icon className="size-5" />
              {label}
            </span>
          )
        })}
      </nav>
    </>
  )
}
