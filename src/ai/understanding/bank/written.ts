import type { Said } from '@/ai/language/corpus/types.ts'
import type { BankEntry, ScreenId } from './types.ts'

/** One label's hand-written sentences, grouped by region so the per-region quotas are easy to read and count. */
export function written(label: string, screens: ScreenId[] | 'any', byRegion: Partial<Record<Said, string[]>>): BankEntry[] {
  return (Object.entries(byRegion) as [Said, string[]][]).flatMap(([region, says]) =>
    says.map((say) => ({ say, region, screens, label, source: 'written' as const })),
  )
}
