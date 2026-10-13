const TRAILING_PARTICLES = /(?:นะคะ|นะครับ|ค่ะ|ครับ|คะ|จ้ะ|จ้า)$/

/** "ครัวป้าแดงค่ะ" → "ครัวป้าแดง" */
export function stripParticles(text: string): string {
  return text.trim().replace(TRAILING_PARTICLES, '').trim()
}
