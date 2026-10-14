import { CloudRain } from 'lucide-react'
import { rainForecast, salesSummary } from '@/ai/navigator/insights.ts'
import type { InsightsTab } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import type { PanelProps } from './props.ts'

const TABS: InsightsTab[] = ['overview', 'sales', 'trend']
const t = th.act2.insights

const tabClass = (on: boolean) => `min-h-14 flex-1 cursor-pointer rounded-xl px-2 font-bold ${on ? 'bg-action text-white' : 'bg-surface text-action ring-1 ring-line'}`

/** One bar per day or hour; `soft` is the lighter bar beside it (last week). */
function Bars({ labels, values, soft, peak }: { labels: string[]; values: number[]; soft?: number[]; peak: number }) {
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label={labels.map((label, i) => `${label} ${values[i]}`).join(', ')}>
      {values.map((value, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="flex h-28 w-full items-end gap-px">
            {soft && <div className="w-1/2 rounded-t bg-line" style={{ height: `${(soft[i] / peak) * 100}%` }} />}
            <div className={`rounded-t bg-grab ${soft ? 'w-1/2' : 'w-full'}`} style={{ height: `${(value / peak) * 100}%` }} />
          </div>
          <span className="text-xs text-ink-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function Insights({ nav, highlight, change, ask, home }: PanelProps) {
  const shop = getMerchant()
  const sales = salesSummary(shop)
  const rain = rainForecast(shop)
  const hours = Object.keys(shop.baselineOrdersByHour)
  const peak = Math.max(...shop.sales.thisWeekTHB, ...shop.sales.lastWeekTHB)
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        <div className="flex gap-2" role="tablist">
          {TABS.map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={nav.tab === tab} data-nav={`tab-${tab}`} onClick={() => change({ tab })} className={`${tabClass(nav.tab === tab)} ${mark(highlight, `tab-${tab}`)}`}>
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {nav.tab === 'overview' && <p className="rounded-2xl bg-surface p-4 text-ink-muted ring-1 ring-line">{t.overview}</p>}

        {nav.tab === 'sales' && (
          <>
            <div className="flex gap-2">
              {([7, 30] as const).map((days) => (
                <button key={days} type="button" data-nav={`period-${days}`} aria-pressed={nav.period === days} onClick={() => change({ period: days })} className={`${tabClass(nav.period === days)} ${mark(highlight, `period-${days}`)}`}>
                  {t.days(days)}
                </button>
              ))}
            </div>
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <p className="text-money font-bold">{formatTHB(sales.totalTHB)}</p>
              <p className="text-ink-muted">
                {nav.period === 7 ? t.thisWeek : t.days(30)} · {th.act2.sample}
              </p>
              <div className="mt-3">
                <Bars labels={shop.sales.days} values={shop.sales.thisWeekTHB} soft={nav.compare ? shop.sales.lastWeekTHB : undefined} peak={peak} />
              </div>
              <label data-nav="compare" className={`mt-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-2 ${mark(highlight, 'compare')}`}>
                <input type="checkbox" className="size-6 accent-action" checked={nav.compare} onChange={(event) => change({ compare: event.target.checked })} />
                <span>{t.compare}</span>
              </label>
              {nav.compare && (
                <p className="text-ink-muted">
                  {t.lastWeek} {formatTHB(sales.lastWeekTHB)} ({sales.changePct >= 0 ? '+' : ''}
                  {sales.changePct}%)
                </p>
              )}
            </section>
            <section data-nav="best-item" className={`rounded-2xl bg-ok-bg p-4 ${mark(highlight, 'best-item')}`}>
              <p className="text-sm font-bold text-action">{t.bestItem}</p>
              <p className="text-lg font-bold">{sales.best.name}</p>
              <p className="text-ink-muted">{sales.best.sold28d} จาน ใน 28 วัน</p>
            </section>
          </>
        )}

        {nav.tab === 'trend' && (
          <>
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <p className="font-bold">{t.normalOrders(rain.normal)}</p>
              <p className="text-ink-muted">{th.act2.sample}</p>
              <div className="mt-3">
                <Bars labels={hours} values={hours.map((hour) => shop.baselineOrdersByHour[hour])} peak={Math.max(...Object.values(shop.baselineOrdersByHour))} />
              </div>
              <button type="button" data-nav="rain" aria-pressed={nav.rain} onClick={() => change({ rain: !nav.rain })} className={`mt-3 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-bold ${nav.rain ? 'bg-action text-white' : 'bg-canvas text-action ring-1 ring-line'} ${mark(highlight, 'rain')}`}>
                <CloudRain className="size-6" aria-hidden />
                {t.rainToggle}
              </button>
            </section>
            {nav.rain && (
              <>
                <section data-nav="forecast-range" className={`rounded-2xl bg-ok-bg p-4 ${mark(highlight, 'forecast-range')}`}>
                  <p className="text-money font-bold">{t.forecast(...rain.range)}</p>
                  <p className="text-ink-muted">
                    {th.act2.estimate} · {th.act2.sample}
                  </p>
                </section>
                <section data-nav="prep" className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line ${mark(highlight, 'prep')}`}>
                  <p className="font-bold">{t.prep(...rain.prepPct)}</p>
                  <Button variant="secondary" fullWidth onClick={() => ask(th.act2.ask.promo)}>
                    {t.makePromo}
                  </Button>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
