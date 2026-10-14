import { UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { CHECK_THRESHOLD } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import { formatAccount, formatIdNumber, formatTHB } from '@/lib/format.ts'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import type { DocKind } from '@/types/domain.ts'

/** The diagonal stamp that marks every sample as not a real document. */
function Stamp() {
  return (
    <span
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-red-600/70 px-3 text-2xl font-bold text-red-600/70"
      aria-hidden
    >
      {th.scan.sample}
    </span>
  )
}

function Paper({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`relative w-full max-w-xs overflow-hidden rounded-xl p-4 text-ink shadow-lg ${className}`}>{children}</div>
}

function IdCardSample() {
  const card = sampleScan('idCard')
  return (
    <Paper className="aspect-[85.6/54] bg-linear-to-br from-sky-50 to-emerald-50">
      <p className="text-sm font-bold">{th.scan.paper.idTitle}</p>
      <p className="mt-1 text-sm">
        {th.scan.paper.idNumber} <span className="font-bold tracking-wider">{formatIdNumber(card.idNumber).replaceAll('-', ' ')}</span>
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-sm">
          {th.scan.paper.name} <span className="font-bold">{`${card.title} ${card.name}`}</span>
        </p>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-white/70 ring-1 ring-line">
          <UserRound className="size-10 text-ink-muted" aria-hidden />
        </span>
      </div>
      <Stamp />
    </Paper>
  )
}

function BankBookSample() {
  const book = sampleScan('bankBook')
  return (
    <Paper className="bg-amber-50">
      <p className="border-b border-amber-200 pb-1 text-sm font-bold">{th.scan.paper.bookTitle}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
        <dt>{th.scan.paper.bank}</dt>
        <dd className="font-bold">{book.bankName}</dd>
        <dt>{th.scan.paper.accountNumber}</dt>
        <dd className="font-bold tracking-wider">{formatAccount(book.accountNumber)}</dd>
        <dt>{th.scan.paper.accountName}</dt>
        <dd className="font-bold">{book.accountName}</dd>
      </dl>
      <Stamp />
    </Paper>
  )
}

function PaperMenuSample() {
  const menu = sampleScan('menu')
  return (
    <Paper className="-rotate-1 bg-[#fffaf0]">
      <p className="text-center text-lg font-bold">{menu.storeName.value}</p>
      <ul className="mt-2 flex flex-col gap-0.5 text-sm">
        {menu.items.map((item) => (
          <li key={item.name} className="flex justify-between gap-3 border-b border-dotted border-ink-muted/30">
            <span>{item.name}</span>
            {/* The price the reader is unsure of is smudged on the paper too. */}
            <span className={item.confidence < CHECK_THRESHOLD ? 'blur-[1.5px]' : ''}>{formatTHB(item.priceTHB)}</span>
          </li>
        ))}
      </ul>
      <Stamp />
    </Paper>
  )
}

/** What the camera "sees" on S1: a sample document drawn in code, never a real one. */
export function SampleDocument({ kind }: { kind: DocKind }) {
  switch (kind) {
    case 'idCard':
      return <IdCardSample />
    case 'bankBook':
      return <BankBookSample />
    case 'menu':
      return <PaperMenuSample />
  }
}
