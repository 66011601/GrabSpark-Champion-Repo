import { normalizeThaiDigits } from './thaiNumber.ts'

// Phone numbers are read digit by digit; Thais often say "โท" for 2.
const PHONE_DIGITS: [string, string][] = [
  ['ศูนย์', '0'],
  ['หนึ่ง', '1'],
  ['นึง', '1'],
  ['สอง', '2'],
  ['โท', '2'],
  ['สาม', '3'],
  ['สี่', '4'],
  ['ห้า', '5'],
  ['หก', '6'],
  ['เจ็ด', '7'],
  ['แปด', '8'],
  ['เก้า', '9'],
]

/** "ศูนย์แปดหนึ่ง สองสามสี่…" → "081234…". Null unless it is a 10-digit number starting with 0. */
export function parsePhone(input: string): string | null {
  // Remove "โทร" first so its "โท" is not read as a 2.
  let text = normalizeThaiDigits(input).replace(/โทรศัพท์|โทร/g, '')
  for (const [word, digit] of PHONE_DIGITS) text = text.split(word).join(digit)
  const digits = text.replace(/\D/g, '')
  return /^0\d{9}$/.test(digits) ? digits : null
}
