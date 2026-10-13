import { th } from '@/copy/th.ts'

export type MicState = 'idle' | 'listening' | 'processing' | 'error'
/** 'private' = looking away while the merchant types something the companion must not see. */
export type CompanionState = MicState | 'private'

export const MIC_LABELS: Record<MicState, string> = {
  idle: th.mic.idle,
  listening: th.mic.listening,
  processing: th.mic.processing,
  error: th.mic.error,
}
