import { GRID } from '@/ai/navigator/openPage.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { AppHeader } from './AppHeader.tsx'
import { GRID_ICONS } from './gridIcons.ts'
import type { PanelProps } from './props.ts'

/** A home item the demo does not build: its name, its icon and what it is for, so a spoken "เปิด…" still lands somewhere real. */
export function PageScreen({ nav, home }: PanelProps) {
  const item = GRID.find((entry) => entry.id === nav.page) ?? GRID[0]
  const Icon = GRID_ICONS[item.id]
  return (
    <>
      <AppHeader title={item.label} onBack={home} />
      <main className="flex flex-1 flex-col items-center gap-3 overflow-y-auto bg-canvas px-6 pt-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-ok-bg text-action">
          <Icon className="size-10" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold">{item.label}</h2>
        <p className="text-lg">{th.act2.pages[item.id]}</p>
        <p className="text-ink-muted">{th.act2.pageNote}</p>
      </main>
      <footer className="border-t border-line bg-surface px-4 pt-3 pb-3">
        <Button fullWidth variant="secondary" onClick={home}>
          {th.act2.home}
        </Button>
      </footer>
    </>
  )
}
