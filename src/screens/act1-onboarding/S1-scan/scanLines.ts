import { CHECK_THRESHOLD } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import { formatAccount, formatIdNumber, formatTHB, lastFour } from '@/lib/format.ts'
import type { ScanResult } from '@/types/domain.ts'

export interface ScanLine {
  label: string
  value: string
  confidence: number
}

/** The rows S1 shows after a read. This is the only place a full ID or account number appears. */
export function scanLines(scan: ScanResult): ScanLine[] {
  const { lines } = th.scan
  switch (scan.kind) {
    case 'idCard':
      return [
        { label: lines.name, value: `${scan.title} ${scan.name}`, confidence: scan.confidence },
        { label: lines.idNumber, value: formatIdNumber(scan.idNumber), confidence: scan.confidence },
      ]
    case 'bankBook':
      return [
        { label: lines.bank, value: scan.bankName, confidence: scan.confidence },
        { label: lines.accountNumber, value: formatAccount(scan.accountNumber), confidence: scan.confidence },
        { label: lines.accountName, value: scan.accountName, confidence: scan.confidence },
      ]
    case 'menu':
      return [
        { label: lines.storeName, value: scan.storeName.value, confidence: scan.storeName.confidence },
        { label: lines.category, value: scan.category.value, confidence: scan.category.confidence },
        ...scan.items.map((item) => ({ label: item.name, value: formatTHB(item.priceTHB), confidence: item.confidence })),
      ]
  }
}

/** What the companion says after a read: numbers only by their last four digits. */
export function scanSummary(scan: ScanResult): string {
  switch (scan.kind) {
    case 'idCard':
      return th.scan.readId(scan.name, lastFour(scan.idNumber))
    case 'bankBook':
      return th.scan.readBank(scan.bankName, lastFour(scan.accountNumber))
    case 'menu': {
      const unclear = scan.items.find((item) => item.confidence < CHECK_THRESHOLD)
      return th.scan.readMenu(scan.items.length, unclear?.name ?? null)
    }
  }
}
