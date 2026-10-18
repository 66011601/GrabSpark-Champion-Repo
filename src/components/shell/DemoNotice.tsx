import { FlaskConical, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

/**
 * The first thing on screen: this app is a prototype for the GrabSpark Business Case presentation, not a launch.
 * Thai and English side by side, with the team that made it. Nothing starts behind it, and its button is the tap that lets the
 * browser play the companion's voice.
 */
export function DemoNotice({ onStart }: { onStart: () => void }) {
  const { demoNotice: copy } = th
  const { team } = copy
  const notice = useRef<HTMLDivElement>(null)

  // The start button takes the focus without scrolling: on a short phone the notice opens at its title.
  useEffect(() => notice.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }), [])

  return (
    <div ref={notice} role="alertdialog" aria-modal="true" aria-labelledby="demo-notice-title" className="flex flex-1 flex-col justify-between overflow-y-auto bg-action px-6 pt-8 pb-6 text-white">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-bold tracking-wide">
          <FlaskConical className="size-5" aria-hidden />
          {copy.badge}
        </p>
        <h1 id="demo-notice-title" className="mt-5 text-3xl leading-tight font-bold">
          {copy.title}
          <span lang="en" className="mt-1 block text-xl font-semibold text-white/85">
            {copy.en.title}
          </span>
        </h1>
        <p className="mt-4 text-base leading-relaxed">{copy.body}</p>
        <p lang="en" className="mt-3 text-base leading-relaxed text-white/85">
          {copy.en.body}
        </p>
        <section aria-labelledby="demo-notice-team" className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-white/85">
            <Users className="size-4" aria-hidden />
            {team.label} · <span lang="en">{team.labelEn}</span>
          </p>
          <h2 id="demo-notice-team" lang="en" className="mt-0.5 text-lg leading-snug font-bold">
            {team.name}
          </h2>
          <dl lang="en" className="mt-2 flex flex-col gap-1.5">
            {team.groups.map((group) => (
              <div key={group.role}>
                <dt className="text-xs text-white/75">{group.role}</dt>
                {/* A name never breaks in the middle; the line wraps between names, or before a nickname on a narrow phone. */}
                <dd className="flex flex-wrap gap-x-3 text-[13px] leading-snug font-semibold">
                  {group.people.map((person) => (
                    <span key={person.name}>
                      <span className="whitespace-nowrap">{person.name}</span>{' '}
                      <span className="text-xs font-normal whitespace-nowrap text-white/85">({person.nickname})</span>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <Button fullWidth onClick={onStart} className="mt-6 bg-surface! text-action! active:bg-ok-bg!">
        {copy.start}
        <span lang="en" className="font-semibold text-action/80">
          · {copy.en.start}
        </span>
      </Button>
    </div>
  )
}
