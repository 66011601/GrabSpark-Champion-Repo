import { ArrowLeft } from 'lucide-react'
import { th } from '@/copy/th.ts'

/** GrabMerchant's green title bar. Everything under it is simulated, so it says so. */
export function AppHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="flex min-h-14 items-center gap-1 bg-action px-2 text-white">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={th.act2.home} className="flex size-14 cursor-pointer items-center justify-center rounded-full active:bg-action-pressed">
          <ArrowLeft className="size-6" aria-hidden />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="flex-1 text-lg font-bold">{title}</h1>
      <span className="rounded-full bg-white/20 px-3 text-sm">{th.act2.sample}</span>
    </header>
  )
}
