import { Bot, Calculator, ChartColumn, CircleHelp, Link2, Megaphone, MessageSquareText, ReceiptText, ShoppingBasket, Store, UtensilsCrossed, Users, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
import type { NavScreen } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import type { PanelProps } from './props.ts'

// GrabMerchant's home, in the order of the real app. Only four open a screen; the rest are there to look real.
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

export function HomeGrid({ highlight, change, ask }: PanelProps) {
  return (
    <>
      <AppHeader title={getMerchant().storeName} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={th.act2.helper}>
          {EXAMPLES.map((id) => (
            <Chip key={id} onClick={() => ask(th.act2.ask[id])}>
              <span className="whitespace-nowrap">{th.act2.chips[id]}</span>
            </Chip>
          ))}
        </div>
        <ul className="grid grid-cols-3 gap-3">
          {ITEMS.map(({ id, Icon, opens }, index) => (
            <li key={id}>
              <button
                type="button"
                data-nav={`grid-${id}`}
                aria-disabled={!opens}
                onClick={() => opens && change({ screen: opens })}
                className={`flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-surface p-2 text-center text-sm ring-1 ring-line ${opens ? 'cursor-pointer active:bg-ok-bg' : 'cursor-default opacity-70'} ${mark(highlight, `grid-${id}`)}`}
              >
                <Icon className="size-7 text-action" aria-hidden />
                {th.act2.grid[index]}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
