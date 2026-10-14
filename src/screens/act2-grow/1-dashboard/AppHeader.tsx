import { ArrowLeft } from 'lucide-react'
import { th } from '@/copy/th.ts'

/** GrabMerchant's white title bar with a back arrow. Everything under it is simulated, so it says so. */
export function AppHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex min-h-14 items-center gap-1 border-b border-line bg-surface px-2">
      <button type="button" onClick={onBack} aria-label={th.act2.home} className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink active:bg-canvas">
        <ArrowLeft className="size-6" aria-hidden />
      </button>
      <h1 className="flex-1 text-lg font-bold">{title}</h1>
      <span className="mr-2 rounded-full bg-canvas px-3 text-sm text-ink-muted">{th.act2.sample}</span>
    </header>
  )
}
