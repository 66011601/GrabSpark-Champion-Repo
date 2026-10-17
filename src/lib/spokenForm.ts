/**
 * Some lines carry words nobody could record ahead: the dishes and prices a merchant just said. The bubble shows them
 * in full; the recorded voice says a fixed line instead (the dishes are on screen), so she keeps one voice.
 * The device's own voice, when there are no recordings, still reads the full line.
 */
const FORMS = new Map<string, string>()
const KEEP = 50 // the latest few are enough: a line is spoken right after it is made

/** Returns `shown`, remembering that the recorded voice says `spoken` for it. */
export function sayInstead(shown: string, spoken: string): string {
  FORMS.delete(shown)
  FORMS.set(shown, spoken)
  if (FORMS.size > KEEP) FORMS.delete(FORMS.keys().next().value as string)
  return shown
}

/** The line with every part made by sayInstead swapped for what the recorded voice says. */
export function spokenForm(line: string): string {
  let out = line
  for (const [shown, spoken] of FORMS) if (out.includes(shown)) out = out.replace(shown, spoken)
  return out
}
