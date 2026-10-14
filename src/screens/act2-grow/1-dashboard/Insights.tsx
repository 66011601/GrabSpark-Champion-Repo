import { CloudRain, Star } from 'lucide-react'
import { menuShare, rainForecast, ratingSummary, salesSummary } from '@/ai/navigator/insights.ts'
import type { InsightsTab } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { Switch } from '@/components/ui/Switch.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import type { PanelProps } from './props.ts'
import { TabBar } from './TabBar.tsx'

const t = th.act2.insights
const TABS: { id: InsightsTab; label: string }[] = [
  { id: 'overview', label: t.tabs.overview },
  { id: 'sales', label: t.tabs.sales },
  { id: 'trend', label: t.tabs.trend },
]
const card = 'rounded-2xl bg-surface p-4 ring-1 ring-line'

/** One bar per day or hour; `soft` is the grey bar beside it (last week). */
function Bars({ labels, values, soft, peak }: { labels: string[]; values: number[]; soft?: number[]; peak: number }) {
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label={labels.map((label, i) => `${label} ${values[i]}`).join(', ')}>
      {values.map((value, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="flex h-28 w-full items-end justify-center gap-px">
            {soft && <div className="w-1/2 rounded-t bg-line" style={{ height: `${(soft[i] / peak) * 100}%` }} />}
            <div className={`rounded-t bg-grab ${soft ? 'w-1/2' : 'w-3/4'}`} style={{ height: `${(value / peak) * 100}%` }} />
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
  const rating = ratingSummary(shop)
  const shares = menuShare(shop)
  const hours = Object.keys(shop.baselineOrdersByHour)
  const peak = Math.max(...shop.sales.thisWeekTHB, ...shop.sales.lastWeekTHB)
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <TabBar tabs={TABS} current={nav.tab} onPick={(tab) => change({ tab })} highlight={highlight} navPrefix="tab" />
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas px-4 py-3">
        {nav.tab === 'overview' && (
          <>
            <p className="text-ink-muted">{t.overview}</p>
            <section className={card}>
              <p className="text-sm text-ink-muted">{th.act2.homeScreen.sales7}</p>
              <p className="text-money font-bold tabular-nums">{formatTHB(sales.totalTHB)}</p>
            </section>
            <div className="grid grid-cols-2 gap-3">
              <section className={card}>
                <p className="text-sm text-ink-muted">{t.ordersPerDay}</p>
                <p className="text-2xl font-bold tabular-nums">{rain.normal}</p>
              </section>
              <section className={card}>
                <p className="text-sm text-ink-muted">{t.rating}</p>
                <p className="flex items-center gap-1 text-2xl font-bold tabular-nums">
                  <Star className="size-5 fill-current text-warn-ink" aria-hidden />
                  {rating.average}
                </p>
              </section>
            </div>
          </>
        )}

        {nav.tab === 'sales' && (
          <>
            <div className="flex gap-2">
              {([7, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  data-nav={`period-${days}`}
                  aria-pressed={nav.period === days}
                  onClick={() => change({ period: days })}
                  className={`min-h-12 cursor-pointer rounded-full px-5 font-bold ${nav.period === days ? 'bg-action text-white' : 'bg-surface text-ink ring-1 ring-line'} ${mark(highlight, `period-${days}`)}`}
                >
                  {t.days(days)}
                </button>
              ))}
            </div>
            <section className={card}>
              <p className="text-sm text-ink-muted">
                {nav.period === 7 ? t.thisWeek : t.days(30)} · {th.act2.sample}
              </p>
              <p className="text-money font-bold tabular-nums">{formatTHB(sales.totalTHB)}</p>
              {nav.compare && (
                <p className="text-sm font-bold text-action">
                  {th.act2.homeScreen.change(sales.changePct)} ({t.lastWeek} {formatTHB(sales.lastWeekTHB)})
                </p>
              )}
              <div className="mt-3">
                <Bars labels={shop.sales.days} values={shop.sales.thisWeekTHB} soft={nav.compare ? shop.sales.lastWeekTHB : undefined} peak={peak} />
              </div>
              <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl pl-1 ${mark(highlight, 'compare')}`}>
                <span>{t.compare}</span>
                <Switch on={nav.compare} label={t.compare} onChange={(compare) => change({ compare })} data-nav="compare" />
              </div>
            </section>
            <section className={card}>
              <h2 className="font-bold">{t.menuPerformance}</h2>
              <p className="text-sm text-ink-muted">{t.last28}</p>
              <ol className="mt-2 flex flex-col gap-1">
                {shares.map((share, index) => (
                  <li key={share.id} data-nav={index === 0 ? 'best-item' : undefined} className={`flex items-center gap-3 rounded-xl py-2 ${index === 0 ? `bg-ok-bg px-2 ${mark(highlight, 'best-item')}` : 'px-2'}`}>
                    <span className={`w-6 text-center font-bold tabular-nums ${index === 0 ? 'text-action' : 'text-ink-muted'}`}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 leading-snug font-bold">{share.name}</p>
                      {index === 0 && <p className="text-sm font-bold text-action">{t.bestItem}</p>}
                    </div>
                    <span className="shrink-0 text-sm text-ink-muted tabular-nums">{t.share(share.pct, share.sold)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {nav.tab === 'trend' && (
          <>
            <section className={card}>
              <p className="font-bold">{t.normalOrders(rain.normal)}</p>
              <p className="text-sm text-ink-muted">{th.act2.sample}</p>
              <div className="mt-3">
                <Bars labels={hours} values={hours.map((hour) => shop.baselineOrdersByHour[hour])} peak={Math.max(...Object.values(shop.baselineOrdersByHour))} />
              </div>
              <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl pl-1 ${mark(highlight, 'rain')}`}>
                <span className="flex items-center gap-2">
                  <CloudRain className="size-6 text-action" aria-hidden />
                  {t.rainToggle}
                </span>
                <Switch on={nav.rain} label={t.rainToggle} onChange={(rain) => change({ rain })} data-nav="rain" />
              </div>
            </section>
            {nav.rain && (
              <>
                <section data-nav="forecast-range" className={`rounded-2xl bg-ok-bg p-4 ${mark(highlight, 'forecast-range')}`}>
                  <p className="text-2xl font-bold">{t.forecast(...rain.range)}</p>
                  <p className="text-sm text-ink-muted">
                    {th.act2.estimate} · {th.act2.sample}
                  </p>
                </section>
                <section data-nav="prep" className={`flex flex-col gap-3 ${card} ${mark(highlight, 'prep')}`}>
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
