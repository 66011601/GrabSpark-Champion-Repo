import { X } from 'lucide-react'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import type { MenuEntry } from '@/types/domain.ts'

export function MenuItemList({ items, onRemove }: { items: MenuEntry[]; onRemove: (name: string) => void }) {
  return (
    <section aria-label={th.fields.menu}>
      <h2 className="mb-2 font-bold">{th.fields.menu}</h2>
      <ul className="divide-y divide-line rounded-3xl ring-1 ring-line">
        {items.map((item) => (
          <li key={item.name} className="flex min-h-14 items-center gap-3 pl-4">
            <span className="min-w-0 flex-1">{item.name}</span>
            <span className="font-bold">{formatTHB(item.priceTHB)}</span>
            <button
              type="button"
              onClick={() => onRemove(item.name)}
              aria-label={th.onboarding.removeItem(item.name)}
              className="flex size-14 shrink-0 items-center justify-center text-ink-muted"
            >
              <X className="size-6" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
