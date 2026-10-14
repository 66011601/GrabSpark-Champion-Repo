import { Bell, Bot, Calculator, ChartColumn, ChevronRight, CircleHelp, Home, Link2, Megaphone, MessageSquareText, ReceiptText, ShoppingBasket, Store, User, UtensilsCrossed, Users, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
import { salesSummary } from '@/ai/navigator/insights.ts'
import type { NavScreen } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import type { PanelProps } from './props.ts'

// GrabMerchant's home, in the order of the real app (merchant.grab.com guide "วิธีการใช้แอป GrabMerchant เบื้องต้น").
// Only four open a screen in this demo; the rest are there so the home looks like the one owners know.
const ITEMS: { id: string; Icon: ComponentType<{ className?: string }>; opens?: NavScreen }[] = [
  { id: 'orders', Icon: ReceiptText },
  { id: 'menu', Icon: UtensilsCrossed, opens: 'MENU' },
  { id: 'shop', Icon: Store },
  { id: 'boost', Icon: Megaphone, opens: 'BOOST' },
  { id: 'staff', Icon: Users },
  { id: 'grabshop', Icon: ShoppingBasket },
  { id: 'ai', Icon: Bot },
  { id: 'insights', Icon: ChartColumn, opens: 'INSIGHTS' },
  { id: 'feedback', Icon: MessageSquareText, opens: 'FEEDBACK' },
  { id: 'cashier', Icon: Calculator },
  { id: 'express', Icon: Zap },
  { id: 'smartlink', Icon: Link2 },
  { id: 'help', Icon: CircleHelp },
]

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
        <button type="button" onClick={() => change({ screen: 'INSIGHTS' })} className="mx-4 mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-line active:bg-ok-bg">
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
          {ITEMS.map(({ id, Icon, opens }, index) => (
            <li key={id}>
              <button
                type="button"
                data-nav={`grid-${id}`}
                aria-disabled={!opens}
                onClick={() => opens && change({ screen: opens })}
                className={`flex min-h-22 w-full flex-col items-center justify-start gap-1 rounded-xl px-0.5 pt-1 text-center text-sm leading-tight text-balance ${opens ? 'cursor-pointer active:bg-ok-bg' : 'cursor-default'} ${mark(highlight, `grid-${id}`)}`}
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-ok-bg">
                  <Icon className="size-6 text-action" aria-hidden />
                </span>
                {th.act2.grid[index]}
              </button>
            </li>
          ))}
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
