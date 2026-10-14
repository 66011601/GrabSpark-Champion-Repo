const ID_LENGTH = 13

/** Thai national ID: 13 digits; the last is a checksum of the first 12, weighted 13 down to 2. */
export function isValidThaiId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false
  const digits = [...id].map(Number)
  const sum = digits.slice(0, 12).reduce((total, digit, index) => total + digit * (ID_LENGTH - index), 0)
  return (11 - (sum % 11)) % 10 === digits[12]
}
