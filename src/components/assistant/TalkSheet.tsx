import { Keyboard } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { CompanionAvatar } from './CompanionAvatar.tsx'
import type { CompanionState } from './companionState.ts'
import { TranscriptBubble } from './TranscriptBubble.tsx'
import { TypeInstead } from './TypeInstead.tsx'

interface TalkSheetProps {
  open: boolean
  onClose: () => void
  question: string // what the companion is asking now (the helper bar says it aloud)
  chips?: { label: string; onPress: () => void }[]
  transcript: { text: string; final: boolean } | null
  mic: CompanionState
  onMic: () => void
  onType: (text: string) => void // typed words go through the same reading as speech
}

/** Talk to the companion about this step; what it understands fills the form behind the sheet. */
export function TalkSheet({ open, onClose, question, chips = [], transcript, mic, onMic, onType }: TalkSheetProps) {
  const [typing, setTyping] = useState(false)
  return (
    <BottomSheet open={open} title={th.sheet.talkTitle} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <CompanionAvatar state={mic} onPress={onMic} />
          <div className="min-w-0 flex-1 rounded-3xl rounded-tl-md bg-ok-bg px-4 py-3">
            <p className="text-lg">{question}</p>
            <p className="mt-1 text-sm font-medium text-action">{th.sheet.tapToTalk}</p>
          </div>
        </div>
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Chip key={chip.label} onClick={chip.onPress}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}
        {typing ? (
          <TypeInstead onSend={onType} onClose={() => setTyping(false)} />
        ) : (
          <Button variant="ghost" className="self-start px-0!" icon={<Keyboard className="size-6" aria-hidden />} onClick={() => setTyping(true)}>
            {th.onboarding.typeInstead}
          </Button>
        )}
        <Button fullWidth onClick={onClose}>
          {th.sheet.done}
        </Button>
      </div>
    </BottomSheet>
  )
}
