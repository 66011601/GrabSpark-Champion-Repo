import { Sparkles } from 'lucide-react'
import { th } from '@/copy/th.ts'

export function CompanionBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action text-white" aria-hidden>
        <Sparkles className="size-6" />
      </div>
      <p className="rounded-3xl rounded-tl-md bg-ok-bg px-4 py-3 text-lg">
        <span className="sr-only">{th.companion.name}: </span>
        {text}
      </p>
    </div>
  )
}
