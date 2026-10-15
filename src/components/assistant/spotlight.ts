/** The steps whose advice the companion already showed with the page dimmed, this visit. */
const SEEN = new Set<string>()

/** Dim the page for this advice? Only the first time a step shows it, so going back and forth stays quiet. */
export const shouldSpotlight = (advice: string, seen: Set<string> = SEEN) => advice.trim() !== '' && !seen.has(advice)

export const markSeen = (advice: string, seen: Set<string> = SEEN) => void seen.add(advice)
