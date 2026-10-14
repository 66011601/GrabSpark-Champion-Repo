// Titles the ID card and the bank book may write differently, or leave out. Longest first.
const TITLE = /^(?:นางสาว|เด็กชาย|เด็กหญิง|น\.ส\.|ด\.ช\.|ด\.ญ\.|นาง|นาย)\s*/

/** "นาง แดง ใจดี" → "แดงใจดี": no title, no spaces. */
export function normalizeName(name: string): string {
  return name.trim().replace(TITLE, '').replace(/\s+/g, '')
}

/** Grab pays out only to an account in the owner's own name. */
export function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  return left.length > 0 && left === normalizeName(b)
}
