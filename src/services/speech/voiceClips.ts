/**
 * The companion's recorded voice: every line she says in the demo, made once with Google's Thai text-to-speech by
 * scripts/voice/build.mjs and served as files, so she sounds the same on every device. A line with no recording
 * (a dish or price the merchant made up) is read by the device's own voice instead.
 */

/** line (spaces collapsed) → recording id; the file is voice/<id>.mp3 */
export type VoiceManifest = Record<string, string>

/** A line as the manifest keys it: runs of spaces as one, no spaces at the ends. */
export const lineKey = (text: string): string => text.replace(/\s+/g, ' ').trim()

/**
 * The recordings that say the line, in order: the whole line when it was recorded, otherwise the fewest recorded
 * pieces it splits into at spaces (the helper bar says a reply and the page's line together). Null when any part
 * has no recording, so one voice says the whole line.
 */
export function clipsFor(line: string, manifest: VoiceManifest): string[] | null {
  const key = lineKey(line)
  if (!key) return null
  if (manifest[key]) return [manifest[key]]
  const words = key.split(' ')
  // best[end]: the fewest recordings that say words[0..end)
  const best: (string[] | null)[] = Array.from({ length: words.length + 1 }, () => null)
  best[0] = []
  for (let end = 1; end <= words.length; end += 1) {
    for (let start = 0; start < end; start += 1) {
      const before = best[start]
      const id = before && manifest[words.slice(start, end).join(' ')]
      if (id && (!best[end] || before.length + 1 < best[end]!.length)) best[end] = [...before, id]
    }
  }
  return best[words.length]
}

const base = () => import.meta.env.BASE_URL

let manifest: Promise<VoiceManifest | null> | undefined

/** The manifest, fetched once. A failed fetch (offline for a moment) is tried again on the next line. */
export function loadVoice(): Promise<VoiceManifest | null> {
  manifest ??= fetch(`${base()}voice/manifest.json`)
    .then((response) => (response.ok ? (response.json() as Promise<{ lines: VoiceManifest }>) : null))
    .then((file) => file?.lines ?? null)
    .catch(() => {
      manifest = undefined
      return null
    })
  return manifest
}

export const clipUrl = (id: string): string => `${base()}voice/${id}.mp3`

/** Lines said while running the dev server, for scripts/voice: `copy(JSON.stringify([...window.__spokenLines]))`. */
export function noteSpoken(line: string): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  const store = window as unknown as { __spokenLines?: Set<string> }
  ;(store.__spokenLines ??= new Set()).add(lineKey(line))
}
