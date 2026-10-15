// จ้า ends a sentence, but the same letters end ศาลเจ้า or พระเจ้า: those are words, not particles.
const TRAILING_PARTICLES = /(?:นะคะ|นะครับ|ค่ะ|ครับ|คะ|(?<!เ)จ้[ะา])$/

/** "ครัวป้าแดงค่ะ" → "ครัวป้าแดง" */
export function stripParticles(text: string): string {
  return text.trim().replace(TRAILING_PARTICLES, '').trim()
}
