import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'

export interface VoiceCommand<Id> {
  id: Id
  phrases: string[]
}

// A long phrase ("ลงทะเบียน") may sit inside a short sentence. A longer sentence is the merchant
// telling us about the shop, even if a command word happens to be inside it.
const LONG_PHRASE = 6
const EXTRA_CHARACTERS = 10
// A short phrase ("กลับ", "ได้") is part of too many other words, so it must be all that was said,
// give or take these: "กดไปต่อเลยค่ะ" is "ไปต่อ".
const FILLERS = /กด|ช่วย|ขอ|เลย|หน่อย|ด้วย|แล้ว|หน้า|นะ/g

const squash = (text: string) => stripParticles(text).toLowerCase().replace(/\s+/g, '')

/**
 * Which on-screen action the merchant asked for, or null when they said something else.
 * The longest phrase wins, so "ยังไม่เคย" is not mistaken for "เคย".
 */
export function matchCommand<Id>(utterance: string, commands: VoiceCommand<Id>[]): Id | null {
  const said = squash(utterance)
  const core = said.replace(FILLERS, '')
  let best: { id: Id; length: number } | null = null
  for (const command of commands) {
    for (const phrase of command.phrases) {
      const wanted = squash(phrase)
      const fits =
        wanted.length >= LONG_PHRASE ? said.includes(wanted) && said.length <= wanted.length + EXTRA_CHARACTERS : core === wanted
      if (fits && (!best || wanted.length > best.length)) best = { id: command.id, length: wanted.length }
    }
  }
  return best?.id ?? null
}
