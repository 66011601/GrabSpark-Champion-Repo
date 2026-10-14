export type Region = 'isan' | 'north' | 'south'
export type WordKind = 'yesNo' | 'verb' | 'question' | 'time' | 'number' | 'place' | 'pronoun' | 'particle' | 'evidence'

/**
 * A dialect word and what it means in central Thai. `central: ''` drops a particle; `central: null` keeps the word
 * as said and only counts as evidence of the region (adjectives that may be part of a name: นัว, ลำ, หรอย).
 * `alone` is what the word means when it is the whole sentence (Northern "เจ้า" on its own is a yes).
 * `shared` words are used in more than one region, so they never tell the region.
 */
export interface DialectWord {
  word: string
  central: string | null
  region: Region | 'shared'
  kind: WordKind
  alone?: string
}

const w = (word: string, central: string | null, region: DialectWord['region'], kind: WordKind, alone?: string): DialectWord =>
  alone === undefined ? { word, central, region, kind } : { word, central, region, kind, alone }

export const DIALECT: DialectWord[] = [
  // yes / no
  w('แม่นแล้ว', 'ใช่แล้ว', 'shared', 'yesNo'),
  w('แม่น', 'ใช่', 'shared', 'yesNo'),
  w('บ่แม่น', 'ไม่ใช่', 'isan', 'yesNo'),
  w('บ่ใจ้', 'ไม่ใช่', 'north', 'yesNo'),
  w('ใจ้', 'ใช่', 'north', 'yesNo'),
  w('ไม่ช่าย', 'ไม่ใช่', 'south', 'yesNo'),
  w('ช่าย', 'ใช่', 'south', 'yesNo'),
  w('บ่', 'ไม่', 'shared', 'yesNo'),
  // verbs
  w('เฮ็ด', 'ทำ', 'isan', 'verb'),
  w('เบิ่ง', 'ดู', 'isan', 'verb'),
  w('เว้า', 'พูด', 'isan', 'verb'),
  w('เอิ้น', 'เรียก', 'isan', 'verb'),
  w('จ่ม', 'บ่น', 'isan', 'verb'),
  w('ฮอด', 'ถึง', 'isan', 'verb'),
  w('ยะ', 'ทำ', 'north', 'verb'),
  w('ผ่อ', 'ดู', 'north', 'verb'),
  w('ปิ๊ก', 'กลับ', 'north', 'verb'),
  w('กิ๋น', 'กิน', 'north', 'verb'),
  w('อู้', 'พูด', 'north', 'verb'),
  w('แอ่ว', 'เที่ยว', 'north', 'verb'),
  w('หื้อ', 'ให้', 'north', 'verb'),
  w('แล', 'ดู', 'south', 'verb'),
  w('หลบ', 'กลับ', 'south', 'verb'),
  w('แหลง', 'พูด', 'south', 'verb'),
  // question words
  w('จั่งใด๋', 'อย่างไร', 'isan', 'question'),
  w('จังใด', 'อย่างไร', 'isan', 'question'),
  w('จักบาท', 'กี่บาท', 'isan', 'question'),
  w('จักโมง', 'กี่โมง', 'isan', 'question'),
  w('ไส', 'ไหน', 'isan', 'question'),
  w('หยัง', 'อะไร', 'shared', 'question'),
  w('เท่าใด', 'เท่าไหร่', 'shared', 'question'),
  w('ตางใด', 'ที่ไหน', 'north', 'question'),
  w('จะใด', 'อย่างไร', 'north', 'question'),
  w('พรือ', 'อย่างไร', 'south', 'question'),
  w('ไหร', 'อะไร', 'south', 'question'),
  w('กี่ตัง', 'กี่บาท', 'south', 'question'),
  w('กี่ตังค์', 'กี่บาท', 'shared', 'question'), // everyday money talk everywhere, so it never tells the region
  // time
  w('มื้อนี่', 'วันนี้', 'isan', 'time'),
  w('มื้อนี้', 'วันนี้', 'isan', 'time'),
  w('มื้ออื่น', 'พรุ่งนี้', 'isan', 'time'),
  w('มื้อวาน', 'เมื่อวาน', 'isan', 'time'),
  w('ซู่มื้อ', 'ทุกวัน', 'isan', 'time'),
  w('ทุกมื้อ', 'ทุกวัน', 'isan', 'time'),
  w('ตอนงาย', 'ตอนสาย', 'isan', 'time'),
  w('ตอนแลง', 'ตอนเย็น', 'shared', 'time'),
  w('แลง', 'เย็น', 'shared', 'time'),
  w('วันพูก', 'พรุ่งนี้', 'north', 'time'),
  w('มะวาน', 'เมื่อวาน', 'north', 'time'),
  w('หวันนี้', 'วันนี้', 'south', 'time'),
  w('ต่อเช้า', 'พรุ่งนี้', 'south', 'time'),
  w('ทุกหวัน', 'ทุกวัน', 'south', 'time'),
  // numbers
  w('ซาว', 'ยี่สิบ', 'shared', 'number'),
  w('ฮ้อย', 'ร้อย', 'isan', 'number'),
  // places
  w('ทางพุ้น', 'ทางโน้น', 'isan', 'place'),
  w('พุ้น', 'โน้น', 'isan', 'place'),
  w('กาด', 'ตลาด', 'north', 'place'),
  w('ตี้', 'ที่', 'north', 'place'),
  // pronouns
  w('ข้อย', 'ฉัน', 'isan', 'pronoun'),
  w('ข่อย', 'ฉัน', 'isan', 'pronoun'),
  w('เฮา', 'เรา', 'isan', 'pronoun'),
  w('ข้าเจ้า', 'ฉัน', 'north', 'pronoun'),
  w('ฉาน', 'ฉัน', 'south', 'pronoun'),
  // particles
  w('เด้อ', '', 'isan', 'particle'),
  w('เด้', '', 'isan', 'particle'),
  w('แหน่', 'หน่อย', 'isan', 'particle'),
  w('โลด', 'เลย', 'isan', 'particle'),
  w('เนาะ', '', 'shared', 'particle'),
  w('เจ้า', '', 'north', 'particle', 'ใช่'),
  w('เน้อ', '', 'north', 'particle'),
  w('ก่', '', 'north', 'particle'),
  w('แต๊', '', 'north', 'particle'),
  w('หนิ', '', 'south', 'particle'),
  w('ฮู้', '', 'south', 'particle'),
  w('แหละ', '', 'shared', 'particle'),
  w('จัง', '', 'shared', 'particle'),
  // evidence only: kept as said, they may be part of a shop or dish name
  w('นัว', null, 'isan', 'evidence'),
  w('คัก', null, 'isan', 'evidence'),
  w('ลำ', null, 'north', 'evidence'),
  w('หรอย', null, 'south', 'evidence'),
]

/**
 * Central words with a dialect word inside them, kept as said: ศาลเจ้า is a shrine, not ศาล + Northern เจ้า,
 * and หลบฝน is "shelter from the rain", not Southern หลบ (go back). The เจ้า- titles (เจ้าสัว, เจ้าพ่อ) are common in
 * shop names; a particle inside a phrase is kept anyway, these are kept even before a gap.
 */
export const CENTRAL_WORDS: string[] = [
  'ศาลเจ้า', 'พระเจ้า', 'เทพเจ้า', 'เจ้าหน้าที่', 'เจ้าภาพ', 'เจ้าพระยา', 'เจ้าดัง', 'เจ้าเก่า', 'เจ้าประจำ', 'เจ้าอื่น',
  'เจ้าสัว', 'เจ้าพ่อ', 'เจ้าแม่', 'เจ้าคุณ', 'เจ้านาย',
  'หลบฝน', 'หลบแดด', 'หลบหน้า', 'หลบมุม', 'แลเห็น', 'แลดู', 'ตำหนิ',
]
