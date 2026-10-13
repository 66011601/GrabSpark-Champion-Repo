import accountData from '@/data/account.json'
import landmarkData from '@/data/landmarks.json'
import type { Account, Landmark } from '@/types/domain.ts'

/** Mock of the logged-in GrabMerchant account. */
export function getAccount(): Account {
  return accountData
}

/** Mock geocoder table: places the location parser can recognise. */
export function getLandmarks(): Landmark[] {
  return landmarkData
}
