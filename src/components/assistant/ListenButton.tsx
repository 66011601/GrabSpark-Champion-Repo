import { Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getThaiVoice, onVoicesChanged, speak, stopSpeaking } from '@/services/speech/textToSpeech.ts'

/** Reads text aloud in Thai. Hidden when the device has no Thai voice. */
export function ListenButton({ text, label = th.review.listen }: { text: string; label?: string }) {
  const [available, setAvailable] = useState(() => getThaiVoice() !== undefined)
  useEffect(() => onVoicesChanged(() => setAvailable(getThaiVoice() !== undefined)), [])
  useEffect(() => stopSpeaking, [])
  if (!available) return null
  return (
    <Button variant="secondary" icon={<Volume2 className="size-6" aria-hidden />} onClick={() => speak(text)}>
      {label}
    </Button>
  )
}
