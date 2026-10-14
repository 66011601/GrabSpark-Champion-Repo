# Plan 1c: Act 1 in GrabMerchant's own screens — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Act 1 as GrabMerchant's real seven sign-up steps, then Home → menu → hours, with the AI companion helping on every step through a slim helper bar and talk/scan sheets.

**Architecture:**
- **Profile model.** The onboarding profile grows to the fields of the real form. A pure `stepStatus` decides whether each step's ต่อไป is allowed.
- **Journey.** A new reducer walks the screens. NEXT confirms a step's fields.
- **Writes.** Two guarded write paths (submit, save shop set-up) stay in `submit.ts`.
- **Screens.** Built from a small Grab-style UI kit (`StepShell`, `Field`, `AiHelperBar`, `BottomSheet`) plus `TalkSheet` and `ScanSheet`, which reuse the existing voice and scan parts.

**Tech stack:** React 19.3, TypeScript 6.0, Tailwind 4.3, Vitest 5, lucide-react, Vite 8. There are no new dependencies.

**Spec:** `docs/specs/2026-10-14-grab-style-signup-design.md`. It builds on `2026-10-13-merchant-companion-design.md` and `2026-10-14-act1-photo-scan-design.md`.

## Global constraints

**Code style**
- No semicolons and single quotes.
- Imports use explicit `.ts`/`.tsx` extensions, and `@/` maps to `src/`.
- `verbatimModuleSyntax` and `erasableSyntaxOnly` are on, so no enums and no parameter properties.
- `noImplicitReturns` is off, so a `switch` over a union may omit cases.
- `tsc -b` also type-checks the test files.

**Copy and accessibility**
- Every string the merchant sees lives in `src/copy/th.ts`. New screen copy goes in its own top-level section of `th` (`grab`, `sheet`, `sources`, `g0`, `login`, `s1` … `s7`, `h1` … `h3`), as each task says.
- The companion calls itself หนู and ends sentences with ค่ะ/คะ.
- Tap targets are at least 48px (`min-h-12`); primary buttons are `min-h-14`. Text is never smaller than `text-sm` (16px).
- **No Grab logo files or screenshots.** The "GrabMerchant" wordmark is text.

**Trust and privacy**
- **Trust rule:** only `src/ai/onboarding/submit.ts` may import `src/services/merchantApi.write.ts`. Only `S7Confirm.tsx`, `H2Menu.tsx` and `H3Hours.tsx` may import `submit.ts`.
- `src/ai/**` never imports React.
- AI-filled values are drafts (`heard`). A step's values become `confirmed` only through the merchant's ต่อไป, or a ✓ tap on an amber field or the map pin.
- Voice never enters an email, password or OTP, never ticks a consent box, and never presses ส่งใบสมัคร.
- Full ID and account numbers appear only in the scan results list and on step 5/6's own inputs. They are masked everywhere else, and only ever spoken as their last 4 digits.
- All sample data is fictional:
  - ID `1234567890121`
  - account `1234567890`
  - owner นาง แดง ใจดี
  - email `padaeng@example.com`

**Running tests**
- `npx vitest run <path>` runs one file; `npm test` runs everything. Then run `npm run build` and `npm run lint`. All must be clean before each commit.
- Vitest runs in Node: in code that tests touch, use the global `setTimeout`, not `window.setTimeout`.

**Commits**
- Plain-sentence commit messages, no `feat:` prefix.
- End each message with the `Co-Authored-By:` trailer your own harness attribution reminder gives you.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/screens/register/**`, `src/screens/act1-onboarding/**`, `ListenButton.tsx`, `methodPhrases.test.ts` | delete (T1) | the old Act 1 |
| `src/components/scan/*` | moved (T1), `ScanSheet.tsx` new (T7) | sample documents, viewfinder, results, scan sheet |
| `src/components/ui/MapPinConfirm.tsx`, `src/components/assistant/TypeInstead.tsx` | moved (T1) | pin map; keyboard fallback |
| `src/types/domain.ts`, `src/ai/onboarding/profile.ts` | modify (T2, T4, T5) | profile fields and groups |
| `src/ai/onboarding/steps.ts` | create (T3) | `STEP_FIELDS`, `stepStatus`, `confirmStep` |
| `src/ai/onboarding/addressFields.ts`, `businessTalk.ts` | create (T3) | drafting building/address; what a 3/7 sentence fills |
| `src/app/journey/journeyMachine.ts` | rewrite (T4) | screens, state and events |
| `src/ai/onboarding/submit.ts`, `src/services/merchantApi.write.ts` | rewrite/modify (T5) | guarded submit and set-up save |
| `src/components/grab/*` | create (T6) | `StepShell`, `Field`, `Select`, `AiHelperBar`, `BottomSheet`, `problemText`, `fieldMarks` |
| `src/components/assistant/useSpokenLine.ts`, `VoiceToggle.tsx`, `TalkSheet.tsx` | create (T6, T7) | speaking a line; mute; the talk sheet |
| `src/services/otp.ts` | create (T9) | mock OTP |
| `src/screens/signup/*` | create (T8–T12) | G0, L1, 1/7 … 7/7 |
| `src/screens/home/*` | create (T13) | H1, H2, H3 |
| `src/App.tsx`, `src/app/demo/*`, `README.md`, `src/architecture.test.ts`, `src/copy/th.ts` | modify | wiring, presenter, docs, trust test, copy |

---

### Task 1: Remove the old Act 1 screens

**Files:**
- Delete:
  - `src/screens/register/` (R1, R2 + MethodPicker, R3)
  - `src/screens/act1-onboarding/A1-talk/`, `A2-review/`, `A3-submitted/`
  - `src/screens/act1-onboarding/S1-scan/ScanScreen.tsx`
  - `src/screens/act1-onboarding/summarizeField.ts` + `.test.ts`
  - `src/components/assistant/ListenButton.tsx`
  - `src/ai/commands/methodPhrases.test.ts`
- Move:
  - `A2-review/MapPinConfirm.tsx` → `src/components/ui/MapPinConfirm.tsx`
  - `A1-talk/TypeInstead.tsx` → `src/components/assistant/TypeInstead.tsx`
  - `S1-scan/{SampleDocument.tsx,Viewfinder.tsx,ScanResults.tsx,scanLines.ts,scanLines.test.ts}` → `src/components/scan/`
- Modify: `src/App.tsx`, `src/ai/commands/phrases.ts`

**Interfaces:**
- **Produces:**
  - `@/components/ui/MapPinConfirm.tsx` (`MapPinConfirm({ point })`)
  - `@/components/assistant/TypeInstead.tsx` (`TypeInstead({ onSend, onClose })`)
  - `@/components/scan/{SampleDocument,Viewfinder,ScanResults,scanLines}`, all unchanged inside.
- The app shows a temporary screen-id placeholder for every screen except Transition and G1 until later tasks add the new screens. That is expected.

- [ ] **Step 1: Move the parts that stay, delete the rest**

```bash
mkdir -p src/components/scan
git mv src/screens/act1-onboarding/A2-review/MapPinConfirm.tsx src/components/ui/MapPinConfirm.tsx
git mv src/screens/act1-onboarding/A1-talk/TypeInstead.tsx src/components/assistant/TypeInstead.tsx
for f in SampleDocument.tsx Viewfinder.tsx ScanResults.tsx scanLines.ts scanLines.test.ts; do git mv "src/screens/act1-onboarding/S1-scan/$f" "src/components/scan/$f"; done
git rm -r -q src/screens/register src/screens/act1-onboarding src/components/assistant/ListenButton.tsx src/ai/commands/methodPhrases.test.ts
```

The moved files keep their own imports: they use `@/…` paths, and `ScanResults.tsx` imports `./scanLines.ts`, which moved with it.

- [ ] **Step 2: Remove the method phrases**

In `src/ai/commands/phrases.ts`, delete the three lines `methodVoice: …`, `methodPhoto: …` and `methodType: …`.

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { DashboardScreen } from '@/screens/act2-grow/1-dashboard/DashboardScreen.tsx'
import { ActTransition } from '@/screens/ActTransition.tsx'

// Temporary while Plan 1c rebuilds Act 1 screen by screen; Task 13 removes it.
function NotBuiltYet({ screen }: { screen: string }) {
  return <p className="m-auto p-6 text-center text-ink-muted">{screen}</p>
}

function ScreenSwitch() {
  const { state } = useJourney()
  switch (state.screen) {
    case 'TRANSITION':
      return <ActTransition />
    case 'G1_DASHBOARD':
      return <DashboardScreen />
    default:
      return <NotBuiltYet screen={state.screen} />
  }
}

function App() {
  return (
    <JourneyProvider>
      <DeviceFrame side={<DemoPanel />}>
        <ScreenSwitch />
      </DeviceFrame>
    </JourneyProvider>
  )
}

export default App
```

- [ ] **Step 4: Check and commit**

```bash
grep -rn "screens/register\|act1-onboarding\|ListenButton\|methodVoice" src || echo clean
npm test && npm run build && npm run lint
git add -A src
git commit -m "Remove the old Act 1 screens; keep the scan, map and typing parts for the new steps"
```

Expected: the grep prints `clean`. Tests, build and lint pass; the remaining tests cover the parsers, the AI helpers, the journey, scan lines and the architecture rules.

---

### Task 2: Profile fields for the real form

**Files:**
- Modify:
  - `src/types/domain.ts`, `src/ai/onboarding/profile.ts`, `src/ai/onboarding/followUp.ts`
  - `src/ai/onboarding/documents/scanToUpdates.ts`
  - `src/data/ocr-samples.json`, `src/data/account.json`
  - `src/lib/format.ts`, `src/copy/th.ts`
- Tests:
  - `src/ai/onboarding/profile.test.ts`, `followUp.test.ts`
  - `documents/scanToUpdates.test.ts`, `submit.test.ts`
  - `src/lib/format.test.ts`

**Interfaces:**
- **Produces:**
  - Types:
    - `BusinessType = 'personal' | 'company'`
    - `OwnerIdentity` gains `birthDate`, `idExpiry` (ISO `yyyy-mm-dd`)
    - `PayoutAccount` gains `bookPhoto: string | null`
    - `ProfileFields` gains `building`, `address`, `businessType`, `contactEmail`
    - `Account` gains `email`
    - `IdCardScan` gains `birthDate`, `idExpiry`
  - `SUBMIT_FIELDS`, `SETUP_FIELDS`, `ALL_FIELDS: ProfileFieldKey[]`
  - `pickFollowUp(profile, fields: ProfileFieldKey[], account)`
  - `formatThaiDate(iso: string): string`
  - Copy: `th.fields.building`, `th.fields.address`, `th.fields.businessType`, `th.fields.contactEmail`; `th.followUp.building`
- **Removed:** `TALK_FIELDS`, `DOC_FIELDS`, `countHeard`, `isReadyForReview`.
- **Kept for now:**
  - `REVIEW_FIELDS`, until Task 5.
  - `missingDocs` and `DOC_FOR_FIELD`, until Task 4.

- [ ] **Step 1: Types**

In `src/types/domain.ts`:
- Add after `MenuEntry`:

```ts
/** GrabMerchant 4/7 "ประเภทธุรกิจ". */
export type BusinessType = 'personal' | 'company'
```

- Replace `OwnerIdentity` and `PayoutAccount` with:

```ts
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
```

- Replace `ProfileFields` with:

```ts
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
```

- In `Account`, add `email: string` after `phone`.
- In `IdCardScan`, add `birthDate: string` and `idExpiry: string` after `idNumber`.

- [ ] **Step 2: Sample data**
- In `src/data/account.json`, add `"email": "padaeng@example.com",` after the `phone` line.
- In `src/data/ocr-samples.json`, change the `idCard` entry to:

```json
  "idCard": { "kind": "idCard", "title": "นาง", "name": "แดง ใจดี", "idNumber": "1234567890121", "birthDate": "1970-01-01", "idExpiry": "2031-01-01", "confidence": 0.97 },
```

- [ ] **Step 3: Write the failing tests**
- **`src/lib/format.test.ts`:** add `formatThaiDate` to the import and append:

```ts
describe('formatThaiDate', () => {
  it('shows a CE date in the Thai long form with the Buddhist year', () => {
    expect(formatThaiDate('1970-01-01')).toBe('1 มกราคม 2513')
    expect(formatThaiDate('2031-12-31')).toBe('31 ธันวาคม 2574')
  })

  it('leaves anything that is not a date as it is', () => {
    expect(formatThaiDate('')).toBe('')
    expect(formatThaiDate('soon')).toBe('soon')
  })
})
```

- **`src/ai/onboarding/profile.test.ts`:**
  - In the import list, replace `TALK_FIELDS`, `DOC_FIELDS`, `countHeard`, `isReadyForReview`, `missingDocs` and `REVIEW_FIELDS` with `ALL_FIELDS`, `SETUP_FIELDS`, `SUBMIT_FIELDS`, `missingDocs`. Keep every other import.
  - In the first test, use `ALL_FIELDS.every(...)`.
  - Delete the `describe('progress', …)` block, the `describe('field groups', …)` block, and the test "does not wait for documents before review is possible from A1".
  - Add `birthDate: '1970-01-01', idExpiry: '2031-01-01'` to the `OWNER.value` object and `bookPhoto: 'sample'` to the `PAYOUT.value` object.
  - Append:

```ts
describe('field groups', () => {
  it('lists the sign-up fields in GrabMerchant order, then the shop set-up', () => {
    expect(SUBMIT_FIELDS).toEqual(['storeName', 'building', 'location', 'address', 'category', 'businessType', 'phone', 'contactEmail', 'owner', 'payout'])
    expect(SETUP_FIELDS).toEqual(['menu', 'hours'])
    expect(ALL_FIELDS).toEqual([...SUBMIT_FIELDS, ...SETUP_FIELDS])
  })

  it('starts every new field empty', () => {
    const { fields } = createEmptyProfile()
    expect([fields.building.status, fields.address.status, fields.businessType.status, fields.contactEmail.status]).toEqual(['empty', 'empty', 'empty', 'empty'])
  })

  it('applies updates to the new fields', () => {
    const profile = applyUpdates(createEmptyProfile(), { businessType: { value: 'personal', confidence: 1, heardFrom: 'x' } })
    expect(profile.fields.businessType).toEqual({ value: 'personal', status: 'heard', confidence: 1, heardFrom: 'x' })
  })
})
```

- **`src/ai/onboarding/followUp.test.ts`:**
  - Add `const OLD_ORDER = ['storeName', 'category', 'location', 'hours', 'menu', 'phone'] as const` after `const account = …`.
  - Change every `pickFollowUp(x, account)` to `pickFollowUp(x, [...OLD_ORDER], account)`.
  - Append:

```ts
describe('pickFollowUp with a step’s own fields', () => {
  it('asks only about the fields it is given', () => {
    const question = pickFollowUp(afterLine1, ['storeName', 'location', 'category', 'building'], account)
    expect(question).toEqual({ field: 'building', text: th.followUp.building, chips: [] })
  })

  it('is done when those fields are filled', () => {
    expect(pickFollowUp(afterLine1, ['storeName', 'category'], account)).toBeNull()
  })
})
```

- **`src/ai/onboarding/documents/scanToUpdates.test.ts`:**
  - In the ID-card expectation, use `value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121', birthDate: '1970-01-01', idExpiry: '2031-01-01' }`.
  - In the bank-book expectation, add `bookPhoto: 'sample'` to `value`.
- **`src/ai/onboarding/submit.test.ts`:** in `VALID`, add `birthDate: '1970-01-01', idExpiry: '2031-01-01'` to every `owner` value and `bookPhoto: 'sample'` to every `payout` value. This includes the two in the name-match tests. The test file is fully rewritten in Task 5.

Run: `npx vitest run src/lib/format.test.ts src/ai/onboarding`
Expected: FAIL. `formatThaiDate`, `SUBMIT_FIELDS` and the 3-argument `pickFollowUp` don't exist yet, and the scan expectations lack the new keys.

- [ ] **Step 4: Implement**

**`src/lib/format.ts`:** append:

```ts
const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const BUDDHIST_ERA_OFFSET = 543

/** "1970-01-01" → "1 มกราคม 2513": how Thai ID cards and forms write dates. */
export function formatThaiDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${Number(day)} ${THAI_MONTHS[Number(month) - 1]} ${Number(year) + BUDDHIST_ERA_OFFSET}`
}
```

**`src/ai/onboarding/profile.ts`:**
- Replace the four constants `TALK_FIELDS`, `DOC_FIELDS`, `REVIEW_FIELDS` and `DOC_FOR_FIELD` with:

```ts
/** GrabMerchant's sign-up form, in its own order (steps 2–6). 7/7 requires all of them confirmed. */
export const SUBMIT_FIELDS: ProfileFieldKey[] = ['storeName', 'building', 'location', 'address', 'category', 'businessType', 'phone', 'contactEmail', 'owner', 'payout']

/** Filled after submitting, from Home's "ตั้งค่าร้านให้เรียบร้อย". */
export const SETUP_FIELDS: ProfileFieldKey[] = ['menu', 'hours']

export const ALL_FIELDS: ProfileFieldKey[] = [...SUBMIT_FIELDS, ...SETUP_FIELDS]

/** The old Act 1 review list; the guardrail still counts it until Task 5 rewrites submit.ts. */
export const REVIEW_FIELDS: ProfileFieldKey[] = ['storeName', 'category', 'location', 'hours', 'menu', 'phone', 'owner', 'payout']

/** Which document fills a document field (the old journey uses it until Task 4). */
export const DOC_FOR_FIELD: Partial<Record<ProfileFieldKey, DocKind>> = { owner: 'idCard', payout: 'bankBook' }
```

- In `createEmptyProfile`, use this field list:

```ts
    fields: {
      storeName: { value: null, status: 'empty' },
      building: { value: null, status: 'empty' },
      location: { value: null, status: 'empty' },
      address: { value: null, status: 'empty' },
      category: { value: null, status: 'empty' },
      businessType: { value: null, status: 'empty' },
      phone: { value: null, status: 'empty', suggestFromAccount: true },
      contactEmail: { value: null, status: 'empty' },
      owner: { value: null, status: 'empty' },
      payout: { value: null, status: 'empty' },
      menu: { value: null, status: 'empty' },
      hours: { value: null, status: 'empty' },
    },
```

- In `applyUpdates` and `onlyEmptyFields`, loop over `ALL_FIELDS` instead of `REVIEW_FIELDS`.
- Delete `countHeard` and `isReadyForReview`. Keep `missingDocs`.

**`src/ai/onboarding/followUp.ts`:**
- Remove the `TALK_FIELDS` import.
- Add to `QUESTIONS`, after `storeName`:

```ts
  building: () => ({ field: 'building', text: th.followUp.building, chips: [] }),
```

- Replace `pickFollowUp` with:

```ts
/**
 * What the companion should ask next about `fields`, or null when they are all filled.
 * When none of them is filled yet, it opens with the free-talk prompt.
 */
export function pickFollowUp(profile: OnboardingProfile, fields: ProfileFieldKey[], account: Account): FollowUpQuestion | null {
  const { fields: values } = profile
  if (fields.every((key) => values[key].status === 'empty')) {
    return { field: null, text: th.followUp.open, chips: [] }
  }
  const next = fields.find((key) => values[key].status === 'empty')
  return next ? (QUESTIONS[next]?.(account) ?? null) : null
}
```

**`src/ai/onboarding/documents/scanToUpdates.ts`:**
- The ID-card value becomes `{ title: scan.title, name: scan.name, idNumber: scan.idNumber, birthDate: scan.birthDate, idExpiry: scan.idExpiry }`.
- The bank-book value gains `bookPhoto: 'sample'`. The caller replaces it with the real photo.

**`src/copy/th.ts`:**
- Add to `fields`, after `payout`:

```ts
    building: 'ชื่ออาคาร/ถนน',
    address: 'ที่อยู่ร้านค้า',
    businessType: 'ประเภทธุรกิจ',
    contactEmail: 'อีเมลเจ้าของธุรกิจ',
```

- Add to `followUp`: `building: 'ร้านอยู่อาคารหรือถนนอะไรคะ?',`.

- [ ] **Step 5: Run the tests, check and commit**

```bash
npx vitest run src/lib/format.test.ts src/ai/onboarding
npm test && npm run build && npm run lint
git add -A src
git commit -m "Grow the profile to GrabMerchant's sign-up fields and add Thai long dates"
```

If `tsc -b` reports another file that builds an `OwnerIdentity` or `PayoutAccount` literal without the new keys, add them there with the same sample values.

---

### Task 3: Step rules and the 3/7 drafting helpers

**Files:**
- Create:
  - `src/ai/onboarding/steps.ts` + `steps.test.ts`
  - `src/ai/onboarding/addressFields.ts` + `addressFields.test.ts`
  - `src/ai/onboarding/businessTalk.ts` + `businessTalk.test.ts`
- Modify: `src/copy/th.ts`, `src/app/demo/demoProfile.ts`, `src/app/demo/demoProfile.test.ts`

**Interfaces:**
- **Consumes:** `needsCheck`, `confirmField`, `onlyEmptyFields`, `createEmptyProfile`, `applyUpdates` (profile.ts); `namesMatch`; `isValidThaiId`; `extractProfile`; `parseBuilding`, `BUILDING_CONFIDENCE`; `stripParticles` (`parsers/particles.ts`).
- **Produces:**
  - `type FormStep = 3 | 4 | 5 | 6`, `FORM_STEPS`, `STEP_FIELDS: Record<FormStep, ProfileFieldKey[]>`
  - `type StepProblem = 'missing' | 'unchecked' | 'pinNotConfirmed' | 'idInvalid' | 'nameMismatch' | 'noBookPhoto'`
  - `interface StepIssue { field: ProfileFieldKey; problem: StepProblem }` and `interface StepStatus { valid: boolean; issues: StepIssue[] }`
  - `stepStatus(profile, step): StepStatus` and `confirmStep(profile, step): OnboardingProfile`
  - `addressFromLocation(point: GeoPoint, heardFrom: string): ProfileUpdates`, plus `DERIVED_CONFIDENCE = 0.7` and `MAP_ADDRESS_CONFIDENCE = 0.9`
  - `STEP3_TALK: ProfileFieldKey[]` and `businessUpdates(text, ctx): ProfileUpdates`
  - Copy: `th.sources = { account, map, typed, suggested, sms }`
  - `demoProfile()`: every submit and set-up field is heard.

- [ ] **Step 1: Copy**

Add a new top-level section to `src/copy/th.ts`, after `fields`:

```ts
  // Where a value came from when it was not heard or photographed. Shown as "ที่มา: …" under a field.
  sources: {
    account: 'จากบัญชีที่สมัคร',
    map: 'จากแผนที่',
    typed: 'พิมพ์เอง',
    suggested: 'หนูแนะนำ',
    sms: 'จาก SMS',
  },
```

- [ ] **Step 2: Write the failing tests**

`src/ai/onboarding/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyUpdates, confirmField, createEmptyProfile } from './profile.ts'
import { confirmStep, STEP_FIELDS, stepStatus } from './steps.ts'

const PIN = { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }
const OWNER = { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121', birthDate: '1970-01-01', idExpiry: '2031-01-01' }
const PAYOUT = { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี', bookPhoto: 'sample' }
const sure = <T,>(value: T) => ({ value, confidence: 1, heardFrom: 'x' })

const step3 = applyUpdates(createEmptyProfile(), {
  storeName: { value: 'ครัวป้าแดง', confidence: 1, heardFrom: 'x' },
  building: { value: 'ลาดพร้าว 71', confidence: 1, heardFrom: 'x' },
  location: { value: PIN, confidence: 0.9, heardFrom: 'x' },
  address: { value: 'ลาดพร้าว 71 กรุงเทพฯ', confidence: 1, heardFrom: 'x' },
  category: { value: 'อาหารไทย', confidence: 1, heardFrom: 'x' },
})

describe('STEP_FIELDS', () => {
  it('follows the GrabMerchant form', () => {
    expect(STEP_FIELDS).toEqual({
      3: ['storeName', 'building', 'location', 'address', 'category'],
      4: ['businessType', 'phone', 'contactEmail'],
      5: ['owner'],
      6: ['payout'],
    })
  })
})

describe('stepStatus', () => {
  it('lists every missing field', () => {
    expect(stepStatus(createEmptyProfile(), 4)).toEqual({
      valid: false,
      issues: [
        { field: 'businessType', problem: 'missing' },
        { field: 'phone', problem: 'missing' },
        { field: 'contactEmail', problem: 'missing' },
      ],
    })
  })

  it('needs the map pin confirmed on 3/7', () => {
    expect(stepStatus(step3, 3).issues).toEqual([{ field: 'location', problem: 'pinNotConfirmed' }])
    expect(stepStatus(confirmField(step3, 'location'), 3)).toEqual({ valid: true, issues: [] })
  })

  it('flags an unsure value until the merchant checks it', () => {
    const unsure = applyUpdates(confirmField(step3, 'location'), { category: { value: 'อาหารไทย', confidence: 0.6, heardFrom: 'x' } })
    expect(stepStatus(unsure, 3).issues).toEqual([{ field: 'category', problem: 'unchecked' }])
  })

  it('treats a half-typed owner as missing and a wrong ID number as invalid', () => {
    const half = applyUpdates(createEmptyProfile(), { owner: sure({ ...OWNER, birthDate: '' }) })
    expect(stepStatus(half, 5).issues).toEqual([{ field: 'owner', problem: 'missing' }])
    const typo = applyUpdates(createEmptyProfile(), { owner: sure({ ...OWNER, idNumber: '1234567890122' }) })
    expect(stepStatus(typo, 5).issues).toEqual([{ field: 'owner', problem: 'idInvalid' }])
    expect(stepStatus(applyUpdates(createEmptyProfile(), { owner: sure(OWNER) }), 5).valid).toBe(true)
  })

  it('needs the bank book photo and an account in the owner’s name on 6/7', () => {
    const withOwner = applyUpdates(createEmptyProfile(), { owner: sure(OWNER) })
    const noPhoto = applyUpdates(withOwner, { payout: sure({ ...PAYOUT, bookPhoto: null }) })
    expect(stepStatus(noPhoto, 6).issues).toEqual([{ field: 'payout', problem: 'noBookPhoto' }])
    const otherName = applyUpdates(withOwner, { payout: sure({ ...PAYOUT, accountName: 'นาย สมชาย ขายดี' }) })
    expect(stepStatus(otherName, 6).issues).toEqual([{ field: 'payout', problem: 'nameMismatch' }])
    expect(stepStatus(applyUpdates(withOwner, { payout: sure(PAYOUT) }), 6).valid).toBe(true)
  })
})

describe('confirmStep', () => {
  it('confirms that step’s fields only', () => {
    const both = applyUpdates(step3, { businessType: { value: 'personal', confidence: 1, heardFrom: 'x' } })
    const confirmed = confirmStep(confirmField(both, 'location'), 3)
    expect(STEP_FIELDS[3].map((key) => confirmed.fields[key].status)).toEqual(Array(5).fill('confirmed'))
    expect(confirmed.fields.businessType.status).toBe('heard')
  })
})
```

`src/ai/onboarding/addressFields.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { addressFromLocation, DERIVED_CONFIDENCE, MAP_ADDRESS_CONFIDENCE } from './addressFields.ts'

describe('addressFromLocation', () => {
  it('drafts the building/street and the address from a sample place, asking for a check', () => {
    expect(addressFromLocation({ text: 'ลาดพร้าว 71', lat: 13.8, lng: 100.6 }, 'x')).toEqual({
      building: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
      address: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
    })
  })

  it('uses the map’s full address when Google Maps gave one', () => {
    const point = { text: 'ลาดพร้าว 71', address: '71 ซ. ลาดพร้าว 71 แขวงสะพานสอง เขตวังทองหลาง กรุงเทพมหานคร 10310', lat: 13.8, lng: 100.6 }
    expect(addressFromLocation(point, 'x').address).toEqual({ value: point.address, confidence: MAP_ADDRESS_CONFIDENCE, heardFrom: 'x' })
  })
})
```

`src/ai/onboarding/businessTalk.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import script from '@/data/onboarding-script.json'
import { getLandmarks } from '@/services/merchantApi.ts'
import { DERIVED_CONFIDENCE } from './addressFields.ts'
import { businessUpdates, STEP3_TALK } from './businessTalk.ts'
import { applyUpdates, createEmptyProfile } from './profile.ts'

const landmarks = getLandmarks()
const line1 = script.lines[0].say

describe('businessUpdates', () => {
  it('asks about the 3/7 fields a merchant can say', () => {
    expect(STEP3_TALK).toEqual(['storeName', 'location', 'category', 'building'])
  })

  it('fills name, food type and location from the demo sentence, and drafts building and address', () => {
    const updates = businessUpdates(line1, { landmarks, profile: createEmptyProfile() })
    expect(updates.storeName?.value).toBe('ครัวป้าแดง')
    expect(updates.category?.value).toBe('อาหารไทย')
    expect(updates.location?.value.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
    expect(updates.building).toEqual({ value: 'ลาดพร้าว 71 ตรงข้ามเซเว่น', confidence: DERIVED_CONFIDENCE, heardFrom: line1 })
    expect(updates.address?.value).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
  })

  it('never fills hours or menu on this step', () => {
    const updates = businessUpdates('ร้านชื่อครัวป้าแดง เปิดสิบโมงถึงสองทุ่ม เมนูชาไทยสามสิบห้าบาท', { landmarks, profile: createEmptyProfile() })
    expect(updates.hours).toBeUndefined()
    expect(updates.menu).toBeUndefined()
  })

  it('keeps a building the merchant named over the drafted one', () => {
    const updates = businessUpdates('อยู่ตึกชินวัตร ลาดพร้าวซอยเจ็ดสิบเอ็ด', { landmarks, profile: createEmptyProfile() })
    expect(updates.building?.value).toBe('ตึกชินวัตร')
  })

  it('takes a bare answer when the companion asked for the building', () => {
    const updates = businessUpdates('ถนนลาดพร้าวค่ะ', { expecting: 'building', landmarks, profile: createEmptyProfile() })
    expect(updates.building?.value).toBe('ถนนลาดพร้าว')
  })

  it('never replaces an address the merchant already gave', () => {
    const typed = applyUpdates(createEmptyProfile(), { address: { value: '99 ถนนลาดพร้าว', confidence: 1, heardFrom: 'พิมพ์เอง' } })
    expect(businessUpdates(line1, { landmarks, profile: typed }).address).toBeUndefined()
  })

  it('uses a Google Maps match instead of the sample table when one is given', () => {
    const place = { value: { text: 'ตลาดโชคชัย 4', lat: 13.8, lng: 100.6 }, confidence: 0.9 }
    expect(businessUpdates('อยู่ตลาดโชคชัยสี่', { landmarks, profile: createEmptyProfile(), place }).location).toEqual({ ...place, heardFrom: 'อยู่ตลาดโชคชัยสี่' })
  })
})
```

Replace `src/app/demo/demoProfile.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ALL_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoProfile } from './demoProfile.ts'

describe('demoProfile', () => {
  // The presenter's "ข้อมูลตัวอย่าง": the demo script, the account and both sample documents.
  const profile = demoProfile()

  it('hears every field, confirming none', () => {
    expect(ALL_FIELDS.map((key) => profile.fields[key].status)).toEqual(Array(ALL_FIELDS.length).fill('heard'))
  })

  it('matches the story told in the demo', () => {
    const { fields } = profile
    expect(fields.storeName.value).toBe('ครัวป้าแดง')
    expect(fields.location.value?.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
    expect(fields.businessType.value).toBe('personal')
    expect(fields.phone.value).toBe('0812344217')
    expect(fields.contactEmail.value).toBe('padaeng@example.com')
    expect(fields.owner.value?.name).toBe('แดง ใจดี')
    expect(fields.payout.value?.bookPhoto).toBe('sample')
    expect(fields.hours.value).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
    expect(fields.menu.value?.map((item) => item.priceTHB)).toEqual([89, 65, 75, 35, 30])
  })
})
```

Run: `npx vitest run src/ai/onboarding src/app/demo`
Expected: FAIL, because the modules don't exist yet and the demo profile lacks the new fields.

- [ ] **Step 3: Implement**

`src/ai/onboarding/steps.ts`:

```ts
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'
import { namesMatch } from './documents/nameMatch.ts'
import { isValidThaiId } from './documents/thaiId.ts'
import { confirmField, needsCheck } from './profile.ts'

/** The form steps of GrabMerchant's sign-up ("ขั้นตอนที่ N จาก 7"); 1, 2 and 7 have no profile fields. */
export type FormStep = 3 | 4 | 5 | 6

export const FORM_STEPS: FormStep[] = [3, 4, 5, 6]

export const STEP_FIELDS: Record<FormStep, ProfileFieldKey[]> = {
  3: ['storeName', 'building', 'location', 'address', 'category'],
  4: ['businessType', 'phone', 'contactEmail'],
  5: ['owner'],
  6: ['payout'],
}

export type StepProblem = 'missing' | 'unchecked' | 'pinNotConfirmed' | 'idInvalid' | 'nameMismatch' | 'noBookPhoto'

export interface StepIssue {
  field: ProfileFieldKey
  problem: StepProblem
}

export interface StepStatus {
  valid: boolean
  issues: StepIssue[]
}

/** A field counts as filled only when every part the form asks for is there. */
function isFilled(profile: OnboardingProfile, key: ProfileFieldKey): boolean {
  const { fields } = profile
  if (fields[key].status === 'empty' || fields[key].value === null) return false
  if (key === 'owner') {
    const owner = fields.owner.value!
    return [owner.title, owner.name, owner.birthDate, owner.idExpiry].every((part) => part.trim() !== '') && owner.idNumber.length === 13
  }
  if (key === 'payout') {
    const payout = fields.payout.value!
    return [payout.bankName, payout.accountNumber, payout.accountName].every((part) => part.trim() !== '')
  }
  const value = fields[key].value
  return typeof value === 'string' ? value.trim() !== '' : true
}

/** Whether ต่อไป may be pressed on a step, and what still stops it. Pure. */
export function stepStatus(profile: OnboardingProfile, step: FormStep): StepStatus {
  const { fields } = profile
  const issues: StepIssue[] = []
  for (const key of STEP_FIELDS[step]) {
    if (!isFilled(profile, key)) issues.push({ field: key, problem: 'missing' })
    else if (needsCheck(fields[key])) issues.push({ field: key, problem: 'unchecked' })
  }
  if (step === 3 && isFilled(profile, 'location') && fields.location.needsPinCheck) {
    issues.push({ field: 'location', problem: 'pinNotConfirmed' })
  }
  if (step === 5 && isFilled(profile, 'owner') && !isValidThaiId(fields.owner.value!.idNumber)) {
    issues.push({ field: 'owner', problem: 'idInvalid' })
  }
  if (step === 6 && isFilled(profile, 'payout')) {
    const payout = fields.payout.value!
    const owner = fields.owner.value
    if (!payout.bookPhoto) issues.push({ field: 'payout', problem: 'noBookPhoto' })
    if (owner && !namesMatch(`${owner.title} ${owner.name}`, payout.accountName)) issues.push({ field: 'payout', problem: 'nameMismatch' })
  }
  return { valid: issues.length === 0, issues }
}

/** ต่อไป on a valid step: the merchant has seen every value on it. */
export function confirmStep(profile: OnboardingProfile, step: FormStep): OnboardingProfile {
  return STEP_FIELDS[step].reduce((next, key) => confirmField(next, key), profile)
}
```

`src/ai/onboarding/addressFields.ts`:

```ts
import type { GeoPoint, ProfileUpdates } from '@/types/domain.ts'

/** A value guessed from where the shop is: shown amber so the merchant checks it. */
export const DERIVED_CONFIDENCE = 0.7
export const MAP_ADDRESS_CONFIDENCE = 0.9

/** From where the shop is, draft the "ชื่ออาคาร/ถนน" and "ที่อยู่ร้านค้า" boxes the merchant would otherwise type. */
export function addressFromLocation(point: GeoPoint, heardFrom: string): ProfileUpdates {
  return {
    building: { value: point.text, confidence: DERIVED_CONFIDENCE, heardFrom },
    address: point.address
      ? { value: point.address, confidence: MAP_ADDRESS_CONFIDENCE, heardFrom }
      : { value: point.text, confidence: DERIVED_CONFIDENCE, heardFrom },
  }
}
```

`src/ai/onboarding/businessTalk.ts`:

```ts
import type { GeoPoint, Landmark, OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'
import { addressFromLocation } from './addressFields.ts'
import { extractProfile } from './extractProfile.ts'
import { BUILDING_CONFIDENCE, parseBuilding } from './parsers/building.ts'
import { stripParticles } from './parsers/particles.ts'
import { onlyEmptyFields } from './profile.ts'

/** The 3/7 fields the companion asks about by voice, in order; the address is drafted from the location. */
export const STEP3_TALK: ProfileFieldKey[] = ['storeName', 'location', 'category', 'building']

export interface BusinessTalkContext {
  expecting?: ProfileFieldKey // the field the companion just asked about
  landmarks: Landmark[]
  profile: OnboardingProfile // what is already filled, so drafts never replace it
  place?: { value: GeoPoint; confidence: number } | null // a Google Maps match for the words, when there is one
}

/** What one sentence on 3/7 fills. Hours, menu and phone are left for later steps even if they were said. */
export function businessUpdates(text: string, ctx: BusinessTalkContext): ProfileUpdates {
  const heard = extractProfile(text, { expecting: ctx.expecting, landmarks: ctx.landmarks })
  const updates: ProfileUpdates = {}
  if (heard.storeName) updates.storeName = heard.storeName
  if (heard.category) updates.category = heard.category
  const location = ctx.place ? { ...ctx.place, heardFrom: text } : heard.location
  if (location) updates.location = location

  const named = parseBuilding(text)
  if (named) updates.building = { ...named, heardFrom: text }
  else if (ctx.expecting === 'building' && stripParticles(text)) {
    updates.building = { value: stripParticles(text), confidence: BUILDING_CONFIDENCE, heardFrom: text }
  }

  if (location) {
    const drafted = onlyEmptyFields(ctx.profile, addressFromLocation(location.value, text))
    if (drafted.building && !updates.building) updates.building = drafted.building
    if (drafted.address) updates.address = drafted.address
  }
  return updates
}
```

If `stripParticles` keeps surrounding spaces, wrap it as `stripParticles(text).trim()` in both places.

Replace `src/app/demo/demoProfile.ts`:

```ts
import { addressFromLocation } from '@/ai/onboarding/addressFields.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { applyUpdates, createEmptyProfile, onlyEmptyFields } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import script from '@/data/onboarding-script.json'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'

export const scriptLines = script.lines

/** The presenter's sample merchant: the demo script, the account and both sample documents. Every field heard, none confirmed. */
export function demoProfile(): OnboardingProfile {
  const landmarks = getLandmarks()
  const account = getAccount()
  let profile = createEmptyProfile()
  for (const line of script.lines) {
    const expecting = (line.expecting ?? undefined) as ProfileFieldKey | undefined
    profile = applyUpdates(profile, extractProfile(line.say, { expecting, landmarks }))
  }
  const location = profile.fields.location.value
  if (location) profile = applyUpdates(profile, onlyEmptyFields(profile, addressFromLocation(location, th.sources.map)))
  profile = applyUpdates(profile, {
    businessType: { value: 'personal', confidence: 1, heardFrom: th.sources.suggested },
    phone: { value: account.phone, confidence: 1, heardFrom: th.sources.account },
    contactEmail: { value: account.email, confidence: 1, heardFrom: th.sources.account },
  })
  return applyUpdates(profile, { ...scanToUpdates(sampleScan('idCard')), ...scanToUpdates(sampleScan('bankBook')) })
}
```

- [ ] **Step 4: Run the tests, check and commit**

```bash
npx vitest run src/ai/onboarding src/app/demo
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add step rules for the seven-step form and draft building and address from the location"
```

---

### Task 4: The new journey

**Files:**
- Rewrite: `src/app/journey/journeyMachine.ts`, `src/app/journey/journeyMachine.test.ts`
- Modify:
  - `src/types/domain.ts`: add `SetupPart` and `Consents`; remove `FillMethod`.
  - `src/ai/onboarding/profile.ts`: remove `missingDocs` and `DOC_FOR_FIELD`.
  - `src/ai/onboarding/profile.test.ts`: remove the `missingDocs` block.
  - `src/app/demo/DemoPanel.tsx`

**Interfaces:**
- **Consumes:** `stepStatus`, `confirmStep`, `FormStep` (Task 3); `applyUpdates`, `confirmField`, `reaskField`, `removeMenuItem`, `createEmptyProfile`; `th.sources.account`.
- **Produces** (screens in Tasks 8–13 rely on these exact names):
  - `type Screen = 'G0_WELCOME' | 'L1_LOGIN' | 'S1_SERVICE' | 'S2_ACCOUNT' | 'S2_PHONE' | 'S3_BUSINESS' | 'S4_SHOP' | 'S5_OWNER' | 'S6_BANK' | 'S7_CONFIRM' | 'H1_HOME' | 'H2_MENU' | 'H3_HOURS' | 'TRANSITION' | 'G1_DASHBOARD'`
  - `type Service = 'food' | 'mart'`
  - `SIGNUP_ORDER: Screen[]`, `STEP_NUMBER: Partial<Record<Screen, number>>`, `SCREEN_FOR_STEP: Record<FormStep, Screen>`
  - `JourneyState { screen, service, email, phoneVerified, profile, consents, startedAt, submittedAt, setupDone, runId }`
  - Events: `GO`, `CHOOSE_SERVICE`, `ACCOUNT_SET`, `PHONE_VERIFIED`, `FILL`, `CLEAR_FIELD`, `CONFIRM_FIELD`, `REMOVE_MENU_ITEM`, `NEXT`, `BACK`, `SET_CONSENT`, `SUBMITTED`, `SETUP_SAVED`, `LOGGED_IN`, `LOAD_PROFILE`, `RESET`. Their exact shapes are below.
  - In `domain.ts`: `type SetupPart = 'menu' | 'hours'` and `interface Consents { terms: boolean; accurate: boolean }`

- [ ] **Step 1: Domain types**

In `src/types/domain.ts`, delete `FillMethod` and its comment, and add after `BusinessType`:

```ts
/** Home's "ตั้งค่าร้านให้เรียบร้อย" tasks. */
export type SetupPart = 'menu' | 'hours'

/** 7/7's two boxes; only the merchant's own tap ticks them. */
export interface Consents {
  terms: boolean
  accurate: boolean
}
```

In `src/ai/onboarding/profile.ts`, delete `DOC_FOR_FIELD`, `missingDocs`, and the now-unused `DocKind` import. In `profile.test.ts`, delete the `describe('missingDocs', …)` block and its import.

- [ ] **Step 2: Write the failing journey tests**

Replace `src/app/journey/journeyMachine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyUpdates, confirmField, createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { initialJourney, journeyReducer, SIGNUP_ORDER, STEP_NUMBER, type JourneyState, type Screen } from './journeyMachine.ts'

const at = (state: JourneyState, screen: Screen): JourneyState => ({ ...state, screen })
const run = (state: JourneyState, ...events: Parameters<typeof journeyReducer>[1][]) => events.reduce(journeyReducer, state)

describe('journey: start', () => {
  it('opens on the GrabMerchant welcome with nothing filled', () => {
    const state = initialJourney()
    expect(state).toMatchObject({ screen: 'G0_WELCOME', service: null, email: null, phoneVerified: false, submittedAt: null, runId: 0 })
    expect(state.consents).toEqual({ terms: false, accurate: false })
    expect(state.setupDone).toEqual({ menu: false, hours: false })
  })

  it('numbers the steps like GrabMerchant', () => {
    expect(SIGNUP_ORDER).toEqual(['S1_SERVICE', 'S2_ACCOUNT', 'S2_PHONE', 'S3_BUSINESS', 'S4_SHOP', 'S5_OWNER', 'S6_BANK', 'S7_CONFIRM'])
    expect(SIGNUP_ORDER.map((screen) => STEP_NUMBER[screen])).toEqual([1, 2, 2, 3, 4, 5, 6, 7])
  })
})

describe('journey: steps 1–2', () => {
  it('needs a service before 1/7 moves on', () => {
    const s1 = at(initialJourney(), 'S1_SERVICE')
    expect(journeyReducer(s1, { type: 'NEXT' })).toBe(s1)
    expect(run(s1, { type: 'CHOOSE_SERVICE', service: 'food' }, { type: 'NEXT' })).toMatchObject({ service: 'food', screen: 'S2_ACCOUNT' })
  })

  it('keeps the email, offers it as the owner’s contact email and starts the clock', () => {
    const next = journeyReducer(at(initialJourney(), 'S2_ACCOUNT'), { type: 'ACCOUNT_SET', email: 'padaeng@example.com', at: 1000 })
    expect(next).toMatchObject({ screen: 'S2_PHONE', email: 'padaeng@example.com', startedAt: 1000 })
    expect(next.profile.fields.contactEmail).toMatchObject({ value: 'padaeng@example.com', status: 'heard' })
  })

  it('verifies the phone and confirms it', () => {
    const next = journeyReducer(at(initialJourney(), 'S2_PHONE'), { type: 'PHONE_VERIFIED', phone: '0812344217', heardFrom: 'x' })
    expect(next).toMatchObject({ screen: 'S3_BUSINESS', phoneVerified: true })
    expect(next.profile.fields.phone).toMatchObject({ value: '0812344217', status: 'confirmed' })
  })

  it('ignores step events from the wrong screen', () => {
    const elsewhere = at(initialJourney(), 'S5_OWNER')
    expect(journeyReducer(elsewhere, { type: 'ACCOUNT_SET', email: 'a@b.co', at: 1 })).toBe(elsewhere)
    expect(journeyReducer(elsewhere, { type: 'PHONE_VERIFIED', phone: '0812344217', heardFrom: 'x' })).toBe(elsewhere)
    expect(journeyReducer(elsewhere, { type: 'CHOOSE_SERVICE', service: 'mart' })).toBe(elsewhere)
  })

  it('lets a verified phone page move on when the merchant comes back to it', () => {
    const verified = { ...at(initialJourney(), 'S2_PHONE'), phoneVerified: true }
    expect(journeyReducer(verified, { type: 'NEXT' }).screen).toBe('S3_BUSINESS')
    expect(journeyReducer(at(initialJourney(), 'S2_PHONE'), { type: 'NEXT' }).screen).toBe('S2_PHONE')
  })
})

describe('journey: form steps', () => {
  const filled = { ...at(initialJourney(), 'S3_BUSINESS'), profile: demoProfile() }

  it('fills, clears and confirms fields', () => {
    const typed = journeyReducer(filled, { type: 'FILL', updates: { storeName: { value: 'ร้านของฉัน', confidence: 1, heardFrom: 'พิมพ์เอง' } }, at: 5 })
    expect(typed.profile.fields.storeName).toMatchObject({ value: 'ร้านของฉัน', status: 'heard' })
    expect(typed.startedAt).toBe(5)
    expect(journeyReducer(typed, { type: 'CLEAR_FIELD', field: 'storeName' }).profile.fields.storeName.status).toBe('empty')
    expect(journeyReducer(typed, { type: 'CONFIRM_FIELD', field: 'storeName' }).profile.fields.storeName.status).toBe('confirmed')
  })

  it('stays on a step that is not complete', () => {
    expect(journeyReducer(filled, { type: 'NEXT' })).toBe(filled) // the pin is not confirmed yet
  })

  it('confirms the step and moves on when it is complete', () => {
    const ready = { ...filled, profile: (['location', 'building', 'address', 'category'] as const).reduce((p, key) => confirmField(p, key), filled.profile) }
    const next = journeyReducer(ready, { type: 'NEXT' })
    expect(next.screen).toBe('S4_SHOP')
    expect(next.profile.fields.storeName.status).toBe('confirmed')
  })

  it('goes back one step, then to the welcome from 1/7, and Home from H2/H3', () => {
    expect(journeyReducer(filled, { type: 'BACK' }).screen).toBe('S2_PHONE')
    expect(journeyReducer(at(initialJourney(), 'S1_SERVICE'), { type: 'BACK' }).screen).toBe('G0_WELCOME')
    expect(journeyReducer(at(initialJourney(), 'L1_LOGIN'), { type: 'BACK' }).screen).toBe('G0_WELCOME')
    expect(journeyReducer(at(initialJourney(), 'H3_HOURS'), { type: 'BACK' }).screen).toBe('H1_HOME')
  })

  it('removes a menu item', () => {
    const withMenu = journeyReducer(initialJourney(), {
      type: 'FILL',
      updates: { menu: { value: [{ name: 'ก', priceTHB: 10 }, { name: 'ข', priceTHB: 20 }], confidence: 1, heardFrom: 'x' } },
      at: 1,
    })
    expect(journeyReducer(withMenu, { type: 'REMOVE_MENU_ITEM', name: 'ก' }).profile.fields.menu.value).toEqual([{ name: 'ข', priceTHB: 20 }])
  })
})

describe('journey: submit and set-up', () => {
  const confirming = { ...at(initialJourney(), 'S7_CONFIRM'), startedAt: 1000 }

  it('ticks consents only by event', () => {
    const ticked = journeyReducer(confirming, { type: 'SET_CONSENT', consent: 'terms', value: true })
    expect(ticked.consents).toEqual({ terms: true, accurate: false })
  })

  it('goes Home after a submit of the profile on screen', () => {
    const next = journeyReducer(confirming, { type: 'SUBMITTED', at: 9000, profile: confirming.profile })
    expect(next).toMatchObject({ screen: 'H1_HOME', submittedAt: 9000 })
  })

  it('ignores a stale submit', () => {
    const edited = journeyReducer(confirming, { type: 'FILL', updates: { storeName: { value: 'x', confidence: 1, heardFrom: 'x' } }, at: 2 })
    expect(journeyReducer(edited, { type: 'SUBMITTED', at: 9, profile: confirming.profile })).toBe(edited)
    const left = at(confirming, 'S6_BANK')
    expect(journeyReducer(left, { type: 'SUBMITTED', at: 9, profile: left.profile })).toBe(left)
  })

  it('marks a set-up part done only from its own screen', () => {
    const menu = at(initialJourney(), 'H2_MENU')
    expect(journeyReducer(menu, { type: 'SETUP_SAVED', part: 'menu', profile: menu.profile })).toMatchObject({ screen: 'H1_HOME', setupDone: { menu: true, hours: false } })
    expect(journeyReducer(menu, { type: 'SETUP_SAVED', part: 'hours', profile: menu.profile })).toBe(menu)
  })

  it('logs a returning merchant straight in to Home', () => {
    const profile = applyUpdates(createEmptyProfile(), { storeName: { value: 'ครัวป้าแดง', confidence: 1, heardFrom: 'x' } })
    const next = journeyReducer(at(initialJourney(), 'L1_LOGIN'), { type: 'LOGGED_IN', email: 'padaeng@example.com', profile, at: 7 })
    expect(next).toMatchObject({ screen: 'H1_HOME', email: 'padaeng@example.com', phoneVerified: true, submittedAt: 7 })
    expect(next.profile).toBe(profile)
  })

  it('resets everything and starts a new run', () => {
    const busy = run(at(initialJourney(), 'S1_SERVICE'), { type: 'CHOOSE_SERVICE', service: 'food' }, { type: 'NEXT' })
    expect(journeyReducer(busy, { type: 'RESET' })).toEqual({ ...initialJourney(), runId: 1 })
  })
})
```

Run: `npx vitest run src/app/journey`
Expected: FAIL. The old machine doesn't export these names.

- [ ] **Step 3: Implement**

Replace `src/app/journey/journeyMachine.ts`:

```ts
import { applyUpdates, confirmField, createEmptyProfile, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import { confirmStep, stepStatus, type FormStep } from '@/ai/onboarding/steps.ts'
import { th } from '@/copy/th.ts'
import type { Consents, OnboardingProfile, ProfileFieldKey, ProfileUpdates, SetupPart } from '@/types/domain.ts'

// Plan 2 adds G2_INTENT, G3_PREVIEW, G4_SUCCESS, G5_RECAP.
export type Screen =
  | 'G0_WELCOME'
  | 'L1_LOGIN'
  | 'S1_SERVICE'
  | 'S2_ACCOUNT'
  | 'S2_PHONE'
  | 'S3_BUSINESS'
  | 'S4_SHOP'
  | 'S5_OWNER'
  | 'S6_BANK'
  | 'S7_CONFIRM'
  | 'H1_HOME'
  | 'H2_MENU'
  | 'H3_HOURS'
  | 'TRANSITION'
  | 'G1_DASHBOARD'

export type Service = 'food' | 'mart'

/** GrabMerchant's sign-up, in order. */
export const SIGNUP_ORDER: Screen[] = ['S1_SERVICE', 'S2_ACCOUNT', 'S2_PHONE', 'S3_BUSINESS', 'S4_SHOP', 'S5_OWNER', 'S6_BANK', 'S7_CONFIRM']

/** "ขั้นตอนที่ N จาก 7". Phone + OTP is part of step 2. */
export const STEP_NUMBER: Partial<Record<Screen, number>> = {
  S1_SERVICE: 1,
  S2_ACCOUNT: 2,
  S2_PHONE: 2,
  S3_BUSINESS: 3,
  S4_SHOP: 4,
  S5_OWNER: 5,
  S6_BANK: 6,
  S7_CONFIRM: 7,
}

export const SCREEN_FOR_STEP: Record<FormStep, Screen> = { 3: 'S3_BUSINESS', 4: 'S4_SHOP', 5: 'S5_OWNER', 6: 'S6_BANK' }
const FORM_STEP: Partial<Record<Screen, FormStep>> = { S3_BUSINESS: 3, S4_SHOP: 4, S5_OWNER: 5, S6_BANK: 6 }
const BACK_TO: Partial<Record<Screen, Screen>> = { L1_LOGIN: 'G0_WELCOME', S1_SERVICE: 'G0_WELCOME', H2_MENU: 'H1_HOME', H3_HOURS: 'H1_HOME' }
const SETUP_SCREEN: Record<SetupPart, Screen> = { menu: 'H2_MENU', hours: 'H3_HOURS' }

export interface JourneyState {
  screen: Screen
  service: Service | null
  email: string | null // the password is never kept
  phoneVerified: boolean
  profile: OnboardingProfile
  consents: Consents
  startedAt: number | null // first thing given, for "สมัครเสร็จใน …" on Home
  submittedAt: number | null
  setupDone: Record<SetupPart, boolean>
  runId: number // bumps on RESET so screens start fresh
}

export type JourneyEvent =
  | { type: 'GO'; screen: Screen }
  | { type: 'CHOOSE_SERVICE'; service: Service }
  | { type: 'ACCOUNT_SET'; email: string; at: number }
  | { type: 'PHONE_VERIFIED'; phone: string; heardFrom: string }
  | { type: 'FILL'; updates: ProfileUpdates; at: number } // typed, said or photographed: always a draft
  | { type: 'CLEAR_FIELD'; field: ProfileFieldKey }
  | { type: 'CONFIRM_FIELD'; field: ProfileFieldKey } // the merchant's ✓ on an amber value or the map pin
  | { type: 'REMOVE_MENU_ITEM'; name: string }
  | { type: 'NEXT' } // ต่อไป: confirms the step's values
  | { type: 'BACK' }
  | { type: 'SET_CONSENT'; consent: keyof Consents; value: boolean }
  | { type: 'SUBMITTED'; at: number; profile: OnboardingProfile } // the profile that was sent
  | { type: 'SETUP_SAVED'; part: SetupPart; profile: OnboardingProfile }
  | { type: 'LOGGED_IN'; email: string; profile: OnboardingProfile; at: number }
  | { type: 'LOAD_PROFILE'; profile: OnboardingProfile }
  | { type: 'RESET' }

export function initialJourney(): JourneyState {
  return {
    screen: 'G0_WELCOME',
    service: null,
    email: null,
    phoneVerified: false,
    profile: createEmptyProfile(),
    consents: { terms: false, accurate: false },
    startedAt: null,
    submittedAt: null,
    setupDone: { menu: false, hours: false },
    runId: 0,
  }
}

const nextInSignup = (screen: Screen): Screen => SIGNUP_ORDER[SIGNUP_ORDER.indexOf(screen) + 1] ?? screen

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'GO':
      return { ...state, screen: event.screen }
    case 'CHOOSE_SERVICE':
      if (state.screen !== 'S1_SERVICE') return state
      return { ...state, service: event.service }
    case 'ACCOUNT_SET': {
      if (state.screen !== 'S2_ACCOUNT') return state
      // The sign-up email is also the owner's contact email on 4/7 unless the merchant already gave one.
      const contact = state.profile.fields.contactEmail.status === 'empty'
        ? applyUpdates(state.profile, { contactEmail: { value: event.email, confidence: 1, heardFrom: th.sources.account } })
        : state.profile
      return { ...state, email: event.email, profile: contact, startedAt: state.startedAt ?? event.at, screen: 'S2_PHONE' }
    }
    case 'PHONE_VERIFIED': {
      if (state.screen !== 'S2_PHONE') return state
      const withPhone = applyUpdates(state.profile, { phone: { value: event.phone, confidence: 1, heardFrom: event.heardFrom } })
      return { ...state, profile: confirmField(withPhone, 'phone'), phoneVerified: true, screen: 'S3_BUSINESS' }
    }
    case 'FILL':
      return { ...state, profile: applyUpdates(state.profile, event.updates), startedAt: state.startedAt ?? event.at }
    case 'CLEAR_FIELD':
      return { ...state, profile: reaskField(state.profile, event.field) }
    case 'CONFIRM_FIELD':
      return { ...state, profile: confirmField(state.profile, event.field) }
    case 'REMOVE_MENU_ITEM':
      return { ...state, profile: removeMenuItem(state.profile, event.name) }
    case 'NEXT': {
      if (state.screen === 'S1_SERVICE') return state.service ? { ...state, screen: 'S2_ACCOUNT' } : state
      if (state.screen === 'S2_PHONE') return state.phoneVerified ? { ...state, screen: 'S3_BUSINESS' } : state
      const step = FORM_STEP[state.screen]
      if (!step || !stepStatus(state.profile, step).valid) return state
      return { ...state, profile: confirmStep(state.profile, step), screen: nextInSignup(state.screen) }
    }
    case 'BACK': {
      const index = SIGNUP_ORDER.indexOf(state.screen)
      if (index > 0) return { ...state, screen: SIGNUP_ORDER[index - 1] }
      const back = BACK_TO[state.screen]
      return back ? { ...state, screen: back } : state
    }
    case 'SET_CONSENT':
      return { ...state, consents: { ...state.consents, [event.consent]: event.value } }
    case 'SUBMITTED':
      // The send takes a moment; if the merchant edited or left meanwhile, it no longer applies.
      if (state.screen !== 'S7_CONFIRM' || state.profile !== event.profile) return state
      return { ...state, submittedAt: event.at, screen: 'H1_HOME' }
    case 'SETUP_SAVED':
      if (state.screen !== SETUP_SCREEN[event.part] || state.profile !== event.profile) return state
      return { ...state, setupDone: { ...state.setupDone, [event.part]: true }, screen: 'H1_HOME' }
    case 'LOGGED_IN':
      if (state.screen !== 'L1_LOGIN') return state
      return { ...state, email: event.email, profile: event.profile, phoneVerified: true, startedAt: event.at, submittedAt: event.at, screen: 'H1_HOME' }
    case 'LOAD_PROFILE':
      return { ...state, profile: event.profile }
    case 'RESET':
      return { ...initialJourney(), runId: state.runId + 1 }
  }
}
```

- [ ] **Step 4: Presenter panel for the new screens**

In `src/app/demo/DemoPanel.tsx`:
- Remove the imports of `PHOTO_PATH`, `DocKind` and `createEmptyProfile`. The `type Screen` import stays.
- Replace `JUMPS` and `LISTENING_SCREENS` with:

```ts
// Presenter-only tooling (desktop, beside the phone). Press D to hide or show.
const JUMPS: { label: string; screen: Screen; withProfile?: boolean }[] = [
  { label: 'หน้าแรก GrabMerchant', screen: 'G0_WELCOME' },
  { label: 'เข้าสู่ระบบ', screen: 'L1_LOGIN' },
  { label: '1/7 เลือกบริการ', screen: 'S1_SERVICE' },
  { label: '2/7 อีเมลและรหัสผ่าน', screen: 'S2_ACCOUNT' },
  { label: '2/7 เบอร์โทรและ OTP', screen: 'S2_PHONE' },
  { label: '3/7 ข้อมูลธุรกิจ', screen: 'S3_BUSINESS' },
  { label: '4/7 ข้อมูลร้าน (ข้อมูลตัวอย่าง)', screen: 'S4_SHOP', withProfile: true },
  { label: '5/7 ข้อมูลของคุณ', screen: 'S5_OWNER' },
  { label: '6/7 ข้อมูลธนาคาร', screen: 'S6_BANK' },
  { label: '7/7 คำยืนยัน (ข้อมูลตัวอย่าง)', screen: 'S7_CONFIRM', withProfile: true },
  { label: 'หน้าหลัก (รออนุมัติ)', screen: 'H1_HOME', withProfile: true },
  { label: 'เพิ่มเมนู', screen: 'H2_MENU' },
  { label: 'เวลาเปิด-ปิด', screen: 'H3_HOURS' },
  { label: '30 วันต่อมา…', screen: 'TRANSITION' },
]

// Screens where the companion is listening, so a line "spoken" from here is heard.
const LISTENING_SCREENS: Screen[] = ['G0_WELCOME', 'S1_SERVICE', 'S3_BUSINESS', 'S4_SHOP', 'S5_OWNER', 'S6_BANK', 'S7_CONFIRM', 'H1_HOME', 'H2_MENU', 'H3_HOURS']
```

- Change the jump button's `onClick` back to:

```tsx
            onClick={() => {
              if (jump.withProfile) dispatch({ type: 'LOAD_PROFILE', profile: demoProfile() })
              dispatch({ type: 'GO', screen: jump.screen })
            }}
```

- Change the `key` of the jump buttons to `jump.label`, because screens no longer need to be unique.
- Change the script heading to `พูดแทนไมค์ (บรรทัด 1 ใช้ที่ 3/7 · บรรทัด 2 ที่เวลาเปิด-ปิด · บรรทัด 3 ที่เพิ่มเมนู)`.
- Delete the `<p>` about "บรรทัด 4".

- [ ] **Step 5: Run the tests, check and commit**

```bash
npx vitest run src/app/journey src/ai/onboarding
npm test && npm run build && npm run lint
git add -A src
git commit -m "Walk the GrabMerchant sign-up: seven steps, Home, menu and hours, with ต่อไป confirming each step"
```

If `src/ai/onboarding/submit.ts` or its test still references `missingDocs`, `DOC_FOR_FIELD` or `FillMethod`, remove those references. Task 5 rewrites submit.

---

### Task 5: Guardrails for submit and shop set-up

**Files:**
- Rewrite: `src/ai/onboarding/submit.ts`, `src/ai/onboarding/submit.test.ts`
- Modify:
  - `src/services/merchantApi.write.ts`, `src/services/merchantApi.write.test.ts`
  - `src/ai/onboarding/profile.ts`: remove `REVIEW_FIELDS`.
  - `src/copy/th.ts` (`checks`)
  - `src/architecture.test.ts`

**Interfaces:**
- **Consumes:** `SUBMIT_FIELDS`, `needsCheck` (profile.ts); `isValidThaiId`, `namesMatch`; `checkEmail` (`lib/account.ts`); `Consents`, `SetupPart`.
- **Produces:**
  - `interface SubmitContext { phoneVerified: boolean; consents: Consents; today: string }`, where `today` is ISO `yyyy-mm-dd`
  - `runSubmissionChecks(profile, ctx): GuardrailCheck[]` and `submitProfile(profile, ctx): Promise<ApplicationReceipt>`
  - `runSetupChecks(part, profile): GuardrailCheck[]` and `saveSetup(part, profile): Promise<SetupReceipt>`
  - `SubmissionBlockedError`, unchanged
  - Write API: `saveStoreSetup(part: SetupPart, profile): Promise<SetupReceipt>` and `interface SetupReceipt { part: SetupPart; savedAt: string }`

- [ ] **Step 1: Copy**

Replace the `checks` section of `src/copy/th.ts` with:

```ts
  checks: {
    allConfirmed: 'ยืนยันข้อมูลครบแล้ว',
    unconfirmed: (count: number) => `ยังมีข้อมูลที่ต้องยืนยัน ${count} ข้อ`,
    pinOk: 'ยืนยันหมุดร้านแล้ว',
    pinMissing: 'ยังไม่ได้ยืนยันหมุดร้าน',
    phoneOk: 'เบอร์โทรถูกต้อง',
    phoneInvalid: 'เบอร์โทรต้องมี 10 หลัก และขึ้นต้นด้วย 0',
    phoneVerifiedOk: 'ยืนยันเบอร์ด้วย OTP แล้ว',
    phoneNotVerified: 'ยังไม่ได้ยืนยันเบอร์ด้วย OTP',
    emailOk: 'อีเมลถูกต้อง',
    emailInvalid: 'อีเมลเจ้าของธุรกิจยังไม่ถูกต้อง',
    idOk: 'เลขบัตรถูกต้อง',
    idInvalid: 'เลขบัตรไม่ถูกต้อง ถ่ายใหม่อีกครั้งนะคะ',
    idNotExpired: 'บัตรประชาชนยังไม่หมดอายุ',
    idExpired: 'บัตรประชาชนหมดอายุแล้ว',
    payoutNameOk: 'ชื่อบัญชีตรงกับบัตร',
    payoutNameMismatch: 'ชื่อบัญชีต้องตรงกับชื่อบนบัตรค่ะ',
    bookPhotoOk: 'แนบรูปสมุดบัญชีแล้ว',
    bookPhotoMissing: 'ยังไม่ได้แนบรูปสมุดบัญชี',
    consentsOk: 'ยืนยันข้อตกลงแล้ว',
    consentsMissing: 'ติ๊กยืนยันทั้งสองข้อก่อนนะคะ',
    menuOk: 'เมนูมีราคาครบ',
    menuMissing: 'ต้องมีอย่างน้อย 1 เมนูพร้อมราคา',
    menuUnchecked: 'ช่วยเช็คเมนูที่ขึ้นสีส้มก่อนนะคะ',
    hoursOk: 'เวลาเปิด-ปิดถูกต้อง',
    hoursInvalid: 'เวลาเปิดและเวลาปิดต้องไม่ตรงกัน',
  },
```

- [ ] **Step 2: Write the failing tests**

Replace `src/ai/onboarding/submit.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveStoreSetup, submitApplication } from '@/services/merchantApi.write.ts'
import type { OnboardingProfile, ProfileUpdates } from '@/types/domain.ts'
import { applyUpdates, confirmField, createEmptyProfile, SUBMIT_FIELDS } from './profile.ts'
import { runSetupChecks, runSubmissionChecks, saveSetup, SubmissionBlockedError, submitProfile, type SubmitContext } from './submit.ts'

vi.mock('@/services/merchantApi.write.ts', () => ({
  submitApplication: vi.fn(async () => ({ applicationId: 'APP-TEST', submittedAt: '2026-10-14T06:30:00.000Z' })),
  saveStoreSetup: vi.fn(async (part: string) => ({ part, savedAt: '2026-10-14T06:40:00.000Z' })),
}))

const OWNER = { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121', birthDate: '1970-01-01', idExpiry: '2031-01-01' }
const PAYOUT = { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี', bookPhoto: 'sample' }
const sure = <T,>(value: T) => ({ value, confidence: 1, heardFrom: 'x' })

const VALID: ProfileUpdates = {
  storeName: sure('ครัวป้าแดง'),
  building: sure('ลาดพร้าว 71'),
  location: sure({ text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }),
  address: sure('ลาดพร้าว 71 กรุงเทพฯ'),
  category: sure('อาหารไทย'),
  businessType: sure('personal' as const),
  phone: sure('0812344217'),
  contactEmail: sure('padaeng@example.com'),
  owner: sure(OWNER),
  payout: sure(PAYOUT),
}
const CTX: SubmitContext = { phoneVerified: true, consents: { terms: true, accurate: true }, today: '2026-10-14' }

function confirmedProfile(overrides: ProfileUpdates = {}): OnboardingProfile {
  const heard = applyUpdates(createEmptyProfile(), { ...VALID, ...overrides })
  return SUBMIT_FIELDS.reduce((profile, key) => confirmField(profile, key), heard)
}
const check = (profile: OnboardingProfile, id: string, ctx = CTX) => runSubmissionChecks(profile, ctx).find((c) => c.id === id)

beforeEach(() => {
  vi.mocked(submitApplication).mockClear()
  vi.mocked(saveStoreSetup).mockClear()
})

describe('runSubmissionChecks', () => {
  it('passes every check for a confirmed, valid application', () => {
    expect(runSubmissionChecks(confirmedProfile(), CTX).every((c) => c.pass)).toBe(true)
  })

  it('lists the checks in a fixed order', () => {
    expect(runSubmissionChecks(confirmedProfile(), CTX).map((c) => c.id)).toEqual([
      'ALL_CONFIRMED', 'PIN_CONFIRMED', 'PHONE_VALID', 'PHONE_VERIFIED', 'EMAIL_VALID', 'ID_VALID', 'ID_NOT_EXPIRED', 'PAYOUT_NAME_MATCH', 'BOOK_PHOTO_ATTACHED', 'CONSENTS_GIVEN',
    ])
  })

  it('counts unconfirmed sign-up fields, ignoring menu and hours', () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    expect(check(heardOnly, 'ALL_CONFIRMED')?.message).toBe('ยังมีข้อมูลที่ต้องยืนยัน 10 ข้อ')
    expect(check(confirmedProfile(), 'ALL_CONFIRMED')?.pass).toBe(true)
  })

  it('needs the OTP, both consents and a card that has not expired', () => {
    expect(check(confirmedProfile(), 'PHONE_VERIFIED', { ...CTX, phoneVerified: false })?.pass).toBe(false)
    expect(check(confirmedProfile(), 'CONSENTS_GIVEN', { ...CTX, consents: { terms: true, accurate: false } })?.pass).toBe(false)
    expect(check(confirmedProfile({ owner: sure({ ...OWNER, idExpiry: '2026-10-13' }) }), 'ID_NOT_EXPIRED')?.pass).toBe(false)
  })

  it('rejects a bad ID, another person’s account, a missing bank book photo and a bad email', () => {
    expect(check(confirmedProfile({ owner: sure({ ...OWNER, idNumber: '1234567890122' }) }), 'ID_VALID')?.pass).toBe(false)
    expect(check(confirmedProfile({ payout: sure({ ...PAYOUT, accountName: 'นาย สมชาย ขายดี' }) }), 'PAYOUT_NAME_MATCH')?.pass).toBe(false)
    expect(check(confirmedProfile({ payout: sure({ ...PAYOUT, bookPhoto: null }) }), 'BOOK_PHOTO_ATTACHED')?.pass).toBe(false)
    expect(check(confirmedProfile({ contactEmail: sure('padaeng') }), 'EMAIL_VALID')?.pass).toBe(false)
  })
})

describe('submitProfile', () => {
  it('never calls the API when a check fails, and says which', async () => {
    const error = await submitProfile(confirmedProfile(), { ...CTX, consents: { terms: false, accurate: false } }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SubmissionBlockedError)
    expect((error as SubmissionBlockedError).failed.map((c) => c.id)).toEqual(['CONSENTS_GIVEN'])
    expect(submitApplication).not.toHaveBeenCalled()
  })

  it('submits once every check passes', async () => {
    await expect(submitProfile(confirmedProfile(), CTX)).resolves.toMatchObject({ applicationId: 'APP-TEST' })
    expect(submitApplication).toHaveBeenCalledTimes(1)
  })
})

describe('shop set-up', () => {
  const menu = (items: { name: string; priceTHB: number }[], confidence = 1) => applyUpdates(createEmptyProfile(), { menu: { value: items, confidence, heardFrom: 'x' } })

  it('checks the menu: at least one dish, every price above zero, nothing left amber', () => {
    expect(runSetupChecks('menu', menu([{ name: 'ชาไทยเย็น', priceTHB: 35 }]))[0]).toEqual({ id: 'MENU_VALID', pass: true, message: 'เมนูมีราคาครบ' })
    expect(runSetupChecks('menu', menu([{ name: 'น้ำเปล่า', priceTHB: 0 }]))[0].pass).toBe(false)
    expect(runSetupChecks('menu', menu([{ name: 'ชาไทยเย็น', priceTHB: 35 }], 0.6))[0].message).toBe('ช่วยเช็คเมนูที่ขึ้นสีส้มก่อนนะคะ')
    expect(runSetupChecks('menu', createEmptyProfile())[0].pass).toBe(false)
  })

  it('checks the hours: open and close must differ', () => {
    const hours = (open: string, close: string) => applyUpdates(createEmptyProfile(), { hours: sure({ open, close, closedDays: [] }) })
    expect(runSetupChecks('hours', hours('10:00', '20:00'))[0].pass).toBe(true)
    expect(runSetupChecks('hours', hours('10:00', '10:00'))[0].pass).toBe(false)
  })

  it('saves only after its check passes', async () => {
    await expect(saveSetup('menu', createEmptyProfile())).rejects.toBeInstanceOf(SubmissionBlockedError)
    expect(saveStoreSetup).not.toHaveBeenCalled()
    await expect(saveSetup('menu', menu([{ name: 'ชาไทยเย็น', priceTHB: 35 }]))).resolves.toMatchObject({ part: 'menu' })
    expect(saveStoreSetup).toHaveBeenCalledTimes(1)
  })
})
```

Append to `src/services/merchantApi.write.test.ts`. Add `saveStoreSetup` to the import first.

```ts
describe('saveStoreSetup (mock)', () => {
  it('resolves with what was saved after the simulated delay', async () => {
    vi.useFakeTimers()
    const result = saveStoreSetup('hours', createEmptyProfile())
    await vi.advanceTimersByTimeAsync(800)
    await expect(result).resolves.toMatchObject({ part: 'hours' })
  })
})
```

Run: `npx vitest run src/ai/onboarding/submit.test.ts src/services`
Expected: FAIL, because the new functions don't exist yet.

- [ ] **Step 3: Implement**

In `src/services/merchantApi.write.ts`:
- Change the type import to `import type { OnboardingProfile, SetupPart } from '@/types/domain.ts'`.
- Append:

```ts
export interface SetupReceipt {
  part: SetupPart
  savedAt: string
}

export function saveStoreSetup(part: SetupPart, profile: OnboardingProfile): Promise<SetupReceipt> {
  void profile // the mock keeps nothing; a real backend stores the menu or hours
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (demoFlags.simulateApiFailure) {
        reject(new ApiUnavailableError())
        return
      }
      resolve({ part, savedAt: new Date().toISOString() })
    }, LATENCY_MS)
  })
}
```

Replace `src/ai/onboarding/submit.ts`:

```ts
import { th } from '@/copy/th.ts'
import { checkEmail } from '@/lib/account.ts'
import { saveStoreSetup, submitApplication, type ApplicationReceipt, type SetupReceipt } from '@/services/merchantApi.write.ts'
import type { Consents, GuardrailCheck, OnboardingProfile, SetupPart } from '@/types/domain.ts'
import { namesMatch } from './documents/nameMatch.ts'
import { isValidThaiId } from './documents/thaiId.ts'
import { needsCheck, SUBMIT_FIELDS } from './profile.ts'

/** What 7/7 knows besides the profile. `today` is ISO yyyy-mm-dd. */
export interface SubmitContext {
  phoneVerified: boolean
  consents: Consents
  today: string
}

const result = (id: string, pass: boolean, ok: string, fail: string): GuardrailCheck => ({ id, pass, message: pass ? ok : fail })

/** Deterministic checks run before the application leaves the phone (grab-style spec §7). */
export function runSubmissionChecks(profile: OnboardingProfile, ctx: SubmitContext): GuardrailCheck[] {
  const { fields } = profile
  const c = th.checks
  const unconfirmed = SUBMIT_FIELDS.filter((key) => fields[key].status !== 'confirmed').length
  const owner = fields.owner.value
  const payout = fields.payout.value
  return [
    result('ALL_CONFIRMED', unconfirmed === 0, c.allConfirmed, c.unconfirmed(unconfirmed)),
    result('PIN_CONFIRMED', fields.location.status === 'confirmed' && !fields.location.needsPinCheck, c.pinOk, c.pinMissing),
    result('PHONE_VALID', /^0\d{9}$/.test(fields.phone.value ?? ''), c.phoneOk, c.phoneInvalid),
    result('PHONE_VERIFIED', ctx.phoneVerified, c.phoneVerifiedOk, c.phoneNotVerified),
    result('EMAIL_VALID', checkEmail(fields.contactEmail.value ?? '') === null, c.emailOk, c.emailInvalid),
    result('ID_VALID', owner !== null && isValidThaiId(owner.idNumber), c.idOk, c.idInvalid),
    result('ID_NOT_EXPIRED', owner !== null && owner.idExpiry > ctx.today, c.idNotExpired, c.idExpired),
    result('PAYOUT_NAME_MATCH', owner !== null && payout !== null && namesMatch(`${owner.title} ${owner.name}`, payout.accountName), c.payoutNameOk, c.payoutNameMismatch),
    result('BOOK_PHOTO_ATTACHED', Boolean(payout?.bookPhoto), c.bookPhotoOk, c.bookPhotoMissing),
    result('CONSENTS_GIVEN', ctx.consents.terms && ctx.consents.accurate, c.consentsOk, c.consentsMissing),
  ]
}

/** Checks for Home's set-up tasks: the menu (H2) or the opening hours (H3). */
export function runSetupChecks(part: SetupPart, profile: OnboardingProfile): GuardrailCheck[] {
  const c = th.checks
  if (part === 'hours') {
    const hours = profile.fields.hours.value
    return [result('HOURS_VALID', hours !== null && hours.open !== hours.close, c.hoursOk, c.hoursInvalid)]
  }
  const field = profile.fields.menu
  const menu = field.value ?? []
  if (menu.length === 0 || menu.some((item) => item.priceTHB <= 0)) return [result('MENU_VALID', false, c.menuOk, c.menuMissing)]
  return [result('MENU_VALID', !needsCheck(field), c.menuOk, c.menuUnchecked)]
}

export class SubmissionBlockedError extends Error {
  readonly failed: GuardrailCheck[]

  constructor(failed: GuardrailCheck[]) {
    super(`Submission blocked: ${failed.map((check) => check.id).join(', ')}`)
    this.name = 'SubmissionBlockedError'
    this.failed = failed
  }
}

function blockIfFailed(checks: GuardrailCheck[]): void {
  const failed = checks.filter((check) => !check.pass)
  if (failed.length > 0) throw new SubmissionBlockedError(failed)
}

/** 7/7's ส่งใบสมัคร: the only path from the sign-up to the (mock) Grab API. Every check runs first. */
export async function submitProfile(profile: OnboardingProfile, ctx: SubmitContext): Promise<ApplicationReceipt> {
  blockIfFailed(runSubmissionChecks(profile, ctx))
  return submitApplication(profile)
}

/** H2/H3's บันทึก: the only path for the shop's menu and hours. */
export async function saveSetup(part: SetupPart, profile: OnboardingProfile): Promise<SetupReceipt> {
  blockIfFailed(runSetupChecks(part, profile))
  return saveStoreSetup(part, profile)
}
```

- In `src/ai/onboarding/profile.ts`, delete `REVIEW_FIELDS` and its comment.
- In `src/architecture.test.ts`, replace the `SUBMITTERS` comment and line with:

```ts
// Sending is the merchant's own tap: ส่งใบสมัคร on 7/7, and บันทึก on the menu and hours screens.
const SUBMITTERS = ['/src/screens/signup/S7Confirm.tsx', '/src/screens/home/H2Menu.tsx', '/src/screens/home/H3Hours.tsx']
```

  Rename the test `'only lets A2 send the application'` to `'only lets the confirm and set-up screens send'`.

- [ ] **Step 4: Run the tests, check and commit**

```bash
npx vitest run src/ai/onboarding/submit.test.ts src/services src/architecture.test.ts
npm test && npm run build && npm run lint
git add -A src
git commit -m "Guard the seven-step submit and the menu and hours save with deterministic checks"
```

---

### Task 6: GrabMerchant UI kit

**Files:**
- Create:
  - `src/components/grab/StepShell.tsx`, `Field.tsx`, `AiHelperBar.tsx`, `BottomSheet.tsx`
  - `src/components/grab/fieldMarks.ts` + `fieldMarks.test.ts`
  - `src/components/grab/problemText.ts`
  - `src/components/assistant/useSpokenLine.ts`, `src/components/assistant/VoiceToggle.tsx`
- Modify: `src/components/assistant/CompanionAvatar.tsx` (size prop), `src/copy/th.ts` (`grab` section)
- Delete: `src/components/assistant/CompanionDock.tsx`. It is unused since Task 1; its speaking logic and voice toggle move to the new files.

**Interfaces:**
- **Consumes:** `StepIssue` (Task 3); `th.sources`, `th.scan.source`, `th.fields`; the speech service (`speak`, `stopSpeaking`, `subscribeVoice`, `isSpeakingNow`, `isMuted`, `setMuted`, `getThaiVoice`, `onVoicesChanged`).
- **Produces** (every screen task uses these exact props):
  - `StepShell({ step?: number; heading?: string; title: string; subtitle?: string; onBack?: () => void; footer: ReactNode; children: ReactNode })`
  - `Field({ id: string; label: string; required?: boolean; hint?: string; error?: string | null; mark?: FieldMark | null; onCheck?: (() => void) | null; children: ReactNode })`
  - `inputClass(invalid?: boolean): string`
  - `Select({ id; value: string; options: { value: string; label: string }[]; placeholder: string; onChange: (value: string) => void; invalid?: boolean })`
  - `AiHelperBar({ text: string; notice?: string | null; mic: CompanionState; onAvatar?: () => void; action?: { kind: 'mic' | 'camera'; label: string; onPress: () => void } | null; onSpoken?: () => void })`
  - `BottomSheet({ open: boolean; title: string; onClose: () => void; children: ReactNode })`
  - `interface FieldMark { source: string; spoken: boolean }`, plus `fieldMark(field): FieldMark | null`, `needsAmber(field): boolean` and `TYPED`
  - `problemText(issue: StepIssue): string`
  - `useSpokenLine(line: string, opts: { listening: boolean; onSpoken?: () => void }): void`
  - `VoiceToggle()`
  - `CompanionAvatar` gains `size?: 'md' | 'sm'` (default `'md'`).

- [ ] **Step 1: Copy**

Add to `src/copy/th.ts`, after `sources`:

```ts
  grab: {
    stepOf: (step: number, total: number) => `ขั้นตอนที่ ${step} จาก ${total}`,
    help: 'ช่วยเหลือ',
    close: 'ปิด',
    aiFilled: 'AI กรอกให้',
    aiHelper: 'ผู้ช่วย AI',
    source: (source: string) => `ที่มา: ${source}`,
    heard: (words: string) => `ได้ยินว่า “${words}”`,
    pleaseCheck: 'ช่วยเช็คหน่อยค่ะ',
    looksRight: 'ถูกแล้ว',
    problems: {
      missing: (label: string) => `ยังไม่ได้กรอก${label}ค่ะ`,
      unchecked: (label: string) => `ช่วยเช็ค${label}ที่ขึ้นสีส้มก่อนนะคะ`,
      pin: 'กด "หมุดถูกแล้ว" ใต้แผนที่ก่อนนะคะ',
      idInvalid: 'เลขบัตรประชาชนไม่ถูกต้อง ลองถ่ายใหม่หรือแก้ตัวเลขนะคะ',
      nameMismatch: 'ชื่อบัญชีต้องตรงกับชื่อเจ้าของร้านในขั้นตอนที่ 5',
      noBookPhoto: 'แนบรูปสมุดบัญชีก่อนนะคะ',
    },
  },
```

- [ ] **Step 2: Write the failing test**

`src/components/grab/fieldMarks.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { fieldMark, needsAmber, TYPED } from './fieldMarks.ts'

describe('fieldMark', () => {
  it('marks nothing on an empty or typed field', () => {
    expect(fieldMark({ status: 'empty' })).toBeNull()
    expect(fieldMark({ status: 'heard', heardFrom: TYPED })).toBeNull()
  })

  it('marks a photographed or suggested value with its source', () => {
    expect(fieldMark({ status: 'heard', heardFrom: th.scan.source.idCard })).toEqual({ source: 'รูปบัตรประชาชน', spoken: false })
    expect(fieldMark({ status: 'confirmed', heardFrom: th.sources.account })).toEqual({ source: 'จากบัญชีที่สมัคร', spoken: false })
  })

  it('marks spoken words as heard', () => {
    expect(fieldMark({ status: 'heard', heardFrom: 'ร้านชื่อครัวป้าแดงค่ะ' })).toEqual({ source: 'ร้านชื่อครัวป้าแดงค่ะ', spoken: true })
  })
})

describe('needsAmber', () => {
  it('is true only for an unsure draft', () => {
    expect(needsAmber({ status: 'heard', confidence: 0.6 })).toBe(true)
    expect(needsAmber({ status: 'confirmed', confidence: 0.6 })).toBe(false)
    expect(needsAmber({ status: 'heard', confidence: 0.9 })).toBe(false)
  })
})
```

Run: `npx vitest run src/components/grab`
Expected: FAIL, because the module is not found.

- [ ] **Step 3: Implement the helpers**

`src/components/grab/fieldMarks.ts`:

```ts
import { needsCheck } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import type { FieldStatus } from '@/types/domain.ts'

/** The source of a value the merchant typed: it gets no AI mark. */
export const TYPED = th.sources.typed

// Sources that are not someone's words: shown as "ที่มา: …", not "ได้ยินว่า …".
const NAMED_SOURCES: string[] = [...Object.values(th.sources), ...Object.values(th.scan.source)]

export interface FieldMark {
  source: string
  spoken: boolean
}

/** The ✨ "AI กรอกให้" mark for a field the companion filled (by voice, photo, map or suggestion). */
export function fieldMark(field: { status: FieldStatus; heardFrom?: string }): FieldMark | null {
  if (field.status === 'empty' || !field.heardFrom || field.heardFrom === TYPED) return null
  return { source: field.heardFrom, spoken: !NAMED_SOURCES.includes(field.heardFrom) }
}

/** An unsure draft: amber, with a ✓ the merchant must press. */
export const needsAmber = (field: { status: FieldStatus; confidence?: number }) => needsCheck(field)
```

`src/components/grab/problemText.ts`:

```ts
import type { StepIssue } from '@/ai/onboarding/steps.ts'
import { th } from '@/copy/th.ts'

/** What the helper bar says about the first thing still stopping ต่อไป. */
export function problemText(issue: StepIssue): string {
  const p = th.grab.problems
  switch (issue.problem) {
    case 'missing':
      return p.missing(th.fields[issue.field])
    case 'unchecked':
      return p.unchecked(th.fields[issue.field])
    case 'pinNotConfirmed':
      return p.pin
    case 'idInvalid':
      return p.idInvalid
    case 'nameMismatch':
      return p.nameMismatch
    case 'noBookPhoto':
      return p.noBookPhoto
  }
}
```

`src/components/assistant/useSpokenLine.ts`:

```ts
import { useEffect, useRef } from 'react'
import { speak, stopSpeaking } from '@/services/speech/textToSpeech.ts'

/** Says `line` aloud each time it changes. It never talks over the merchant: the mic would hear it. */
export function useSpokenLine(line: string, { listening, onSpoken }: { listening: boolean; onSpoken?: () => void }): void {
  const latest = useRef({ listening, onSpoken })
  useEffect(() => {
    latest.current = { listening, onSpoken }
  })
  useEffect(() => {
    if (!line) return // nothing to say (e.g. a closed sheet): leave whatever is playing alone
    if (!latest.current.listening) speak(line, () => latest.current.onSpoken?.())
    return stopSpeaking
  }, [line])
}
```

`src/components/assistant/VoiceToggle.tsx`:
- Move the `VoiceToggle` function from `CompanionDock.tsx` here unchanged, exported as `export function VoiceToggle()`.
- Bring its imports: `Volume2`, `VolumeX`, `useEffect`, `useState`, `useSyncExternalStore`, `th`, and `getThaiVoice`, `isMuted`, `onVoicesChanged`, `setMuted`, `subscribeVoice` from the speech service.
- Remove the `-mt-1 -mr-2` margins from both class strings.

Then run `git rm src/components/assistant/CompanionDock.tsx`.

In `src/components/assistant/CompanionAvatar.tsx`:
- Add `size = 'md'` to the props, typed `size?: 'md' | 'sm'`.
- Use `className={`relative ${size === 'sm' ? 'size-12 ring-2' : 'size-18 ring-4'} rounded-full object-cover ${RING[state]}`}` on the `<img>`, and `width`/`height` of 48 or 72.
- In `MicBadge`, accept `small` and use `size-6 -top-1.5 -left-1.5` with an icon of `size-4` when small.

- [ ] **Step 4: Implement the components**

`src/components/grab/StepShell.tsx`:

```tsx
import { ArrowLeft, HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '@/copy/th.ts'

export const TOTAL_STEPS = 7

interface StepShellProps {
  step?: number // 1–7: "ขั้นตอนที่ N จาก 7" and the progress strip
  heading?: string // the header text when there is no step number
  title: string
  subtitle?: string
  onBack?: () => void
  footer: ReactNode // the helper bar and the screen's one green button
  children: ReactNode
}

/** GrabMerchant's form page: header, big title, fields, and a pinned footer. */
export function StepShell({ step, heading, title, subtitle, onBack, footer, children }: StepShellProps) {
  return (
    <>
      <header className="flex min-h-14 items-center gap-1 px-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={th.common.back}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink active:bg-canvas"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>
        ) : (
          <span className="w-3" />
        )}
        <p className="flex-1 text-base font-bold">{step ? th.grab.stepOf(step, TOTAL_STEPS) : heading}</p>
        <span className="flex size-12 items-center justify-center text-ink-muted" title={th.grab.help}>
          <HelpCircle className="size-6" aria-hidden />
          <span className="sr-only">{th.grab.help}</span>
        </span>
      </header>
      {step && (
        <ol className="flex gap-1 px-5" aria-label={th.grab.stepOf(step, TOTAL_STEPS)}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <li key={index} className={`h-1 flex-1 rounded-full ${index < step ? 'bg-grab' : 'bg-line'}`} />
          ))}
        </ol>
      )}
      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-ink-muted">{subtitle}</p>}
        <div className="mt-5 flex flex-col gap-5">{children}</div>
      </main>
      <footer className="flex flex-col gap-3 border-t border-line bg-surface px-4 pt-3 pb-4">{footer}</footer>
    </>
  )
}
```

`src/components/grab/Field.tsx`:

```tsx
import { AlertCircle, AlertTriangle, Check, ChevronDown, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import type { FieldMark } from './fieldMarks.ts'

/** GrabMerchant's text box: rounded, thin border, green when focused. */
export const inputClass = (invalid = false) =>
  `min-h-14 w-full rounded-xl border bg-surface px-4 text-lg transition-colors placeholder:text-ink-muted focus:border-action focus:ring-2 focus:ring-grab/25 focus:outline-none ${invalid ? 'border-warn-ink' : 'border-field'}`

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  mark?: FieldMark | null // the companion filled this field
  onCheck?: (() => void) | null // set when the value is unsure: shown amber with a ✓
  children: ReactNode
}

/** A labelled form row: label (with * when required), the input, then an error, the AI source or a hint. */
export function Field({ id, label, required = false, hint, error, mark, onCheck, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-base font-bold">
          {label}
          {required && <span className="text-red-700"> *</span>}
        </label>
        {mark && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-ok-bg px-2 text-sm font-medium text-action">
            <Sparkles className="size-4" aria-hidden />
            {th.grab.aiFilled}
          </span>
        )}
      </div>
      <div className={onCheck ? 'rounded-2xl bg-warn-bg p-1 ring-2 ring-warn-ink/40' : ''}>{children}</div>
      {onCheck && (
        <div className="flex items-center justify-between gap-2 text-base text-warn-ink">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            {th.grab.pleaseCheck}
          </span>
          <Button variant="secondary" className="min-h-12! px-3!" icon={<Check className="size-5" aria-hidden />} onClick={onCheck}>
            {th.grab.looksRight}
          </Button>
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-2 text-base text-warn-ink">
          <AlertCircle className="mt-1 size-5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : mark ? (
        <p className="text-sm text-ink-muted">{mark.spoken ? th.grab.heard(mark.source) : th.grab.source(mark.source)}</p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

interface SelectProps {
  id: string
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  onChange: (value: string) => void
  invalid?: boolean
}

/** GrabMerchant's dropdown: the same box as a text field, with a chevron. */
export function Select({ id, value, options, placeholder, onChange, invalid = false }: SelectProps) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass(invalid)} appearance-none pr-12`}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
    </div>
  )
}
```

`src/components/grab/AiHelperBar.tsx`:

```tsx
import { Camera, Mic } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { CompanionAvatar } from '@/components/assistant/CompanionAvatar.tsx'
import type { CompanionState } from '@/components/assistant/companionState.ts'
import { useSpokenLine } from '@/components/assistant/useSpokenLine.ts'
import { VoiceToggle } from '@/components/assistant/VoiceToggle.tsx'
import { th } from '@/copy/th.ts'
import { isSpeakingNow, subscribeVoice } from '@/services/speech/textToSpeech.ts'

interface AiHelperBarProps {
  text: string // what the companion offers here; said aloud each time it changes
  notice?: string | null // something to fix, said first and shown amber
  mic: CompanionState
  onAvatar?: () => void // the face is the talk button
  action?: { kind: 'mic' | 'camera'; label: string; onPress: () => void } | null
  onSpoken?: () => void
}

/** The slim "ผู้ช่วย AI" bar above the screen's green button. */
export function AiHelperBar({ text, notice, mic, onAvatar, action, onSpoken }: AiHelperBarProps) {
  const speaking = useSyncExternalStore(subscribeVoice, isSpeakingNow)
  useSpokenLine(notice ? `${notice} ${text}` : text, { listening: mic === 'listening', onSpoken })
  const Icon = action?.kind === 'camera' ? Camera : Mic
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ok-bg p-2 pr-2">
      <CompanionAvatar size="sm" state={mic} speaking={speaking} onPress={onAvatar} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-action">{th.grab.aiHelper}</p>
        {notice && (
          <p role="status" className="text-base text-warn-ink">
            {notice}
          </p>
        )}
        <p key={text} aria-live="polite" className="animate-rise text-base leading-snug">
          {text}
        </p>
      </div>
      <VoiceToggle />
      {action && (
        <button
          type="button"
          onClick={action.onPress}
          aria-label={action.label}
          className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-action text-white active:bg-action-pressed"
        >
          <Icon className="size-6" aria-hidden />
        </button>
      )}
    </div>
  )
}
```

`src/components/grab/BottomSheet.tsx`:

```tsx
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { th } from '@/copy/th.ts'

/** A sheet that slides up over the lower part of the phone; the form stays visible above it. */
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-ink/40" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85%] animate-rise overflow-y-auto rounded-t-3xl bg-surface px-4 pt-3 pb-6 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={th.grab.close} className="flex size-12 cursor-pointer items-center justify-center rounded-full active:bg-canvas">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Run the tests, check and commit**

```bash
npx vitest run src/components
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add the GrabMerchant UI kit: step page, fields with AI marks, the helper bar and a bottom sheet"
```

---

### Task 7: Talk and scan sheets

**Files:**
- Create: `src/components/assistant/TalkSheet.tsx`, `src/components/scan/ScanSheet.tsx`
- Modify: `src/copy/th.ts` (`sheet` section)

**Interfaces:**
- **Consumes:** `BottomSheet`, `useSpokenLine` (Task 6); `CompanionAvatar`; `TranscriptBubble`; `TypeInstead`; `Viewfinder`, `SampleDocument`, `ScanResults`, `scanLines`, `scanSummary` (`components/scan`); `readDocument`; `Button`, `Chip`.
- **Produces:**
  - `TalkSheet({ open: boolean; onClose: () => void; question: string; chips?: { label: string; onPress: () => void }[]; transcript: { text: string; final: boolean } | null; mic: CompanionState; onMic: () => void; onType: (text: string) => void })`
  - `ScanSheet({ open: boolean; doc: DocKind; onClose: () => void; onUse: (scan: ScanResult, photo: string) => void })`. `photo` is `'sample'` or a local object URL.
- **Screens own the voice.** `useVoiceInput` lives in the screen; the sheets only render and call back. The helper bar under the sheet speaks the question, so `TalkSheet` does not speak.

- [ ] **Step 1: Copy**

Add to `src/copy/th.ts`, after `grab`:

```ts
  sheet: {
    talkTitle: 'คุยกับผู้ช่วย AI',
    done: 'เสร็จแล้ว',
    tapToTalk: 'แตะที่หนูแล้วพูดได้เลย พูดจบลงท้ายว่า "จ้า"',
    scanTitle: (doc: string) => `ถ่ายรูป${doc}`,
  },
```

- [ ] **Step 2: TalkSheet**

`src/components/assistant/TalkSheet.tsx`:

```tsx
import { Keyboard } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { CompanionAvatar } from './CompanionAvatar.tsx'
import type { CompanionState } from './companionState.ts'
import { TranscriptBubble } from './TranscriptBubble.tsx'
import { TypeInstead } from './TypeInstead.tsx'

interface TalkSheetProps {
  open: boolean
  onClose: () => void
  question: string // what the companion is asking now (the helper bar says it aloud)
  chips?: { label: string; onPress: () => void }[]
  transcript: { text: string; final: boolean } | null
  mic: CompanionState
  onMic: () => void
  onType: (text: string) => void // typed words go through the same reading as speech
}

/** Talk to the companion about this step; what it understands fills the form behind the sheet. */
export function TalkSheet({ open, onClose, question, chips = [], transcript, mic, onMic, onType }: TalkSheetProps) {
  const [typing, setTyping] = useState(false)
  return (
    <BottomSheet open={open} title={th.sheet.talkTitle} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <CompanionAvatar state={mic} onPress={onMic} />
          <div className="min-w-0 flex-1 rounded-3xl rounded-tl-md bg-ok-bg px-4 py-3">
            <p className="text-lg">{question}</p>
            <p className="mt-1 text-sm font-medium text-action">{th.sheet.tapToTalk}</p>
          </div>
        </div>
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Chip key={chip.label} onClick={chip.onPress}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}
        {typing ? (
          <TypeInstead onSend={onType} onClose={() => setTyping(false)} />
        ) : (
          <Button variant="ghost" className="self-start px-0!" icon={<Keyboard className="size-6" aria-hidden />} onClick={() => setTyping(true)}>
            {th.onboarding.typeInstead}
          </Button>
        )}
        <Button fullWidth onClick={onClose}>
          {th.sheet.done}
        </Button>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 3: ScanSheet**

`src/components/scan/ScanSheet.tsx`:

```tsx
import { Camera, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useSpokenLine } from '@/components/assistant/useSpokenLine.ts'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { readDocument } from '@/services/ocr/mockOcr.ts'
import type { DocKind, ScanResult } from '@/types/domain.ts'
import { SampleDocument } from './SampleDocument.tsx'
import { scanLines, scanSummary } from './scanLines.ts'
import { ScanResults } from './ScanResults.tsx'
import { Viewfinder } from './Viewfinder.tsx'

type Phase = 'aim' | 'scanning' | 'read'

interface ScanSheetProps {
  open: boolean
  doc: DocKind
  onClose: () => void
  onUse: (scan: ScanResult, photo: string) => void // photo: 'sample' or a local object URL
}

/** Photograph one document. Reading only drafts: the values land in the form as "heard". */
export function ScanSheet({ open, doc, onClose, onUse }: ScanSheetProps) {
  const [phase, setPhase] = useState<Phase>('aim')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [upload, setUpload] = useState<string | null>(null) // never leaves the browser
  const handedOver = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  // An uploaded photo that was not used is let go when it is replaced or the sheet goes away.
  useEffect(
    () => () => {
      if (upload && handedOver.current !== upload) URL.revokeObjectURL(upload)
    },
    [upload],
  )
  // Every time the sheet opens it starts from the viewfinder.
  useEffect(() => {
    if (!open) return
    setPhase('aim')
    setResult(null)
  }, [open])

  const line = phase === 'aim' ? th.scan.aim[doc] : phase === 'scanning' ? th.scan.reading : result ? scanSummary(result) : th.scan.aim[doc]
  useSpokenLine(open ? line : '', { listening: false })

  const shoot = async () => {
    if (phase === 'scanning') return
    setPhase('scanning')
    setResult(null)
    const scan = await readDocument(doc)
    if (!mounted.current) return
    setResult(scan)
    setPhase('read')
  }
  const use = () => {
    if (!result) return
    const photo = upload ?? 'sample'
    handedOver.current = upload
    onUse(result, photo)
  }
  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUpload(URL.createObjectURL(file))
    void shoot()
  }

  return (
    <BottomSheet open={open} title={th.sheet.scanTitle(th.scan.docs[doc])} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Viewfinder scanning={phase === 'scanning'}>
          {upload ? <img src={upload} alt={th.scan.uploadedAlt} className="max-h-48 rounded-xl object-contain" /> : <SampleDocument kind={doc} />}
        </Viewfinder>
        <p aria-live="polite" className="text-center text-base">
          {line}
        </p>
        {upload && <p className="rounded-2xl bg-warn-bg px-3 py-2 text-base text-warn-ink">{th.scan.demoUpload}</p>}
        {phase === 'read' && result && <ScanResults lines={scanLines(result)} />}
        {phase === 'read' ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="px-4!" onClick={() => setPhase('aim')}>
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
        )}
        {phase !== 'scanning' && (
          <Button variant="ghost" className="self-start px-0!" icon={<Upload className="size-6" aria-hidden />} onClick={() => fileInput.current?.click()}>
            {th.scan.upload}
          </Button>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
    </BottomSheet>
  )
}
```

`useSpokenLine(open ? line : '', …)` keeps the sheet silent while it is closed. An empty line says nothing and stops nothing (see the guard in Task 6).

- [ ] **Step 4: Check and commit**

These are presentational, so there are no unit tests. Screens wire them in Tasks 10–13.

```bash
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add the talk and scan sheets the companion opens over a step"
```

---

### Task 8: Welcome, log in, and 1/7 choose service

**Files:**
- Create: `src/screens/signup/G0Welcome.tsx`, `L1Login.tsx`, `S1Service.tsx`
- Modify: `src/App.tsx`, `src/copy/th.ts` (`g0`, `login`, `s1`), `src/ai/commands/phrases.ts`

**Interfaces:**
- **Consumes:** `StepShell`, `Field`, `inputClass`, `AiHelperBar` (Task 6); `useVoiceInput`, `matchCommand`, `SAY`; journey events `GO`, `CHOOSE_SERVICE`, `NEXT`, `BACK`, `LOGGED_IN`; `demoProfile`; `SUBMIT_FIELDS`, `confirmField`; `checkEmail`, `checkPassword`.
- **Produces:** the screens `G0Welcome`, `L1Login` and `S1Service`, wired in `App.tsx`.

- [ ] **Step 1: Copy and phrases**

Add to `src/copy/th.ts`:

```ts
  g0: {
    wordmark: 'GrabMerchant',
    headline: 'เปิดร้านบน Grab ง่าย ๆ',
    headlineAccent: 'มีผู้ช่วย AI กรอกให้',
    points: ['พูดหรือถ่ายรูป แทนการพิมพ์', 'ทำตามขั้นตอนจริงของ GrabMerchant', 'ยังไม่ส่งข้อมูลจนกว่าคุณจะกดยืนยัน'],
    register: 'ลงทะเบียน',
    login: 'เข้าสู่ระบบ',
    helper: 'เคยสมัครรึยังคะ? บอกหนูว่า "สมัคร" หรือ "เข้าสู่ระบบ" ก็ได้',
  },
  login: {
    title: 'เข้าสู่ระบบ',
    subtitle: 'ใช้อีเมลและรหัสผ่านที่ลงทะเบียนไว้',
    submit: 'เข้าสู่ระบบ',
    helper: 'ยินดีต้อนรับกลับมาค่ะ อีเมลกับรหัสผ่านพิมพ์เองนะคะ หนูไม่แอบดู',
  },
  s1: {
    title: 'เลือกบริการ',
    subtitle: 'เลือกบริการที่ตรงกับธุรกิจของคุณ',
    food: { title: 'GrabFood', body: 'ขายอาหาร ของหวาน และเครื่องดื่ม' },
    mart: { title: 'GrabMart', body: 'ขายสินค้าในชีวิตประจำวัน' },
    helper: 'ขายอาหารใช่ไหมคะ? เลือก GrabFood ได้เลย',
    martNote: 'ในเดโมนี้หนูจะพาสมัครแบบร้านอาหารนะคะ',
  },
```

Add to `SAY` in `src/ai/commands/phrases.ts`:

```ts
  food: ['อาหาร', 'ร้านอาหาร', 'กร็อบฟู้ด', 'แกร็บฟู้ด', 'grabfood'],
  mart: ['ของใช้', 'มาร์ท', 'แกร็บมาร์ท', 'grabmart'],
```

- [ ] **Step 2: G0 Welcome**

`src/screens/signup/G0Welcome.tsx`:

```tsx
import { Mic, ScanLine, ShieldCheck } from 'lucide-react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

const POINT_ICONS = [Mic, ScanLine, ShieldCheck]
const COMMANDS = [
  { id: 'register' as const, phrases: SAY.register },
  { id: 'login' as const, phrases: SAY.login },
]

/** The app's first screen, GrabMerchant style. */
export function G0Welcome() {
  const { dispatch } = useJourney()
  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const choice = matchCommand(text, COMMANDS)
      if (choice === 'register') dispatch({ type: 'GO', screen: 'S1_SERVICE' })
      if (choice === 'login') dispatch({ type: 'GO', screen: 'L1_LOGIN' })
      return choice !== null
    },
    { autoListen: true },
  )
  return (
    <>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="bg-grab px-6 pt-14 pb-10 text-white">
          <p className="text-3xl font-bold tracking-tight">{th.g0.wordmark}</p>
          <h1 className="mt-8 animate-rise text-[2.25rem] leading-tight font-bold">
            {th.g0.headline}
            <br />
            {th.g0.headlineAccent}
          </h1>
        </div>
        <ul className="flex flex-col gap-3 px-6 pt-6">
          {th.g0.points.map((point, index) => {
            const Icon = POINT_ICONS[index]
            return (
              <li key={point} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ok-bg text-action">
                  <Icon className="size-5" aria-hidden />
                </span>
                {point}
              </li>
            )
          })}
        </ul>
      </main>
      <footer className="flex flex-col gap-3 px-4 pt-3 pb-4">
        <AiHelperBar text={th.g0.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} />
        <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'S1_SERVICE' })}>
          {th.g0.register}
        </Button>
        <Button fullWidth variant="secondary" onClick={() => dispatch({ type: 'GO', screen: 'L1_LOGIN' })}>
          {th.g0.login}
        </Button>
      </footer>
    </>
  )
}
```

- [ ] **Step 3: L1 Log in**

`src/screens/signup/L1Login.tsx`:

```tsx
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { confirmField, SUBMIT_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass } from '@/components/grab/Field.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { checkEmail, checkPassword } from '@/lib/account.ts'

const SIGN_IN_MS = 600
const FORM_ID = 'login-form'

/** A returning merchant: typed email and password only. Lands on Home with the sample shop already submitted. */
export function L1Login() {
  const { dispatch } = useJourney()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [tried, setTried] = useState(false)
  const [inPassword, setInPassword] = useState(false)
  const [working, setWorking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const emailProblem = checkEmail(email)
  const passwordProblem = checkPassword(password, false)
  const emailError = tried && emailProblem ? (emailProblem === 'empty' ? th.account.emailEmpty : th.account.emailInvalid) : null
  const passwordError = tried && passwordProblem ? th.account.passwordEmpty : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (emailProblem || passwordProblem) return
    setWorking(true)
    // Prototype: no real account service. The password stays in this screen and is dropped here.
    timer.current = window.setTimeout(() => {
      const profile = SUBMIT_FIELDS.reduce((next, key) => confirmField(next, key), demoProfile())
      dispatch({ type: 'LOGGED_IN', email: email.trim(), profile, at: Date.now() })
    }, SIGN_IN_MS)
  }

  return (
    <StepShell
      heading={th.login.title}
      title={th.login.title}
      subtitle={th.login.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={emailError ?? passwordError ?? (inPassword ? th.account.bubblePrivate : th.login.helper)} mic={inPassword ? 'private' : 'idle'} />
          <Button type="submit" form={FORM_ID} fullWidth loading={working}>
            {working ? th.account.working : th.login.submit}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Field id="login-email" label={th.account.email} required error={emailError}>
          <input id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
            placeholder={th.account.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass(Boolean(emailError))} />
        </Field>
        <Field id="login-password" label={th.account.password} required error={passwordError}>
          <div className="relative">
            <input id="login-password" type={shown ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} onFocus={() => setInPassword(true)} onBlur={() => setInPassword(false)}
              className={`${inputClass(Boolean(passwordError))} pr-14`} />
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShown((value) => !value)}
              aria-label={shown ? th.account.hidePassword : th.account.showPassword} aria-pressed={shown}
              className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center text-ink-muted">
              {shown ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
            </button>
          </div>
        </Field>
      </form>
    </StepShell>
  )
}
```

- [ ] **Step 4: 1/7 choose service**

`src/screens/signup/S1Service.tsx`:

```tsx
import { Check, ChevronRight, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Service } from '@/app/journey/journeyMachine.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

const SERVICES: { id: Service; Icon: typeof UtensilsCrossed }[] = [
  { id: 'food', Icon: UtensilsCrossed },
  { id: 'mart', Icon: ShoppingBasket },
]
const COMMANDS = [
  { id: 'food' as const, phrases: SAY.food },
  { id: 'mart' as const, phrases: SAY.mart },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 1/7 เลือกบริการ. */
export function S1Service() {
  const { state, dispatch } = useJourney()
  const choose = (service: Service) => dispatch({ type: 'CHOOSE_SERVICE', service })
  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'food' || command === 'mart') choose(command)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true },
  )
  return (
    <StepShell
      step={1}
      title={th.s1.title}
      subtitle={th.s1.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={state.service === 'mart' ? th.s1.martNote : th.s1.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} />
          <Button fullWidth disabled={!state.service} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={th.s1.title} className="flex flex-col gap-3">
        {SERVICES.map(({ id, Icon }) => {
          const chosen = state.service === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => choose(id)}
              className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl p-4 text-left ring-1 transition-colors ${chosen ? 'bg-ok-bg ring-2 ring-action' : 'bg-surface ring-line active:bg-canvas'}`}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-action">
                <Icon className="size-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{th.s1[id].title}</span>
                <span className="block text-base text-ink-muted">{th.s1[id].body}</span>
              </span>
              {chosen ? <Check className="size-6 text-action" aria-hidden /> : <ChevronRight className="size-6 text-ink-muted" aria-hidden />}
            </button>
          )
        })}
      </div>
    </StepShell>
  )
}
```

- [ ] **Step 5: Wire into App**

In `src/App.tsx`:
- Import the three screens from `@/screens/signup/…`.
- Add these cases before `TRANSITION`:

```tsx
    case 'G0_WELCOME':
      return <G0Welcome />
    case 'L1_LOGIN':
      return <L1Login key={state.runId} />
    case 'S1_SERVICE':
      return <S1Service />
```

- [ ] **Step 6: Check and commit**

```bash
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add the GrabMerchant welcome, log in and step 1 service choice"
```

---

### Task 9: 2/7 email, password, phone and OTP

**Files:**
- Create: `src/services/otp.ts` + `otp.test.ts`, `src/screens/signup/S2Account.tsx`, `src/screens/signup/S2Phone.tsx`
- Modify: `src/App.tsx`, `src/copy/th.ts` (`s2`, `s2phone`)

**Interfaces:**
- **Consumes:** the UI kit; `checkEmail`, `checkPassword`, `MIN_PASSWORD_LENGTH`; `getAccount`; journey events `ACCOUNT_SET`, `PHONE_VERIFIED`, `NEXT`, `BACK`; `formatPhone`; `th.sources.account`, `th.sources.sms`, `th.sources.typed`.
- **Produces:**
  - `MOCK_OTP = '123456'`, `OTP_LENGTH = 6`, `SMS_ARRIVES_MS = 1500`, `RESEND_SECONDS = 30`
  - `isValidPhone(phone: string): boolean`, `verifyOtp(code: string): boolean`
  - The screens `S2Account` and `S2Phone`.

- [ ] **Step 1: OTP mock, test first**

`src/services/otp.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isValidPhone, MOCK_OTP, OTP_LENGTH, verifyOtp } from './otp.ts'

describe('mock OTP', () => {
  it('accepts a Thai mobile number only', () => {
    expect(isValidPhone('0812344217')).toBe(true)
    expect(isValidPhone('812344217')).toBe(false)
    expect(isValidPhone('08123442171')).toBe(false)
  })

  it('verifies only the mock code', () => {
    expect(MOCK_OTP).toHaveLength(OTP_LENGTH)
    expect(verifyOtp('123456')).toBe(true)
    expect(verifyOtp('654321')).toBe(false)
    expect(verifyOtp('12345')).toBe(false)
  })
})
```

`src/services/otp.ts`:

```ts
// Prototype: no SMS is sent. Every phone "receives" this code, and the companion reads it from the "SMS".
export const MOCK_OTP = '123456'
export const OTP_LENGTH = 6
export const SMS_ARRIVES_MS = 1500
export const RESEND_SECONDS = 30

export const isValidPhone = (phone: string) => /^0\d{9}$/.test(phone)

export const verifyOtp = (code: string) => code === MOCK_OTP
```

Run: `npx vitest run src/services/otp.test.ts`. Expected: PASS.

- [ ] **Step 2: Copy**

Add to `src/copy/th.ts`:

```ts
  s2: {
    title: 'ตั้งค่าอีเมลและรหัสผ่าน',
    subtitle: 'อีเมลนี้ใช้ลงทะเบียนและเข้าสู่ระบบแอป GrabMerchant',
    remember: 'บันทึกข้อมูลไว้ใช้เข้าสู่ระบบ',
    helper: 'อีเมลกับรหัสผ่านพิมพ์เองนะคะ หนูหลับตาให้',
    typeItYourself: 'อีเมลกับรหัสผ่านต้องพิมพ์เองนะคะ หนูไม่ฟังค่ะ พิมพ์เสร็จแล้วบอกหนูว่า "ต่อไป" ได้เลย',
  },
  s2phone: {
    title: 'ยืนยันเบอร์โทรศัพท์',
    subtitle: 'เราจะส่งรหัส OTP ไปที่เบอร์นี้',
    phone: 'เบอร์โทรศัพท์',
    phoneInvalid: 'เบอร์โทรต้องมี 10 หลัก และขึ้นต้นด้วย 0',
    useThisPhone: (masked: string) => `ใช้เบอร์ ${masked} ในเครื่องนี้`,
    sendCode: 'ส่งรหัส OTP',
    otpTitle: 'ใส่รหัส OTP',
    otpSubtitle: (phone: string) => `รหัส 6 หลักส่งไปที่ ${phone}`,
    otpLabel: 'รหัส OTP',
    resendIn: (seconds: number) => `ส่งรหัสอีกครั้งได้ใน ${seconds} วินาที`,
    resend: 'ส่งรหัสอีกครั้ง',
    wrongCode: 'รหัสไม่ถูกต้อง ลองอีกครั้งนะคะ',
    verified: 'ยืนยันเบอร์แล้ว',
    helperPhone: 'จะใช้เบอร์ในเครื่องนี้ไหมคะ? กดปุ่มด้านบนได้เลย',
    helperWaiting: 'รอ SMS แป๊บนึงนะคะ',
    helperFilled: 'ได้รับ SMS แล้ว กรอกให้นะคะ กด "ต่อไป" ได้เลย',
    helperVerified: 'ยืนยันเบอร์เรียบร้อยแล้วค่ะ',
  },
```

- [ ] **Step 3: S2 Account**

`src/screens/signup/S2Account.tsx`:

```tsx
import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass } from '@/components/grab/Field.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { checkEmail, checkPassword, MIN_PASSWORD_LENGTH } from '@/lib/account.ts'

const FORM_ID = 'account-form'
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 2/7 ตั้งค่าอีเมลและรหัสผ่าน. Typed only: the companion never takes these by ear, and looks away from the password. */
export function S2Account() {
  const { state, dispatch } = useJourney()
  const [email, setEmail] = useState(state.email ?? '')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [remember, setRemember] = useState(true)
  const [tried, setTried] = useState(false)
  const [inPassword, setInPassword] = useState(false)

  const emailProblem = checkEmail(email)
  const passwordProblem = checkPassword(password, true)
  const emailError = tried && emailProblem ? (emailProblem === 'empty' ? th.account.emailEmpty : th.account.emailInvalid) : null
  const passwordError = tried && passwordProblem ? (passwordProblem === 'empty' ? th.account.passwordEmpty : th.account.passwordShort(MIN_PASSWORD_LENGTH)) : null

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    setTried(true)
    if (emailProblem || passwordProblem) return
    dispatch({ type: 'ACCOUNT_SET', email: email.trim(), at: Date.now() })
  }

  const { mic, notice, toggleMic } = useVoiceInput((text) => {
    const command = matchCommand(text, COMMANDS)
    if (command === 'next') submit()
    if (command === 'back') dispatch({ type: 'BACK' })
    return command ? true : th.s2.typeItYourself
  })

  return (
    <StepShell
      step={2}
      title={th.s2.title}
      subtitle={th.s2.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar
            text={emailError ?? passwordError ?? (inPassword ? th.account.bubblePrivate : th.s2.helper)}
            notice={notice}
            mic={inPassword ? 'private' : mic}
            onAvatar={inPassword ? undefined : toggleMic}
          />
          <Button type="submit" form={FORM_ID} fullWidth>
            {th.common.next}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Field id="account-email" label={th.account.email} required error={emailError}>
          <input
            id="account-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={th.account.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass(Boolean(emailError))}
          />
        </Field>
        <Field id="account-password" label={th.account.password} required hint={th.account.passwordHint(MIN_PASSWORD_LENGTH)} error={passwordError}>
          <div className="relative">
            <input
              id="account-password"
              type={shown ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setInPassword(true)}
              onBlur={() => setInPassword(false)}
              className={`${inputClass(Boolean(passwordError))} pr-14`}
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShown((value) => !value)}
              aria-label={shown ? th.account.hidePassword : th.account.showPassword}
              aria-pressed={shown}
              className="absolute inset-y-0 right-1 flex w-12 cursor-pointer items-center justify-center text-ink-muted"
            >
              {shown ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
            </button>
          </div>
        </Field>
        <label className="flex min-h-12 items-center justify-between gap-3 text-base">
          {th.s2.remember}
          <input type="checkbox" role="switch" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-7 w-12 accent-action" />
        </label>
      </form>
    </StepShell>
  )
}
```

- [ ] **Step 4: S2 Phone + OTP**

`src/screens/signup/S2Phone.tsx`:

```tsx
import { CheckCircle2, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass } from '@/components/grab/Field.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatPhone } from '@/lib/format.ts'
import { getAccount } from '@/services/merchantApi.ts'
import { isValidPhone, MOCK_OTP, OTP_LENGTH, RESEND_SECONDS, SMS_ARRIVES_MS, verifyOtp } from '@/services/otp.ts'

const account = getAccount()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'yes' as const, phrases: SAY.yes },
]

/** 2/7 (continued): phone number, then the 6-digit OTP the companion reads from the mock SMS. */
export function S2Phone() {
  const { state, dispatch } = useJourney()
  const [stage, setStage] = useState<'phone' | 'otp'>(state.phoneVerified ? 'otp' : 'phone')
  const [phone, setPhone] = useState(state.profile.fields.phone.value ?? '')
  const [fromAccount, setFromAccount] = useState(false)
  const [code, setCode] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState(RESEND_SECONDS)
  const sms = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(sms.current), [])
  useEffect(() => {
    if (stage !== 'otp' || state.phoneVerified || left <= 0) return
    const tick = window.setTimeout(() => setLeft((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(tick)
  }, [stage, left, state.phoneVerified])

  const sendCode = () => {
    if (!isValidPhone(phone)) return setError(th.s2phone.phoneInvalid)
    setError(null)
    setStage('otp')
    setCode('')
    setAutoFilled(false)
    setLeft(RESEND_SECONDS)
    window.clearTimeout(sms.current)
    sms.current = window.setTimeout(() => {
      setCode(MOCK_OTP)
      setAutoFilled(true)
    }, SMS_ARRIVES_MS)
  }
  const takeAccountPhone = () => {
    setPhone(account.phone)
    setFromAccount(true)
    setError(null)
  }
  const next = () => {
    if (state.phoneVerified) return dispatch({ type: 'NEXT' })
    if (stage === 'phone') return sendCode()
    if (!verifyOtp(code)) return setError(th.s2phone.wrongCode)
    dispatch({ type: 'PHONE_VERIFIED', phone, heardFrom: fromAccount ? th.sources.account : th.sources.typed })
  }

  const { mic, notice, toggleMic, onSpoken } = useVoiceInput((text) => {
    const command = matchCommand(text, COMMANDS)
    if (command === 'yes' && stage === 'phone') takeAccountPhone()
    if (command === 'next') next()
    if (command === 'back') dispatch({ type: 'BACK' })
    return command !== null
  })

  const helper = state.phoneVerified
    ? th.s2phone.helperVerified
    : stage === 'phone'
      ? th.s2phone.helperPhone
      : autoFilled
        ? th.s2phone.helperFilled
        : th.s2phone.helperWaiting

  return (
    <StepShell
      step={2}
      title={stage === 'phone' ? th.s2phone.title : th.s2phone.otpTitle}
      subtitle={stage === 'phone' ? th.s2phone.subtitle : th.s2phone.otpSubtitle(formatPhone(phone))}
      onBack={() => (stage === 'otp' && !state.phoneVerified ? setStage('phone') : dispatch({ type: 'BACK' }))}
      footer={
        <>
          <AiHelperBar text={error ?? helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} />
          <Button fullWidth disabled={stage === 'otp' && !state.phoneVerified && code.length !== OTP_LENGTH} onClick={next}>
            {stage === 'phone' ? th.s2phone.sendCode : th.common.next}
          </Button>
        </>
      }
    >
      {stage === 'phone' ? (
        <>
          <Field id="phone" label={th.s2phone.phone} required error={error}>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, ''))
                setFromAccount(false)
              }}
              className={inputClass(Boolean(error))}
            />
          </Field>
          <Chip onClick={takeAccountPhone}>
            <span className="flex items-center gap-2">
              <Smartphone className="size-5" aria-hidden />
              {th.s2phone.useThisPhone(account.maskedPhone)}
            </span>
          </Chip>
        </>
      ) : state.phoneVerified ? (
        <p className="flex items-center gap-2 text-lg font-bold text-action">
          <CheckCircle2 className="size-6" aria-hidden />
          {th.s2phone.verified}: {formatPhone(phone)}
        </p>
      ) : (
        <>
          <Field id="otp" label={th.s2phone.otpLabel} required error={error} mark={autoFilled ? { source: th.sources.sms, spoken: false } : null}>
            <div className="relative">
              <div className="flex justify-between gap-2" aria-hidden>
                {Array.from({ length: OTP_LENGTH }, (_, index) => (
                  <span
                    key={index}
                    className={`flex h-14 w-12 items-center justify-center rounded-xl border text-2xl font-bold ${code[index] ? 'border-action' : 'border-field'}`}
                  >
                    {code[index] ?? ''}
                  </span>
                ))}
              </div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''))
                  setAutoFilled(false)
                  setError(null)
                }}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
              />
            </div>
          </Field>
          {left > 0 ? (
            <p className="text-base text-ink-muted">{th.s2phone.resendIn(left)}</p>
          ) : (
            <Button variant="ghost" className="self-start px-0!" onClick={sendCode}>
              {th.s2phone.resend}
            </Button>
          )}
        </>
      )}
    </StepShell>
  )
}
```

- [ ] **Step 5: Wire, check and commit**

In `src/App.tsx`, import both screens and add:

```tsx
    case 'S2_ACCOUNT':
      return <S2Account key={state.runId} />
    case 'S2_PHONE':
      return <S2Phone key={state.runId} />
```

```bash
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add step 2: email and password, then phone with a mock OTP the companion fills from the SMS"
```

---

### Task 10: 3/7 business info, filled by talking

**Files:**
- Create: `src/screens/signup/S3Business.tsx`
- Modify: `src/App.tsx`, `src/copy/th.ts` (`s3`)

**Interfaces:**
- **Consumes:**
  - `businessUpdates`, `STEP3_TALK` (Task 3); `addressFromLocation`; `pickFollowUp`; `locationPhrase`; `stepStatus`
  - `getPlaces`, `PlaceSuggestions`, `MapPinConfirm`; `CATEGORY_LABELS`
  - the UI kit: `StepShell`, `Field`, `inputClass`, `Select`, `AiHelperBar`, `fieldMark`, `needsAmber`, `problemText`, `TYPED`; `TalkSheet`; `useVoiceInput`
  - journey `FILL`, `CLEAR_FIELD`, `CONFIRM_FIELD`, `NEXT`, `BACK`
- **Produces:** `S3Business`.

- [ ] **Step 1: Copy**

```ts
  s3: {
    title: 'ลงทะเบียน',
    subtitle: 'โปรดกรอกข้อมูลเพื่อแสดงให้ลูกค้าดู',
    section: 'ข้อมูลธุรกิจ',
    storeName: 'ชื่อร้านค้า',
    locationPlaceholder: 'ค้นหาซอย ถนน หรือจุดสังเกต',
    categoryPlaceholder: 'เลือกประเภทอาหาร',
    pinConfirm: 'หมุดถูกแล้ว',
    pinChange: 'เปลี่ยนที่ตั้ง',
    helperStart: 'เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ ร้านชื่ออะไร อยู่ตรงไหน ขายอะไร',
    helperDone: 'ครบแล้วค่ะ ตรวจดูอีกนิด แล้วกด "ต่อไป" ได้เลย',
    talk: 'คุยกับผู้ช่วย',
  },
```

- [ ] **Step 2: The screen**

`src/screens/signup/S3Business.tsx`:

```tsx
import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { addressFromLocation } from '@/ai/onboarding/addressFields.ts'
import { businessUpdates, STEP3_TALK } from '@/ai/onboarding/businessTalk.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { CATEGORY_LABELS } from '@/ai/onboarding/parsers/category.ts'
import { locationPhrase } from '@/ai/onboarding/parsers/locationPhrase.ts'
import { onlyEmptyFields } from '@/ai/onboarding/profile.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { MapPinConfirm } from '@/components/ui/MapPinConfirm.tsx'
import { PlaceSuggestions } from '@/components/ui/PlaceSuggestions.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { getPlaces, type PlaceSuggestion } from '@/services/places/places.ts'
import type { ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'

const SUGGEST_AFTER_MS = 300
const account = getAccount()
const landmarks = getLandmarks()
const places = getPlaces()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
]

/** 3/7 ข้อมูลธุรกิจ: name, building/street, map pin, address and food type. Tell the companion, or type. */
export function S3Business() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const [talking, setTalking] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const question = useMemo(() => pickFollowUp(state.profile, STEP3_TALK, account), [state.profile])
  const status = stepStatus(state.profile, 3)

  const fill = (updates: ProfileUpdates) => {
    if (Object.keys(updates).length > 0) dispatch({ type: 'FILL', updates, at: Date.now() })
  }
  const type = (key: ProfileFieldKey) => (value: string) => {
    if (!value.trim()) return dispatch({ type: 'CLEAR_FIELD', field: key })
    fill({ [key]: { value, confidence: 1, heardFrom: TYPED } } as ProfileUpdates)
  }

  // Offer places a moment after the merchant stops typing in the location search.
  useEffect(() => {
    let current = true
    const waiting = window.setTimeout(async () => {
      const found = search.trim() ? await places.suggest(search.trim()) : []
      if (current) setSuggestions(found)
    }, SUGGEST_AFTER_MS)
    return () => {
      current = false
      window.clearTimeout(waiting)
    }
  }, [search])

  const pickPlace = async (suggestion: PlaceSuggestion) => {
    setSearch('')
    const match = await places.pick(suggestion)
    if (!match) return
    fill({ location: { ...match, heardFrom: th.sources.map }, ...onlyEmptyFields(state.profile, addressFromLocation(match.value, th.sources.map)) })
  }

  const { mic, transcript, notice, toggleMic, hear, onSpoken } = useVoiceInput(
    async (text, isCurrent) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'next') {
        dispatch({ type: 'NEXT' })
        return true
      }
      if (command === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      if (command === 'typeInstead') {
        setTalking(true)
        return true
      }
      const expecting = question?.field ?? undefined
      const wantsPlace = places.live && (expecting === 'location' || expecting === undefined)
      const phrase = wantsPlace ? locationPhrase(text, expecting === 'location') : null
      const place = phrase ? await places.find(phrase) : null
      if (!isCurrent()) return false // the screen was left or reset while the map was answering
      const updates = businessUpdates(text, { expecting, landmarks, profile: state.profile, place })
      if (phrase && !place && Object.keys(updates).length === 0) return th.places.notFound
      fill(updates)
      return Object.keys(updates).length > 0
    },
    { autoListen: talking },
  )

  const helper = question ? (question.field === null ? th.s3.helperStart : question.text) : status.valid ? th.s3.helperDone : problemText(status.issues[0])
  const amber = (key: ProfileFieldKey) => (needsAmber(fields[key]) ? () => dispatch({ type: 'CONFIRM_FIELD', field: key }) : null)

  return (
    <StepShell
      step={3}
      title={th.s3.title}
      subtitle={th.s3.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar
            text={helper}
            notice={notice}
            mic={mic}
            onAvatar={toggleMic}
            onSpoken={onSpoken}
            action={{ kind: 'mic', label: th.s3.talk, onPress: () => setTalking(true) }}
          />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <h2 className="text-lg font-bold">{th.s3.section}</h2>
      <Field id="s3-name" label={th.s3.storeName} required mark={fieldMark(fields.storeName)} onCheck={amber('storeName')}>
        <input id="s3-name" autoComplete="organization" value={fields.storeName.value ?? ''} onChange={(event) => type('storeName')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s3-building" label={th.fields.building} required mark={fieldMark(fields.building)} onCheck={amber('building')}>
        <input id="s3-building" autoComplete="address-line1" value={fields.building.value ?? ''} onChange={(event) => type('building')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s3-location" label={th.store.location} required mark={fieldMark(fields.location)} onCheck={amber('location')}>
        {fields.location.value ? (
          <div className="flex flex-col gap-2">
            <MapPinConfirm point={fields.location.value} />
            <div className="flex flex-wrap gap-2">
              {fields.location.needsPinCheck && (
                <Button variant="secondary" className="min-h-12!" icon={<MapPin className="size-5" aria-hidden />} onClick={() => dispatch({ type: 'CONFIRM_FIELD', field: 'location' })}>
                  {th.s3.pinConfirm}
                </Button>
              )}
              <Button variant="ghost" className="min-h-12! px-0!" onClick={() => dispatch({ type: 'CLEAR_FIELD', field: 'location' })}>
                {th.s3.pinChange}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-action" aria-hidden />
              <input id="s3-location" autoComplete="off" placeholder={th.s3.locationPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass()} pl-11`} />
            </div>
            <PlaceSuggestions suggestions={suggestions} live={places.live} onPick={pickPlace} />
          </div>
        )}
      </Field>
      <Field id="s3-address" label={th.fields.address} required mark={fieldMark(fields.address)} onCheck={amber('address')}>
        <textarea id="s3-address" rows={2} value={fields.address.value ?? ''} onChange={(event) => type('address')(event.target.value)} className={`${inputClass()} py-3`} />
      </Field>
      <Field id="s3-category" label={th.fields.category} required mark={fieldMark(fields.category)} onCheck={amber('category')}>
        <Select
          id="s3-category"
          value={fields.category.value ?? ''}
          placeholder={th.s3.categoryPlaceholder}
          options={[...new Set([...CATEGORY_LABELS, ...(fields.category.value ? [fields.category.value] : [])])].map((label) => ({ value: label, label }))}
          onChange={type('category')}
        />
      </Field>

      <TalkSheet
        open={talking}
        onClose={() => setTalking(false)}
        question={question ? (question.field === null ? th.s3.helperStart : question.text) : th.s3.helperDone}
        chips={(question?.chips ?? []).filter((chip) => chip.kind === 'say').map((chip) => ({ label: chip.label, onPress: () => hear(chip.label) }))}
        transcript={transcript}
        mic={mic}
        onMic={toggleMic}
        onType={hear}
      />
    </StepShell>
  )
}
```

- [ ] **Step 3: Wire, check and commit**

In `App.tsx`, add `case 'S3_BUSINESS': return <S3Business key={state.runId} />`.

```bash
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add step 3 business info: tell the companion, it fills name, street, pin, address and food type"
```

---

### Task 11: 4/7 shop details and 5/7 your info (ID card scan)

**Files:**
- Create: `src/screens/signup/S4Shop.tsx`, `src/screens/signup/S5Owner.tsx`
- Modify: `src/App.tsx`, `src/copy/th.ts` (`s4`, `s5`), `src/ai/commands/phrases.ts`

**Interfaces:**
- **Consumes:** the UI kit; `ScanSheet`; `scanToUpdates`; `stepStatus`; `formatIdNumber`, `formatPhone`, `formatThaiDate`; journey `FILL`, `CLEAR_FIELD`, `CONFIRM_FIELD`, `NEXT`, `BACK`.
- **Produces:** `S4Shop` and `S5Owner`.

- [ ] **Step 1: Copy and phrases**

```ts
  s4: {
    title: 'ข้อมูลร้าน',
    subtitle: 'โปรดกรอกข้อมูลร้าน ช่องทางการติดต่อ และเอกสารสำหรับตรวจสอบยืนยัน',
    business: 'ข้อมูลธุรกิจ',
    typePlaceholder: 'เลือกประเภทธุรกิจ',
    types: { personal: 'ธุรกิจส่วนตัว (บุคคลธรรมดา)', company: 'นิติบุคคล (บริษัท/ห้างหุ้นส่วน)' },
    contact: 'ช่องทางการติดต่อเจ้าของธุรกิจ',
    contactNote: 'ธุรกิจส่วนตัวหรือกิจการที่มีเจ้าของคนเดียว ใช้เบอร์และอีเมลของเจ้าของเป็นช่องทางติดต่อ',
    ownerPhone: 'เบอร์เจ้าของธุรกิจ',
    verified: 'ยืนยันแล้ว',
    privacy: 'ข้อมูลจะใช้ตามนโยบายความเป็นส่วนตัวของ Grab',
    helper: 'ร้านทั่วไปเลือก "ธุรกิจส่วนตัว" ได้เลยค่ะ เบอร์กับอีเมลหนูใส่ให้แล้ว',
    suggest: 'ใช้ธุรกิจส่วนตัว',
  },
  s5: {
    title: 'ข้อมูลของคุณ',
    note: 'Grab ให้ความสำคัญกับความเป็นส่วนตัวของคุณ ข้อมูลนี้ใช้ยืนยันตัวตนเท่านั้น',
    idNumber: 'เลขประจำตัวประชาชน',
    title_: 'คำนำหน้า',
    titlePlaceholder: 'เลือกคำนำหน้า',
    titles: ['นาย', 'นาง', 'นางสาว'],
    name: 'ชื่อ-นามสกุลเจ้าของร้าน',
    nameHint: 'กรอกชื่อ-นามสกุล ไม่ต้องมีคำนำหน้า',
    birthDate: 'วัน/เดือน/ปีเกิด (พ.ศ.)',
    idExpiry: 'วันหมดอายุบัตรประชาชน',
    asThai: (thai: string) => `= ${thai}`,
    helper: 'ถ่ายรูปบัตรประชาชน หนูกรอกให้ทั้งหน้าเลยค่ะ',
    scan: 'ถ่ายรูปบัตรประชาชน',
  },
```

Add to `SAY`: `personal: ['ส่วนตัว', 'ธุรกิจส่วนตัว', 'บุคคลธรรมดา'],` and `company: ['บริษัท', 'นิติบุคคล', 'ห้างหุ้นส่วน'],`.

- [ ] **Step 2: S4 Shop**

`src/screens/signup/S4Shop.tsx`:

```tsx
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass, Select } from '@/components/grab/Field.tsx'
import { fieldMark, TYPED } from '@/components/grab/fieldMarks.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { formatPhone } from '@/lib/format.ts'
import type { BusinessType } from '@/types/domain.ts'

const COMMANDS = [
  { id: 'personal' as const, phrases: SAY.personal },
  { id: 'company' as const, phrases: SAY.company },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 4/7 ข้อมูลร้าน: business type and the owner's contact details (phone verified on step 2). */
export function S4Shop() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const status = stepStatus(state.profile, 4)
  const setType = (value: BusinessType, heardFrom: string) => dispatch({ type: 'FILL', updates: { businessType: { value, confidence: 1, heardFrom } }, at: Date.now() })

  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'personal' || command === 'company') setType(command, th.sources.suggested)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true },
  )

  return (
    <StepShell
      step={4}
      title={th.s4.title}
      subtitle={th.s4.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={status.valid || fields.businessType.status === 'empty' ? th.s4.helper : problemText(status.issues[0])} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <h2 className="text-lg font-bold">{th.s4.business}</h2>
      <Field id="s4-type" label={th.fields.businessType} required mark={fieldMark(fields.businessType)}>
        <Select
          id="s4-type"
          value={fields.businessType.value ?? ''}
          placeholder={th.s4.typePlaceholder}
          options={(['personal', 'company'] as const).map((value) => ({ value, label: th.s4.types[value] }))}
          onChange={(value) => setType(value as BusinessType, TYPED)}
        />
      </Field>
      {fields.businessType.status === 'empty' && <Chip onClick={() => setType('personal', th.sources.suggested)}>{th.s4.suggest}</Chip>}

      <h2 className="text-lg font-bold">{th.s4.contact}</h2>
      <p className="-mt-3 text-base text-ink-muted">{th.s4.contactNote}</p>
      <Field id="s4-phone" label={th.s4.ownerPhone} required>
        <p id="s4-phone" className="flex min-h-14 items-center justify-between rounded-xl border border-line bg-canvas px-4 text-lg">
          {fields.phone.value ? formatPhone(fields.phone.value) : '—'}
          {state.phoneVerified && (
            <span className="flex items-center gap-1 text-base text-action">
              <CheckCircle2 className="size-5" aria-hidden />
              {th.s4.verified}
            </span>
          )}
        </p>
      </Field>
      <Field id="s4-email" label={th.fields.contactEmail} required mark={fieldMark(fields.contactEmail)}>
        <input
          id="s4-email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={fields.contactEmail.value ?? ''}
          onChange={(event) =>
            event.target.value.trim()
              ? dispatch({ type: 'FILL', updates: { contactEmail: { value: event.target.value, confidence: 1, heardFrom: TYPED } }, at: Date.now() })
              : dispatch({ type: 'CLEAR_FIELD', field: 'contactEmail' })
          }
          className={inputClass()}
        />
      </Field>
      <p className="flex items-start gap-2 text-base text-ink-muted">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        {th.s4.privacy}
      </p>
    </StepShell>
  )
}
```

- [ ] **Step 3: S5 Owner**

`src/screens/signup/S5Owner.tsx`:

```tsx
import { Info } from 'lucide-react'
import { useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { ScanSheet } from '@/components/scan/ScanSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatIdNumber, formatThaiDate } from '@/lib/format.ts'
import type { OwnerIdentity } from '@/types/domain.ts'

const EMPTY_OWNER: OwnerIdentity = { title: '', name: '', idNumber: '', birthDate: '', idExpiry: '' }
const COMMANDS = [
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 5/7 ข้อมูลของคุณ: one photo of the ID card fills the page. Numbers are never taken by ear. */
export function S5Owner() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.owner
  const owner = field.value ?? EMPTY_OWNER
  const mark = fieldMark(field)
  const [scanning, setScanning] = useState(false)
  const status = stepStatus(state.profile, 5)

  // Editing any box keeps the rest; the owner is one field in the profile.
  const edit = (part: keyof OwnerIdentity) => (value: string) =>
    dispatch({ type: 'FILL', updates: { owner: { value: { ...owner, [part]: value }, confidence: 1, heardFrom: TYPED } }, at: Date.now() })

  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'shoot') setScanning(true)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true },
  )

  const idError = status.issues.some((issue) => issue.problem === 'idInvalid') ? th.grab.problems.idInvalid : null
  const helper = field.status === 'empty' ? th.s5.helper : status.valid ? th.s3.helperDone : problemText(status.issues[0])

  return (
    <StepShell
      step={5}
      title={th.s5.title}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} action={{ kind: 'camera', label: th.s5.scan, onPress: () => setScanning(true) }} />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <p className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-base">
        <Info className="mt-0.5 size-5 shrink-0 text-action" aria-hidden />
        {th.s5.note}
      </p>
      {needsAmber(field) && (
        <Button variant="secondary" onClick={() => dispatch({ type: 'CONFIRM_FIELD', field: 'owner' })}>
          {th.grab.looksRight}
        </Button>
      )}
      <Field id="s5-id" label={th.s5.idNumber} required mark={mark} error={idError}>
        <input
          id="s5-id"
          inputMode="numeric"
          autoComplete="off"
          value={owner.idNumber.length === 13 ? formatIdNumber(owner.idNumber) : owner.idNumber}
          onChange={(event) => edit('idNumber')(event.target.value.replace(/\D/g, '').slice(0, 13))}
          className={inputClass(Boolean(idError))}
        />
      </Field>
      <Field id="s5-title" label={th.s5.title_} required mark={mark}>
        <Select id="s5-title" value={owner.title} placeholder={th.s5.titlePlaceholder} options={th.s5.titles.map((title) => ({ value: title, label: title }))} onChange={edit('title')} />
      </Field>
      <Field id="s5-name" label={th.s5.name} required hint={th.s5.nameHint} mark={mark}>
        <input id="s5-name" autoComplete="name" value={owner.name} onChange={(event) => edit('name')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s5-birth" label={th.s5.birthDate} required mark={mark} hint={owner.birthDate ? th.s5.asThai(formatThaiDate(owner.birthDate)) : undefined}>
        <input id="s5-birth" type="date" value={owner.birthDate} onChange={(event) => edit('birthDate')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s5-expiry" label={th.s5.idExpiry} required mark={mark} hint={owner.idExpiry ? th.s5.asThai(formatThaiDate(owner.idExpiry)) : undefined}>
        <input id="s5-expiry" type="date" value={owner.idExpiry} onChange={(event) => edit('idExpiry')(event.target.value)} className={inputClass()} />
      </Field>

      <ScanSheet
        open={scanning}
        doc="idCard"
        onClose={() => setScanning(false)}
        onUse={(scan) => {
          dispatch({ type: 'FILL', updates: scanToUpdates(scan), at: Date.now() })
          setScanning(false)
        }}
      />
    </StepShell>
  )
}
```

When an AI-filled field has a mark, `Field` shows the source instead of the hint. For the two dates this hides "= 1 มกราคม 2513". That is acceptable, because the scan results and the native date box already show the date.

- [ ] **Step 4: Wire, check and commit**

In `App.tsx`, add `case 'S4_SHOP': return <S4Shop />` and `case 'S5_OWNER': return <S5Owner key={state.runId} />`.

```bash
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add step 4 shop details and step 5 your info, filled from one photo of the ID card"
```

---

### Task 12: 6/7 bank details and 7/7 confirm and submit

**Files:**
- Create:
  - `src/screens/signup/S6Bank.tsx`, `src/screens/signup/S7Confirm.tsx`
  - `src/screens/signup/confirmSummary.ts` + `confirmSummary.test.ts`
- Modify: `src/App.tsx`, `src/copy/th.ts` (`s6`, `s7`), `src/ai/commands/phrases.ts`

**Interfaces:**
- **Consumes:** the UI kit; `ScanSheet`; `scanToUpdates`; `stepStatus`; `submitProfile`, `SubmissionBlockedError`, `runSubmissionChecks`; `maskIdNumber`, `maskAccount`, `lastFour`, `formatPhone`; `speak`; `SCREEN_FOR_STEP`; journey `FILL`, `CLEAR_FIELD`, `NEXT`, `BACK`, `GO`, `SET_CONSENT`, `SUBMITTED`.
- **Produces:**
  - `confirmRows(profile): { step: FormStep; title: string; lines: string[] }[]`, with masked numbers
  - `confirmSpeech(profile): string`, with the last 4 digits only
  - `S6Bank` and `S7Confirm`

- [ ] **Step 1: Copy and phrases**

```ts
  s6: {
    title: 'ข้อมูลธนาคาร',
    subtitle: 'บัญชีสำหรับรับเงินจากการขาย',
    accountName: 'ชื่อบัญชี',
    bank: 'ชื่อธนาคาร',
    bankPlaceholder: 'เลือกธนาคาร',
    banks: ['ธนาคารกสิกรไทย', 'ธนาคารไทยพาณิชย์', 'ธนาคารกรุงเทพ', 'ธนาคารกรุงไทย', 'ธนาคารกรุงศรีอยุธยา', 'ธนาคารทหารไทยธนชาต', 'ธนาคารออมสิน'],
    accountNumber: 'เลขบัญชี',
    documents: 'เอกสารที่ต้องใช้',
    bookPhoto: 'รูปถ่ายสมุดบัญชีธนาคาร',
    uploaded: 'อัปโหลดสำเร็จ',
    removePhoto: 'ลบรูป',
    addPhoto: 'ถ่ายรูปหรืออัปโหลด',
    note: 'ชื่อเจ้าของบัญชีต้องตรงกับชื่อที่ลงทะเบียน',
    helper: 'ถ่ายรูปหน้าแรกสมุดบัญชี หนูกรอกให้และแนบรูปให้เลย',
    scan: 'ถ่ายรูปสมุดบัญชี',
  },
  s7: {
    title: 'คำยืนยัน',
    subtitle: 'เมื่อทำเครื่องหมายในช่องด้านล่าง ถือว่าคุณยืนยันในนามของคุณ',
    summaryTitle: 'ตรวจข้อมูลก่อนส่ง',
    edit: 'แก้ไข',
    listen: 'ฟังสรุป',
    rows: { 3: 'ข้อมูลธุรกิจ', 4: 'ข้อมูลร้าน', 5: 'ข้อมูลของคุณ', 6: 'บัญชีรับเงิน' },
    terms: 'ข้าพเจ้ายอมรับข้อตกลงการใช้งาน Grab ข้อกำหนดและเงื่อนไขร้านค้า และประกาศความเป็นส่วนตัว',
    accurate: 'ข้าพเจ้ายืนยันว่าข้อมูลที่กรอกถูกต้องตามความเป็นจริง',
    submit: 'ส่งใบสมัคร',
    submitting: 'กำลังส่งใบสมัคร…',
    helper: 'หนูช่วยกรอกให้ครบแล้วค่ะ ตรวจอีกครั้ง แล้วติ๊กยืนยันกับกดส่งเองนะคะ',
    mustTap: 'ข้อนี้ต้องกดเองนะคะ หนูกดยืนยันหรือส่งแทนไม่ได้ค่ะ',
    apiError: 'ตอนนี้ระบบช้าอยู่ค่ะ ลองกดอีกครั้งนะคะ',
    goFix: 'ไปแก้',
    speech: (parts: string[]) => parts.join(' '),
    accountEnding: (bank: string, last4: string) => `${bank} บัญชีลงท้ายด้วย ${last4}`,
    idEnding: (name: string, last4: string) => `${name} บัตรลงท้ายด้วย ${last4}`,
  },
```

Add to `SAY`: `consentTick: ['ติ๊ก', 'ยอมรับ', 'ยินยอม'],`. It is only used to answer "ต้องกดเอง".

- [ ] **Step 2: Summary helpers, test first**

`src/screens/signup/confirmSummary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { confirmRows, confirmSpeech } from './confirmSummary.ts'

describe('confirmRows', () => {
  const rows = confirmRows(demoProfile())

  it('has one row per form step with an edit target', () => {
    expect(rows.map((row) => row.step)).toEqual([3, 4, 5, 6])
  })

  it('masks the ID and account numbers', () => {
    expect(rows[2].lines).toContain('นาง แดง ใจดี · x-xxxx-xxxx0-12-1')
    expect(rows[3].lines).toContain('ธนาคารกสิกรไทย · xxx-x-xx789-0')
    expect(JSON.stringify(rows)).not.toContain('1234567890')
  })
})

describe('confirmSpeech', () => {
  it('says only the last four digits', () => {
    const said = confirmSpeech(demoProfile())
    expect(said).toContain('บัตรลงท้ายด้วย 0121')
    expect(said).toContain('บัญชีลงท้ายด้วย 7890')
    expect(said).not.toContain('1234567890')
  })
})
```

`src/screens/signup/confirmSummary.ts`:

```ts
import type { FormStep } from '@/ai/onboarding/steps.ts'
import { th } from '@/copy/th.ts'
import { formatPhone, lastFour, maskAccount, maskIdNumber } from '@/lib/format.ts'
import type { OnboardingProfile } from '@/types/domain.ts'

export interface ConfirmRow {
  step: FormStep
  title: string
  lines: string[]
}

/** 7/7's summary card: one row per step, numbers masked. */
export function confirmRows(profile: OnboardingProfile): ConfirmRow[] {
  const { fields } = profile
  const owner = fields.owner.value
  const payout = fields.payout.value
  const present = (lines: (string | null | undefined)[]) => lines.filter((line): line is string => Boolean(line))
  return [
    { step: 3, title: th.s7.rows[3], lines: present([fields.storeName.value, fields.address.value, fields.category.value]) },
    {
      step: 4,
      title: th.s7.rows[4],
      lines: present([
        fields.businessType.value ? th.s4.types[fields.businessType.value] : null,
        fields.phone.value ? formatPhone(fields.phone.value) : null,
        fields.contactEmail.value,
      ]),
    },
    { step: 5, title: th.s7.rows[5], lines: present([owner ? `${owner.title} ${owner.name} · ${maskIdNumber(owner.idNumber)}` : null]) },
    { step: 6, title: th.s7.rows[6], lines: present([payout ? `${payout.bankName} · ${maskAccount(payout.accountNumber)}` : null, payout?.accountName]) },
  ]
}

/** What "ฟังสรุป" reads aloud: the shop, the owner and the bank, numbers only by their last four digits. */
export function confirmSpeech(profile: OnboardingProfile): string {
  const { fields } = profile
  const owner = fields.owner.value
  const payout = fields.payout.value
  return th.s7.speech(
    [
      fields.storeName.value,
      fields.address.value,
      owner ? th.s7.idEnding(owner.name, lastFour(owner.idNumber)) : null,
      payout ? th.s7.accountEnding(payout.bankName, lastFour(payout.accountNumber)) : null,
    ].filter((part): part is string => Boolean(part)),
  )
}
```

Run: `npx vitest run src/screens/signup`. Expected: PASS once both files exist. Write the test first and watch it fail on the missing module.

- [ ] **Step 3: S6 Bank**

`src/screens/signup/S6Bank.tsx`:

```tsx
import { BookOpen, CheckCircle2, Info, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { ScanSheet } from '@/components/scan/ScanSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import type { PayoutAccount } from '@/types/domain.ts'

const EMPTY_PAYOUT: PayoutAccount = { bankName: '', accountNumber: '', accountName: '', bookPhoto: null }
const COMMANDS = [
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 6/7 ข้อมูลธนาคาร: one photo of the bank book fills the account and attaches the photo. */
export function S6Bank() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.payout
  const payout = field.value ?? EMPTY_PAYOUT
  const mark = fieldMark(field)
  const [scanning, setScanning] = useState(false)
  const status = stepStatus(state.profile, 6)

  const edit = (part: keyof PayoutAccount) => (value: string | null) =>
    dispatch({ type: 'FILL', updates: { payout: { value: { ...payout, [part]: value }, confidence: 1, heardFrom: TYPED } }, at: Date.now() })

  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'shoot') setScanning(true)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true },
  )

  const nameError = status.issues.some((issue) => issue.problem === 'nameMismatch') ? th.grab.problems.nameMismatch : null
  const helper = field.status === 'empty' ? th.s6.helper : status.valid ? th.s3.helperDone : problemText(status.issues[0])

  return (
    <StepShell
      step={6}
      title={th.s6.title}
      subtitle={th.s6.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} action={{ kind: 'camera', label: th.s6.scan, onPress: () => setScanning(true) }} />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      {needsAmber(field) && (
        <Button variant="secondary" onClick={() => dispatch({ type: 'CONFIRM_FIELD', field: 'payout' })}>
          {th.grab.looksRight}
        </Button>
      )}
      <Field id="s6-name" label={th.s6.accountName} required mark={mark} error={nameError}>
        <input id="s6-name" value={payout.accountName} onChange={(event) => edit('accountName')(event.target.value)} className={inputClass(Boolean(nameError))} />
      </Field>
      <Field id="s6-bank" label={th.s6.bank} required mark={mark}>
        <Select id="s6-bank" value={payout.bankName} placeholder={th.s6.bankPlaceholder} options={th.s6.banks.map((bank) => ({ value: bank, label: bank }))} onChange={edit('bankName')} />
      </Field>
      <Field id="s6-number" label={th.s6.accountNumber} required mark={mark}>
        <input id="s6-number" inputMode="numeric" value={payout.accountNumber} onChange={(event) => edit('accountNumber')(event.target.value.replace(/\D/g, '').slice(0, 15))} className={inputClass()} />
      </Field>

      <h2 className="text-lg font-bold">{th.s6.documents}</h2>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-bold">
          {th.s6.bookPhoto}
          <span className="text-red-700"> *</span>
        </p>
        {payout.bookPhoto ? (
          <div className="flex min-h-16 items-center gap-3 rounded-xl border border-line p-2">
            {payout.bookPhoto === 'sample' ? (
              <span className="flex size-12 items-center justify-center rounded-lg bg-amber-50 text-warn-ink">
                <BookOpen className="size-6" aria-hidden />
              </span>
            ) : (
              <img src={payout.bookPhoto} alt={th.s6.bookPhoto} className="size-12 rounded-lg object-cover" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block">{th.s6.bookPhoto}</span>
              <span className="flex items-center gap-1 text-sm text-action">
                <CheckCircle2 className="size-4" aria-hidden />
                {th.s6.uploaded}
              </span>
            </span>
            <button type="button" aria-label={th.s6.removePhoto} onClick={() => edit('bookPhoto')(null)} className="flex size-12 cursor-pointer items-center justify-center rounded-full text-ink-muted active:bg-canvas">
              <Trash2 className="size-5" aria-hidden />
            </button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setScanning(true)}>
            {th.s6.addPhoto}
          </Button>
        )}
      </div>
      <p className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-base">
        <Info className="mt-0.5 size-5 shrink-0 text-action" aria-hidden />
        {th.s6.note}
      </p>

      <ScanSheet
        open={scanning}
        doc="bankBook"
        onClose={() => setScanning(false)}
        onUse={(scan, photo) => {
          const updates = scanToUpdates(scan)
          if (updates.payout) updates.payout = { ...updates.payout, value: { ...updates.payout.value, bookPhoto: photo } }
          dispatch({ type: 'FILL', updates, at: Date.now() })
          setScanning(false)
        }}
      />
    </StepShell>
  )
}
```

- [ ] **Step 4: S7 Confirm**

`src/screens/signup/S7Confirm.tsx`:

```tsx
import { Pencil, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { SubmissionBlockedError, submitProfile } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { SCREEN_FOR_STEP } from '@/app/journey/journeyMachine.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { speak } from '@/services/speech/textToSpeech.ts'
import type { Consents, GuardrailCheck } from '@/types/domain.ts'
import { confirmRows, confirmSpeech } from './confirmSummary.ts'

const READ_AFTER_MS = 150
const COMMANDS = [
  { id: 'listen' as const, phrases: SAY.listenSummary },
  { id: 'submit' as const, phrases: SAY.submit },
  { id: 'tick' as const, phrases: SAY.consentTick },
  { id: 'back' as const, phrases: SAY.back },
]

/** 7/7 คำยืนยัน: check the summary, tick both boxes and press ส่งใบสมัคร, all by the merchant's own hand. */
export function S7Confirm() {
  const { state, dispatch } = useJourney()
  const { profile, consents } = state
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<GuardrailCheck[]>([])
  const [apiError, setApiError] = useState(false)
  const mounted = useRef(true)
  const reading = useRef<number | undefined>(undefined)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(reading.current)
    }
  }, [])

  const readSummary = () => {
    reading.current = window.setTimeout(() => speak(confirmSpeech(profile)), READ_AFTER_MS)
  }
  const tick = (consent: keyof Consents) => (value: boolean) => dispatch({ type: 'SET_CONSENT', consent, value })

  // By voice the companion reads the summary; ticking and sending take the merchant's own tap.
  const { mic, notice, toggleMic } = useVoiceInput((text) => {
    const command = matchCommand(text, COMMANDS)
    if (command === 'listen') {
      readSummary()
      return true
    }
    if (command === 'submit' || command === 'tick') return th.s7.mustTap
    if (command === 'back') {
      dispatch({ type: 'BACK' })
      return true
    }
    return false
  })

  const send = async () => {
    setSending(true)
    setFailed([])
    setApiError(false)
    try {
      await submitProfile(profile, { phoneVerified: state.phoneVerified, consents, today: new Date().toISOString().slice(0, 10) })
      // Carries the profile that was sent: if it changed meanwhile, the journey ignores this.
      dispatch({ type: 'SUBMITTED', at: Date.now(), profile })
    } catch (caught) {
      if (!mounted.current) return
      if (caught instanceof SubmissionBlockedError) setFailed(caught.failed)
      else setApiError(true)
    }
    if (mounted.current) setSending(false)
  }

  return (
    <StepShell
      step={7}
      title={th.s7.title}
      subtitle={th.s7.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={th.s7.helper} notice={apiError ? th.s7.apiError : notice} mic={mic} onAvatar={toggleMic} />
          {failed.length > 0 && (
            <ul role="alert" className="flex flex-col gap-1 rounded-2xl bg-warn-bg p-3 text-base text-warn-ink">
              {failed.map((check) => (
                <li key={check.id}>{check.message}</li>
              ))}
            </ul>
          )}
          <Button fullWidth disabled={!consents.terms || !consents.accurate} loading={sending} onClick={send}>
            {sending ? th.s7.submitting : th.s7.submit}
          </Button>
        </>
      }
    >
      <section className="rounded-2xl ring-1 ring-line">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
          <h2 className="font-bold">{th.s7.summaryTitle}</h2>
          <Button variant="ghost" className="min-h-12! px-2!" icon={<Volume2 className="size-5" aria-hidden />} onClick={readSummary}>
            {th.s7.listen}
          </Button>
        </div>
        <ul className="divide-y divide-line">
          {confirmRows(profile).map((row) => (
            <li key={row.step} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-muted">{row.title}</p>
                {row.lines.map((line) => (
                  <p key={line} className="text-base">
                    {line}
                  </p>
                ))}
              </div>
              <Button variant="ghost" className="min-h-12! px-2!" icon={<Pencil className="size-4" aria-hidden />} onClick={() => dispatch({ type: 'GO', screen: SCREEN_FOR_STEP[row.step] })}>
                {th.s7.edit}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {(['terms', 'accurate'] as const).map((consent) => (
        <label key={consent} className="flex min-h-12 cursor-pointer items-start gap-3 text-base">
          <input type="checkbox" checked={consents[consent]} onChange={(event) => tick(consent)(event.target.checked)} className="mt-1 size-6 shrink-0 accent-action" />
          <span className={consent === 'terms' ? 'text-action underline-offset-2' : ''}>{th.s7[consent]}</span>
        </label>
      ))}
    </StepShell>
  )
}
```

- [ ] **Step 5: Wire, check and commit**

In `App.tsx`, add `case 'S6_BANK': return <S6Bank key={state.runId} />` and `case 'S7_CONFIRM': return <S7Confirm />`.

```bash
npx vitest run src/screens/signup src/architecture.test.ts
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add step 6 bank details from a bank book photo and step 7 summary, consent and submit"
```

---

### Task 13: Home, add menu and opening hours

**Files:**
- Create: `src/screens/home/H1Home.tsx`, `H2Menu.tsx`, `H3Hours.tsx`
- Modify:
  - `src/App.tsx`: final switch, and remove `NotBuiltYet`
  - `src/copy/th.ts` (`h1`, `h2`, `h3`)

**Interfaces:**
- **Consumes:** the UI kit; `ScanSheet`; `TalkSheet`; `scanToUpdates`; `extractProfile`; `saveSetup`, `SubmissionBlockedError`; `formatDuration`, `formatTHB`, `formatHours`; journey `GO`, `FILL`, `CONFIRM_FIELD`, `REMOVE_MENU_ITEM`, `SETUP_SAVED`, `BACK`; `th.chips.hoursFullDay` and `th.chips.hoursMorning`.
- **Produces:** `H1Home`, `H2Menu` and `H3Hours`. Every `Screen` is handled in `App.tsx`.

- [ ] **Step 1: Copy**

```ts
  h1: {
    heading: 'หน้าหลัก',
    status: 'อยู่ระหว่างตรวจสอบ',
    statusBody: 'Grab จะแจ้งผลภายใน 1–3 วันทำการ',
    elapsed: (duration: string) => `สมัครเสร็จใน ${duration}`,
    tasksTitle: 'ตั้งค่าร้านให้เรียบร้อย',
    menuTask: 'เพิ่มเมนู',
    hoursTask: 'ตั้งเวลาเปิด-ปิด',
    allDone: 'ร้านพร้อมเปิดรับออเดอร์เมื่ออนุมัติ',
    continue: 'ดูต่อ: 30 วันต่อมา',
    helper: 'สมัครเสร็จแล้วค่ะ! ระหว่างรอ มาเพิ่มเมนูกันไหมคะ ถ่ายรูปเมนูกระดาษก็ได้',
    helperDone: 'ตั้งค่าร้านครบแล้วค่ะ รออนุมัติได้เลย',
    nav: ['หน้าหลัก', 'ออเดอร์', 'เมนู', 'บัญชี'],
    bell: 'การแจ้งเตือน',
  },
  h2: {
    title: 'เพิ่มเมนู',
    empty: 'ยังไม่มีเมนูค่ะ',
    dish: 'ชื่อเมนู',
    price: 'ราคา (บาท)',
    add: 'เพิ่มรายการ',
    save: 'บันทึกเมนู',
    saving: 'กำลังบันทึก…',
    remove: (name: string) => `ลบ ${name}`,
    helper: 'ถ่ายรูปเมนูกระดาษ หรือพูดชื่อเมนูกับราคาให้หนูฟังก็ได้ค่ะ',
    scan: 'ถ่ายรูปเมนูกระดาษ',
    talk: 'พูดชื่อเมนูกับราคา',
    talkQuestion: 'มีเมนูอะไรบ้างคะ บอกพร้อมราคาได้เลย',
    apiError: 'ตอนนี้ระบบช้าอยู่ค่ะ ลองกดอีกครั้งนะคะ',
  },
  h3: {
    title: 'เวลาเปิด-ปิด',
    open: 'เวลาเปิด',
    close: 'เวลาปิด',
    timePlaceholder: 'เลือกเวลา',
    closedDays: 'วันหยุด',
    save: 'บันทึก',
    saving: 'กำลังบันทึก…',
    helper: 'บอกเวลาเปิดปิดได้เลยค่ะ เช่น "สิบโมงถึงสองทุ่ม หยุดวันจันทร์"',
    talk: 'บอกเวลาเปิดปิด',
    days: { mon: 'จ.', tue: 'อ.', wed: 'พ.', thu: 'พฤ.', fri: 'ศ.', sat: 'ส.', sun: 'อา.' },
    apiError: 'ตอนนี้ระบบช้าอยู่ค่ะ ลองกดอีกครั้งนะคะ',
  },
```

- [ ] **Step 2: H1 Home**

`src/screens/home/H1Home.tsx`:

```tsx
import { Bell, CheckCircle2, ChevronRight, Circle, ClipboardList, Clock, Home, ReceiptText, User, UtensilsCrossed } from 'lucide-react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatDuration } from '@/lib/format.ts'

const NAV_ICONS = [Home, ReceiptText, UtensilsCrossed, User]

/** Home after submitting: waiting for approval, and the two set-up tasks. */
export function H1Home() {
  const { state, dispatch } = useJourney()
  const { startedAt, submittedAt, setupDone } = state
  const allDone = setupDone.menu && setupDone.hours
  const elapsed = startedAt !== null && submittedAt !== null ? formatDuration(submittedAt - startedAt) : null
  const { mic, notice, toggleMic, onSpoken } = useVoiceInput(() => false)
  const tasks = [
    { key: 'menu' as const, label: th.h1.menuTask, Icon: UtensilsCrossed, screen: 'H2_MENU' as const },
    { key: 'hours' as const, label: th.h1.hoursTask, Icon: Clock, screen: 'H3_HOURS' as const },
  ]
  return (
    <>
      <header className="flex min-h-14 items-center justify-between bg-grab px-4 text-white">
        <p className="text-lg font-bold">{state.profile.fields.storeName.value ?? th.h1.heading}</p>
        <span className="flex size-12 items-center justify-center" title={th.h1.bell}>
          <Bell className="size-6" aria-hidden />
          <span className="sr-only">{th.h1.bell}</span>
        </span>
      </header>
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        <section className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <ClipboardList className="mt-0.5 size-6 shrink-0 text-action" aria-hidden />
          <div>
            <h1 className="text-lg font-bold">{th.h1.status}</h1>
            <p className="text-base text-ink-muted">{th.h1.statusBody}</p>
            {elapsed && <p className="mt-1 text-base">{th.h1.elapsed(elapsed)}</p>}
          </div>
        </section>
        <section className={`rounded-2xl p-4 ring-1 ${allDone ? 'bg-ok-bg ring-action' : 'bg-surface ring-line'}`}>
          <h2 className="font-bold">{allDone ? th.h1.allDone : th.h1.tasksTitle}</h2>
          <ul className="mt-2 divide-y divide-line">
            {tasks.map(({ key, label, Icon, screen }) => (
              <li key={key}>
                <button type="button" onClick={() => dispatch({ type: 'GO', screen })} className="flex min-h-14 w-full cursor-pointer items-center gap-3 text-left">
                  <Icon className="size-6 shrink-0 text-action" aria-hidden />
                  <span className="flex-1">{label}</span>
                  {setupDone[key] ? <CheckCircle2 className="size-6 text-action" aria-hidden /> : <Circle className="size-6 text-line" aria-hidden />}
                  <ChevronRight className="size-5 text-ink-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
        {allDone && (
          <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'TRANSITION' })}>
            {th.h1.continue}
          </Button>
        )}
      </main>
      <div className="px-4 pt-2">
        <AiHelperBar text={allDone ? th.h1.helperDone : th.h1.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} />
      </div>
      <nav className="mt-2 grid grid-cols-4 border-t border-line bg-surface" aria-hidden>
        {th.h1.nav.map((label, index) => {
          const Icon = NAV_ICONS[index]
          return (
            <span key={label} className={`flex min-h-14 flex-col items-center justify-center text-sm ${index === 0 ? 'text-action' : 'text-ink-muted'}`}>
              <Icon className="size-5" />
              {label}
            </span>
          )
        })}
      </nav>
    </>
  )
}
```

- [ ] **Step 3: H2 Menu**

`src/screens/home/H2Menu.tsx`:

```tsx
import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { SubmissionBlockedError, saveSetup } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, inputClass } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { ScanSheet } from '@/components/scan/ScanSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import { getLandmarks } from '@/services/merchantApi.ts'

const landmarks = getLandmarks()
const COMMANDS = [
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'back' as const, phrases: SAY.back },
]

/** H2 เพิ่มเมนู: from a photo of the paper menu, by voice, or typed. Saved through the set-up guardrail. */
export function H2Menu() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.menu
  const items = field.value ?? []
  const [scanning, setScanning] = useState(false)
  const [talking, setTalking] = useState(false)
  const [dish, setDish] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const { mic, transcript, notice, toggleMic, hear, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'shoot') {
        setScanning(true)
        return true
      }
      if (command === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      const updates = extractProfile(text, { expecting: 'menu', landmarks })
      if (!updates.menu) return false
      dispatch({ type: 'FILL', updates: { menu: updates.menu }, at: Date.now() })
      return true
    },
    { autoListen: talking },
  )

  const add = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(price)
    if (!dish.trim() || !(amount > 0)) return
    dispatch({ type: 'FILL', updates: { menu: { value: [{ name: dish.trim(), priceTHB: amount }], confidence: 1, heardFrom: TYPED } }, at: Date.now() })
    setDish('')
    setPrice('')
  }
  const save = async () => {
    setSaving(true)
    setProblem(null)
    try {
      await saveSetup('menu', state.profile)
      dispatch({ type: 'SETUP_SAVED', part: 'menu', profile: state.profile })
    } catch (caught) {
      if (!mounted.current) return
      setProblem(caught instanceof SubmissionBlockedError ? caught.failed[0].message : th.h2.apiError)
    }
    if (mounted.current) setSaving(false)
  }

  return (
    <StepShell
      heading={th.h2.title}
      title={th.h2.title}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={problem ?? th.h2.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} action={{ kind: 'camera', label: th.h2.scan, onPress: () => setScanning(true) }} />
          <div className="flex gap-2">
            <Button variant="secondary" className="px-4!" onClick={() => setTalking(true)}>
              {th.h2.talk}
            </Button>
            <Button className="min-w-0 flex-1" disabled={items.length === 0} loading={saving} onClick={save}>
              {saving ? th.h2.saving : th.h2.save}
            </Button>
          </div>
        </>
      }
    >
      <Field id="h2-menu" label={th.fields.menu} required mark={fieldMark(field)} onCheck={needsAmber(field) ? () => dispatch({ type: 'CONFIRM_FIELD', field: 'menu' }) : null}>
        {items.length === 0 ? (
          <p id="h2-menu" className="text-ink-muted">
            {th.h2.empty}
          </p>
        ) : (
          <ul id="h2-menu" className="divide-y divide-line rounded-xl bg-surface ring-1 ring-line">
            {items.map((item) => (
              <li key={item.name} className="flex min-h-14 items-center gap-3 pl-4">
                <span className="min-w-0 flex-1">{item.name}</span>
                <span className="font-bold">{formatTHB(item.priceTHB)}</span>
                <button type="button" onClick={() => dispatch({ type: 'REMOVE_MENU_ITEM', name: item.name })} aria-label={th.h2.remove(item.name)} className="flex size-12 shrink-0 cursor-pointer items-center justify-center text-ink-muted">
                  <X className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <form onSubmit={add} className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-base font-bold">
          {th.h2.dish}
          <input value={dish} onChange={(event) => setDish(event.target.value)} className={inputClass()} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-base font-bold">
          {th.h2.price}
          <input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))} className={inputClass()} />
        </label>
        <Button type="submit" variant="secondary" aria-label={th.h2.add} icon={<Plus className="size-6" aria-hidden />} className="px-3!" />
      </form>

      <ScanSheet
        open={scanning}
        doc="menu"
        onClose={() => setScanning(false)}
        onUse={(scan) => {
          // The paper menu fills the menu only: the shop's name and food type were settled at sign-up.
          const { menu } = scanToUpdates(scan)
          if (menu) dispatch({ type: 'FILL', updates: { menu }, at: Date.now() })
          setScanning(false)
        }}
      />
      <TalkSheet open={talking} onClose={() => setTalking(false)} question={th.h2.talkQuestion} transcript={transcript} mic={mic} onMic={toggleMic} onType={hear} />
    </StepShell>
  )
}
```

- [ ] **Step 4: H3 Hours**

`src/screens/home/H3Hours.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { SubmissionBlockedError, saveSetup } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import type { OpeningHours, Weekday } from '@/types/domain.ts'

const landmarks = getLandmarks()
const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
// Every half hour from 05:00 to 23:30, plus midnight.
const TIMES = [...Array.from({ length: 38 }, (_, index) => {
  const minutes = 5 * 60 + index * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}), '00:00']
const COMMANDS = [{ id: 'back' as const, phrases: SAY.back }]

/** H3 เวลาเปิด-ปิด: said, chosen from chips, or picked. Saved through the set-up guardrail. */
export function H3Hours() {
  const { state, dispatch } = useJourney()
  const field = state.profile.fields.hours
  const hours: OpeningHours = field.value ?? { open: '', close: '', closedDays: [] }
  const [talking, setTalking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const set = (change: Partial<OpeningHours>) =>
    dispatch({ type: 'FILL', updates: { hours: { value: { ...hours, ...change }, confidence: 1, heardFrom: TYPED } }, at: Date.now() })

  const { mic, transcript, notice, toggleMic, hear, onSpoken } = useVoiceInput(
    (text) => {
      if (matchCommand(text, COMMANDS) === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      const updates = extractProfile(text, { expecting: 'hours', landmarks })
      if (!updates.hours) return false
      dispatch({ type: 'FILL', updates: { hours: updates.hours }, at: Date.now() })
      return true
    },
    { autoListen: talking },
  )

  const save = async () => {
    setSaving(true)
    setProblem(null)
    try {
      await saveSetup('hours', state.profile)
      dispatch({ type: 'SETUP_SAVED', part: 'hours', profile: state.profile })
    } catch (caught) {
      if (!mounted.current) return
      setProblem(caught instanceof SubmissionBlockedError ? caught.failed[0].message : th.h3.apiError)
    }
    if (mounted.current) setSaving(false)
  }

  const mark = fieldMark(field)
  const check = needsAmber(field) ? () => dispatch({ type: 'CONFIRM_FIELD', field: 'hours' }) : null
  const timeOptions = TIMES.map((time) => ({ value: time, label: `${time} น.` }))

  return (
    <StepShell
      heading={th.h3.title}
      title={th.h3.title}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={problem ?? th.h3.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} action={{ kind: 'mic', label: th.h3.talk, onPress: () => setTalking(true) }} />
          <Button fullWidth disabled={!hours.open || !hours.close} loading={saving} onClick={save}>
            {saving ? th.h3.saving : th.h3.save}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field id="h3-open" label={th.h3.open} required mark={mark} onCheck={check}>
          <Select id="h3-open" value={hours.open} placeholder={th.h3.timePlaceholder} options={timeOptions} onChange={(open) => set({ open })} />
        </Field>
        <Field id="h3-close" label={th.h3.close} required mark={mark}>
          <Select id="h3-close" value={hours.close} placeholder={th.h3.timePlaceholder} options={timeOptions} onChange={(close) => set({ close })} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-bold">{th.h3.closedDays}</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const closed = hours.closedDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={closed}
                onClick={() => set({ closedDays: closed ? hours.closedDays.filter((d) => d !== day) : [...hours.closedDays, day] })}
                className={`min-h-12 min-w-12 cursor-pointer rounded-full px-3 font-bold ring-1 ${closed ? 'bg-action text-white ring-action' : 'bg-surface ring-line'}`}
              >
                {th.h3.days[day]}
              </button>
            )
          })}
        </div>
      </fieldset>
      <TalkSheet
        open={talking}
        onClose={() => setTalking(false)}
        question={th.h3.helper}
        chips={[th.chips.hoursFullDay, th.chips.hoursMorning].map((label) => ({ label, onPress: () => hear(label) }))}
        transcript={transcript}
        mic={mic}
        onMic={toggleMic}
        onType={hear}
      />
    </StepShell>
  )
}
```

- [ ] **Step 5: Final App switch**

Replace the body of `ScreenSwitch` in `src/App.tsx` so every screen has a case. Add the imports `H1Home`, `H2Menu` and `H3Hours` from `@/screens/home/…`; the signup screens are already imported from earlier tasks. Then delete `NotBuiltYet` and the `default` branch:

```tsx
function ScreenSwitch() {
  const { state } = useJourney()
  switch (state.screen) {
    case 'G0_WELCOME':
      return <G0Welcome />
    case 'L1_LOGIN':
      return <L1Login key={state.runId} />
    case 'S1_SERVICE':
      return <S1Service />
    case 'S2_ACCOUNT':
      return <S2Account key={state.runId} />
    case 'S2_PHONE':
      return <S2Phone key={state.runId} />
    case 'S3_BUSINESS':
      return <S3Business key={state.runId} />
    case 'S4_SHOP':
      return <S4Shop />
    case 'S5_OWNER':
      return <S5Owner key={state.runId} />
    case 'S6_BANK':
      return <S6Bank key={state.runId} />
    case 'S7_CONFIRM':
      return <S7Confirm />
    case 'H1_HOME':
      return <H1Home />
    case 'H2_MENU':
      return <H2Menu key={state.runId} />
    case 'H3_HOURS':
      return <H3Hours key={state.runId} />
    case 'TRANSITION':
      return <ActTransition />
    case 'G1_DASHBOARD':
      return <DashboardScreen />
  }
}
```

- [ ] **Step 6: Check and commit**

```bash
grep -n "NotBuiltYet" src/App.tsx || echo clean
npm test && npm run build && npm run lint
git add -A src
git commit -m "Add Home with the set-up card, and the add-menu and opening-hours screens"
```

---

### Task 14: Presenter tools, README, copy cleanup

**Files:**
- Modify: `src/app/demo/DemoPanel.tsx`, `README.md`, `src/copy/th.ts`, `src/architecture.test.ts`
- Delete: any file under `src/` that nothing imports any more (check with the command below).

**Interfaces:**
- **Consumes:** everything.
- **Produces:** the finished prototype.

- [ ] **Step 1: Trust test sees the new screens**

In `src/architecture.test.ts`, in `'sees the source tree'`, add:

```ts
    expect(Object.keys(sources)).toContain('/src/screens/signup/S7Confirm.tsx')
    expect(Object.keys(sources)).toContain('/src/screens/home/H2Menu.tsx')
```

- [ ] **Step 2: Remove unused copy and files**

List the top-level `th` sections and how often each is used outside `th.ts`:

```bash
for s in $(grep -oE "^  [a-zA-Z0-9_]+: \{" src/copy/th.ts | sed -E 's/^  ([a-zA-Z0-9_]+).*/\1/'); do printf "%s %s\n" "$s" "$(grep -rn "th\.$s\b" src --include=*.ts --include=*.tsx | grep -v "src/copy/th.ts" | wc -l)"; done
```

- Delete every section with count 0.
- Inside kept sections (`account`, `review`, `onboarding`, `store`, `followUp`, `chips`, `scan`), delete keys that a `grep -rn "th\.<section>\.<key>"` shows are unused.
- `CHECK_THRESHOLD`, `th.scan.*` used by `components/scan`, and `th.followUp.*` used by `followUp.ts` stay.

Find files no one imports. `main.tsx`, test files and `App.tsx` are expected entry points:

```bash
for f in $(git ls-files 'src/**/*.ts' 'src/**/*.tsx' | grep -v '\.test\.' | grep -v 'src/main.tsx'); do base=$(basename "$f" | sed -E 's/\.(tsx?|json)$//'); n=$(grep -rln "/$base\.\(ts\|tsx\)'" src | grep -v "^$f$" | wc -l); [ "$n" = 0 ] && echo "unused: $f"; done
```

Delete each unused file the command lists, except `src/App.tsx`. Expected candidates:
- `src/components/shell/OnboardingShell.tsx`, only if `DashboardScreen` no longer uses it. Otherwise keep it.
- `src/app/demo/demoBus.ts`, which must stay, because `useVoiceInput` imports it.
Re-run the command until it lists only `src/App.tsx`, or nothing.

- [ ] **Step 3: README demo steps**

In `README.md`, under "### Presenting the demo", replace the bullets from "**Register" down to the line before "จำลองระบบล่ม" with:

```markdown
- **The demo follows GrabMerchant's real sign-up** (merchant.grab.com guide "ขั้นตอนสมัครเป็นพาร์ทเนอร์ร้านค้า GrabFood บนแอป GrabMerchant"), with the AI helper bar above the green button on every step.
- **Register:** หน้าแรก → **ลงทะเบียน** → 1/7 GrabFood → 2/7 type any email and password → phone: tap "ใช้เบอร์ … ในเครื่องนี้" → **ส่งรหัส OTP** (the companion fills 123456 from the mock SMS) → **ต่อไป**.
- **3/7:** tap 🎤 and play "บรรทัด 1" from the panel (or speak it). Name, street, pin, address and food type fill in; tap **หมุดถูกแล้ว** and ✓ any amber box → **ต่อไป**.
- **4/7:** tap "ใช้ธุรกิจส่วนตัว" → **ต่อไป**. **5/7:** tap 📷 → **ถ่ายรูป** → **ใช้รูปนี้** → **ต่อไป**. **6/7:** same with the bank book (the photo is attached) → **ต่อไป**.
- **7/7:** read the summary (**ฟังสรุป** reads it aloud, numbers by their last 4 digits), tick both boxes yourself → **ส่งใบสมัคร**. Voice cannot tick or send.
- **Home:** "อยู่ระหว่างตรวจสอบ" → **เพิ่มเมนู** (📷 paper menu: one price comes back amber, ✓ it; or play "บรรทัด 3") → **บันทึกเมนู** → **ตั้งเวลาเปิด-ปิด** (play "บรรทัด 2" or tap a chip) → **บันทึก** → **ดูต่อ: 30 วันต่อมา**.
- **เข้าสู่ระบบ** goes straight to Home with the sample shop submitted. The panel's "(ข้อมูลตัวอย่าง)" jumps load the sample merchant.
- All documents and numbers are fictional samples stamped "ตัวอย่าง". An uploaded photo stays in the browser.
```

- [ ] **Step 4: Check and commit**

```bash
npm test && npm run build && npm run lint
git add -A src README.md
git commit -m "Point the presenter panel and README at the GrabMerchant flow and drop unused copy and files"
```

- [ ] **Step 5: Browser check (controller, not a subagent)**

Use the dev server at `http://localhost:5173`: reuse it if it is running, or start it with the `web` launch config. Check at 390×844 and at 1366×768:
1. Register end to end: G0 → 1/7 … 7/7 → Home → menu (scan) → hours (chip) → Transition.
2. 3/7 typed only: place search → pin ✓.
3. 6/7 with an account name typed to differ from 5/7: ต่อไป is disabled with the name error.
4. 7/7: ส่งใบสมัคร is disabled until both boxes are ticked; saying "ส่ง" gets the must-tap reply.
5. Log in → Home.
6. Header "ขั้นตอนที่ N จาก 7" and the progress strip on every step; nothing overflows horizontally at 390px.
