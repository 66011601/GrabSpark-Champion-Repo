import type { OpeningHours, Weekday } from '@/types/domain.ts'

const baht = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })

const WEEKDAY_TH: Record<Weekday, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
  sat: 'เสาร์',
  sun: 'อาทิตย์',
}

/** "฿1,025". Rounds down so money is never overstated. */
export function formatTHB(amount: number): string {
  return `฿${baht.format(Math.floor(amount))}`
}

/** "14:00" → "14:00 น." */
export function formatTime(hhmm: string): string {
  return `${hhmm} น.`
}

/** "10:00 – 20:00 น. · เปิดทุกวัน" */
export function formatHours({ open, close, closedDays }: OpeningHours): string {
  const days = closedDays.length === 0 ? 'เปิดทุกวัน' : `หยุดวัน${closedDays.map((day) => WEEKDAY_TH[day]).join(' ')}`
  return `${open} – ${close} น. · ${days}`
}

/** "0812344217" → "081-234-4217" */
export function formatPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}` : phone
}

/** 160000 → "2 นาที 40 วินาที" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} วินาที`
  return seconds === 0 ? `${minutes} นาที` : `${minutes} นาที ${seconds} วินาที`
}

const ID_GROUPS = [1, 4, 5, 2, 1]
const ACCOUNT_GROUPS = [3, 1, 5, 1]

/** Joins digits with dashes in the given group sizes, or leaves them as they are when the length does not fit. */
function group(digits: string, sizes: number[]): string {
  if (digits.length !== sizes.reduce((total, size) => total + size, 0)) return digits
  const parts: string[] = []
  let at = 0
  for (const size of sizes) {
    parts.push(digits.slice(at, at + size))
    at += size
  }
  return parts.join('-')
}

const hideAllButLastFour = (digits: string) => digits.slice(0, -4).replace(/\d/g, 'x') + digits.slice(-4)

/** "1234567890121" → "1-2345-67890-12-1" (only on S1, right after the photo). */
export const formatIdNumber = (id: string) => group(id, ID_GROUPS)

/** "1234567890121" → "x-xxxx-xxxx0-12-1" */
export const maskIdNumber = (id: string) => group(hideAllButLastFour(id), ID_GROUPS)

/** "1234567890" → "123-4-56789-0" */
export const formatAccount = (account: string) => group(account, ACCOUNT_GROUPS)

/** "1234567890" → "xxx-x-xx789-0" */
export const maskAccount = (account: string) => group(hideAllButLastFour(account), ACCOUNT_GROUPS)

/** What the companion may say aloud: "ลงท้ายด้วย 7890". */
export const lastFour = (digits: string) => digits.slice(-4)

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const BUDDHIST_ERA_OFFSET = 543

/** "1970-01-01" → "1 มกราคม 2513": how Thai ID cards and forms write dates. */
export function formatThaiDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${Number(day)} ${THAI_MONTHS[Number(month) - 1]} ${Number(year) + BUDDHIST_ERA_OFFSET}`
}
