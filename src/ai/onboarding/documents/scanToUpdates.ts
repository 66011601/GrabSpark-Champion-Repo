import { th } from '@/copy/th.ts'
import type { ProfileUpdates, ScanResult } from '@/types/domain.ts'

/** What one photo contributes to the profile. Like speech, it only drafts: A2 still needs the merchant's tap. */
export function scanToUpdates(scan: ScanResult): ProfileUpdates {
  const heardFrom = th.scan.source[scan.kind]
  switch (scan.kind) {
    case 'idCard':
      return { owner: { value: { title: scan.title, name: scan.name, idNumber: scan.idNumber, birthDate: scan.birthDate, idExpiry: scan.idExpiry }, confidence: scan.confidence, heardFrom } }
    case 'bankBook':
      return {
        payout: {
          value: { bankName: scan.bankName, accountNumber: scan.accountNumber, accountName: scan.accountName, bookPhoto: 'sample' },
          confidence: scan.confidence,
          heardFrom,
        },
      }
    case 'menu': {
      const updates: ProfileUpdates = {
        storeName: { ...scan.storeName, heardFrom },
        category: { ...scan.category, heardFrom },
      }
      if (scan.items.length > 0) {
        updates.menu = {
          value: scan.items.map(({ name, priceTHB }) => ({ name, priceTHB })),
          // One smudged price is enough to ask the merchant to look again.
          confidence: Math.min(...scan.items.map((item) => item.confidence)),
          heardFrom,
        }
      }
      return updates
    }
  }
}
