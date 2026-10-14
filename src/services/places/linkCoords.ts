export type LinkReading = { kind: 'point'; lat: number; lng: number } | { kind: 'unreadable' }

// Where map links keep the point. Short links (maps.app.goo.gl) hide it behind a redirect only a server can follow.
const IN_LINK = [
  /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // google.com/maps/…/@13.80,100.60,17z
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // …/data=…!3d13.80!4d100.60
  /[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i,
]
const BARE = /^\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})\s*$/ // "13.8016, 100.6033" copied from a map
const LINK = /https?:\/\/\S+/i

const point = (lat: string, lng: string): LinkReading => ({ kind: 'point', lat: Number(lat), lng: Number(lng) })

function decoded(link: string): string {
  try {
    return decodeURIComponent(link)
  } catch {
    return link
  }
}

/** The point in a pasted map link or "lat, lng"; `unreadable` for a link without one; null when the text is neither. */
export function readLink(text: string): LinkReading | null {
  const bare = BARE.exec(text)
  if (bare) return point(bare[1], bare[2])
  const link = LINK.exec(text)?.[0]
  if (!link) return null
  for (const pattern of IN_LINK) {
    const found = pattern.exec(decoded(link)) ?? pattern.exec(link)
    if (found) return point(found[1], found[2])
  }
  return { kind: 'unreadable' }
}
