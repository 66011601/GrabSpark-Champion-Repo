import type { GeoPoint, Landmark, OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'
import { addressFromLocation, DERIVED_CONFIDENCE } from './addressFields.ts'
import { extractProfile } from './extractProfile.ts'
import { BUILDING_CONFIDENCE, parseBuilding } from './parsers/building.ts'
import { stripParticles } from './parsers/particles.ts'
import { isQuestion } from './parsers/question.ts'
import { formatThaiAddress, parseThaiAddress, streetLine } from './parsers/thaiAddress.ts'
import { onlyEmptyFields } from './profile.ts'

/** The 3/7 fields the companion asks about by voice, in order; the address is drafted from the location. */
export const STEP3_TALK: ProfileFieldKey[] = ['storeName', 'location', 'category', 'building']

export interface BusinessTalkContext {
  expecting?: ProfileFieldKey // the field the companion just asked about
  landmarks: Landmark[]
  profile: OnboardingProfile // what is already filled, so drafts never replace it
  place?: { value: GeoPoint; confidence: number } | null // the resolver's match for the words (map or sample place), when there is one
}

/** A full address the merchant said: their own words, but heard, so it is checked. */
export const SPOKEN_ADDRESS_CONFIDENCE = 0.75

/** What one sentence on 3/7 fills. Hours, menu and phone are left for later steps even if they were said. */
export function businessUpdates(text: string, ctx: BusinessTalkContext): ProfileUpdates {
  // The merchant may answer a different field than the one asked, or several at once: what they clearly said fills
  // its own field, and the asked field takes the rest of the answer.
  const said = ctx.expecting ? extractProfile(text, { landmarks: ctx.landmarks }) : {}
  const heard = { ...said, ...extractProfile(text, { expecting: ctx.expecting, landmarks: ctx.landmarks }) }
  const updates: ProfileUpdates = {}
  if (heard.storeName) updates.storeName = heard.storeName
  if (heard.category) updates.category = heard.category
  const location = ctx.place ? { ...ctx.place, heardFrom: text } : heard.location
  if (location) updates.location = location

  const spoken = parseThaiAddress(text)
  if (spoken) updates.address = { value: formatThaiAddress(spoken), confidence: SPOKEN_ADDRESS_CONFIDENCE, heardFrom: text }

  const named = parseBuilding(text)
  if (named) updates.building = { ...named, heardFrom: text }
  else if (ctx.expecting === 'building' && stripParticles(text) && !isQuestion(text) && !heard.storeName && !heard.category) {
    updates.building = { value: stripParticles(text), confidence: BUILDING_CONFIDENCE, heardFrom: text }
  } else if (spoken && streetLine(spoken)) {
    updates.building = { value: streetLine(spoken), confidence: DERIVED_CONFIDENCE, heardFrom: text }
  }

  if (location) {
    const drafted = onlyEmptyFields(ctx.profile, addressFromLocation(location.value, text))
    if (drafted.building && !updates.building) updates.building = drafted.building
    if (drafted.address && !updates.address) updates.address = drafted.address
  }
  return updates
}
