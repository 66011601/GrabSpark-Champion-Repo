import { Download } from 'lucide-react'
import { th } from '@/copy/th.ts'
import { downloadHeardLog } from '@/services/speech/heardLog.ts'
import { useHeardLog } from './useHeardLog.ts'

/** For testers collecting real speech (opened with ?heardlog): saves what the recogniser heard as a file. */
export function HeardLogButton() {
  const { on, count } = useHeardLog()
  if (!on) return null
  return (
    <button
      type="button"
      onClick={() => downloadHeardLog()}
      className="fixed bottom-2 left-2 z-50 flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white shadow-lg"
    >
      <Download className="size-4" aria-hidden />
      {th.heardLog.download(count)}
    </button>
  )
}
