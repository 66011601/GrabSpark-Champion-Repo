import { BUTTONS } from '@/ai/navigator/buttons.ts'
import { GRID } from '@/ai/navigator/openPage.ts'
import { th } from '@/copy/th.ts'

/** How the companion names a label in "หมายถึง … ใช่ไหมคะ" and on its buttons. */
export function labelName(label: string): string {
  const names: Record<string, string> = th.understanding.names
  if (names[label]) return names[label]
  const [kind, id] = label.split(':')
  if (kind === 'open') return th.understanding.openPage(GRID.find((item) => item.id === id)?.label ?? id)
  if (kind === 'button') return BUTTONS.find((button) => button.id === id)?.label ?? id
  return label
}
