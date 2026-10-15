import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { matchButton } from '@/ai/navigator/buttons.ts'
import { asksToConfirm, CONTROLS, matchIntent } from '@/ai/navigator/matchIntent.ts'
import { matchOpen } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'

/**
 * The label Act 2's own rules give a sentence, in DashboardScreen's order (see src/ai/language/corpus/corpus.test.ts),
 * or null when they give none. Tests use it to check that canonical phrases route home and that "none" sentences
 * really are left to the matcher.
 */
export function act2Route(text: string): string | null {
  if (asksToConfirm(text)) return 'act2:confirm'
  const control = matchCommand(text, CONTROLS)
  if (control) return `control:${control}`
  const page = matchOpen(text)
  if (page) return `open:${page}`
  const button = matchButton(text)
  if (button) return `button:${button}`
  const intent = matchIntent(text, SCRIPTS)
  return intent ? `intent:${intent}` : null
}
