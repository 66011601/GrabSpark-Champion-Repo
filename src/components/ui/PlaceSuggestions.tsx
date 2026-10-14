import { MapPin } from 'lucide-react'
import { th } from '@/copy/th.ts'
import type { PlaceSuggestion } from '@/services/places/places.ts'

/** Places matching what was typed, under the address box. `live` says whether they come from Google Maps. */
export function PlaceSuggestions({
  suggestions,
  live,
  onPick,
}: {
  suggestions: PlaceSuggestion[]
  live: boolean
  onPick: (suggestion: PlaceSuggestion) => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
      <ul aria-label={th.places.choose} className="divide-y divide-line">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-ok-bg"
            >
              <MapPin className="size-6 shrink-0 text-action" aria-hidden />
              <span className="min-w-0">
                <span className="block font-bold">{suggestion.title}</span>
                {suggestion.subtitle && <span className="block text-base text-ink-muted">{suggestion.subtitle}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-line bg-canvas px-4 py-1.5 text-sm text-ink-muted">{live ? th.places.fromGoogle : th.places.fromLocal}</p>
    </div>
  )
}
