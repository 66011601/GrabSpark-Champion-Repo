import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

/**
 * The first thing on screen: this app is a prototype for the GrabSpark Business Case presentation, not a launch.
 * Thai and English side by side. Nothing starts behind it, and its button is the tap that lets the browser play the companion's voice.
 */
export function DemoNotice({ onStart }: { onStart: () => void }) {
  const { demoNotice: copy } = th

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="demo-notice-title" className="flex flex-1 flex-col justify-between overflow-y-auto bg-action px-6 pt-12 pb-6 text-white">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-bold tracking-wide">
          <FlaskConical className="size-5" aria-hidden />
          {copy.badge}
        </p>
        <h1 id="demo-notice-title" className="mt-6 text-3xl leading-tight font-bold">
          {copy.title}
          <span lang="en" className="mt-1 block text-2xl font-semibold text-white/85">
            {copy.en.title}
          </span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed">{copy.body}</p>
        <p lang="en" className="mt-4 text-base leading-relaxed text-white/85">
          {copy.en.body}
        </p>
      </div>
      <Button autoFocus fullWidth onClick={onStart} className="mt-8 bg-surface! text-action! active:bg-ok-bg!">
        {copy.start}
        <span lang="en" className="font-semibold text-action/80">
          · {copy.en.start}
        </span>
      </Button>
    </div>
  )
}
