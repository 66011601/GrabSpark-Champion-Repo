import { CircleCheck, Megaphone, Sparkles, TriangleAlert, UtensilsCrossed } from 'lucide-react'
import { draftChecks } from '@/ai/guardrail/checks.ts'
import { estimateImpact, profitPerUnit } from '@/ai/guardrail/promoMath.ts'
import { buildRainPromo } from '@/ai/navigator/drafts.ts'
import type { PromoDraft } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { Switch } from '@/components/ui/Switch.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import { ConfirmBar, StopPromoButton } from './ConfirmBar.tsx'
import type { PanelProps } from './props.ts'
import { TabBar } from './TabBar.tsx'

const t = th.act2.promo
const TABS = [
  { id: 'promos' as const, label: t.tabs.promos },
  { id: 'ads' as const, label: t.tabs.ads, disabled: true },
  { id: 'campaigns' as const, label: t.tabs.campaigns, disabled: true },
]
const card = 'rounded-2xl bg-surface ring-1 ring-line'
const span = (window: [string, string]) => `${window[0]}-${window[1]} น.`

/** One pre-filled value, marked the way Act 1 marks AI-filled fields, with the reason under it. */
function Row({ label, value, why }: { label: string; value: string; why: string }) {
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-ink-muted">{label}</span>
        <span className="text-right font-bold">{value}</span>
      </div>
      <p className="flex items-start gap-1.5 text-sm text-action">
        <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {t.reasonPrefix} {why}
        </span>
      </p>
    </li>
  )
}

function PromoForm({ promo, highlight, onOpened }: { promo: PromoDraft; highlight: string | null; onOpened: () => void }) {
  const shop = getMerchant()
  const items = shop.menu.filter((item) => promo.itemIds.includes(item.id))
  const profit = profitPerUnit(promo.bundlePrice, items.reduce((total, item) => total + item.costTHB, 0), shop.commissionRate)
  const impact = estimateImpact({ baselineByHour: shop.baselineOrdersByHour, window: promo.window, liftPct: shop.bundleLiftPct, days: promo.days, price: promo.bundlePrice, profitPerBundle: profit })
  const checks = draftChecks(promo, shop)
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-3">
        <h2 className="text-lg font-bold">{t.heading}</h2>
        <section className={`flex items-center gap-3 p-3 ${card}`}>
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-ok-bg text-action">
            <UtensilsCrossed className="size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-bold">{t.name}</p>
            <p>
              <span className="font-bold text-action">{formatTHB(promo.bundlePrice)}</span> <s className="text-ink-muted">{formatTHB(promo.normalPrice)}</s>
            </p>
            <p className="text-sm text-ink-muted">{span(promo.window)}</p>
          </div>
        </section>
        <ul data-nav="promo-fields" className={`divide-y divide-line px-4 ${card} ${mark(highlight, 'promo-fields')}`}>
          <Row label={t.fields.items} value={items.map((item) => item.name.split(' ')[0]).join(' + ')} why={t.why.items} />
          <Row label={t.fields.price} value={formatTHB(promo.bundlePrice)} why={t.why.price(promo.normalPrice - promo.bundlePrice)} />
          <Row label={t.fields.window} value={span(promo.window)} why={t.why.window} />
          <Row label={t.fields.days} value={`${promo.days} ${t.unit.days}`} why={t.why.days} />
          <Row label={t.fields.cap} value={`${promo.dailyCap} ${t.unit.set}`} why={t.why.cap} />
        </ul>
        <section className={`p-4 ${card}`}>
          <p className="font-bold">{t.impact(`${impact.extraOrders[0]}-${impact.extraOrders[1]}`, `${formatTHB(impact.extraProfitTHB[0])}-${formatTHB(impact.extraProfitTHB[1])}`)}</p>
          <p className="text-sm text-ink-muted">
            {th.act2.estimate} · {t.impactNote}
          </p>
        </section>
        <ul data-nav="checks" className={`flex flex-col gap-1 p-3 ${card} ${mark(highlight, 'checks')}`}>
          {checks.map((check) => (
            <li key={check.id} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${check.pass ? '' : 'bg-warn-bg text-warn-ink'}`}>
              {check.pass ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-action" aria-hidden /> : <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
              {check.message}
            </li>
          ))}
        </ul>
        <div className={`flex items-center justify-between gap-3 py-1 pr-1 pl-4 ${card}`}>
          <span className="text-sm">{t.boostOff}</span>
          <Switch on={false} disabled label={t.boostOff} onChange={() => {}} />
        </div>
      </div>
      <ConfirmBar draft={promo} label={th.act2.confirm.promo} highlight={highlight} onDone={onOpened} />
    </>
  )
}

export function Boost({ nav, highlight, change, announce, home }: PanelProps) {
  const promo = nav.promo
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <TabBar tabs={TABS} current="promos" onPick={() => {}} />
      <main className="flex flex-1 flex-col overflow-y-auto bg-canvas">
        {nav.done === 'promo' && promo ? (
          <section className="m-4 flex flex-col gap-3 rounded-2xl bg-ok-bg p-4 ring-1 ring-action">
            <p className="flex items-center gap-2 text-lg font-bold">
              <CircleCheck className="size-6 text-action" aria-hidden />
              {t.opened}
            </p>
            <p className="text-ink-muted">
              {t.name} · {formatTHB(promo.bundlePrice)} · {span(promo.window)}
            </p>
            <StopPromoButton
              promoId={`PROMO-${promo.itemIds.join('-')}`}
              onStopped={() => {
                change({ promo: null, done: null })
                announce(t.stopped)
              }}
            />
          </section>
        ) : promo ? (
          <PromoForm
            promo={promo}
            highlight={highlight}
            onOpened={() => {
              change({ done: 'promo' })
              announce(t.opened)
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-ok-bg text-action">
              <Megaphone className="size-10" aria-hidden />
            </span>
            <p className="text-lg font-bold">{t.empty}</p>
            <p className="text-ink-muted">{t.emptyBody}</p>
          </div>
        )}
      </main>
      {!promo && (
        <footer className="border-t border-line bg-surface px-4 pt-3 pb-3">
          <Button fullWidth data-nav="create-promo" className={mark(highlight, 'create-promo')} onClick={() => change({ promo: buildRainPromo(getMerchant()) })}>
            {t.create}
          </Button>
        </footer>
      )}
    </>
  )
}
