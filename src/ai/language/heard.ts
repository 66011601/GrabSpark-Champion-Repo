import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'
import { normalizeThaiDigits } from '@/ai/onboarding/parsers/thaiNumber.ts'

/**
 * The browser's Thai recogniser writes what it heard in central Thai spelling. A dialect word comes out as the central
 * word it sounds like (เฮ็ด → เห็ด), a short answer may come out in English ("OK"), and Android Chrome repeats words.
 * `fixHeard` puts those back before the language layer reads the sentence. Every rule is guarded by the words around
 * it, so ordinary Thai (typed, or heard right) passes through unchanged: ผัดเห็ด stays a dish.
 */

// Number words, for prices and phone numbers said with pauses ("ห้า สิบ บาท").
const NUMBER = 'ศูนย์|หนึ่ง|นึง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|หมื่น|แสน'
// Words that start with a number word and are not numbers.
const NOT_NUMBER = 'ห้าง|สี่แยก|สามแยก|ศูนย์การค้า|ศูนย์อาหาร|พันธุ์|ยี่ห้อ|สิบล้อ'
const ONLY_NUMBER = new RegExp(`^(?:\\d|${NUMBER})+$`)
// Polite endings and regional closing words a short answer may end with.
const ENDINGS = '(?:\\s*(?:นะคะ|นะครับ|ค่ะ|คะ|ครับ|คับ|จ้า|จ้ะ|นะ|เลย|เจ้า|เด้อ|เน้อ|เนาะ|เด้|หนา))*'

// A dish or a shopping word next to เห็ด: then it is a mushroom, not Isan เฮ็ด ("do").
const DISH_BEFORE = 'ผัด|ต้ม|ยำ|ทอด|ย่าง|ซุป|แกง|ลาบ|หมก|ปิ้ง|ใส่|น้ำ|ข้าว|เก็บ|ขาย|กิน|ซื้อ|สั่ง|ชอบ'
const DIALECT_FIXES: [RegExp, string][] = [
  // เฮ็ด ("do") heard as เห็ด, known by the question or verb after it: "เห็ดจั่งได๋" → "เฮ็ดจั่งใด๋".
  [new RegExp(`(?<!(?:${DISH_BEFORE})\\s*)เห็ด(?=\\s*(?:อะไร|อีหยัง|อิหยัง|หยัง|ให้|หื้อ|แหน่|บ่|ได้|จั่ง|จัง|จั๋ง|ยังไง|ไป|เลย|เป็น|ต่อ|นำ|ผิด|แนว|ซั่น))`, 'g'), 'เฮ็ด'],
  [new RegExp(`(?<=(?:สิ|ซิ|กำลัง|ต้อง|อยาก)\\s*)เห็ด(?!\\s*(?:หอม|ฟาง|นางฟ้า|เข็มทอง|หูหนู|ออรินจิ|ชิเมจิ|โคน|เผาะ|ป่า))`, 'g'), 'เฮ็ด'],
  // จั่งใด๋ ("how") in the spellings the recogniser gives it. "จังได้" (…very, can…) is central Thai and stays.
  [/จั[่๋]?งได[๋]?(?!้)/g, 'จั่งใด๋'],
  // Isan words in spellings that are no Thai word at all.
  [/เบิ้ง/g, 'เบิ่ง'],
  [/(?<!เ)มื่อ/g, 'มื้อ'], // เมื่อ ("when") has the same letters after its เ
  [/(?<![เแโใไ])จ้ม/g, 'จ่ม'], // not the end of ใจ้ before มา
  [/แหล่ว|แล่ว/g, 'แล้ว'],
  [/ไจ้/g, 'ใจ้'],
  // บ่ ("not") heard as บ่อ / บ้อ, only before the words it negates in a yes/no answer (บ่อมีปลา is a pond).
  [/บ[่้]?อ(?=\s*(?:แม่น|ใจ้|เอา|ฮู้|เคย|ใช่))/g, 'บ่'],
  // Southern แหลง ("speak") heard as แหล่ง, known by what follows: "แหล่งไทย", "แหล่งกับหนู".
  [/แหล่ง(?=\s*(?:กับ|ไทย|ใต้|ช้า|ให้ฟัง|พรือ|ไหร|หลาว|ม่าย))/g, 'แหลง'],
  // Northern เจ้า (yes, polite ending) written จ้าว, at the very end only: ร้านจ้าวสัว keeps its name.
  [/จ้าว(?=\s*$)/g, 'เจ้า'],
  // บาท heard as บาด (cut) after a number or a "how many" word: "จักบาด" → "จักบาท", "กี่ตังบาด" → "กี่ตังบาท".
  [new RegExp(`(?<=(?:จัก|กี่|ตัง|\\d|${NUMBER})\\s*)บาด`, 'g'), 'บาท'],
  [/โอเคร(?=\s|$|ค่ะ|คะ|ครับ|คับ)/g, 'โอเค'],
]

// Short answers the recogniser writes in English. Only when the English word is the whole sentence: "ร้าน OK Coffee"
// is a name.
const ENGLISH: Record<string, string> = {
  ok: 'โอเค',
  okay: 'โอเค',
  okey: 'โอเค',
  oke: 'โอเค',
  yes: 'ใช่',
  yeah: 'ใช่',
  yep: 'ใช่',
  no: 'ไม่ใช่',
  nope: 'ไม่ใช่',
  next: 'ถัดไป',
  back: 'ย้อนกลับ',
  skip: 'ข้าม',
  food: 'อาหาร',
  mart: 'มาร์ท',
  menu: 'เมนู',
  home: 'หน้าหลัก',
  stop: 'หยุด',
  cancel: 'ยกเลิก',
  thanks: 'ขอบคุณ',
  thankyou: 'ขอบคุณ',
  thank: 'ขอบคุณ',
}
const ENGLISH_ALONE = new RegExp(`^([a-z][a-z.\\s]*?)(${ENDINGS})$`, 'i')

function fromEnglish(text: string): string {
  const match = ENGLISH_ALONE.exec(text)
  const thai = match && ENGLISH[match[1].toLowerCase().replace(/[.\s]/g, '')]
  return thai ? thai + match[2] : text
}

/** 8 AM → 08:00, 8 PM → 20:00, 7.30 pm → 19:30. */
function fromClock(text: string): string {
  return text.replace(/(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s?m\.?(?![a-z])/gi, (whole, hour: string, minute: string | undefined, half: string) => {
    const h = Number(hour)
    if (h < 1 || h > 12) return whole
    const h24 = (h % 12) + (half.toLowerCase() === 'p' ? 12 : 0)
    return `${String(h24).padStart(2, '0')}:${minute ?? '00'}`
  })
}

const isNumber = (word: string) => ONLY_NUMBER.test(word)

// Short answers said twice with ๆ ("ใช่ๆ"). Other words keep their ๆ: "เล็กๆ", "ช้าๆ" mean something.
const ANSWER_TWICE = new RegExp(`^(ใช่|ใจ้|ช่าย|แม่น|ได้|โอเค|เอา|ถูก)\\s*ๆ(${ENDINGS})$`)
const FALSE_START = /^(\S{2,})\s+(\1\S*)/
const SAID_TWICE = new RegExp(`^(\\S{3,}?)\\s*\\1(${ENDINGS})$`)
const repeatable = (word: string) => !isNumber(word) && stripParticles(word) !== ''

/**
 * A false start or a repeat: "ต่อ ต่อไป" → "ต่อไป", "ร้าน ร้านป้าแดง" → "ร้านป้าแดง", "ถัดไป ถัดไป" or "ถัดไปถัดไป" → "ถัดไป",
 * "ใช่ๆ" → "ใช่". Only at the start or for the whole sentence; never for numbers, which a phone number repeats.
 */
function withoutRepeats(text: string): string {
  let fixed = text
  const start = FALSE_START.exec(fixed)
  if (start && repeatable(start[1])) fixed = start[2] + fixed.slice(start[0].length)
  const twice = SAID_TWICE.exec(fixed)
  if (twice && repeatable(twice[1])) fixed = twice[1] + twice[2]
  return fixed.replace(ANSWER_TWICE, '$1$2')
}

/** Numbers as the parsers read them: ฿50 → 50 บาท, 1,200 → 1200, "ห้า สิบ" → "ห้าสิบ", 8 PM → 20:00. */
function numbersFixed(text: string): string {
  return fromClock(
    text
      .replace(/฿\s*(\d[\d,]*)/g, '$1 บาท')
      .replace(/(\d)\s*฿/g, '$1 บาท')
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
      .replace(new RegExp(`(${NUMBER})\\s+(?=(?:${NUMBER}))(?!${NOT_NUMBER})`, 'g'), '$1'),
  )
}

/** The sentence the merchant meant, from what the recogniser wrote. Pure; text it has no rule for comes back as it was. */
export function fixHeard(heard: string): string {
  let text = normalizeThaiDigits(heard.trim())
  if (!text) return text
  text = fromEnglish(text)
  text = numbersFixed(text)
  for (const [mistake, meant] of DIALECT_FIXES) text = text.replace(mistake, meant)
  return withoutRepeats(text)
}
