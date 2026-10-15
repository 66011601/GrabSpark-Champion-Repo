import { th } from '@/copy/th.ts'
import type { Region } from './dialect.ts'

/** The one-time greeting in the merchant's regional style (the rest of the talk stays central Thai). */
export const greetingFor = (region: Region | null): string | null => (region ? th.language.greet[region] : null)

/** The greeting goes in front of whatever the companion says next. */
export function withGreeting(notice: string | null, greeting: string | null): string | null {
  if (!greeting) return notice
  return notice ? `${greeting} ${notice}` : greeting
}

// The greeting waits here until a notice is actually shown: a turn that leaves the screen (ไปต่อโลดเด้อ) shows
// nothing, and the greeting must not be lost with it. Once per page session, like the region itself.
let waiting: string | null = null

/** Keeps a greeting until the companion next says something. A null greeting changes nothing. */
export function holdGreeting(greeting: string | null): void {
  if (greeting) waiting = greeting
}

/** The waiting greeting, if any; it is given out once. */
export function takeGreeting(): string | null {
  const greeting = waiting
  waiting = null
  return greeting
}
