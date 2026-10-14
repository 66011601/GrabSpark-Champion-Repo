import { Camera, Check, Keyboard, Mic, type LucideIcon } from 'lucide-react'
import { th } from '@/copy/th.ts'
import type { FillMethod } from '@/types/domain.ts'

const METHODS: { id: FillMethod; Icon: LucideIcon }[] = [
  { id: 'voice', Icon: Mic },
  { id: 'photo', Icon: Camera },
  { id: 'type', Icon: Keyboard },
]

/** Three big cards: how the merchant wants to fill in the shop. One is always chosen (voice to start). */
export function MethodPicker({ value, onChange }: { value: FillMethod; onChange: (method: FillMethod) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg font-bold">{th.method.question}</legend>
      {METHODS.map(({ id, Icon }) => {
        const chosen = value === id
        const { title, body } = th.method.options[id]
        return (
          <label
            key={id}
            className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-3xl p-4 ring-2 transition-colors has-[input:focus-visible]:outline-4 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-grab/50 ${chosen ? 'bg-ok-bg ring-action' : 'bg-surface ring-line active:bg-canvas'}`}
          >
            <input type="radio" name="fill-method" value={id} checked={chosen} onChange={() => onChange(id)} className="sr-only" />
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${chosen ? 'bg-action text-white' : 'bg-canvas text-action'}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 font-bold">
                {title}
                {id === 'voice' && <span className="rounded-full bg-action px-2 text-sm text-white">{th.method.recommended}</span>}
              </span>
              <span className="block text-base text-ink-muted">{body}</span>
            </span>
            {chosen && <Check className="size-6 shrink-0 text-action" aria-hidden />}
          </label>
        )
      })}
    </fieldset>
  )
}
