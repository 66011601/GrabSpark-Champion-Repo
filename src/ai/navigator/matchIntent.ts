import { matchCommand, type VoiceCommand } from '@/ai/commands/matchCommand.ts'
import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import type { Script, ScriptId } from './types.ts'

const squash = (text: string) => stripParticles(text).toLowerCase().replace(/\s+/g, '')

/**
 * Which script an owner's sentence asks for, or null.
 * Whole sentences go through matchCommand; longer or misheard ones fall back to keyword groups.
 * The best group (most letters matched) wins; on a tie the earlier script does.
 */
export function matchIntent(utterance: string, scripts: Script<ScriptId>[]): ScriptId | null {
  const said = squash(utterance)
  if (asksToConfirm(utterance)) return null
  const open = scripts.filter((script) => !script.not?.some((word) => said.includes(squash(word))))
  const whole = matchCommand(utterance, open.map((script): VoiceCommand<ScriptId> => ({ id: script.id, phrases: script.phrases })))
  if (whole) return whole
  let best: { id: ScriptId; score: number } | null = null
  for (const script of open) {
    for (const group of script.keywords) {
      const words = group.map(squash)
      const score = words.every((word) => said.includes(word)) ? words.join('').length : 0
      if (score > 0 && (!best || score > best.score)) best = { id: script.id, score }
    }
  }
  return best?.id ?? null
}

/** "ยืนยัน", "ตกลง", "เปิดใช้งาน": only the merchant's tap does that, so the words start nothing. */
export const asksToConfirm = (utterance: string) => /ยืนยัน|ตกลง|เปิดใช้งาน|ส่งเลย|ติ๊ก/.test(utterance)

export type Control = 'home' | 'back' | 'stop'

/** Words that steer the run itself. None of them confirms anything: only a tap does. */
export const CONTROLS: VoiceCommand<Control>[] = [
  { id: 'home', phrases: ['กลับหน้าหลัก', 'กลับหน้าแรก', 'ไปหน้าหลัก', 'หน้าหลัก'] },
  { id: 'back', phrases: ['กลับ', 'ย้อนกลับ', 'ถอยกลับ', 'กลับไป', 'ย้อน'] },
  { id: 'stop', phrases: ['หยุด', 'พอแล้ว', 'ยกเลิก', 'ไม่ต้องแล้ว', 'หยุดก่อน'] },
]
