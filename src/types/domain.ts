export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type FieldStatus = 'empty' | 'heard' | 'confirmed'

export interface ProfileField<T> {
  value: T | null
  status: FieldStatus
  confidence?: number // 0–1, set when status = 'heard'
  heardFrom?: string // the words the value came from (shown in A2)
}

export interface GeoPoint {
  text: string
  address?: string // the map's own full address, when the place came from Google Maps
  lat: number
  lng: number
}

export interface OpeningHours {
  open: string // "HH:MM"
  close: string // "HH:MM"
  closedDays: Weekday[]
}

export interface MenuEntry {
  name: string
  priceTHB: number
}

/** How the merchant chose to fill in the shop on R2. */
export type FillMethod = 'voice' | 'photo' | 'type'

/** A document the scanner can read. */
export type DocKind = 'idCard' | 'bankBook' | 'menu'

export interface OwnerIdentity {
  title: string // นาย / นาง / นางสาว, as printed
  name: string // first and last name, without the title
  idNumber: string // 13 digits, no dashes
}

export interface PayoutAccount {
  bankName: string
  accountNumber: string // digits only
  accountName: string // as printed in the bank book, title included
}

export interface ProfileFields {
  storeName: ProfileField<string>
  category: ProfileField<string>
  location: ProfileField<GeoPoint> & { needsPinCheck?: boolean }
  hours: ProfileField<OpeningHours>
  menu: ProfileField<MenuEntry[]>
  phone: ProfileField<string> & { suggestFromAccount?: boolean }
  owner: ProfileField<OwnerIdentity>
  payout: ProfileField<PayoutAccount>
}

export type ProfileFieldKey = keyof ProfileFields

export interface OnboardingProfile {
  sessionId: string
  fields: ProfileFields
}

/** What one utterance contributed, keyed by field. */
export type ProfileUpdates = {
  [K in ProfileFieldKey]?: {
    value: NonNullable<ProfileFields[K]['value']>
    confidence: number
    heardFrom: string
  }
}

export type ChipKind = 'say' | 'startMic' | 'useAccountPhone' | 'useDeviceLocation' | 'scanMenu'

export interface FollowUpChip {
  label: string
  kind: ChipKind // 'say' feeds the label to the extractor as if spoken
}

export interface FollowUpQuestion {
  field: ProfileFieldKey | null // null = the open "tell me about your shop" prompt
  text: string
  chips: FollowUpChip[]
}

export interface GuardrailCheck {
  id: string
  pass: boolean
  message: string
}

export interface Landmark {
  label: string
  match: string[] // place names as people say them, e.g. "ลาดพร้าวซอย 71"
  lat: number
  lng: number
}

export interface Account {
  ownerName: string
  phone: string
  maskedPhone: string
  deviceLocation: GeoPoint
}
