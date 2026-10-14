import accountData from '@/data/account.json'
import landmarkData from '@/data/landmarks.json'
import merchantData from '@/data/merchant.json'
import type { Account, Landmark, Merchant } from '@/types/domain.ts'

/** Mock of the logged-in GrabMerchant account. */
export function getAccount(): Account {
  return accountData
}

/** Mock geocoder table: places the location parser can recognise. */
export function getLandmarks(): Landmark[] {
  return landmarkData
}

/** Mock of the Day-30 shop Act 2 works on. */
export function getMerchant(): Merchant {
  return merchantData as unknown as Merchant
}
