// "จ้า" (or "จ้ะ") closes the merchant's turn: "ร้านชื่อครัวป้าแดง อยู่ลาดพร้าว 71 จ้า".
// The same letters inside เจ้า (เจ้าของ), จ้าง (ลูกจ้าง) and จ้าว are part of another word.
const END_WORD = /(?<!เ)จ้[าะ](?![งว])/

/** Cuts what was heard at the closing word. `ended` says whether the merchant has finished the turn. */
export function cutAtEndWord(heard: string): { text: string; ended: boolean } {
  const match = END_WORD.exec(heard)
  if (!match) return { text: heard.trim(), ended: false }
  return { text: heard.slice(0, match.index).trim(), ended: true }
}
