import { th } from '@/copy/th.ts'
import type { Region } from './dialect.ts'

/** The one-time greeting in the merchant's regional style (the rest of the talk stays central Thai). */
export const greetingFor = (region: Region | null): string | null => (region ? th.language.greet[region] : null)

/** The greeting goes in front of whatever the companion says next. */
export function withGreeting(notice: string | null, greeting: string | null): string | null {
  if (!greeting) return notice
  return notice ? `${greeting} ${notice}` : greeting
}
