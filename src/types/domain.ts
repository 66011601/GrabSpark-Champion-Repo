export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type FieldStatus = 'empty' | 'heard' | 'confirmed'

export interface ProfileField<T> {
  value: T | null
  status: FieldStatus
  confidence?: number // 0–1, set when status = 'heard'
  heardFrom?: string // the words the value came from (shown in A2)
}

/** A Thai postal address in parts. The merchant sees it as one line (formatThaiAddress). */
export interface ThaiAddress {
  houseNo?: string // "12/3"
  moo?: string // หมู่ "4"
  soi?: string
  road?: string
  subdistrict?: string // ตำบล, or แขวง in Bangkok
  district?: string // อำเภอ, or เขต in Bangkok
  province?: string
  postcode?: string // 5 digits
}

export interface GeoPoint {
  text: string
  address?: string // the full address on one line, when known
  parts?: ThaiAddress // the same address in parts, when known
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

/** GrabMerchant 4/7 "ประเภทธุรกิจ". */
export type BusinessType = 'personal' | 'company'

/** Home's "ตั้งค่าร้านให้เรียบร้อย" tasks. */
export type SetupPart = 'menu' | 'hours'

/** 7/7's two boxes; only the merchant's own tap ticks them. */
export interface Consents {
  terms: boolean
  accurate: boolean
}

/** A document the scanner can read. */
export type DocKind = 'idCard' | 'bankBook' | 'menu'

export interface OwnerIdentity {
  title: string // นาย / นาง / นางสาว, as printed
  name: string // first and last name, without the title
  idNumber: string // 13 digits, no dashes
  birthDate: string // ISO yyyy-mm-dd (CE); shown in the Buddhist calendar
  idExpiry: string // ISO yyyy-mm-dd (CE)
}

export interface PayoutAccount {
  bankName: string
  accountNumber: string // digits only
  accountName: string // as printed in the bank book, title included
  bookPhoto: string | null // 'sample' or a local object URL of the bank book photo; never uploaded
}

export interface ProfileFields {
  storeName: ProfileField<string>
  building: ProfileField<string> // ชื่ออาคาร/ถนน
  location: ProfileField<GeoPoint> & { needsPinCheck?: boolean }
  address: ProfileField<string> // ที่อยู่ร้านค้า
  category: ProfileField<string>
  businessType: ProfileField<BusinessType>
  phone: ProfileField<string> & { suggestFromAccount?: boolean }
  contactEmail: ProfileField<string>
  owner: ProfileField<OwnerIdentity>
  payout: ProfileField<PayoutAccount>
  menu: ProfileField<MenuEntry[]>
  hours: ProfileField<OpeningHours>
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

export type ChipKind = 'say' | 'startMic' | 'useAccountPhone' | 'useDeviceLocation' | 'pinOnMap' | 'scanMenu'

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
  parts?: ThaiAddress // the sample place's address, so it drafts a full address offline
}

export interface Account {
  ownerName: string
  phone: string
  email: string
  maskedPhone: string
  deviceLocation: GeoPoint
}

/** What the (mock) OCR read from one photo. Values are drafts until the merchant confirms them in A2. */
export interface IdCardScan {
  kind: 'idCard'
  title: string
  name: string
  idNumber: string
  birthDate: string
  idExpiry: string
  confidence: number
}

export interface BankBookScan {
  kind: 'bankBook'
  bankName: string
  accountNumber: string
  accountName: string
  confidence: number
}

export interface MenuScan {
  kind: 'menu'
  storeName: { value: string; confidence: number } // from the menu's header
  category: { value: string; confidence: number } // guessed from the dishes
  items: { name: string; priceTHB: number; confidence: number }[]
}

export type ScanResult = IdCardScan | BankBookScan | MenuScan

/** Act 2's simulated Day-30 shop (src/data/merchant.json). All of it is sample data. */
export interface ShopItem {
  id: string
  name: string
  aliases: string[] // what owners call it: "หมูกรอบ"
  type: string // "main" | "drink"
  priceTHB: number
  costTHB: number
  sold28d: number
}

export interface Merchant {
  storeName: string
  hours: OpeningHours
  commissionRate: number
  maxDailyPromoSpendTHB: number
  menu: ShopItem[]
  activePromotions: { itemIds: string[]; window: [string, string] }[]
  sales: { days: string[]; thisWeekTHB: number[]; lastWeekTHB: number[] }
  baselineOrdersByHour: Record<string, number>
  rainLiftPct: [number, number]
  bundleLiftPct: [number, number] // assumption for the demo: how much a bundle lifts orders in its window
  reviews: { stars: number; text: string; topic?: string }[]
}
