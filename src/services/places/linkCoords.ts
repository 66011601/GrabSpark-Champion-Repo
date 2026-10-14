export type LinkReading = { kind: 'point'; lat: number; lng: number } | { kind: 'unreadable' }

// Where map links keep the point. Short links (maps.app.goo.gl) hide it behind a redirect only a server can follow.
const IN_LINK = [
  /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // google.com/maps/…/@13.80,100.60,17z
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // …/data=…!3d13.80!4d100.60
  /[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i,
]
// A pair copied from a map, alone or inside a sentence. The digit lookarounds stop it matching a piece of a longer number.
const BARE = /(?<![\d.])(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})(?![\d.])/
const LINKS = /https?:\/\/\S+/gi

const point = (lat: string, lng: string): LinkReading => ({ kind: 'point', lat: Number(lat), lng: Number(lng) })

function decoded(link: string): string {
  try {
    return decodeURIComponent(link)
  } catch {
    return link
  }
}

/** The point a single link carries, or null when this link has none. */
function pointIn(link: string): LinkReading | null {
  for (const pattern of IN_LINK) {
    const found = pattern.exec(decoded(link)) ?? pattern.exec(link)
    if (found) return point(found[1], found[2])
  }
  return null
}

/**
 * The point in a pasted map link or "lat, lng" in the text. A link's own point wins, then a pair anywhere in the text.
 * `unreadable` when there are links but none gives a point; null when there is neither a link nor a pair.
 */
export function readLink(text: string): LinkReading | null {
  const links = [...text.matchAll(LINKS)].map((match) => match[0])
  for (const link of links) {
    const found = pointIn(link)
    if (found) return found
  }
  const bare = BARE.exec(text)
  if (bare) return point(bare[1], bare[2])
  return links.length > 0 ? { kind: 'unreadable' } : null
}
