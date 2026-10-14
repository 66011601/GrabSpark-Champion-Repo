import { BUTTONS } from '@/ai/navigator/buttons.ts'
import { GRID } from '@/ai/navigator/openPage.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { AppHeader } from './AppHeader.tsx'
import { GRID_ICONS } from './gridIcons.ts'
import type { PanelProps } from './props.ts'
import { ButtonList, SubPage } from './SubPage.tsx'

/** A home item without its own demo screen: what it is for, and its buttons when it has some, so a spoken "เปิด…" still lands somewhere real. */
export function PageScreen({ nav, highlight, change, announce, home }: PanelProps) {
  const item = GRID.find((entry) => entry.id === nav.page) ?? GRID[0]
  const Icon = GRID_ICONS[item.id]
  const buttons = BUTTONS.filter((button) => button.page === item.id)
  if (nav.sub) return <SubPage key={nav.sub} id={nav.sub} back={() => change({ sub: null })} announce={announce} />
  return (
    <>
      <AppHeader title={item.label} onBack={home} />
      <main className="flex flex-1 flex-col items-center gap-3 overflow-y-auto bg-canvas px-6 pt-10 pb-3 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-ok-bg text-action">
          <Icon className="size-10" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold">{item.label}</h2>
        <p className="text-lg">{th.act2.pages[item.id]}</p>
        {buttons.length > 0 ? <ButtonList buttons={buttons} highlight={highlight} change={change} /> : <p className="text-ink-muted">{th.act2.pageNote}</p>}
      </main>
      <footer className="border-t border-line bg-surface px-4 pt-3 pb-3">
        <Button fullWidth variant="secondary" onClick={home}>
          {th.act2.home}
        </Button>
      </footer>
    </>
  )
}
