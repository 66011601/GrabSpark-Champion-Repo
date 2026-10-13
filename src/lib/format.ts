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
