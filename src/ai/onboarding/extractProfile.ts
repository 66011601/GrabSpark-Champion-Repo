import type { Landmark, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'
import { parseCategory, parseCategoryAnswer } from './parsers/category.ts'
import { parseLocation } from './parsers/location.ts'
import { parseMenuItems } from './parsers/menuItems.ts'
import { parsePhone } from './parsers/phone.ts'
import { parseStoreName, parseStoreNameAnswer } from './parsers/storeName.ts'
import { parseOpeningHours } from './parsers/thaiTime.ts'

export const HOURS_CONFIDENCE = 0.95
export const MENU_CONFIDENCE = 0.9
export const PHONE_CONFIDENCE = 0.9

export interface ExtractContext {
  expecting?: ProfileFieldKey // set when the companion just asked about one field
  landmarks: Landmark[]
}

/** One utterance → the profile fields it mentions. Pure: it never changes a profile itself. */
export function extractProfile(utterance: string, ctx: ExtractContext): ProfileUpdates {
  const text = utterance.trim()
  if (!text) return {}
  return ctx.expecting ? extractAnswer(text, ctx.expecting, ctx.landmarks) : extractOpenTalk(text, ctx.landmarks)
}

function extractOpenTalk(text: string, landmarks: Landmark[]): ProfileUpdates {
  const updates: ProfileUpdates = {}
  const heardFrom = text
  const storeName = parseStoreName(text)
  if (storeName) updates.storeName = { ...storeName, heardFrom }
  const category = parseCategory(text)
  if (category) updates.category = { ...category, heardFrom }
  const location = parseLocation(text, landmarks)
  if (location) updates.location = { ...location, heardFrom }
  const hours = parseOpeningHours(text)
  if (hours) updates.hours = { value: hours, confidence: HOURS_CONFIDENCE, heardFrom }
  // Only read prices when the merchant is clearly talking about the menu;
  // otherwise "ซอยเจ็ดสิบเอ็ด" would become a ฿71 dish.
  if (/บาท|เมนู/.test(text)) {
    const menu = parseMenuItems(text)
    if (menu.length > 0) updates.menu = { value: menu, confidence: MENU_CONFIDENCE, heardFrom }
  }
  return updates
}

function extractAnswer(text: string, field: ProfileFieldKey, landmarks: Landmark[]): ProfileUpdates {
  const heardFrom = text
  switch (field) {
    case 'storeName': {
      const storeName = parseStoreNameAnswer(text)
      return storeName ? { storeName: { ...storeName, heardFrom } } : {}
    }
    case 'category': {
      const category = parseCategoryAnswer(text)
      return category ? { category: { ...category, heardFrom } } : {}
    }
    case 'location': {
      const location = parseLocation(text, landmarks)
      return location ? { location: { ...location, heardFrom } } : {}
    }
    case 'hours': {
      const hours = parseOpeningHours(text)
      return hours ? { hours: { value: hours, confidence: HOURS_CONFIDENCE, heardFrom } } : {}
    }
    case 'menu': {
      const menu = parseMenuItems(text)
      return menu.length > 0 ? { menu: { value: menu, confidence: MENU_CONFIDENCE, heardFrom } } : {}
    }
    case 'phone': {
      const phone = parsePhone(text)
      return phone ? { phone: { value: phone, confidence: PHONE_CONFIDENCE, heardFrom } } : {}
    }
  }
}
