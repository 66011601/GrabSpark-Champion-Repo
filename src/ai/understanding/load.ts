import type { ScreenId } from './bank/types.ts'
import { learnable, prepare } from './features.ts'
import { buildIndex, classify, type Match, type MatchIndex } from './matcher.ts'

// The bank is large; it loads with the first sentence the rules did not understand, not with the page.
let bank: Promise<typeof import('./bank/index.ts')> | undefined
const indexes = new Map<ScreenId, MatchIndex>()

async function indexFor(screen: ScreenId): Promise<MatchIndex> {
  const known = indexes.get(screen)
  if (known) return known
  bank ??= import('./bank/index.ts')
  const { trainingFor } = await bank
  const built = buildIndex(trainingFor(screen).map((entry) => ({ text: learnable(entry.say), label: entry.label })))
  indexes.set(screen, built)
  return built
}

/** What an understood sentence most likely means on this screen. */
export async function matchOn(screen: ScreenId, understood: string): Promise<Match> {
  return classify(await indexFor(screen), prepare(understood))
}
