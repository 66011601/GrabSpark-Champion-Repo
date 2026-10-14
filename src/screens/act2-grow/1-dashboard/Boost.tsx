import { CircleCheck, TriangleAlert } from 'lucide-react'
import { draftChecks } from '@/ai/guardrail/checks.ts'
import { estimateImpact, profitPerUnit } from '@/ai/guardrail/promoMath.ts'
import { buildRainPromo } from '@/ai/navigator/drafts.ts'
import type { PromoDraft } from '@/ai/navigator/types.ts'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { AppHeader } from './AppHeader.tsx'
import { ConfirmBar, StopPromoButton } from './ConfirmBar.tsx'
import type { PanelProps } from './props.ts'

const t = th.act2.promo

/** One pre-filled value and why the AI chose it. */
function Row({ label, value, why }: { label: string; value: string; why: string }) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink-muted">{label}</span>
        <span className="text-right font-bold">{value}</span>
      </div>
      <p className="text-sm text-action">
        {t.reasonPrefix} {why}
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
      <h2 className="text-lg font-bold">{t.heading}</h2>
      <section className="rounded-2xl bg-ok-bg p-4">
        <p className="text-sm font-bold text-action">{t.name}</p>
        <p className="text-lg">{t.customer(promo.bundlePrice, promo.normalPrice)}</p>
        <p className="text-ink-muted">
          {promo.window[0]}–{promo.window[1]} น.
        </p>
      </section>
      <ul data-nav="promo-fields" className={`divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line ${mark(highlight, 'promo-fields')}`}>
        <Row label={t.fields.items} value={items.map((item) => item.name.split(' ')[0]).join(' + ')} why={t.why.items} />
        <Row label={t.fields.price} value={formatTHB(promo.bundlePrice)} why={t.why.price(promo.normalPrice - promo.bundlePrice)} />
        <Row label={t.fields.window} value={`${promo.window[0]}–${promo.window[1]} น.`} why={t.why.window} />
        <Row label={t.fields.days} value={`${promo.days} ${t.unit.days}`} why={t.why.days} />
        <Row label={t.fields.cap} value={`${promo.dailyCap} ${t.unit.set}`} why={t.why.cap} />
      </ul>
      <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <p className="font-bold">{t.impact(`${impact.extraOrders[0]}–${impact.extraOrders[1]}`, `${formatTHB(impact.extraProfitTHB[0])}–${formatTHB(impact.extraProfitTHB[1])}`)}</p>
        <p className="text-sm text-ink-muted">
          {th.act2.estimate} · {t.impactNote}
        </p>
      </section>
      <ul data-nav="checks" className={`flex flex-col gap-2 rounded-2xl bg-surface p-4 ring-1 ring-line ${mark(highlight, 'checks')}`}>
        {checks.map((check) => (
          <li key={check.id} className={`flex items-start gap-2 rounded-lg px-2 py-1 ${check.pass ? '' : 'bg-warn-bg text-warn-ink'}`}>
            {check.pass ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-action" aria-hidden /> : <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
            {check.message}
          </li>
        ))}
      </ul>
      <p className="text-ink-muted">{t.boostOff}</p>
      <ConfirmBar draft={promo} label={th.act2.confirm.promo} highlight={highlight} onDone={onOpened} />
    </>
  )
}

export function Boost({ nav, highlight, change, announce, home }: PanelProps) {
  const promo = nav.promo
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        {nav.done === 'promo' && promo ? (
          <section className="flex flex-col gap-3 rounded-2xl bg-ok-bg p-4 ring-1 ring-action">
            <p className="flex items-center gap-2 text-lg font-bold">
              <CircleCheck className="size-6 text-action" aria-hidden />
              {t.opened}
            </p>
            <p className="text-ink-muted">{th.act2.checks.reversible}</p>
            <StopPromoButton promoId={`PROMO-${promo.itemIds.join('-')}`} onStopped={() => change({ promo: null, done: null })} />
          </section>
        ) : promo ? (
          <PromoForm promo={promo} highlight={highlight} onOpened={() => {
              change({ done: 'promo' })
              announce(t.opened)
            }} />
        ) : (
          <>
            <p className="rounded-2xl bg-surface p-4 text-ink-muted ring-1 ring-line">{t.empty}</p>
            <Button fullWidth data-nav="create-promo" className={mark(highlight, 'create-promo')} onClick={() => change({ promo: buildRainPromo(getMerchant()) })}>
              {t.create}
            </Button>
          </>
        )}
      </main>
    </>
  )
}
