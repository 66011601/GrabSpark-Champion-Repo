import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

/** Keyboard fallback. Whatever is typed goes through the same extractor as speech. */
export function TypeInstead({ onSend, onClose }: { onSend: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!text.trim()) return
        onSend(text.trim())
        setText('')
      }}
    >
      <label htmlFor="type-instead" className="sr-only">
        {th.onboarding.typePlaceholder}
      </label>
      <input
        id="type-instead"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={th.onboarding.typePlaceholder}
        autoFocus
        className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line px-4 text-lg focus:border-action focus:outline-none"
      />
      <Button type="submit">{th.onboarding.send}</Button>
      <Button variant="ghost" aria-label={th.onboarding.closeTyping} onClick={onClose} icon={<X className="size-6" aria-hidden />} />
    </form>
  )
}
