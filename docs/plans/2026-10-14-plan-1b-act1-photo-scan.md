# Plan 1b: Fill-in method choice and photo scan, implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On R2 the merchant chooses how to sign up (voice, photo or typing). A simulated scanner reads a sample ID card, bank book and paper menu into the same profile that voice fills. A2 then reviews and guards all eight fields before anything is sent.

**Architecture:**
- **Scan screen.** One new screen (`S1_SCAN`) works through a queue of documents held in the journey state.
- **Mock OCR.** It returns typed `ScanResult`s from a JSON file. A pure function turns each result into the same `ProfileUpdates` that speech produces.
- **Guardrail.** It gains two deterministic document checks: the Thai ID checksum, and that the account name matches the ID card.
- **Trust rule unchanged.** Nothing new can reach the write API.

**Tech stack:** React 19.3, TypeScript 6.0, Tailwind 4.3, Vitest 5, lucide-react, Vite 8. There are no new dependencies.

**Spec:** `docs/specs/2026-10-14-act1-photo-scan-design.md`, which extends `docs/specs/2026-10-13-merchant-companion-design.md`.

## Global constraints

**Code style**
- No semicolons and single quotes.
- Imports use explicit `.ts`/`.tsx` extensions, and `@/` maps to `src/`.
- `verbatimModuleSyntax` and `erasableSyntaxOnly` are on, so no enums and no parameter properties.

**Copy and accessibility**
- Every string the merchant sees lives in `src/copy/th.ts`.
- The companion calls itself หนู and ends sentences with ค่ะ/คะ.
- Tap targets are at least 56px (`min-h-14`). Body text is never smaller than `text-sm` (16px).

**Trust and privacy**
- **Trust rule:** only `src/ai/onboarding/submit.ts` may import `src/services/merchantApi.write.ts`.
- `src/ai/**` never imports React.
- Scanning only drafts values (`status: 'heard'`). Nothing is confirmed without a tap in A2.
- Full ID and account numbers are shown only in S1's results list. They are masked everywhere else, never spoken, and never taken by voice.
- All sample data is fictional:
  - ID `1234567890121`
  - account `1234567890`
  - owner นาง แดง ใจดี
  - the sample documents carry a "ตัวอย่าง" stamp and no real logos.

**Running tests**
- Run `npx vitest run <file>` for one file, `npm test` for everything, then `npm run build` and `npm run lint`. All must be clean before each commit.
- Vitest runs in Node: in code that tests touch, use the global `setTimeout`, not `window.setTimeout`.

**Commits**
- Plain sentence commit messages with no `feat:` prefix.
- End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/ai/onboarding/documents/thaiId.ts` | create | Thai ID checksum |
| `src/ai/onboarding/documents/nameMatch.ts` | create | Compare two Thai names, ignoring titles and spaces |
| `src/ai/onboarding/documents/scanToUpdates.ts` | create | `ScanResult` → `ProfileUpdates` |
| `src/lib/format.ts` | modify | Full and masked ID/account formats, `lastFour` |
| `src/types/domain.ts` | modify | `FillMethod`, `DocKind`, `OwnerIdentity`, `PayoutAccount`, `ScanResult`; `owner`/`payout` fields |
| `src/ai/onboarding/profile.ts` | modify | `TALK_FIELDS` / `DOC_FIELDS` / `REVIEW_FIELDS`, `missingDocs`, `DOC_FOR_FIELD` |
| `src/ai/onboarding/submit.ts` | modify | ID_VALID, PAYOUT_NAME_MATCH; ALL_CONFIRMED over 8 fields |
| `src/data/ocr-samples.json` | create | The three sample documents |
| `src/services/ocr/mockOcr.ts` | create | `sampleScan`, `readDocument` |
| `src/app/journey/journeyMachine.ts` | modify | `S1_SCAN`, `method`, `scan`, scan events, `TALK_DONE` |
| `src/ai/commands/phrases.ts` | modify | Method and scan voice commands |
| `src/screens/register/R2-account/MethodPicker.tsx` | create | Three method cards |
| `src/screens/register/R2-account/AccountScreen.tsx` | modify | Hosts MethodPicker, sends `method` |
| `src/screens/act1-onboarding/S1-scan/SampleDocument.tsx` | create | Sample ID card, bank book and paper menu, drawn in code |
| `src/screens/act1-onboarding/S1-scan/Viewfinder.tsx` | create | Camera frame and scan line |
| `src/screens/act1-onboarding/S1-scan/scanLines.ts` | create | Result rows and the companion's line after a read |
| `src/screens/act1-onboarding/S1-scan/ScanResults.tsx` | create | The read values list |
| `src/screens/act1-onboarding/S1-scan/ScanScreen.tsx` | create | The S1 screen |
| `src/screens/act1-onboarding/A1-talk/TalkScreen.tsx` | modify | `TALK_DONE`, menu chip opens S1, typing path |
| `src/screens/register/R3-store/StoreBasicsScreen.tsx` | modify | No auto-listen on the typing path |
| `src/screens/act1-onboarding/A2-review/*` | modify | Owner and payout cards, rescan, new copy |
| `src/screens/act1-onboarding/summarizeField.ts` | modify | Owner and payout summaries (masked) |
| `src/app/demo/*`, `src/App.tsx`, `README.md`, `src/architecture.test.ts` | modify | Wiring, presenter jumps, docs, trust test |

---

### Task 1: Document checks and number formats

**Files:**
- Create: `src/ai/onboarding/documents/thaiId.ts`, `src/ai/onboarding/documents/thaiId.test.ts`
- Create: `src/ai/onboarding/documents/nameMatch.ts`, `src/ai/onboarding/documents/nameMatch.test.ts`
- Modify: `src/lib/format.ts` (append), `src/lib/format.test.ts` (append)

**Interfaces:**
- **Produces:**
  - `isValidThaiId(id: string): boolean`
  - `normalizeName(name: string): string`
  - `namesMatch(a: string, b: string): boolean`
  - `formatIdNumber(id: string): string`
  - `maskIdNumber(id: string): string`
  - `formatAccount(account: string): string`
  - `maskAccount(account: string): string`
  - `lastFour(digits: string): string`

- [ ] **Step 1: Write the failing tests**

`src/ai/onboarding/documents/thaiId.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isValidThaiId } from './thaiId.ts'

describe('isValidThaiId', () => {
  it('accepts 13 digits whose last digit is the checksum', () => {
    expect(isValidThaiId('1234567890121')).toBe(true)
    expect(isValidThaiId('1103700412344')).toBe(true)
  })

  it('rejects a wrong checksum', () => {
    expect(isValidThaiId('1234567890122')).toBe(false)
  })

  it('rejects anything that is not exactly 13 digits', () => {
    expect(isValidThaiId('123456789012')).toBe(false)
    expect(isValidThaiId('1-2345-67890-12-1')).toBe(false)
    expect(isValidThaiId('')).toBe(false)
  })
})
```

`src/ai/onboarding/documents/nameMatch.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { namesMatch, normalizeName } from './nameMatch.ts'

describe('normalizeName', () => {
  it('drops the title and every space', () => {
    expect(normalizeName('นาง แดง ใจดี')).toBe('แดงใจดี')
    expect(normalizeName('นางสาวแดง  ใจดี')).toBe('แดงใจดี')
    expect(normalizeName('น.ส. แดง ใจดี')).toBe('แดงใจดี')
    expect(normalizeName(' นาย สมชาย ขายดี ')).toBe('สมชายขายดี')
  })
})

describe('namesMatch', () => {
  it('matches the ID card name with the bank book name', () => {
    expect(namesMatch('แดง ใจดี', 'นาง แดง ใจดี')).toBe(true)
  })

  it('does not match a different person', () => {
    expect(namesMatch('แดง ใจดี', 'นาง แดง ใจร้าย')).toBe(false)
  })

  it('never matches two empty names', () => {
    expect(namesMatch('', '')).toBe(false)
    expect(namesMatch('นาง', 'นาง')).toBe(false)
  })
})
```

Append to `src/lib/format.test.ts`. Extend the import line at the top to:

```ts
import { formatAccount, formatDuration, formatHours, formatIdNumber, formatPhone, formatTHB, formatTime, lastFour, maskAccount, maskIdNumber } from './format.ts'
```

Then add this to the end of the file:

```ts
describe('ID and account numbers', () => {
  it('groups a full ID number the way the card prints it', () => {
    expect(formatIdNumber('1234567890121')).toBe('1-2345-67890-12-1')
  })

  it('masks an ID number except the last four digits', () => {
    expect(maskIdNumber('1234567890121')).toBe('x-xxxx-xxxx0-12-1')
  })

  it('groups and masks a 10-digit account number', () => {
    expect(formatAccount('1234567890')).toBe('123-4-56789-0')
    expect(maskAccount('1234567890')).toBe('xxx-x-xx789-0')
  })

  it('leaves out the dashes when the length is unexpected', () => {
    expect(maskAccount('123456789012')).toBe('xxxxxxxx9012')
  })

  it('gives the last four digits for spoken lines', () => {
    expect(lastFour('1234567890')).toBe('7890')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/ai/onboarding/documents src/lib/format.test.ts`
Expected: FAIL, with modules not found or the format functions not exported.

- [ ] **Step 3: Implement**

`src/ai/onboarding/documents/thaiId.ts`:

```ts
const ID_LENGTH = 13

/** Thai national ID: 13 digits; the last is a checksum of the first 12, weighted 13 down to 2. */
export function isValidThaiId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false
  const digits = [...id].map(Number)
  const sum = digits.slice(0, 12).reduce((total, digit, index) => total + digit * (ID_LENGTH - index), 0)
  return (11 - (sum % 11)) % 10 === digits[12]
}
```

`src/ai/onboarding/documents/nameMatch.ts`:

```ts
// Titles the ID card and the bank book may write differently, or leave out. Longest first.
const TITLE = /^(?:นางสาว|เด็กชาย|เด็กหญิง|น\.ส\.|ด\.ช\.|ด\.ญ\.|นาง|นาย)\s*/

/** "นาง แดง ใจดี" → "แดงใจดี": no title, no spaces. */
export function normalizeName(name: string): string {
  return name.trim().replace(TITLE, '').replace(/\s+/g, '')
}

/** Grab pays out only to an account in the owner's own name. */
export function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  return left.length > 0 && left === normalizeName(b)
}
```

Append to `src/lib/format.ts`:

```ts
const ID_GROUPS = [1, 4, 5, 2, 1]
const ACCOUNT_GROUPS = [3, 1, 5, 1]

/** Joins digits with dashes in the given group sizes, or leaves them as they are when the length does not fit. */
function group(digits: string, sizes: number[]): string {
  if (digits.length !== sizes.reduce((total, size) => total + size, 0)) return digits
  const parts: string[] = []
  let at = 0
  for (const size of sizes) {
    parts.push(digits.slice(at, at + size))
    at += size
  }
  return parts.join('-')
}

const hideAllButLastFour = (digits: string) => digits.slice(0, -4).replace(/\d/g, 'x') + digits.slice(-4)

/** "1234567890121" → "1-2345-67890-12-1" (only on S1, right after the photo). */
export const formatIdNumber = (id: string) => group(id, ID_GROUPS)

/** "1234567890121" → "x-xxxx-xxxx0-12-1" */
export const maskIdNumber = (id: string) => group(hideAllButLastFour(id), ID_GROUPS)

/** "1234567890" → "123-4-56789-0" */
export const formatAccount = (account: string) => group(account, ACCOUNT_GROUPS)

/** "1234567890" → "xxx-x-xx789-0" */
export const maskAccount = (account: string) => group(hideAllButLastFour(account), ACCOUNT_GROUPS)

/** What the companion may say aloud: "ลงท้ายด้วย 7890". */
export const lastFour = (digits: string) => digits.slice(-4)
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/ai/onboarding/documents src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Check and commit**

```bash
npm test && npm run build && npm run lint
git add src/ai/onboarding/documents src/lib/format.ts src/lib/format.test.ts
git commit -m "Add the Thai ID checksum, owner-name matching and masked number formats

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Owner and payout fields, and field groups

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/ai/onboarding/profile.ts`, `src/ai/onboarding/profile.test.ts`
- Modify: `src/ai/onboarding/followUp.ts`, `src/ai/onboarding/submit.ts`, `src/ai/onboarding/submit.test.ts`
- Modify: `src/app/demo/demoProfile.test.ts`, `src/copy/th.ts`
- Modify: `src/screens/act1-onboarding/summarizeField.ts`, `src/screens/act1-onboarding/summarizeField.test.ts`
- Modify: `src/screens/act1-onboarding/A1-talk/LiveProfileChecklist.tsx`, `src/screens/act1-onboarding/A1-talk/TalkScreen.tsx`, `src/screens/act1-onboarding/A2-review/ReviewScreen.tsx`

**Interfaces:**
- **Consumes:** `lastFour` (Task 1).
- **Produces:**
  - Types `FillMethod`, `DocKind`, `OwnerIdentity` and `PayoutAccount`; `ProfileFields.owner` and `ProfileFields.payout`.
  - `TALK_FIELDS`, `DOC_FIELDS` and `REVIEW_FIELDS: ProfileFieldKey[]`.
  - `DOC_FOR_FIELD: Partial<Record<ProfileFieldKey, DocKind>>` and `missingDocs(profile: OnboardingProfile): DocKind[]`.
  - Copy: `th.fields.owner` and `th.fields.payout`; `th.review.payoutSummary(bank: string, last4: string)`.
  - `PROFILE_FIELDS` is **removed**, renamed to `TALK_FIELDS`. The spec's `missingDocs(profile, method)` loses its `method` argument because the result never depends on it.

- [ ] **Step 1: Add the types**

In `src/types/domain.ts`, insert after the `MenuEntry` interface:

```ts
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
```

Then add these two lines at the end of `ProfileFields`, after `phone`:

```ts
  owner: ProfileField<OwnerIdentity>
  payout: ProfileField<PayoutAccount>
```

- [ ] **Step 2: Write the failing profile tests**

In `src/ai/onboarding/profile.test.ts`:
- Change the import list: replace `PROFILE_FIELDS,` with `DOC_FIELDS,`, `missingDocs,`, `REVIEW_FIELDS,` and `TALK_FIELDS,`, keeping alphabetical order.
- Replace `PROFILE_FIELDS.every` in the first test with `REVIEW_FIELDS.every`.
- Append:

```ts
const OWNER = { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'รูปบัตรประชาชน' }
const PAYOUT = {
  value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' },
  confidence: 0.95,
  heardFrom: 'รูปสมุดบัญชี',
}

describe('field groups', () => {
  it('talks about six fields and scans two', () => {
    expect(TALK_FIELDS).toEqual(['storeName', 'category', 'location', 'hours', 'menu', 'phone'])
    expect(DOC_FIELDS).toEqual(['owner', 'payout'])
    expect(REVIEW_FIELDS).toEqual([...TALK_FIELDS, ...DOC_FIELDS])
  })

  it('applies scanned document values as drafts', () => {
    const profile = applyUpdates(createEmptyProfile(), { owner: OWNER })
    expect(profile.fields.owner).toEqual({ ...OWNER, status: 'heard' })
  })

  it('does not wait for documents before review is possible from A1', () => {
    const talked = applyUpdates(createEmptyProfile(), {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
      category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
      location: { value: PIN, confidence: 0.62, heardFrom: 'x' },
      hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
      phone: { value: '0812344217', confidence: 1, heardFrom: 'x' },
    })
    expect(isReadyForReview(talked)).toBe(true)
    expect(countHeard(talked)).toBe(6)
  })
})

describe('missingDocs', () => {
  it('asks for the ID card and the bank book until both are scanned', () => {
    const empty = createEmptyProfile()
    expect(missingDocs(empty)).toEqual(['idCard', 'bankBook'])
    expect(missingDocs(applyUpdates(empty, { owner: OWNER }))).toEqual(['bankBook'])
    expect(missingDocs(applyUpdates(empty, { owner: OWNER, payout: PAYOUT }))).toEqual([])
  })
})
```

Run: `npx vitest run src/ai/onboarding/profile.test.ts`
Expected: FAIL. The new exports do not exist yet, and TypeScript reports `owner`/`payout` missing from `createEmptyProfile`.

- [ ] **Step 3: Implement the profile changes**

In `src/ai/onboarding/profile.ts`:
- Add `DocKind` to the type import.
- Replace the `PROFILE_FIELDS` export with:

```ts
/** What A1 asks about, in the order it asks; also the A1 checklist. */
export const TALK_FIELDS: ProfileFieldKey[] = ['storeName', 'category', 'location', 'hours', 'menu', 'phone']

/** What only a photo fills (S1); never asked by voice. */
export const DOC_FIELDS: ProfileFieldKey[] = ['owner', 'payout']

/** Everything A2 shows and the guardrail requires confirmed. */
export const REVIEW_FIELDS: ProfileFieldKey[] = [...TALK_FIELDS, ...DOC_FIELDS]

/** Which document fills a document field: editing that field in A2 means photographing it again. */
export const DOC_FOR_FIELD: Partial<Record<ProfileFieldKey, DocKind>> = { owner: 'idCard', payout: 'bankBook' }
```

- In `createEmptyProfile`, add after the `phone` line:

```ts
      owner: { value: null, status: 'empty' },
      payout: { value: null, status: 'empty' },
```

- In `applyUpdates`, change `for (const key of PROFILE_FIELDS)` to `for (const key of REVIEW_FIELDS)`.
- In `countHeard` and `isReadyForReview`, change `PROFILE_FIELDS` to `TALK_FIELDS`. There are three occurrences.
- Append:

```ts
/** The documents still to photograph before review: the ID card while there is no owner, the bank book while there is no payout account. */
export function missingDocs(profile: OnboardingProfile): DocKind[] {
  const docs: DocKind[] = []
  if (profile.fields.owner.status === 'empty') docs.push('idCard')
  if (profile.fields.payout.status === 'empty') docs.push('bankBook')
  return docs
}
```

- [ ] **Step 4: Rename the other users of `PROFILE_FIELDS`**

Every one of these becomes `TALK_FIELDS`, in both the import and the use:
- `src/ai/onboarding/followUp.ts`: the import and two uses.
- `src/ai/onboarding/submit.ts`: the import and one use. Task 3 changes this one to `REVIEW_FIELDS`.
- `src/ai/onboarding/submit.test.ts`: the import and two uses.
- `src/app/demo/demoProfile.test.ts`: the import and one use.
- `src/screens/act1-onboarding/A1-talk/LiveProfileChecklist.tsx`: the import and one use.
- `src/screens/act1-onboarding/A1-talk/TalkScreen.tsx`: the import and one use.
- `src/screens/act1-onboarding/A2-review/ReviewScreen.tsx`: the import and two uses. Task 10 changes these.

Run: `npx vitest run src/ai/onboarding/profile.test.ts`
Expected: PASS. Then run `npx tsc -b`. The expected errors are of two kinds, and Step 5 fixes both:
- `th.fields` has no `owner`/`payout`, which breaks every `th.fields[key]` lookup (summarizeField, LiveProfileChecklist, ReviewScreen).
- The `summarizeField` switch does not cover `owner`/`payout`.

- [ ] **Step 5: Summaries for the new fields (tests first)**

In `src/copy/th.ts`, add these to `fields`, after `phone`:

```ts
    owner: 'เจ้าของร้าน',
    payout: 'บัญชีรับเงิน',
```

Add this to `review`, after `moreItems`:

```ts
    payoutSummary: (bank: string, last4: string) => `${bank} ลงท้ายด้วย ${last4}`,
```

Append to `src/screens/act1-onboarding/summarizeField.test.ts`, adding `import { applyUpdates } from '@/ai/onboarding/profile.ts'` at the top:

```ts
describe('document fields', () => {
  const profile = applyUpdates(demoProfile(), {
    owner: { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'x' },
    payout: { value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' }, confidence: 0.95, heardFrom: 'x' },
  })

  it('names the owner and only the last four digits of the account', () => {
    expect(summarizeField(profile, 'owner')).toBe('แดง ใจดี')
    expect(summarizeField(profile, 'payout')).toBe('ธนาคารกสิกรไทย ลงท้ายด้วย 7890')
  })

  it('never reads a full ID or account number aloud', () => {
    const said = profileSummary(profile)
    expect(said).toContain('เจ้าของร้าน แดง ใจดี บัญชีรับเงิน ธนาคารกสิกรไทย ลงท้ายด้วย 7890')
    expect(said).not.toContain('1234567890')
  })
})
```

In `src/screens/act1-onboarding/summarizeField.ts`:
- Change the import to `import { REVIEW_FIELDS } from '@/ai/onboarding/profile.ts'`.
- Add `lastFour` to the format import.
- Add these cases to the switch:

```ts
    case 'owner':
      return fields.owner.value?.name ?? ''
    case 'payout':
      return fields.payout.value ? th.review.payoutSummary(fields.payout.value.bankName, lastFour(fields.payout.value.accountNumber)) : ''
```

- Replace `profileSummary` with:

```ts
/** One paragraph for read-aloud. Fields not filled yet are left out; numbers are only ever their last four digits. */
export function profileSummary(profile: OnboardingProfile): string {
  return REVIEW_FIELDS.map((key) => [key, summarizeField(profile, key)] as const)
    .filter(([, summary]) => summary !== '')
    .map(([key, summary]) => `${th.fields[key]} ${summary}`)
    .join(' ')
}
```

The existing `profileSummary` test keeps passing because `demoProfile()` has no documents yet.

- [ ] **Step 6: Run everything**

Run: `npm test && npm run build && npm run lint`
Expected: everything passes, and the build is clean.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "Add owner and payout fields; split talk fields from document fields

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Guardrail checks for the documents

**Files:**
- Modify: `src/ai/onboarding/submit.ts`, `src/ai/onboarding/submit.test.ts`, `src/copy/th.ts`

**Interfaces:**
- **Consumes:** `isValidThaiId`, `namesMatch` (Task 1); `REVIEW_FIELDS` (Task 2).
- **Produces:** `runSubmissionChecks` returns seven checks, in this order: ALL_CONFIRMED, PIN_CONFIRMED, MENU_VALID, HOURS_VALID, PHONE_VALID, ID_VALID, PAYOUT_NAME_MATCH.

- [ ] **Step 1: Write the failing tests**

In `src/ai/onboarding/submit.test.ts`:
- Change the profile import to `import { applyUpdates, confirmField, createEmptyProfile, REVIEW_FIELDS } from './profile.ts'`. Then replace every `TALK_FIELDS` with `REVIEW_FIELDS`, and change `.slice(0, 4)` to `.slice(0, 6)` in the "counts unconfirmed fields" test (still 2 left).
- Add to `VALID`:

```ts
  owner: { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'x' },
  payout: { value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' }, confidence: 0.95, heardFrom: 'x' },
```

- Append inside `describe('runSubmissionChecks', …)`:

```ts
  it('rejects an ID number whose checksum is wrong', () => {
    const typo = confirmedProfile({ owner: { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890122' }, confidence: 0.97, heardFrom: 'x' } })
    expect(check(typo, 'ID_VALID')).toEqual({ id: 'ID_VALID', pass: false, message: 'เลขบัตรไม่ถูกต้อง ถ่ายใหม่อีกครั้งนะคะ' })
  })

  it('requires the bank account to be in the owner’s name', () => {
    const someoneElse = confirmedProfile({
      payout: { value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาย สมชาย ขายดี' }, confidence: 0.95, heardFrom: 'x' },
    })
    expect(check(someoneElse, 'PAYOUT_NAME_MATCH')).toEqual({ id: 'PAYOUT_NAME_MATCH', pass: false, message: 'ชื่อบัญชีต้องตรงกับชื่อบนบัตรค่ะ' })
  })

  it('fails both document checks when nothing was scanned', () => {
    const heard = applyUpdates(createEmptyProfile(), { ...VALID, owner: undefined, payout: undefined })
    expect(check(heard, 'ID_VALID')?.pass).toBe(false)
    expect(check(heard, 'PAYOUT_NAME_MATCH')?.pass).toBe(false)
    expect(check(heard, 'ALL_CONFIRMED')?.message).toBe('ยังมีข้อมูลที่ต้องยืนยัน 8 ข้อ')
  })
```

Run: `npx vitest run src/ai/onboarding/submit.test.ts`
Expected: FAIL, because ID_VALID and PAYOUT_NAME_MATCH are undefined.

- [ ] **Step 2: Implement**

Add to `th.checks` in `src/copy/th.ts`:

```ts
    idOk: 'เลขบัตรถูกต้อง',
    idInvalid: 'เลขบัตรไม่ถูกต้อง ถ่ายใหม่อีกครั้งนะคะ',
    payoutNameOk: 'ชื่อบัญชีตรงกับบัตร',
    payoutNameMismatch: 'ชื่อบัญชีต้องตรงกับชื่อบนบัตรค่ะ',
```

In `src/ai/onboarding/submit.ts`:
- Import `REVIEW_FIELDS` instead of `TALK_FIELDS`, and add:

```ts
import { namesMatch } from './documents/nameMatch.ts'
import { isValidThaiId } from './documents/thaiId.ts'
```

- In `runSubmissionChecks`, count over `REVIEW_FIELDS`. Add before the `return`:

```ts
  const owner = fields.owner.value
  const payout = fields.payout.value
  const idOk = owner !== null && isValidThaiId(owner.idNumber)
  const nameOk = owner !== null && payout !== null && namesMatch(owner.name, payout.accountName)
```

- Append to the returned array:

```ts
    { id: 'ID_VALID', pass: idOk, message: idOk ? th.checks.idOk : th.checks.idInvalid },
    { id: 'PAYOUT_NAME_MATCH', pass: nameOk, message: nameOk ? th.checks.payoutNameOk : th.checks.payoutNameMismatch },
```

- Update the doc comment to `/** Deterministic checks run before anything leaves the phone (spec §6.5, photo-scan spec §4.5). */`.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/ai/onboarding/submit.test.ts`
Expected: PASS. "reports which checks failed" still lists `['ALL_CONFIRMED', 'PIN_CONFIRMED']`, because the heard-only profile has a valid ID and matching names.

- [ ] **Step 4: Check and commit**

A2 cannot submit in the browser until Task 10 adds the owner and payout cards. That is expected mid-plan.

```bash
npm test && npm run build && npm run lint
git add src/ai/onboarding/submit.ts src/ai/onboarding/submit.test.ts src/copy/th.ts
git commit -m "Guard the ID checksum and require the payout account in the owner's name

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Mock OCR and scan → profile updates

**Files:**
- Modify: `src/types/domain.ts`, `src/copy/th.ts`
- Create: `src/data/ocr-samples.json`
- Create: `src/services/ocr/mockOcr.ts`, `src/services/ocr/mockOcr.test.ts`
- Create: `src/ai/onboarding/documents/scanToUpdates.ts`, `src/ai/onboarding/documents/scanToUpdates.test.ts`

**Interfaces:**
- **Consumes:** `DocKind`, `ProfileUpdates` (Task 2).
- **Produces:**
  - Types `IdCardScan`, `BankBookScan`, `MenuScan` and `ScanResult`.
  - `READ_MS = 1200`.
  - `sampleScan<K extends DocKind>(kind: K)`, which returns the scan type for that kind (for example `sampleScan('menu')` is a `MenuScan`). It is synchronous and returns a fresh copy.
  - `readDocument(kind: DocKind, delayMs?: number): Promise<ScanResult>`.
  - `scanToUpdates(scan: ScanResult): ProfileUpdates`.
  - Copy: `th.scan.source: { idCard, bankBook, menu }` and `th.scan.lines: { name, idNumber, bank, accountNumber, accountName, storeName, category }`.

- [ ] **Step 1: Add the types**

Append to `src/types/domain.ts`:

```ts
/** What the (mock) OCR read from one photo. Values are drafts until the merchant confirms them in A2. */
export interface IdCardScan {
  kind: 'idCard'
  title: string
  name: string
  idNumber: string
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
```

- [ ] **Step 2: Add the sample data and copy**

`src/data/ocr-samples.json` uses the same store and dishes as `onboarding-script.json`, so every path reaches the same A2:

```json
{
  "idCard": { "kind": "idCard", "title": "นาง", "name": "แดง ใจดี", "idNumber": "1234567890121", "confidence": 0.97 },
  "bankBook": { "kind": "bankBook", "bankName": "ธนาคารกสิกรไทย", "accountNumber": "1234567890", "accountName": "นาง แดง ใจดี", "confidence": 0.95 },
  "menu": {
    "kind": "menu",
    "storeName": { "value": "ครัวป้าแดง", "confidence": 0.9 },
    "category": { "value": "อาหารไทย", "confidence": 0.75 },
    "items": [
      { "name": "น้ำพริกกะปิปลาทู", "priceTHB": 89, "confidence": 0.6 },
      { "name": "กะเพราหมูสับ", "priceTHB": 65, "confidence": 0.95 },
      { "name": "แกงเขียวหวาน", "priceTHB": 75, "confidence": 0.95 },
      { "name": "ชาไทยเย็น", "priceTHB": 35, "confidence": 0.95 },
      { "name": "น้ำกระเจี๊ยบ", "priceTHB": 30, "confidence": 0.95 }
    ]
  }
}
```

Add a `scan` block to `src/copy/th.ts`, after `review`. Task 8 adds the rest of this block.

```ts
  scan: {
    // Where a scanned value came from; A2 shows it as "ที่มา: …", never "ได้ยินว่า".
    source: { idCard: 'รูปบัตรประชาชน', bankBook: 'รูปสมุดบัญชี', menu: 'รูปเมนู' },
    lines: {
      name: 'ชื่อ-นามสกุล',
      idNumber: 'เลขบัตรประชาชน',
      bank: 'ธนาคาร',
      accountNumber: 'เลขบัญชี',
      accountName: 'ชื่อบัญชี',
      storeName: 'ชื่อร้าน',
      category: 'ประเภทอาหาร',
    },
  },
```

- [ ] **Step 3: Write the failing tests**

`src/services/ocr/mockOcr.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { READ_MS, readDocument, sampleScan } from './mockOcr.ts'

afterEach(() => {
  vi.useRealTimers()
})

describe('readDocument', () => {
  it('reads the sample for that document after a moment', async () => {
    vi.useFakeTimers()
    let done = false
    const reading = readDocument('idCard').then((scan) => {
      done = true
      return scan
    })
    await vi.advanceTimersByTimeAsync(READ_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await expect(reading).resolves.toEqual(sampleScan('idCard'))
  })

  it('hands out a fresh copy every time', async () => {
    const first = sampleScan('menu')
    first.items.pop()
    expect(sampleScan('menu').items).toHaveLength(5)
    const read = await readDocument('menu', 0)
    expect(read.kind).toBe('menu')
  })

  it('matches the demo store', () => {
    expect(sampleScan('idCard').idNumber).toBe('1234567890121')
    expect(sampleScan('bankBook').accountName).toBe('นาง แดง ใจดี')
    expect(sampleScan('menu').storeName.value).toBe('ครัวป้าแดง')
  })
})
```

`src/ai/onboarding/documents/scanToUpdates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import { applyUpdates, createEmptyProfile } from '../profile.ts'
import { scanToUpdates } from './scanToUpdates.ts'

describe('scanToUpdates', () => {
  it('turns an ID card into the owner', () => {
    expect(scanToUpdates(sampleScan('idCard'))).toEqual({
      owner: { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'รูปบัตรประชาชน' },
    })
  })

  it('turns a bank book into the payout account', () => {
    expect(scanToUpdates(sampleScan('bankBook'))).toEqual({
      payout: {
        value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' },
        confidence: 0.95,
        heardFrom: 'รูปสมุดบัญชี',
      },
    })
  })

  it('takes the store name, a guessed category and every dish from a menu', () => {
    const updates = scanToUpdates(sampleScan('menu'))
    expect(updates.storeName).toEqual({ value: 'ครัวป้าแดง', confidence: 0.9, heardFrom: 'รูปเมนู' })
    expect(updates.category).toEqual({ value: 'อาหารไทย', confidence: 0.75, heardFrom: 'รูปเมนู' })
    expect(updates.menu?.value.map((item) => item.priceTHB)).toEqual([89, 65, 75, 35, 30])
  })

  it('rates the whole menu by its least readable price', () => {
    expect(scanToUpdates(sampleScan('menu')).menu?.confidence).toBe(0.6)
  })

  it('leaves out the menu when no dish was read', () => {
    const blank = { ...sampleScan('menu'), items: [] }
    expect(scanToUpdates(blank).menu).toBeUndefined()
  })

  it('only drafts values: nothing is confirmed by a photo', () => {
    const profile = applyUpdates(createEmptyProfile(), scanToUpdates(sampleScan('idCard')))
    expect(profile.fields.owner.status).toBe('heard')
  })
})
```

Run: `npx vitest run src/services/ocr src/ai/onboarding/documents/scanToUpdates.test.ts`
Expected: FAIL, because the modules are not found.

- [ ] **Step 4: Implement**

`src/services/ocr/mockOcr.ts`:

```ts
import samples from '@/data/ocr-samples.json'
import type { DocKind, ScanResult } from '@/types/domain.ts'

type Samples = { [K in DocKind]: Extract<ScanResult, { kind: K }> }

const SAMPLES = samples as Samples

/** How long the pretend reading takes; S1's scan-line animation lasts the same. */
export const READ_MS = 1200

/** The sample document of that kind, as the scanner would read it. A fresh copy every call. */
export function sampleScan<K extends DocKind>(kind: K): Samples[K] {
  return structuredClone(SAMPLES[kind])
}

/**
 * Prototype stand-in for Grab's document OCR: whatever the photo, it "reads" the sample for that kind.
 * In production this is a call to Grab's backend, never a model key in the browser (spec §12).
 */
export function readDocument(kind: DocKind, delayMs = READ_MS): Promise<ScanResult> {
  return new Promise((resolve) => setTimeout(() => resolve(sampleScan(kind)), delayMs))
}
```

`src/ai/onboarding/documents/scanToUpdates.ts`:

```ts
import { th } from '@/copy/th.ts'
import type { ProfileUpdates, ScanResult } from '@/types/domain.ts'

/** What one photo contributes to the profile. Like speech, it only drafts: A2 still needs the merchant's tap. */
export function scanToUpdates(scan: ScanResult): ProfileUpdates {
  const heardFrom = th.scan.source[scan.kind]
  switch (scan.kind) {
    case 'idCard':
      return { owner: { value: { title: scan.title, name: scan.name, idNumber: scan.idNumber }, confidence: scan.confidence, heardFrom } }
    case 'bankBook':
      return {
        payout: {
          value: { bankName: scan.bankName, accountNumber: scan.accountNumber, accountName: scan.accountName },
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
```

- [ ] **Step 5: Run the tests, check and commit**

```bash
npx vitest run src/services/ocr src/ai/onboarding/documents
npm test && npm run build && npm run lint
git add src/types/domain.ts src/copy/th.ts src/data/ocr-samples.json src/services/ocr src/ai/onboarding/documents
git commit -m "Add a mock document reader and turn what it reads into profile drafts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Journey: method, scan queue and the routes between them

**Files:**
- Modify: `src/app/journey/journeyMachine.ts`, `src/app/journey/journeyMachine.test.ts`

**Interfaces:**
- **Consumes:** `FillMethod`, `DocKind` (Task 2); `missingDocs`, `DOC_FOR_FIELD` (Task 2).
- **Produces:**
  - `Screen` gains `'S1_SCAN'`.
  - `ScanPlan { docs: DocKind[]; queue: DocKind[]; returnTo: Screen }`.
  - `JourneyState` gains `method: FillMethod` and `scan: ScanPlan | null`.
  - Events:
    - `{ type: 'AUTHENTICATED'; email: string; method?: FillMethod }`
    - `{ type: 'START_SCAN'; docs: DocKind[]; returnTo: Screen }`
    - `{ type: 'SCANNED'; doc: DocKind; updates: ProfileUpdates; at: number }`
    - `{ type: 'SKIP_DOC'; doc: DocKind }`
    - `{ type: 'TALK_DONE' }`
  - `PHOTO_PATH: DocKind[]` is exported.

- [ ] **Step 1: Write the failing tests**

Append to `src/app/journey/journeyMachine.test.ts`, and add `import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'` and `import { sampleScan } from '@/services/ocr/mockOcr.ts'` at the top:

```ts
const ID = scanToUpdates(sampleScan('idCard'))
const BANK = scanToUpdates(sampleScan('bankBook'))

const signUp = (method?: 'voice' | 'photo' | 'type') =>
  journeyReducer(journeyReducer(initialJourney(), { type: 'CHOOSE_AUTH', mode: 'register' }), {
    type: 'AUTHENTICATED',
    email: 'padaeng@example.com',
    method,
  })

describe('fill-in method', () => {
  it('starts as voice', () => {
    expect(initialJourney().method).toBe('voice')
    expect(initialJourney().scan).toBeNull()
  })

  it('sends voice and typing to the store basics', () => {
    expect(signUp('voice').screen).toBe('R3_STORE')
    expect(signUp('type')).toMatchObject({ screen: 'R3_STORE', method: 'type' })
    expect(signUp().method).toBe('voice')
  })

  it('sends photo to the scanner: ID card, bank book, then menu, then A1', () => {
    expect(signUp('photo')).toMatchObject({
      screen: 'S1_SCAN',
      method: 'photo',
      scan: { docs: ['idCard', 'bankBook', 'menu'], queue: ['idCard', 'bankBook', 'menu'], returnTo: 'A1_TALK' },
    })
  })

  it('ignores the method for a returning merchant', () => {
    const chosen = journeyReducer(initialJourney(), { type: 'CHOOSE_AUTH', mode: 'login' })
    expect(journeyReducer(chosen, { type: 'AUTHENTICATED', email: 'a@b.co', method: 'photo' })).toMatchObject({ screen: 'A1_TALK', scan: null })
  })
})

describe('scanning', () => {
  it('applies a scan, drops it from the queue and starts the clock', () => {
    const next = journeyReducer(signUp('photo'), { type: 'SCANNED', doc: 'idCard', updates: ID, at: 3000 })
    expect(next.scan?.queue).toEqual(['bankBook', 'menu'])
    expect(next.profile.fields.owner.status).toBe('heard')
    expect(next.startedAt).toBe(3000)
    expect(next.screen).toBe('S1_SCAN')
  })

  it('goes on to where it was heading once the queue is empty', () => {
    const plan = journeyReducer(initialJourney(), { type: 'START_SCAN', docs: ['menu'], returnTo: 'A1_TALK' })
    const done = journeyReducer(plan, { type: 'SCANNED', doc: 'menu', updates: {}, at: 1 })
    expect(done).toMatchObject({ screen: 'A1_TALK', scan: null })
  })

  it('skips a document without filling anything', () => {
    const skipped = journeyReducer(signUp('photo'), { type: 'SKIP_DOC', doc: 'idCard' })
    expect(skipped.scan?.queue).toEqual(['bankBook', 'menu'])
    expect(skipped.profile.fields.owner.status).toBe('empty')
  })

  it('ignores a late result for a document that is no longer next', () => {
    const photo = signUp('photo')
    expect(journeyReducer(photo, { type: 'SCANNED', doc: 'bankBook', updates: BANK, at: 1 })).toBe(photo)
    expect(journeyReducer(photo, { type: 'SKIP_DOC', doc: 'menu' })).toBe(photo)
    const elsewhere = journeyReducer(photo, { type: 'GO', screen: 'A2_REVIEW' })
    expect(journeyReducer(elsewhere, { type: 'SCANNED', doc: 'idCard', updates: ID, at: 1 })).toBe(elsewhere)
  })

  it('goes straight on when there is nothing to scan', () => {
    expect(journeyReducer(initialJourney(), { type: 'START_SCAN', docs: [], returnTo: 'A2_REVIEW' })).toMatchObject({ screen: 'A2_REVIEW', scan: null })
  })
})

describe('after talking', () => {
  it('asks for the documents that are still missing', () => {
    const talked = journeyReducer(initialJourney(), { type: 'TALK_DONE' })
    expect(talked).toMatchObject({ screen: 'S1_SCAN', scan: { queue: ['idCard', 'bankBook'], returnTo: 'A2_REVIEW' } })
  })

  it('goes to review when the documents are already in', () => {
    const scanned = journeyReducer(initialJourney(), { type: 'HEARD', updates: { ...ID, ...BANK }, at: 1 })
    expect(journeyReducer(scanned, { type: 'TALK_DONE' }).screen).toBe('A2_REVIEW')
  })

  it('photographs a document again when it is edited in A2, then comes back', () => {
    const reviewing = { ...journeyReducer(initialJourney(), { type: 'HEARD', updates: ID, at: 1 }), screen: 'A2_REVIEW' as const }
    const rescan = journeyReducer(reviewing, { type: 'REASK_FIELD', field: 'owner' })
    expect(rescan).toMatchObject({ screen: 'S1_SCAN', scan: { queue: ['idCard'], returnTo: 'A2_REVIEW' } })
    expect(rescan.profile.fields.owner.status).toBe('empty')
  })
})
```

In the existing tests:
- "sends a new merchant from the account page to the store basics" still passes, because `method` is omitted, which means voice.
- "resets everything" still passes, because `initialJourney()` includes the new fields.

Run: `npx vitest run src/app/journey`
Expected: FAIL, with type errors on `method`/`START_SCAN` and wrong screens.

- [ ] **Step 2: Implement**

In `src/app/journey/journeyMachine.ts`:

```ts
import { applyUpdates, confirmField, createEmptyProfile, DOC_FOR_FIELD, missingDocs, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import type { DocKind, FillMethod, OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'
```

- Add `| 'S1_SCAN'` to `Screen`, after `'A1_TALK'`.
- Add after `AuthMode`:

```ts
/** The documents S1 is working through. `docs` is the whole list, for the step chips; `queue` is what is left. */
export interface ScanPlan {
  docs: DocKind[]
  queue: DocKind[]
  returnTo: Screen
}

/** The photo path scans everything first, then A1 asks for what a photo cannot show. */
export const PHOTO_PATH: DocKind[] = ['idCard', 'bankBook', 'menu']
```

- Add to `JourneyState`, after `authMode`:

```ts
  method: FillMethod // chosen on R2; a returning merchant keeps 'voice'
  scan: ScanPlan | null
```

- Change the `AUTHENTICATED` event to `{ type: 'AUTHENTICATED'; email: string; method?: FillMethod }`, and add the events:

```ts
  | { type: 'START_SCAN'; docs: DocKind[]; returnTo: Screen }
  | { type: 'SCANNED'; doc: DocKind; updates: ProfileUpdates; at: number }
  | { type: 'SKIP_DOC'; doc: DocKind }
  | { type: 'TALK_DONE' } // A1 has heard every talk field
```

- In `initialJourney`, add `method: 'voice',` and `scan: null,` after `authMode`.
- Add the helpers above `journeyReducer`:

```ts
function startScan(state: JourneyState, docs: DocKind[], returnTo: Screen): JourneyState {
  if (docs.length === 0) return { ...state, scan: null, screen: returnTo }
  return { ...state, scan: { docs, queue: docs, returnTo }, screen: 'S1_SCAN' }
}

/** The document on S1 is done (read or skipped): show the next one, or go where the scan was heading. */
function nextDoc(state: JourneyState): JourneyState {
  if (!state.scan) return state
  const queue = state.scan.queue.slice(1)
  return queue.length > 0 ? { ...state, scan: { ...state.scan, queue } } : { ...state, scan: null, screen: state.scan.returnTo }
}

// A result only counts for the document S1 is showing now; anything else arrived after the screen moved on.
const isCurrentDoc = (state: JourneyState, doc: DocKind) => state.screen === 'S1_SCAN' && state.scan?.queue[0] === doc
```

- Replace the `AUTHENTICATED` case:

```ts
    case 'AUTHENTICATED': {
      const signedIn = { ...state, email: event.email }
      // A returning merchant goes straight to the companion; a new one starts the way they chose on R2.
      if (state.authMode === 'login') return { ...signedIn, screen: 'A1_TALK' }
      const method = event.method ?? 'voice'
      if (method === 'photo') return startScan({ ...signedIn, method }, PHOTO_PATH, 'A1_TALK')
      return { ...signedIn, method, screen: 'R3_STORE' }
    }
```

- Replace the `REASK_FIELD` case:

```ts
    case 'REASK_FIELD': {
      const profile = reaskField(state.profile, event.field)
      // A document field is corrected by photographing it again, then back to A2.
      const doc = DOC_FOR_FIELD[event.field]
      return doc ? startScan({ ...state, profile }, [doc], 'A2_REVIEW') : { ...state, profile, screen: 'A1_TALK' }
    }
```

- Add the new cases before `LOAD_PROFILE`:

```ts
    case 'START_SCAN':
      return startScan(state, event.docs, event.returnTo)
    case 'SCANNED':
      if (!isCurrentDoc(state, event.doc)) return state
      return nextDoc({ ...state, profile: applyUpdates(state.profile, event.updates), startedAt: state.startedAt ?? event.at })
    case 'SKIP_DOC':
      if (!isCurrentDoc(state, event.doc)) return state
      return nextDoc(state)
    case 'TALK_DONE':
      return startScan(state, missingDocs(state.profile), 'A2_REVIEW')
```

`App.tsx` has no `S1_SCAN` case yet. `ScreenSwitch` then renders nothing for it, which compiles because `noImplicitReturns` is off. Task 8 adds the screen.

- [ ] **Step 3: Run the tests, check and commit**

```bash
npx vitest run src/app/journey
npm test && npm run build && npm run lint
git add src/app/journey
git commit -m "Route each fill-in method through a queue of documents to scan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: R2 method choice

**Files:**
- Modify: `src/ai/commands/phrases.ts`, `src/copy/th.ts`
- Create: `src/ai/commands/methodPhrases.test.ts`
- Create: `src/screens/register/R2-account/MethodPicker.tsx`
- Modify: `src/screens/register/R2-account/AccountScreen.tsx`

**Interfaces:**
- **Consumes:** `FillMethod` (Task 2); `AUTHENTICATED { method }` (Task 5).
- **Produces:**
  - `SAY.methodVoice`, `SAY.methodPhoto`, `SAY.methodType`.
  - `th.method.{ question, recommended, options: Record<FillMethod, { title, body }>, bubble }`.
  - `MethodPicker({ value, onChange })`.

- [ ] **Step 1: Write the failing voice-command test**

`src/ai/commands/methodPhrases.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { matchCommand } from './matchCommand.ts'
import { SAY } from './phrases.ts'

const METHODS = [
  { id: 'voice', phrases: SAY.methodVoice },
  { id: 'photo', phrases: SAY.methodPhoto },
  { id: 'type', phrases: SAY.methodType },
]

describe('choosing a method by voice', () => {
  it('hears each method, with polite words around it', () => {
    expect(matchCommand('พูดค่ะ', METHODS)).toBe('voice')
    expect(matchCommand('ใช้เสียง', METHODS)).toBe('voice')
    expect(matchCommand('อยากถ่ายรูปค่ะ', METHODS)).toBe('photo')
    expect(matchCommand('ขอพิมพ์เองค่ะ', METHODS)).toBe('type')
  })

  it('does not take a sentence about the shop as a choice', () => {
    expect(matchCommand('ร้านขายข้าวมันไก่ ถ่ายรูปเมนูสวยมากเลยค่ะ อยู่ลาดพร้าว', METHODS)).toBeNull()
  })
})
```

Run: `npx vitest run src/ai/commands/methodPhrases.test.ts`
Expected: FAIL, because `SAY.methodVoice` is undefined.

- [ ] **Step 2: Add the phrases and copy**

Add to `SAY` in `src/ai/commands/phrases.ts`:

```ts
  methodVoice: ['พูด', 'เสียง', 'ใช้เสียง', 'พูดสมัคร'],
  methodPhoto: ['ถ่ายรูป', 'รูป', 'ถ่ายภาพ', 'ถ่ายภาพเอกสาร'],
  methodType: ['พิมพ์', 'พิมพ์เอง'],
```

Add to `src/copy/th.ts`, after `account`:

```ts
  method: {
    question: 'อยากกรอกข้อมูลร้านแบบไหนคะ?',
    recommended: 'แนะนำ',
    options: {
      voice: { title: 'พูดสมัครด้วยเสียง', body: 'เล่าให้หนูฟัง หนูกรอกให้' },
      photo: { title: 'สมัครด้วยการถ่ายภาพเอกสาร', body: 'ถ่ายบัตร สมุดบัญชี และเมนู' },
      type: { title: 'พิมพ์เอง', body: 'กรอกทีละช่อง' },
    },
    bubble: 'เลือกวิธีกรอกข้อมูลร้านได้เลยค่ะ ถ้าไม่แน่ใจ ลองพูดกับหนูดูนะคะ',
  },
```

Run: `npx vitest run src/ai/commands`
Expected: PASS.

- [ ] **Step 3: Build MethodPicker**

`src/screens/register/R2-account/MethodPicker.tsx`:

```tsx
import { Camera, Check, Keyboard, Mic, type LucideIcon } from 'lucide-react'
import { th } from '@/copy/th.ts'
import type { FillMethod } from '@/types/domain.ts'

const METHODS: { id: FillMethod; Icon: LucideIcon }[] = [
  { id: 'voice', Icon: Mic },
  { id: 'photo', Icon: Camera },
  { id: 'type', Icon: Keyboard },
]

/** Three big cards: how the merchant wants to fill in the shop. One is always chosen (voice to start). */
export function MethodPicker({ value, onChange }: { value: FillMethod; onChange: (method: FillMethod) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg font-bold">{th.method.question}</legend>
      {METHODS.map(({ id, Icon }) => {
        const chosen = value === id
        const { title, body } = th.method.options[id]
        return (
          <label
            key={id}
            className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-3xl p-4 ring-2 transition-colors has-[input:focus-visible]:outline-4 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-grab/50 ${chosen ? 'bg-ok-bg ring-action' : 'bg-surface ring-line active:bg-canvas'}`}
          >
            <input type="radio" name="fill-method" value={id} checked={chosen} onChange={() => onChange(id)} className="sr-only" />
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${chosen ? 'bg-action text-white' : 'bg-canvas text-action'}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 font-bold">
                {title}
                {id === 'voice' && <span className="rounded-full bg-action px-2 text-sm text-white">{th.method.recommended}</span>}
              </span>
              <span className="block text-base text-ink-muted">{body}</span>
            </span>
            {chosen && <Check className="size-6 shrink-0 text-action" aria-hidden />}
          </label>
        )
      })}
    </fieldset>
  )
}
```

- [ ] **Step 4: Put it on R2**

In `src/screens/register/R2-account/AccountScreen.tsx`:
- Add the imports `import type { FillMethod } from '@/types/domain.ts'` and `import { MethodPicker } from './MethodPicker.tsx'`.
- Below `COMMANDS`, add:

```ts
const METHOD_COMMANDS = [
  { id: 'voice' as const, phrases: SAY.methodVoice },
  { id: 'photo' as const, phrases: SAY.methodPhoto },
  { id: 'type' as const, phrases: SAY.methodType },
]
```

- After the `password` state, add:

```ts
  const [method, setMethod] = useState<FillMethod>(state.method)
```

- Replace the `useVoiceInput` call. Voice may pick a card or press ต่อไป, but never types an email or password:

```ts
  const { mic, transcript, notice, toggleMic } = useVoiceInput((text) => {
    const command = matchCommand(text, [...COMMANDS, ...METHOD_COMMANDS])
    if (command === 'next') form.current?.requestSubmit()
    if (command === 'back') dispatch({ type: 'GO', screen: 'R1_WELCOME' })
    if (command === 'voice' || command === 'photo' || command === 'type') {
      if (!isNew) return th.account.typeItYourself // a returning merchant has no method to choose
      setMethod(command)
    }
    return command ? true : th.account.typeItYourself
  })
```

- In `submit`, change the dispatch to `dispatch({ type: 'AUTHENTICATED', email: email.trim(), method })`.
- Change the dock's `text` so that once the password box has been visited, a new merchant is asked about the method:

```tsx
          text={
            emailError ??
            passwordError ??
            (inPassword ? th.account.bubblePrivate : isNew ? (touched.password ? th.method.bubble : th.account.bubbleRegister) : th.account.bubbleLogin)
          }
```

- In the form, between the password `TextField` and the ghost "haveAccount" `Button`, add:

```tsx
        {isNew && <MethodPicker value={method} onChange={setMethod} />}
```

- [ ] **Step 5: Check and commit**

```bash
npm test && npm run build && npm run lint
git add src/ai/commands src/copy/th.ts src/screens/register/R2-account
git commit -m "Let a new merchant choose on R2 to sign up by voice, photo or typing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sample documents and the viewfinder

**Files:**
- Modify: `src/styles/index.css`, `src/copy/th.ts`
- Create: `src/screens/act1-onboarding/S1-scan/SampleDocument.tsx`
- Create: `src/screens/act1-onboarding/S1-scan/Viewfinder.tsx`

**Interfaces:**
- **Consumes:** `sampleScan` (Task 4); `formatIdNumber`, `formatAccount`, `formatTHB` (Task 1 and existing); `CHECK_THRESHOLD` (existing).
- **Produces:**
  - `SampleDocument({ kind: DocKind })`.
  - `Viewfinder({ scanning: boolean, children })`.
  - The CSS utility `animate-scan`.
  - Copy: `th.scan.sample`, `th.scan.paper.{ idTitle, idNumber, name, bookTitle, accountNumber, accountName, bank }`.

The sample documents are drawn in code. They carry no real bank logos, do not imitate the official ID card design, and each has a diagonal "ตัวอย่าง" stamp.

- [ ] **Step 1: Add the scan-line animation**

In `src/styles/index.css`, add this inside `@theme`, next to the other `--animate-*` lines:

```css
  --animate-scan: scan 1.2s ease-in-out both;
```

Add this with the other keyframes inside `@theme`:

```css
  /* The line that sweeps the viewfinder while a photo is read (lasts READ_MS). */
  @keyframes scan {
    0% { top: 6%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 94%; opacity: 0; }
  }
```

- [ ] **Step 2: Add the copy**

Add to `th.scan` in `src/copy/th.ts`:

```ts
    sample: 'ตัวอย่าง',
    paper: {
      idTitle: 'บัตรประจำตัว',
      idNumber: 'เลขประจำตัว',
      name: 'ชื่อ',
      bookTitle: 'สมุดบัญชีเงินฝากออมทรัพย์',
      accountNumber: 'เลขที่บัญชี',
      accountName: 'ชื่อบัญชี',
      bank: 'ธนาคาร',
    },
```

- [ ] **Step 3: Draw the sample documents**

`src/screens/act1-onboarding/S1-scan/SampleDocument.tsx`:

```tsx
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
```

- [ ] **Step 4: Build the viewfinder**

`src/screens/act1-onboarding/S1-scan/Viewfinder.tsx`:

```tsx
import type { ReactNode } from 'react'

const CORNERS = ['top-3 left-3 border-t-4 border-l-4', 'top-3 right-3 border-t-4 border-r-4', 'bottom-3 left-3 border-b-4 border-l-4', 'bottom-3 right-3 border-r-4 border-b-4']

/** A dark camera frame with green corners. While `scanning`, a green line sweeps down over the document. */
export function Viewfinder({ scanning, children }: { scanning: boolean; children: ReactNode }) {
  return (
    <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-3xl bg-ink px-8 py-8">
      {CORNERS.map((corner) => (
        <span key={corner} className={`absolute size-8 rounded-sm border-grab ${corner}`} aria-hidden />
      ))}
      {children}
      {scanning && (
        <span
          className="absolute inset-x-4 h-1 animate-scan rounded-full bg-grab shadow-[0_0_16px_4px] shadow-grab/60 motion-reduce:animate-none motion-reduce:top-1/2"
          aria-hidden
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Check and commit**

These components are presentational, so they have no unit tests. They are checked in the browser in Task 8.

```bash
npm test && npm run build && npm run lint
git add src/styles/index.css src/copy/th.ts src/screens/act1-onboarding/S1-scan
git commit -m "Draw the sample ID card, bank book and paper menu, and a viewfinder with a scan line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: S1 Scan screen

**Files:**
- Modify: `src/ai/commands/phrases.ts`, `src/copy/th.ts`
- Create: `src/screens/act1-onboarding/S1-scan/scanLines.ts`, `src/screens/act1-onboarding/S1-scan/scanLines.test.ts`
- Create: `src/screens/act1-onboarding/S1-scan/ScanResults.tsx`
- Create: `src/screens/act1-onboarding/S1-scan/ScanScreen.tsx`
- Modify: `src/App.tsx`, `src/app/demo/DemoPanel.tsx`

**Interfaces:**
- **Consumes:**
  - `readDocument`, `READ_MS` (Task 4); `scanToUpdates` (Task 4).
  - The journey's `scan`, `SCANNED` and `SKIP_DOC` (Task 5).
  - `SampleDocument`, `Viewfinder` (Task 7).
  - `useVoiceInput`, `matchCommand`, `CompanionDock`, `OnboardingShell`, `Button` (existing).
- **Produces:**
  - `ScanLine { label: string; value: string; confidence: number }`.
  - `scanLines(scan: ScanResult): ScanLine[]`.
  - `scanSummary(scan: ScanResult): string`.
  - `SAY.shoot`, `SAY.retake`, `SAY.useScan`, `SAY.skip`.
  - `ScanScreen`.

- [ ] **Step 1: Add the copy and phrases**

Add to `th.scan` in `src/copy/th.ts`:

```ts
    title: 'ถ่ายรูปเอกสาร',
    docs: { idCard: 'บัตรประชาชน', bankBook: 'สมุดบัญชี', menu: 'เมนู' },
    aim: {
      idCard: 'ถ่ายรูปบัตรประชาชนให้หนูหน่อยค่ะ หนูจะอ่านชื่อกับเลขบัตรให้เอง',
      bankBook: 'ต่อไปเป็นหน้าแรกของสมุดบัญชีค่ะ เงินจากการขายจะโอนเข้าบัญชีนี้',
      menu: 'ถ่ายรูปเมนูที่ร้านได้เลยค่ะ หนูจะอ่านชื่อเมนูกับราคาให้',
    },
    guide: { idCard: 'วางบัตรให้อยู่ในกรอบ', bankBook: 'เปิดหน้าที่มีชื่อและเลขบัญชี', menu: 'ถ่ายให้เห็นเมนูครบทุกรายการ' },
    shoot: 'ถ่ายรูป',
    reading: 'กำลังอ่าน…',
    use: 'ใช้รูปนี้',
    retake: 'ถ่ายใหม่',
    skip: 'ข้ามไปก่อน',
    upload: 'อัปโหลดรูปแทน',
    uploadedAlt: 'รูปที่อัปโหลด',
    demoUpload: 'โหมดสาธิต: ใช้ข้อมูลตัวอย่าง',
    checkHint: 'ถูกไหมคะ? ถ้าถูกกด "ใช้รูปนี้"',
    readId: (name: string, last4: string) => `อ่านได้แล้วค่ะ คุณ${name} บัตรลงท้ายด้วย ${last4}`,
    readBank: (bank: string, last4: string) => `บัญชี${bank} ลงท้ายด้วย ${last4} ค่ะ`,
    readMenu: (count: number, unclear: string | null) =>
      unclear
        ? `อ่านเมนูได้ ${count} รายการค่ะ ราคา${unclear}ไม่ค่อยชัด ช่วยดูอีกทีตอนตรวจนะคะ`
        : `อ่านเมนูได้ ${count} รายการค่ะ`,
```

Add to `SAY` in `src/ai/commands/phrases.ts`:

```ts
  shoot: ['ถ่าย', 'ถ่ายรูป', 'สแกน', 'ถ่ายได้'],
  retake: ['ถ่ายใหม่', 'ขอถ่ายใหม่', 'ไม่ชัด'],
  useScan: ['ใช้รูปนี้', 'ใช้อันนี้', 'ถูกแล้ว', 'ต่อไป', 'ถัดไป'],
  skip: ['ข้าม', 'ข้ามไปก่อน', 'ไว้ทีหลัง'],
```

- [ ] **Step 2: Write the failing tests for the rows and the read line**

`src/screens/act1-onboarding/S1-scan/scanLines.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import { scanLines, scanSummary } from './scanLines.ts'

describe('scanLines', () => {
  it('shows the full ID number right after the photo, for the merchant to compare', () => {
    expect(scanLines(sampleScan('idCard'))).toEqual([
      { label: 'ชื่อ-นามสกุล', value: 'นาง แดง ใจดี', confidence: 0.97 },
      { label: 'เลขบัตรประชาชน', value: '1-2345-67890-12-1', confidence: 0.97 },
    ])
  })

  it('lists the bank, account number and account name', () => {
    expect(scanLines(sampleScan('bankBook')).map((line) => line.value)).toEqual(['ธนาคารกสิกรไทย', '123-4-56789-0', 'นาง แดง ใจดี'])
  })

  it('lists the store, the category and one row per dish with its own confidence', () => {
    const lines = scanLines(sampleScan('menu'))
    expect(lines).toHaveLength(7)
    expect(lines[2]).toEqual({ label: 'น้ำพริกกะปิปลาทู', value: '฿89', confidence: 0.6 })
  })
})

describe('scanSummary', () => {
  it('says only the last four digits', () => {
    expect(scanSummary(sampleScan('idCard'))).toBe('อ่านได้แล้วค่ะ คุณแดง ใจดี บัตรลงท้ายด้วย 0121')
    expect(scanSummary(sampleScan('bankBook'))).toBe('บัญชีธนาคารกสิกรไทย ลงท้ายด้วย 7890 ค่ะ')
  })

  it('points out the price it could not read clearly', () => {
    expect(scanSummary(sampleScan('menu'))).toBe('อ่านเมนูได้ 5 รายการค่ะ ราคาน้ำพริกกะปิปลาทูไม่ค่อยชัด ช่วยดูอีกทีตอนตรวจนะคะ')
  })
})
```

Run: `npx vitest run src/screens/act1-onboarding/S1-scan`
Expected: FAIL, because the module is not found.

- [ ] **Step 3: Implement the rows and the read line**

`src/screens/act1-onboarding/S1-scan/scanLines.ts`:

```ts
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
```

Run: `npx vitest run src/screens/act1-onboarding/S1-scan`
Expected: PASS.

- [ ] **Step 4: The results list**

`src/screens/act1-onboarding/S1-scan/ScanResults.tsx`:

```tsx
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { CHECK_THRESHOLD } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import type { ScanLine } from './scanLines.ts'

const STAGGER_MS = 120

/** The values read from the photo, appearing one by one; an unclear one is amber. */
export function ScanResults({ lines }: { lines: ScanLine[] }) {
  return (
    <ul className="divide-y divide-line rounded-3xl ring-1 ring-line">
      {lines.map((line, index) => {
        const unsure = line.confidence < CHECK_THRESHOLD
        return (
          <li
            key={`${line.label}-${index}`}
            className={`flex min-h-14 animate-rise items-center gap-3 px-4 py-2 first:rounded-t-3xl last:rounded-b-3xl ${unsure ? 'bg-warn-bg' : ''}`}
            style={{ animationDelay: `${index * STAGGER_MS}ms` }}
          >
            {unsure ? (
              <AlertTriangle className="size-6 shrink-0 text-warn-ink" aria-hidden />
            ) : (
              <CheckCircle2 className="size-6 shrink-0 text-action" aria-hidden />
            )}
            <span className="w-32 shrink-0 text-base text-ink-muted">{line.label}</span>
            <span className={`min-w-0 flex-1 font-bold ${unsure ? 'text-warn-ink' : ''}`}>
              {line.value}
              {unsure && <span className="sr-only"> ({th.review.pleaseCheck})</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 5: The screen**

`src/screens/act1-onboarding/S1-scan/ScanScreen.tsx`:

```tsx
import { Camera, CheckCircle2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { readDocument } from '@/services/ocr/mockOcr.ts'
import type { ScanResult } from '@/types/domain.ts'
import { SampleDocument } from './SampleDocument.tsx'
import { scanLines, scanSummary } from './scanLines.ts'
import { ScanResults } from './ScanResults.tsx'
import { Viewfinder } from './Viewfinder.tsx'

type Phase = 'aim' | 'scanning' | 'read'

const COMMANDS = [
  { id: 'retake' as const, phrases: SAY.retake },
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'use' as const, phrases: SAY.useScan },
  { id: 'skip' as const, phrases: SAY.skip },
]

/**
 * One document at a time from the journey's scan queue (App keys this screen per document).
 * Reading only drafts: the values go to A2 as "heard" and the merchant confirms them there.
 */
export function ScanScreen() {
  const { state, dispatch } = useJourney()
  const plan = state.scan
  const doc = plan?.queue[0] ?? null
  const [phase, setPhase] = useState<Phase>('aim')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [upload, setUpload] = useState<string | null>(null) // a local object URL; the file never leaves the browser
  const fileInput = useRef<HTMLInputElement>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => () => {
    if (upload) URL.revokeObjectURL(upload)
  }, [upload])

  const shoot = async () => {
    if (!doc || phase === 'scanning') return
    setPhase('scanning')
    setResult(null)
    const scan = await readDocument(doc)
    if (!mounted.current) return // the screen moved on (skip, demo jump or reset) while reading
    setResult(scan)
    setPhase('read')
  }
  const use = () => {
    if (doc && result) dispatch({ type: 'SCANNED', doc, updates: scanToUpdates(result), at: Date.now() })
  }
  const retake = () => {
    setResult(null)
    setPhase('aim')
  }
  const skip = () => {
    if (doc) dispatch({ type: 'SKIP_DOC', doc })
  }
  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUpload(URL.createObjectURL(file))
    void shoot()
  }

  // By voice: shoot, retake, use or skip. Numbers are never taken by ear.
  const { mic, transcript, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      switch (matchCommand(text, COMMANDS)) {
        case 'shoot':
          if (phase !== 'aim') return false
          void shoot()
          return true
        case 'retake':
          if (phase !== 'read') return false
          retake()
          return true
        case 'use':
          if (phase !== 'read') return false
          use()
          return true
        case 'skip':
          skip()
          return true
        default:
          return false
      }
    },
    { autoListen: state.method === 'voice' },
  )

  if (!plan || !doc) return null

  const step = plan.docs.length - plan.queue.length + 1
  const bubble = phase === 'aim' ? th.scan.aim[doc] : phase === 'scanning' ? th.scan.reading : result ? scanSummary(result) : th.scan.aim[doc]

  return (
    <OnboardingShell
      title={th.scan.title}
      progress={th.common.step(step, plan.docs.length)}
      dock={
        <CompanionDock
          text={bubble}
          notice={notice}
          hint={phase === 'read' ? th.scan.checkHint : mic === 'error' ? undefined : MIC_LABELS[mic]}
          heard={transcript}
          state={mic}
          onPress={toggleMic}
          onSpoken={onSpoken}
          actions={
            phase === 'read' ? (
              <div className="flex gap-2">
                <Button variant="secondary" className="px-4!" onClick={retake}>
                  {th.scan.retake}
                </Button>
                <Button className="min-w-0 flex-1" onClick={use}>
                  {th.scan.use}
                </Button>
              </div>
            ) : (
              <Button fullWidth loading={phase === 'scanning'} icon={<Camera className="size-6" aria-hidden />} onClick={() => void shoot()}>
                {phase === 'scanning' ? th.scan.reading : th.scan.shoot}
              </Button>
            )
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <ol className="flex flex-wrap gap-2" aria-label={th.scan.title}>
          {plan.docs.map((kind) => {
            const done = !plan.queue.includes(kind)
            const current = kind === doc
            return (
              <li
                key={kind}
                aria-current={current ? 'step' : undefined}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-base ${current ? 'bg-action font-bold text-white' : done ? 'bg-ok-bg text-action' : 'bg-canvas text-ink-muted'}`}
              >
                {done && <CheckCircle2 className="size-5" aria-hidden />}
                {th.scan.docs[kind]}
              </li>
            )
          })}
        </ol>

        <Viewfinder scanning={phase === 'scanning'}>
          {upload ? <img src={upload} alt={th.scan.uploadedAlt} className="max-h-56 rounded-xl object-contain" /> : <SampleDocument kind={doc} />}
        </Viewfinder>
        <p className="text-center text-ink-muted">{th.scan.guide[doc]}</p>
        {upload && <p className="rounded-2xl bg-warn-bg px-3 py-2 text-base text-warn-ink">{th.scan.demoUpload}</p>}

        {phase === 'read' && result && <ScanResults lines={scanLines(result)} />}

        {phase !== 'scanning' && (
          <div className="flex flex-wrap gap-x-6">
            <Button variant="ghost" className="px-0!" icon={<Upload className="size-6" aria-hidden />} onClick={() => fileInput.current?.click()}>
              {th.scan.upload}
            </Button>
            <Button variant="ghost" className="px-0!" onClick={skip}>
              {th.scan.skip}
            </Button>
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
    </OnboardingShell>
  )
}
```

- [ ] **Step 6: Wire it in**

In `src/App.tsx`, import `ScanScreen` from `@/screens/act1-onboarding/S1-scan/ScanScreen.tsx` and add a case after `A1_TALK`. The screen starts fresh for every document and on every reset:

```tsx
    case 'S1_SCAN':
      return <ScanScreen key={`${state.runId}:${state.scan?.queue.join(',') ?? ''}`} />
```

In `src/app/demo/DemoPanel.tsx`, add `'S1_SCAN'` to `LISTENING_SCREENS`.

- [ ] **Step 7: Check and commit**

```bash
npm test && npm run build && npm run lint
git add src/ai/commands/phrases.ts src/copy/th.ts src/screens/act1-onboarding/S1-scan src/App.tsx src/app/demo/DemoPanel.tsx
git commit -m "Add the scan screen: shoot, read, retake or skip each document, by tap or voice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: A1 and R3 follow the chosen method

**Files:**
- Modify: `src/screens/act1-onboarding/A1-talk/TalkScreen.tsx`
- Modify: `src/screens/register/R3-store/StoreBasicsScreen.tsx`
- Modify: `src/copy/th.ts`

**Interfaces:**
- **Consumes:** `TALK_DONE`, `START_SCAN` and `state.method` (Task 5); `missingDocs` (Task 2).
- **Produces:** A1 no longer dispatches `GO A2_REVIEW`.

- [ ] **Step 1: Update the copy**

In `src/copy/th.ts`, under `onboarding`:
- **Remove** `scanMenuToast`, because the chip now opens the scanner.
- Add:

```ts
    allHeardDocs: 'ได้ข้อมูลร้านครบแล้วค่ะ ต่อไปถ่ายรูปบัตรกับสมุดบัญชีนะคะ กด "ต่อไป" ได้เลย',
```

- [ ] **Step 2: A1 changes**

In `src/screens/act1-onboarding/A1-talk/TalkScreen.tsx`:
- Import `missingDocs` with the other profile helpers.
- Replace `const [typing, setTyping] = useState(false)` with:

```ts
  // On the typing path the keyboard box is open from the start and the companion does not listen by itself.
  const [typing, setTyping] = useState(state.method === 'type')
```

- After `const ready = isReadyForReview(profile)`, add:

```ts
  const docsLeft = missingDocs(profile).length > 0
  const openMenuScan = () => dispatch({ type: 'START_SCAN', docs: ['menu'], returnTo: 'A1_TALK' })
```

- In `obey`:
  - Replace `case 'scanMenu': return th.onboarding.scanMenuToast` with:

```ts
      case 'scanMenu':
        openMenuScan()
        return true
```

  - In `case 'review':`, replace `dispatch({ type: 'GO', screen: 'A2_REVIEW' })` with `dispatch({ type: 'TALK_DONE' })`.
- In `onChip`, replace `setNotice(th.onboarding.scanMenuToast)` with `openMenuScan()`. If `setNotice` is now unused, also remove it from the `useVoiceInput` destructuring.
- Change `{ autoListen: true }` to `{ autoListen: state.method !== 'type' }`.
- Change the dock text to `text={question ? question.text : docsLeft ? th.onboarding.allHeardDocs : th.onboarding.allHeard}`.
- Change the ready button so it reads ต่อไป when documents still have to be scanned:

```tsx
                <Button className="min-w-0 flex-1" onClick={() => dispatch({ type: 'TALK_DONE' })}>
                  {docsLeft ? th.common.next : th.onboarding.toReview}
                </Button>
```

- [ ] **Step 3: R3 on the typing path**

In `src/screens/register/R3-store/StoreBasicsScreen.tsx`, change `{ autoListen: true }` to `{ autoListen: state.method !== 'type' }`.

- [ ] **Step 4: Check and commit**

```bash
grep -rn "scanMenuToast\|screen: 'A2_REVIEW'" src/screens/act1-onboarding/A1-talk || echo "clean"
npm test && npm run build && npm run lint
git add src/screens/act1-onboarding/A1-talk src/screens/register/R3-store src/copy/th.ts
git commit -m "Send A1 on to the document scan, open the menu scanner from its chip, and keep the mic idle on the typing path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: A2 owner and payout cards, A3 and Transition copy, demo profile

**Files:**
- Modify: `src/screens/act1-onboarding/A2-review/ReviewScreen.tsx`, `src/screens/act1-onboarding/A2-review/ReviewFieldCard.tsx`
- Modify: `src/copy/th.ts`
- Modify: `src/app/demo/demoProfile.ts`, `src/app/demo/demoProfile.test.ts`
- Modify: `src/screens/act1-onboarding/summarizeField.test.ts`

**Interfaces:**
- **Consumes:** `REVIEW_FIELDS` (Task 2); `maskIdNumber`, `maskAccount` (Task 1); `sampleScan`, `scanToUpdates` (Task 4); `th.scan.source` (Task 4).
- **Produces:**
  - `ReviewFieldCard` accepts `editLabel?: string` and hides ถูกแล้ว (confirm) on an empty field.
  - `demoProfile()` now includes the scanned owner and payout.

- [ ] **Step 1: Update the demo profile (test first)**

In `src/app/demo/demoProfile.test.ts`:
- Import `REVIEW_FIELDS`.
- Change the first test to:

```ts
  it('hears every field from the script and the sample documents, confirming none', () => {
    expect(REVIEW_FIELDS.map((key) => profile.fields[key].status)).toEqual(Array(8).fill('heard'))
  })
```

Add to the second test:

```ts
    expect(profile.fields.owner.value?.name).toBe('แดง ใจดี')
    expect(profile.fields.payout.value?.accountNumber).toBe('1234567890')
```

In `src/screens/act1-onboarding/summarizeField.test.ts`, the read-aloud paragraph now ends with the documents:

```ts
    expect(profileSummary(profile)).toBe(
      'ชื่อร้าน ครัวป้าแดง ประเภทอาหาร อาหารไทย ที่ตั้ง ลาดพร้าว 71 ตรงข้ามเซเว่น เวลาเปิด-ปิด 10:00 – 20:00 น. · เปิดทุกวัน เมนู 5 รายการ เบอร์ติดต่อ 081-234-4217 เจ้าของร้าน แดง ใจดี บัญชีรับเงิน ธนาคารกสิกรไทย ลงท้ายด้วย 7890',
    )
```

Run: `npx vitest run src/app/demo src/screens/act1-onboarding/summarizeField.test.ts`
Expected: FAIL, because owner and payout are still empty.

In `src/app/demo/demoProfile.ts`:
- Add the imports `import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'` and `import { sampleScan } from '@/services/ocr/mockOcr.ts'`.
- Replace the final `return` with:

```ts
  profile = applyUpdates(profile, { phone: { value: getAccount().phone, confidence: 1, heardFrom: th.review.fromAccount } })
  return applyUpdates(profile, { ...scanToUpdates(sampleScan('idCard')), ...scanToUpdates(sampleScan('bankBook')) })
```

- Update the doc comment to `/** The profile A2 starts with after the demo script and both sample documents: every field heard, nothing confirmed. */`.

Run the same command. Expected: PASS.

- [ ] **Step 2: Update the copy**

In `src/copy/th.ts`, under `review`:
- `title: 'AI กรอกให้แล้ว',` replaces `'AI ฟังได้ว่า…'`, because the values are now heard or photographed.
- `subtitle: 'หนูกรอกข้อมูลและดึงรายการเมนูให้แล้วนะคะ กรุณาตรวจสอบความถูกต้องก่อนเปิดร้าน',`
- `submit: 'ยืนยันข้อมูลและปักหมุดที่ตั้ง',`
- `allConfirmed: 'ตรวจครบแล้วค่ะ กด "ยืนยันข้อมูลและปักหมุดที่ตั้ง" ได้เลย',`
- **Remove** `owner`. It is unused, and `th.fields.owner` replaces it.
- Add:

```ts
    rescan: 'ถ่ายใหม่',
    scanNow: 'ถ่ายรูป',
    notScanned: 'ยังไม่ได้ถ่ายรูปค่ะ',
    idNumber: 'เลขบัตร',
    accountNumber: 'เลขบัญชี',
    accountName: 'ชื่อบัญชี',
```

Under `submitted`:

```ts
    elapsed: (duration: string) => `ใช้เวลาแค่ ${duration} ก็เสร็จ`,
    dockLine: 'เอกสารครบแล้วค่ะ รอ Grab ตรวจสอบแป๊บเดียว เดี๋ยวหนูบอกนะคะ',
    steps: ['Grab ตรวจสอบข้อมูล (1–3 วันทำการ)', 'เปิดรับออเดอร์'],
```

Under `transition`:

```ts
    body: 'เปิดร้านบน Grab เรียบร้อยแล้ว! พร้อมเรียนรู้ฟีเจอร์ช่วยเพิ่มยอดขายในสเต็ปถัดไป',
```

- [ ] **Step 3: Update ReviewFieldCard**

In `src/screens/act1-onboarding/A2-review/ReviewFieldCard.tsx`:
- Scanned values are not "heard", so extend the list:

```ts
const NON_SPEECH_SOURCES = [th.review.fromAccount, th.chips.useDeviceLocation, th.store.typed, th.places.picked, ...Object.values(th.scan.source)]
```

- Add `editLabel?: string` to `ReviewFieldCardProps`, and destructure it.
- Change the confirm condition to `{!confirmed && field.status !== 'empty' && (`.
- Change the edit button's text to `{editLabel ?? th.review.edit}`.

- [ ] **Step 4: Update ReviewScreen**

In `src/screens/act1-onboarding/A2-review/ReviewScreen.tsx`:
- Replace the profile import with `import { REVIEW_FIELDS } from '@/ai/onboarding/profile.ts'`. Use it in place of `TALK_FIELDS` in both places (`remaining` and `said`).
- Add `maskAccount` and `maskIdNumber` to the format import.
- Remove `getAccount` from the imports and remove `const account = getAccount()`, since they are no longer used.
- Delete the owner line in the phone card, so it is just `<ReviewFieldCard {...card('phone')}>{fields.phone.value && formatPhone(fields.phone.value)}</ReviewFieldCard>`.
- After the phone card, add the two document cards. On these cards, edit means photographing again:

```tsx
        <ReviewFieldCard {...card('owner')} editLabel={fields.owner.value ? th.review.rescan : th.review.scanNow}>
          {fields.owner.value ? (
            <>
              <p>{`${fields.owner.value.title} ${fields.owner.value.name}`}</p>
              <p className="text-base text-ink-muted">
                {th.review.idNumber} {maskIdNumber(fields.owner.value.idNumber)}
              </p>
            </>
          ) : (
            <p className="text-ink-muted">{th.review.notScanned}</p>
          )}
        </ReviewFieldCard>
        <ReviewFieldCard {...card('payout')} editLabel={fields.payout.value ? th.review.rescan : th.review.scanNow}>
          {fields.payout.value ? (
            <>
              <p>{fields.payout.value.bankName}</p>
              <p className="text-base text-ink-muted">
                {th.review.accountNumber} {maskAccount(fields.payout.value.accountNumber)} · {th.review.accountName} {fields.payout.value.accountName}
              </p>
            </>
          ) : (
            <p className="text-ink-muted">{th.review.notScanned}</p>
          )}
        </ReviewFieldCard>
```

The `card()` helper already dispatches `REASK_FIELD`. For `owner` and `payout`, the journey (Task 5) turns that into a rescan that returns to A2.

- [ ] **Step 5: Check and commit**

```bash
grep -rn "th.review.owner\|AI ฟังได้ว่า" src || echo "clean"
npm test && npm run build && npm run lint
git add src
git commit -m "Review the owner and payout account in A2, rescan to edit, and update the A3 and transition copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Presenter panel, README and the trust test

**Files:**
- Modify: `src/app/demo/DemoPanel.tsx`, `README.md`, `src/architecture.test.ts`

**Interfaces:**
- **Consumes:** `START_SCAN` and `PHOTO_PATH` (Task 5).

- [ ] **Step 1: Extend the trust test (it should already pass)**

In `src/architecture.test.ts`:
- Add after `IMPORTS_REACT`:

```ts
// Sending is a merchant's tap in A2, never a side effect of talking or scanning.
const SUBMITTERS = ['/src/screens/act1-onboarding/A2-review/ReviewScreen.tsx']
const IMPORTS_SUBMIT = /(?:from\s+|import\s*\(\s*)['"][^'"]*onboarding\/submit/
```

- In "sees the source tree", add `expect(Object.keys(sources)).toContain('/src/services/ocr/mockOcr.ts')`.
- Append inside `describe`:

```ts
  it('only lets A2 send the application', () => {
    const offenders = appFiles
      .filter(([path, source]) => !SUBMITTERS.includes(path) && IMPORTS_SUBMIT.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
```

Run: `npx vitest run src/architecture.test.ts`
Expected: PASS. If it fails, a file outside A2 imports `submit.ts`. Fix the import, not the test.

- [ ] **Step 2: Add the presenter jumps**

In `src/app/demo/DemoPanel.tsx`:
- Replace `import type { Screen } from '@/app/journey/journeyMachine.ts'` with `import { PHOTO_PATH, type Screen } from '@/app/journey/journeyMachine.ts'`, because `verbatimModuleSyntax` needs a value import for `PHOTO_PATH`. Also add `import type { DocKind } from '@/types/domain.ts'`.
- Change the `JUMPS` type to `{ label: string; screen: Screen; withProfile?: boolean; scan?: DocKind[] }[]`, and insert after the A1 entry:

```ts
  { label: 'S1 · ถ่ายรูปเอกสาร (ทางถ่ายรูป)', screen: 'S1_SCAN', scan: PHOTO_PATH },
```

- In the jump button's `onClick`, start a scan for a jump that has one:

```tsx
            onClick={() => {
              if (jump.withProfile) dispatch({ type: 'LOAD_PROFILE', profile: demoProfile() })
              if (jump.scan) dispatch({ type: 'START_SCAN', docs: jump.scan, returnTo: 'A1_TALK' })
              else dispatch({ type: 'GO', screen: jump.screen })
            }}
```

- [ ] **Step 3: Update the README demo steps**

In `README.md`, under "Presenting the demo", replace the **Register (R1-R3)** and **Act 1** bullets with:

```markdown
- **Register (R1-R2):** the demo opens on R1. Tap **ลงทะเบียน** → on R2 type any email and password, then choose how to fill in the shop: **พูด** (default), **ถ่ายภาพเอกสาร** or **พิมพ์เอง** → **ต่อไป**.
- **Act 1 by voice:** on R3 play "บรรทัด 1" from the panel (or speak it) → **ต่อไป** → on A1 play "บรรทัด 2–3", tap **ใช่** for the phone → **ต่อไป** → S1 asks for the ID card and bank book: tap **ถ่ายรูป** → **ใช้รูปนี้** for each → A2.
- **Act 1 by photo:** S1 scans the sample ID card, bank book and paper menu (one price is smudged on purpose and comes back amber) → A1 asks only for the location, hours and phone → A2. The panel's "S1 · ถ่ายรูปเอกสาร" jumps straight there.
- **A2:** confirm each card (the owner and bank cards show masked numbers; **ถ่ายใหม่** rescans) → **ยืนยันข้อมูลและปักหมุดที่ตั้ง**. The guardrail checks the ID checksum and that the bank account is in the owner's name.
- All documents are fictional samples stamped "ตัวอย่าง". An uploaded photo stays in the browser and still returns the sample data.
```

- [ ] **Step 4: Check and commit**

```bash
npm test && npm run build && npm run lint
git add src/app/demo/DemoPanel.tsx src/architecture.test.ts README.md
git commit -m "Add a presenter jump to the photo path, document it, and test that only A2 can send

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Browser check (controller, not a subagent)**

Use the user's running dev server at `http://localhost:5173`; do not start or stop it. Check each path at 390×844 and at 1366×768:
1. **Voice:** R1 → R2 (voice) → R3 (line 1) → A1 (lines 2–3, ใช่) → ต่อไป → S1 ID → S1 bank → A2. All eight cards are present and masked. Confirming all of them enables the button → A3 → Transition shows the brief's line.
2. **Photo:**
   - R2 (photo) → S1 ×3. The menu has an amber row, and the companion names the dish.
   - A1 opens on the location question, not the open prompt.
   - Then A2, where the menu card is amber.
3. **Typing:** R2 (type) → R3 with the mic idle → A1 with the typing box open → S1 ×2 → A2.
4. **Edge cases:**
   - **Skip:** skipping the ID card on S1 leaves it empty on A2. The button reads ถ่ายรูป and submit stays disabled.
   - **Rescan:** ถ่ายใหม่ on the owner card rescans and comes back to A2.
   - **Upload:** uploading any image shows it in the frame with the demo label.
