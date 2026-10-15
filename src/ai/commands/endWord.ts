// "จ้า" (or "จ้ะ") closes the merchant's turn: "ร้านชื่อครัวป้าแดง อยู่ลาดพร้าว 71 จ้า".
// The same letters inside เจ้า (เจ้าของ), จ้าง (ลูกจ้าง) and จ้าว are part of another word.
const END_WORD = /(?<!เ)จ้[าะ](?![งว])/

/** Cuts what was heard at the closing word. `ended` says whether the merchant has finished the turn. */
export function cutAtEndWord(heard: string): { text: string; ended: boolean } {
  const match = END_WORD.exec(heard)
  if (!match) return { text: heard.trim(), ended: false }
  return { text: heard.slice(0, match.index).trim(), ended: true }
}

// Other regions close a sentence with their own word: Northern เจ้า / เน้อ, Isan เด้อ. They are ordinary words
// elsewhere ("เจ้าของ"), so they only close a turn as the very last thing the recogniser has settled on.
const CLOSING_TAIL = /(?:เจ้าค่ะ|เจ้า|เน้อ|เด้อ|จ้ะ|จ้า)\s*$/

/** True when the settled words end with a regional closing word, so the merchant has finished the turn. */
export const endsWithClosingWord = (settled: string): boolean => CLOSING_TAIL.test(settled)
