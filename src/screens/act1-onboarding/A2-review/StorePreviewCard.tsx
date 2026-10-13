import { MapPin, Store } from 'lucide-react'
import { Card } from '@/components/ui/Card.tsx'
import { th } from '@/copy/th.ts'
import { formatHours, formatTHB } from '@/lib/format.ts'
import type { OnboardingProfile } from '@/types/domain.ts'

const PREVIEW_ITEMS = 3

/** "ลูกค้าจะเห็นร้านแบบนี้": the shop as a customer would see it in the Grab app. */
export function StorePreviewCard({ profile }: { profile: OnboardingProfile }) {
  const { storeName, category, hours, location, menu } = profile.fields
  const items = menu.value ?? []
  const subtitle = [category.value, hours.value ? formatHours(hours.value) : null].filter(Boolean).join(' · ')
  return (
    <section aria-label={th.review.customerSees}>
      <h2 className="mb-2 text-base text-ink-muted">{th.review.customerSees}</h2>
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-grab/20 text-action">
            <Store className="size-8" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{storeName.value}</p>
            <p className="text-base text-ink-muted">{subtitle}</p>
          </div>
        </div>
        {location.value && (
          <p className="mt-3 flex items-center gap-2 text-base">
            <MapPin className="size-5 shrink-0 text-action" aria-hidden />
            {location.value.text}
          </p>
        )}
        <ul className="mt-3 divide-y divide-line">
          {items.slice(0, PREVIEW_ITEMS).map((item) => (
            <li key={item.name} className="flex justify-between gap-3 py-2">
              <span>{item.name}</span>
              <span className="font-bold">{formatTHB(item.priceTHB)}</span>
            </li>
          ))}
        </ul>
        {items.length > PREVIEW_ITEMS && <p className="text-base text-ink-muted">{th.review.moreItems(items.length - PREVIEW_ITEMS)}</p>}
      </Card>
    </section>
  )
}
