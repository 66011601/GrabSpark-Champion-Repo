import { mark } from '@/components/navigator/mark.ts'

/** GrabMerchant's tab row: plain labels, the chosen one green with a bar underneath. */
export function TabBar<Id extends string>({ tabs, current, onPick, highlight, navPrefix }: { tabs: { id: Id; label: string; disabled?: boolean }[]; current: Id; onPick: (id: Id) => void; highlight?: string | null; navPrefix?: string }) {
  return (
    <div role="tablist" className="flex border-b border-line bg-surface px-2">
      {tabs.map((tab) => {
        const on = tab.id === current
        const nav = navPrefix ? `${navPrefix}-${tab.id}` : undefined
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-disabled={tab.disabled}
            data-nav={nav}
            onClick={() => !tab.disabled && onPick(tab.id)}
            className={`relative min-h-14 flex-1 px-2 text-base font-bold ${on ? 'text-action' : 'text-ink-muted'} ${tab.disabled ? 'cursor-default' : 'cursor-pointer'} ${nav ? mark(highlight ?? null, nav) : ''}`}
          >
            {tab.label}
            {on && <span className="absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-grab" />}
          </button>
        )
      })}
    </div>
  )
}
