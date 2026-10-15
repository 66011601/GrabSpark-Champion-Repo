# Plan D1 — Understanding new sentences, and asking back — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a screen's rules do not understand a sentence, a matcher learned from a 3,000-sentence bank (four regions) picks what the merchant most likely meant. The companion acts if it is sure, asks back "หมายถึง … ใช่ไหมคะ" if unsure, and offers two buttons if lost.

**Architecture:**
- `src/ai/understanding/` is pure: character n-gram TF-IDF with a k-nearest vote, a label registry, and the sentence bank, which loads lazily.
- `useVoiceInput` runs the matcher only after the rules return `false`.
- A label is performed by replaying its canonical phrase through the screen's own `interpret`, so screens change by one option.
- A pure decision function (`understandingStep.ts`) holds the ask-back logic.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Vitest 5, oxlint. No new dependencies.

**Spec:** `docs/specs/2026-10-15-understanding-design.md`

## Global Constraints

- **Code style:** no semicolons, single quotes, `.ts`/`.tsx` extensions in imports, `@/` alias. Short doc comment on exports; comments say *why*.
- **Every task ends green:** `npm test`, `npm run lint` (0 warnings) and `npm run build` pass.
- **oxlint:**
  - no component file may also export non-components;
  - no synchronous state setter in an effect body;
  - `react-hooks/exhaustive-deps` is on.
- **Purity:** `src/ai/**` must not import React. `src/ai/understanding/**` imports no write API.
- **Rules first:** the matcher runs only when the screen's rules returned `false`. Nothing that works today may change.
- **Blocked labels are never acted on:** `submit`, `consentTick`, `act2:confirm`. The reply is the existing tap-only line (`th.s7.mustTap`, `th.act2.confirm.byTap`).
- **The matcher never fills a value.** `topic:*` replies with the field's follow-up question.
- **Act 2:** `src/screens/act2-grow/1-dashboard/DashboardScreen.tsx` gets only the `understanding` option and `choices` (Task 4). Nothing else under `src/ai/navigator/**` or `src/screens/act2-grow/**` is edited.
- **Copy:** on-screen and spoken text lives in `src/copy/th.ts`. The companion speaks as หนู…ค่ะ, central Thai. Touch targets are ≥ 48px.
- **Commits:** after each task, commit with the attribution trailer the harness gives (default `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), then `git push` (branch `understanding`).

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/ai/understanding/features.ts` | create | Prepare text; character n-grams |
| `src/ai/understanding/matcher.ts` | create | TF-IDF index, k-nearest vote, levels |
| `src/ai/understanding/labels.ts` | create | Screens, allowed labels, blocked labels, canonical phrases |
| `src/ai/understanding/labelNames.ts` | create | Readable name per label (for ask-back and buttons) |
| `src/ai/understanding/bank/types.ts` | create | `BankEntry`, `ScreenId` |
| `src/ai/understanding/bank/fromCorpus.ts` | create | The 430 corpus sentences as bank entries |
| `src/ai/understanding/bank/signup.ts`, `home.ts`, `act2.ts`, `none.ts` | create | Hand-written sentences |
| `src/ai/understanding/bank/templates.ts` | create | Slot templates (≤ 30%) |
| `src/ai/understanding/bank/index.ts` | create | `BANK`, held-out split |
| `src/ai/understanding/load.ts` | create | Lazy bank load, cached index per screen, `matchOn` |
| `src/components/assistant/understandingStep.ts` | create | Pure decision: act / blocked / ask / lost, yes-no answers |
| `src/components/assistant/useVoiceInput.ts` | modify | Run the matcher after rules; ask-back; `choices` |
| `src/components/grab/AiHelperBar.tsx` | modify | `choices` chips |
| Listening screens (Act 1, Home, Act 2 dashboard) | modify | `understanding: { screen }` and `choices` |
| `src/copy/th.ts` | modify | `understanding` section |
| `README.md` | modify | Held-out metrics table |

---

### Task 1: The matcher core

**Files:**
- Create: `src/ai/understanding/features.ts`, `src/ai/understanding/matcher.ts`
- Test: `src/ai/understanding/matcher.test.ts`

**Interfaces:**
- **Produces:**
  - `prepare(text: string): string`: particles stripped, lower-case, no spaces; **no** dialect conversion, because callers pass text that is already understood.
  - `learnable(say: string): string`: `prepare(understandThai(say).text)`, for bank sentences.
  - `ngrams(text: string): Map<string, number>`: counts of n-grams for n = 2..4; text shorter than 2 gives itself as one gram.
  - `interface Example { text: string; label: string }`: `text` is already `learnable`.
  - `interface MatchIndex`.
  - `buildIndex(examples: Example[]): MatchIndex`.
  - `interface Match { label: string; score: number; margin: number; ranked: string[] }`.
  - `classify(index: MatchIndex, understood: string, k?: number): Match`.
  - `type Level = 'sure' | 'unsure' | 'lost'`.
  - `levelOf(match: Match): Level`.
  - The constants `SURE_SCORE = 0.75`, `SURE_MARGIN = 0.3`, `ASK_SCORE = 0.45`, `K = 5`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { learnable, ngrams, prepare } from './features.ts'
import { ASK_SCORE, buildIndex, classify, levelOf, SURE_MARGIN, SURE_SCORE } from './matcher.ts'

const examples = [
  { text: learnable('ขอดูยอดขายหน่อย'), label: 'intent:sales' },
  { text: learnable('วันนี้ขายได้เท่าไหร่คะ'), label: 'intent:sales' },
  { text: learnable('ยอดขายเป็นยังไงบ้าง'), label: 'intent:sales' },
  { text: learnable('ลูกค้าบ่นอะไรบ้าง'), label: 'intent:feedback' },
  { text: learnable('มีรีวิวไม่ดีไหม'), label: 'intent:feedback' },
  { text: learnable('อากาศร้อนจังเลยวันนี้'), label: 'none' },
  { text: learnable('อืม'), label: 'none' },
]
const index = buildIndex(examples)

describe('features', () => {
  it('prepares understood text: no particles, no spaces, lower case', () => {
    expect(prepare('ต่อไป เลย ค่ะ')).toBe('ต่อไปเลย')
    expect(prepare('GrabFood ค่ะ')).toBe('grabfood')
  })

  it('learns bank sentences through the language layer', () => {
    expect(learnable('เบิ่งยอดขายแหน่')).toBe('ดูยอดขายหน่อย')
  })

  it('counts 2- to 4-character grams', () => {
    const grams = ngrams('ขาย')
    expect(grams.get('ขา')).toBe(1)
    expect(grams.get('ขาย')).toBe(1)
    expect(ngrams('ก').get('ก')).toBe(1)
  })
})

describe('classify', () => {
  it('finds the label of a sentence it has never seen', () => {
    const match = classify(index, prepare('อยากรู้ยอดขายวันนี้'))
    expect(match.label).toBe('intent:sales')
    expect(match.ranked[0]).toBe('intent:sales')
  })

  it('gives an exact training sentence a top score', () => {
    expect(classify(index, prepare('ลูกค้าบ่นอะไรบ้าง')).score).toBeGreaterThan(0.99)
  })

  it('says none with score 0 for text with nothing in common', () => {
    expect(classify(index, prepare('qqqq'))).toMatchObject({ label: 'none', score: 0 })
  })
})

describe('levelOf', () => {
  it('is sure only with a high score and a clear lead', () => {
    expect(levelOf({ label: 'intent:sales', score: SURE_SCORE, margin: SURE_MARGIN, ranked: [] })).toBe('sure')
    expect(levelOf({ label: 'intent:sales', score: SURE_SCORE, margin: 0.1, ranked: [] })).toBe('unsure')
    expect(levelOf({ label: 'intent:sales', score: ASK_SCORE, margin: 1, ranked: [] })).toBe('unsure')
    expect(levelOf({ label: 'intent:sales', score: ASK_SCORE - 0.01, margin: 1, ranked: [] })).toBe('lost')
    expect(levelOf({ label: 'none', score: 1, margin: 1, ranked: [] })).toBe('lost')
  })
})
```

Run: `npx vitest run src/ai/understanding/matcher.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 2: `features.ts`**

```ts
import { understandThai } from '@/ai/language/understand.ts'
import { stripParticles } from '@/ai/onboarding/parsers/particles.ts'

const N_MIN = 2
const N_MAX = 4

/** Understood text as the matcher compares it: no particles, lower case, no spaces (Thai has none between words anyway). */
export const prepare = (text: string): string => stripParticles(text).toLowerCase().replace(/\s+/g, '')

/** A bank sentence, in any region's words, as the matcher learns it: through the same language layer as speech. */
export const learnable = (say: string): string => prepare(understandThai(say).text)

/** Counts of every 2- to 4-character piece. Character pieces need no word breaker and survive small misspellings. */
export function ngrams(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  if (text.length < N_MIN) {
    if (text) counts.set(text, 1)
    return counts
  }
  for (let size = N_MIN; size <= N_MAX; size += 1) {
    for (let start = 0; start + size <= text.length; start += 1) {
      const gram = text.slice(start, start + size)
      counts.set(gram, (counts.get(gram) ?? 0) + 1)
    }
  }
  return counts
}
```

- [ ] **Step 3: `matcher.ts`**

```ts
import { ngrams } from './features.ts'

/** A training sentence (already `learnable`) and what it means. */
export interface Example {
  text: string
  label: string
}

interface Vector {
  label: string
  weights: Map<string, number>
  norm: number
}

export interface MatchIndex {
  idf: Map<string, number>
  vectors: Vector[]
}

/** The best label, how close the closest sentence was (cosine 0–1), and how clearly it beat the runner-up. */
export interface Match {
  label: string
  score: number
  margin: number // the best label's share of the vote minus the runner-up's (0–1)
  ranked: string[] // labels by vote, best first
}

export type Level = 'sure' | 'unsure' | 'lost'

// Initial values from the spec; Task 7 calibrates them on the held-out sentences and updates these lines.
export const SURE_SCORE = 0.75
export const SURE_MARGIN = 0.3
export const ASK_SCORE = 0.45
export const K = 5

function weigh(counts: Map<string, number>, idf: Map<string, number>, label: string): Vector {
  const weights = new Map<string, number>()
  let sum = 0
  for (const [gram, count] of counts) {
    const rarity = idf.get(gram)
    if (rarity === undefined) continue // a piece no training sentence has cannot make two sentences alike
    const weight = (1 + Math.log(count)) * rarity
    weights.set(gram, weight)
    sum += weight * weight
  }
  return { label, weights, norm: Math.sqrt(sum) }
}

/** TF-IDF vectors of the training sentences. Rare pieces weigh more than ones every sentence has. */
export function buildIndex(examples: Example[]): MatchIndex {
  const counted = examples.map((example) => ({ label: example.label, counts: ngrams(example.text) }))
  const seenIn = new Map<string, number>()
  for (const { counts } of counted) for (const gram of counts.keys()) seenIn.set(gram, (seenIn.get(gram) ?? 0) + 1)
  const total = counted.length
  const idf = new Map([...seenIn].map(([gram, docs]) => [gram, Math.log((1 + total) / (1 + docs)) + 1]))
  return { idf, vectors: counted.map(({ label, counts }) => weigh(counts, idf, label)) }
}

function cosine(a: Vector, b: Vector): number {
  if (a.norm === 0 || b.norm === 0) return 0
  const [small, large] = a.weights.size <= b.weights.size ? [a, b] : [b, a]
  let dot = 0
  for (const [gram, weight] of small.weights) dot += weight * (large.weights.get(gram) ?? 0)
  return dot / (a.norm * b.norm)
}

/** What an understood sentence most likely means: the k closest training sentences vote, weighted by closeness. */
export function classify(index: MatchIndex, understood: string, k = K): Match {
  const query = weigh(ngrams(understood), index.idf, '')
  const nearest = index.vectors
    .map((vector) => ({ label: vector.label, similarity: cosine(query, vector) }))
    .filter((near) => near.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
  if (nearest.length === 0) return { label: 'none', score: 0, margin: 0, ranked: [] }
  const votes = new Map<string, number>()
  for (const near of nearest) votes.set(near.label, (votes.get(near.label) ?? 0) + near.similarity)
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label)
  const total = [...votes.values()].reduce((sum, vote) => sum + vote, 0)
  const best = ranked[0]
  const second = ranked[1] ? votes.get(ranked[1])! : 0
  const score = Math.max(...nearest.filter((near) => near.label === best).map((near) => near.similarity))
  return { label: best, score, margin: (votes.get(best)! - second) / total, ranked }
}

/** sure: act; unsure: ask back; lost: offer buttons. "none" is always lost. */
export function levelOf(match: Match): Level {
  if (match.label === 'none' || match.score < ASK_SCORE) return 'lost'
  return match.score >= SURE_SCORE && match.margin >= SURE_MARGIN ? 'sure' : 'unsure'
}
```

- [ ] **Step 4: Run, then the whole suite; Step 5: Commit and push**

`npx vitest run src/ai/understanding` → PASS; `npm test && npm run lint && npm run build`.

```bash
git add src/ai/understanding
git commit -m "Matcher: character n-gram TF-IDF with a k-nearest vote, and sure / unsure / lost levels"
git push
```

(Append the attribution trailer.)

---

### Task 2: Labels, the bank format, the corpus converted, the held-out split

**Files:**
- Create: `src/ai/understanding/labels.ts`, `src/ai/understanding/labelNames.ts`, `src/ai/understanding/bank/types.ts`, `src/ai/understanding/bank/fromCorpus.ts`, `src/ai/understanding/bank/index.ts`
- Test: `src/ai/understanding/labels.test.ts`, `src/ai/understanding/bank/bank.test.ts`
- Modify: `src/copy/th.ts` (`understanding` section)

**Interfaces:**
- **Consumes:**
  - `SAY` from `@/ai/commands/phrases.ts`
  - `SCREEN_COMMANDS` from `@/ai/language/corpus/screens.ts`
  - `SIGNUP`, `HOME`, `ACT2` from `@/ai/language/corpus/*.ts`
  - Act 2 registries, read only: `GRID`, `VERBS` (`@/ai/navigator/openPage.ts`), `BUTTONS` (`@/ai/navigator/buttons.ts`), `SCRIPTS` (`@/ai/navigator/scripts.ts`), `CONTROLS` (`@/ai/navigator/matchIntent.ts`)
- **Produces:**
  - `type ScreenId = 'G0' | 'S1' | 'S2_ACCOUNT' | 'S2_PHONE' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'H1' | 'H2' | 'H3' | 'ACT2'`
  - `interface BankEntry { say: string; region: 'central' | 'isan' | 'north' | 'south'; screens: ScreenId[] | 'any'; label: string; source: 'written' | 'template' }`
  - `SCREEN_LABELS: Record<ScreenId, string[]>` (excluding `none`)
  - `BLOCKED: ReadonlySet<string>`
  - `canonicalPhrase(label: string): string | null` (null for `topic:*`, `task:*` and `none`)
  - `topicQuestion(label: string): string | null`
  - `blockedReply(label: string): string | null`
  - `labelName(label: string): string`
  - `FROM_CORPUS: BankEntry[]`
  - `BANK: BankEntry[]`
  - `isHeldOut(entry: BankEntry): boolean`
  - `trainingFor(screen: ScreenId): BankEntry[]`
  - `heldOutFor(screen: ScreenId): BankEntry[]`

- [ ] **Step 1: Labels**

`src/ai/understanding/bank/types.ts`:

```ts
import type { Said } from '@/ai/language/corpus/types.ts'

/** Every screen that listens. ACT2 is the GrabMerchant home after "30 วันต่อมา…". */
export type ScreenId = 'G0' | 'S1' | 'S2_ACCOUNT' | 'S2_PHONE' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'H1' | 'H2' | 'H3' | 'ACT2'

/** One sentence the matcher learns from: what a merchant said, where, and what they meant. */
export interface BankEntry {
  say: string
  region: Said
  screens: ScreenId[] | 'any' // 'any' for labels that mean the same everywhere (next, back, none)
  label: string
  source: 'written' | 'template'
}
```

`src/ai/understanding/labels.ts`:

```ts
import { SAY } from '@/ai/commands/phrases.ts'
import { SCREEN_COMMANDS } from '@/ai/language/corpus/screens.ts'
import { BUTTONS } from '@/ai/navigator/buttons.ts'
import { CONTROLS } from '@/ai/navigator/matchIntent.ts'
import { GRID } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { th } from '@/copy/th.ts'
import type { ScreenId } from './bank/types.ts'

const TOPICS_S3 = ['topic:storeName', 'topic:location', 'topic:category', 'topic:building', 'topic:address']
const ACT2_LABELS = [
  ...SCRIPTS.map((script) => `intent:${script.id}`),
  ...CONTROLS.map((control) => `control:${control.id}`),
  ...GRID.map((item) => `open:${item.id}`),
  ...BUTTONS.map((button) => `button:${button.id}`),
  'act2:confirm',
]

/** What each screen's matcher may answer (besides "none"): its own voice commands, field topics, Act 2 routes. */
export const SCREEN_LABELS: Record<ScreenId, string[]> = {
  G0: [...SCREEN_COMMANDS.G0],
  S1: [...SCREEN_COMMANDS.S1],
  S2_ACCOUNT: [...SCREEN_COMMANDS.S2_ACCOUNT],
  S2_PHONE: [...SCREEN_COMMANDS.S2_PHONE],
  S3: [...SCREEN_COMMANDS.S3, ...TOPICS_S3],
  S4: [...SCREEN_COMMANDS.S4],
  S5: [...SCREEN_COMMANDS.S5],
  S6: [...SCREEN_COMMANDS.S6],
  S7: [...SCREEN_COMMANDS.S7],
  H1: ['task:menu', 'task:hours'],
  H2: [...SCREEN_COMMANDS.H2, 'topic:menu'],
  H3: [...SCREEN_COMMANDS.H3, 'topic:hours'],
  ACT2: ACT2_LABELS,
}

/** Learned so they are not mistaken for other labels, but only the merchant's own tap may do them. */
export const BLOCKED: ReadonlySet<string> = new Set(['submit', 'consentTick', 'act2:confirm'])

/** The sentence that performs a label through the screen's own rules; null when there is none (topics, tasks, none). */
export function canonicalPhrase(label: string): string | null {
  if (label in SAY) return SAY[label as keyof typeof SAY][0]
  const [kind, id] = label.split(':')
  if (kind === 'intent') return SCRIPTS.find((script) => script.id === id)?.phrases[0] ?? null
  if (kind === 'control') return CONTROLS.find((control) => control.id === id)?.phrases[0] ?? null
  if (kind === 'open') {
    const item = GRID.find((entry) => entry.id === id)
    return item ? `เปิด${item.label}` : null
  }
  if (kind === 'button') return BUTTONS.find((button) => button.id === id)?.names[0] ?? null
  return null
}

const TOPIC_QUESTIONS: Record<string, string> = {
  'topic:storeName': th.followUp.storeName,
  'topic:location': th.followUp.location,
  'topic:category': th.followUp.category,
  'topic:building': th.followUp.building,
  'topic:address': th.understanding.askAddress,
  'topic:menu': th.followUp.menu,
  'topic:hours': th.followUp.hours,
}

/** The follow-up question for a field topic: the matcher never fills a value, it asks for it. */
export const topicQuestion = (label: string): string | null => TOPIC_QUESTIONS[label] ?? null

/** The tap-only line for a blocked label, or null when the label is not blocked. */
export function blockedReply(label: string): string | null {
  if (!BLOCKED.has(label)) return null
  return label === 'act2:confirm' ? th.act2.confirm.byTap : th.s7.mustTap
}
```

`src/ai/understanding/labelNames.ts`:

```ts
import { BUTTONS } from '@/ai/navigator/buttons.ts'
import { GRID } from '@/ai/navigator/openPage.ts'
import { th } from '@/copy/th.ts'

/** How the companion names a label in "หมายถึง … ใช่ไหมคะ" and on its buttons. */
export function labelName(label: string): string {
  const names: Record<string, string> = th.understanding.names
  if (names[label]) return names[label]
  const [kind, id] = label.split(':')
  if (kind === 'open') return th.understanding.openPage(GRID.find((item) => item.id === id)?.label ?? id)
  if (kind === 'button') return BUTTONS.find((button) => button.id === id)?.label ?? id
  return label
}
```

`src/copy/th.ts`, add at the top level:

```ts
  // Asking back when the companion is not sure (spec 2026-10-15-understanding-design).
  understanding: {
    ask: (what: string) => `หมายถึง${what}ใช่ไหมคะ?`,
    unsure: 'หนูยังไม่แน่ใจค่ะ เลือกจากปุ่มนี้ หรือพูดใหม่อีกทีนะคะ',
    declined: 'ขอโทษค่ะ งั้นเลือกจากปุ่มนี้ หรือพูดใหม่อีกทีนะคะ',
    yes: 'ใช่',
    no: 'ไม่ใช่',
    askAddress: 'ที่อยู่ร้านค้าคืออะไรคะ? พิมพ์หรือพูดรหัสไปรษณีย์ก็ได้',
    openPage: (page: string) => `เปิดหน้า${page}`,
    names: {
      register: 'ลงทะเบียน',
      login: 'เข้าสู่ระบบ',
      food: 'สมัคร GrabFood',
      mart: 'สมัคร GrabMart',
      next: 'ไปหน้าต่อไป',
      back: 'ย้อนกลับ',
      yes: 'ใช้เบอร์นี้',
      personal: 'ธุรกิจส่วนตัว',
      company: 'นิติบุคคล',
      shoot: 'ถ่ายรูป',
      here: 'ใช้ตำแหน่งตอนนี้',
      pin: 'ปักหมุดบนแผนที่',
      typeInstead: 'พิมพ์แทน',
      listenSummary: 'ฟังสรุป',
      submit: 'ส่งใบสมัคร',
      consentTick: 'ติ๊กยอมรับ',
      'topic:storeName': 'บอกชื่อร้าน',
      'topic:location': 'บอกที่ตั้งร้าน',
      'topic:category': 'บอกประเภทอาหาร',
      'topic:building': 'บอกอาคารหรือถนน',
      'topic:address': 'บอกที่อยู่ร้าน',
      'topic:menu': 'เพิ่มเมนู',
      'topic:hours': 'ตั้งเวลาเปิด-ปิด',
      'task:menu': 'ไปเพิ่มเมนู',
      'task:hours': 'ไปตั้งเวลาเปิด-ปิด',
      'intent:sales': 'ดูยอดขาย',
      'intent:forecast': 'ดูพยากรณ์ออเดอร์',
      'intent:promo': 'ทำโปรโมชัน',
      'intent:soldOut': 'ปิดเมนูที่หมด',
      'intent:feedback': 'ดูรีวิวลูกค้า',
      'control:home': 'กลับหน้าหลัก',
      'control:back': 'ย้อนกลับ',
      'control:stop': 'หยุด',
      'act2:confirm': 'ยืนยัน',
    } as Record<string, string>,
  },
```

- [ ] **Step 2: Failing tests for labels**

`src/ai/understanding/labels.test.ts` checks the property everything else relies on: **every canonical phrase routes back to its own label through the real rules.**

```ts
import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { SCREEN_COMMANDS } from '@/ai/language/corpus/screens.ts'
import { matchButton } from '@/ai/navigator/buttons.ts'
import { asksToConfirm, CONTROLS, matchIntent } from '@/ai/navigator/matchIntent.ts'
import { matchOpen } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { understandThai } from '@/ai/language/understand.ts'
import type { ScreenId } from './bank/types.ts'
import { BLOCKED, blockedReply, canonicalPhrase, SCREEN_LABELS, topicQuestion } from './labels.ts'
import { labelName } from './labelNames.ts'

// The same order DashboardScreen checks a sentence in (see src/ai/language/corpus/corpus.test.ts).
function act2Route(text: string): string | null {
  if (asksToConfirm(text)) return 'act2:confirm'
  const control = matchCommand(text, CONTROLS)
  if (control) return `control:${control}`
  const page = matchOpen(text)
  if (page) return `open:${page}`
  const button = matchButton(text)
  if (button) return `button:${button}`
  const intent = matchIntent(text, SCRIPTS)
  return intent ? `intent:${intent}` : null
}

describe('labels', () => {
  it('replays every command label through its own screen’s rules', () => {
    for (const [screen, keys] of Object.entries(SCREEN_COMMANDS)) {
      for (const key of keys) {
        const phrase = understandThai(canonicalPhrase(key)!).text
        expect(matchCommand(phrase, keys.map((id) => ({ id, phrases: SAY[id] }))), `${screen} ${key}`).toBe(key)
      }
    }
  })

  it('replays every Act 2 label through Act 2’s rules', () => {
    for (const label of SCREEN_LABELS.ACT2.filter((entry) => entry !== 'act2:confirm')) {
      expect(act2Route(understandThai(canonicalPhrase(label)!).text), label).toBe(label)
    }
  })

  it('asks a question for every topic and names every label', () => {
    for (const labels of Object.values(SCREEN_LABELS)) {
      for (const label of labels) {
        if (label.startsWith('topic:')) expect(topicQuestion(label), label).toBeTruthy()
        expect(labelName(label), label).not.toBe(label)
      }
    }
  })

  it('blocks only the tap-only labels, each with its tap-only line', () => {
    expect([...BLOCKED].sort()).toEqual(['act2:confirm', 'consentTick', 'submit'])
    for (const label of BLOCKED) expect(blockedReply(label)).toBeTruthy()
    expect(blockedReply('next')).toBeNull()
  })

  it('gives every screen at least two labels', () => {
    for (const screen of Object.keys(SCREEN_LABELS) as ScreenId[]) expect(SCREEN_LABELS[screen].length, screen).toBeGreaterThanOrEqual(2)
  })
})
```

Run: `npx vitest run src/ai/understanding/labels.test.ts` → FAIL, then implement Step 1's files until it passes.
- **A canonical phrase that does not route back to its label** (for example, a button's first name taken by a script phrase): change `canonicalPhrase` to use the label's next name or phrase that does route, and comment why. **Never** edit Act 2 files.
- **A label that has no routing phrase at all:** report it.

- [ ] **Step 3: The corpus as bank entries, and the split**

`src/ai/understanding/bank/fromCorpus.ts` converts the 430 corpus sentences. The mapping:

| Corpus `expect` | Bank entry |
|---|---|
| `{ screen, command: key }` | `label: key`, `screens: [screen]` |
| `{ screen, command: null }` | skipped (shop talk the parsers handle) |
| `{ step, fields }` with exactly one field set | `label: 'topic:<field>'` (`locationStartsWith` → `location`, `addressIncludes` → `address`, `buildingIncludes` → `building`, `storeName`, `category`, `hours`, `menu`), `screens: [step]` |
| `{ step, fields }` with two or more fields | skipped (it names several topics at once) |
| `{ act2: 'confirm' }` | `label: 'act2:confirm'`, `screens: ['ACT2']` |
| `{ act2: route }` | `label: route`, `screens: ['ACT2']` |
| `{ act2: null }` | `label: 'none'`, `screens: ['ACT2']` |
| `{ masked }` | skipped |

Every converted entry has `source: 'written'` and the corpus `region`. Entries marked `knownGap` are converted too (the matcher may rescue them).

```ts
import { ACT2 } from '@/ai/language/corpus/act2.ts'
import { HOME } from '@/ai/language/corpus/home.ts'
import { SIGNUP } from '@/ai/language/corpus/signup.ts'
import type { FieldExpect, Utterance } from '@/ai/language/corpus/types.ts'
import type { BankEntry, ScreenId } from './types.ts'

const FIELD_TOPIC: Record<keyof FieldExpect, string> = {
  storeName: 'topic:storeName',
  category: 'topic:category',
  locationStartsWith: 'topic:location',
  addressIncludes: 'topic:address',
  buildingIncludes: 'topic:building',
  hours: 'topic:hours',
  menu: 'topic:menu',
}

function toEntry(utterance: Utterance): BankEntry | null {
  const base = { say: utterance.say, region: utterance.region, source: 'written' as const }
  const expected = utterance.expect
  if ('command' in expected) return expected.command ? { ...base, screens: [expected.screen as ScreenId], label: expected.command } : null
  if ('fields' in expected) {
    const named = Object.keys(expected.fields) as (keyof FieldExpect)[]
    return named.length === 1 ? { ...base, screens: [expected.step as ScreenId], label: FIELD_TOPIC[named[0]] } : null
  }
  if ('act2' in expected) {
    const label = expected.act2 === null ? 'none' : expected.act2 === 'confirm' ? 'act2:confirm' : expected.act2
    return { ...base, screens: ['ACT2'], label }
  }
  return null
}

/** The language layer's tested sentences, reused as training data (spec D1 §5). */
export const FROM_CORPUS: BankEntry[] = [...SIGNUP, ...HOME, ...ACT2].map(toEntry).filter((entry): entry is BankEntry => entry !== null)
```

`src/ai/understanding/bank/index.ts`. Tasks 5–7 add their files to `BANK`:

```ts
import { SCREEN_LABELS } from '../labels.ts'
import { FROM_CORPUS } from './fromCorpus.ts'
import type { BankEntry, ScreenId } from './types.ts'

export const BANK: BankEntry[] = [...FROM_CORPUS]

// FNV-1a: a stable hash, so the same sentence is always in the same half.
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

/** One written sentence in five is kept out of training, to measure how well unseen speech is understood. */
export const isHeldOut = (entry: BankEntry): boolean => entry.source === 'written' && hash(entry.say) % 5 === 0

const onScreen = (entry: BankEntry, screen: ScreenId) =>
  (entry.screens === 'any' || entry.screens.includes(screen)) && (entry.label === 'none' || SCREEN_LABELS[screen].includes(entry.label))

export const trainingFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && !isHeldOut(entry))
export const heldOutFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && isHeldOut(entry))
```

- [ ] **Step 4: Bank structure tests**

`src/ai/understanding/bank/bank.test.ts`. Task 7 adds the size and metric gates.

```ts
import { describe, expect, it } from 'vitest'
import { SCREEN_LABELS } from '../labels.ts'
import { BANK, heldOutFor, isHeldOut, trainingFor } from './index.ts'
import type { ScreenId } from './types.ts'

const ALL_LABELS = new Set(['none', ...Object.values(SCREEN_LABELS).flat()])
const screens = Object.keys(SCREEN_LABELS) as ScreenId[]

describe('bank structure', () => {
  it('uses only known labels, each allowed on the screens it names', () => {
    for (const entry of BANK) {
      expect(ALL_LABELS.has(entry.label), entry.say).toBe(true)
      if (entry.screens !== 'any') for (const screen of entry.screens) expect(entry.label === 'none' || SCREEN_LABELS[screen].includes(entry.label), `${entry.say} @${screen}`).toBe(true)
    }
  })

  it('never trains on a held-out sentence', () => {
    for (const screen of screens) {
      const trained = new Set(trainingFor(screen).map((entry) => entry.say))
      for (const entry of heldOutFor(screen)) expect(trained.has(entry.say), entry.say).toBe(false)
    }
  })

  it('holds out written sentences only', () => {
    expect(BANK.filter(isHeldOut).every((entry) => entry.source === 'written')).toBe(true)
  })

  it('has no duplicate sentence with two different labels on the same screen', () => {
    const seen = new Map<string, string>()
    for (const entry of BANK) {
      const key = `${entry.screens === 'any' ? 'any' : entry.screens.join(',')}|${entry.say}`
      if (seen.has(key)) expect(seen.get(key), entry.say).toBe(entry.label)
      seen.set(key, entry.label)
    }
  })
})
```

- [ ] **Step 5: Run everything; Step 6: Commit and push**

`npx vitest run src/ai/understanding` → PASS; `npm test && npm run lint && npm run build`.

Commit: "Labels per screen, canonical phrases that replay through the screen's own rules, the corpus as bank entries, and a held-out split".

---

### Task 3: Asking back, in the voice hook and the helper bar

**Files:**
- Create: `src/ai/understanding/load.ts`, `src/components/assistant/understandingStep.ts`
- Modify: `src/components/assistant/useVoiceInput.ts`, `src/components/grab/AiHelperBar.tsx`
- Test: `src/components/assistant/understandingStep.test.ts`, `src/ai/understanding/load.test.ts`

**Interfaces:**
- **Consumes:** Tasks 1–2.
- **Produces:**
  - `matchOn(screen: ScreenId, understood: string): Promise<Match>`: lazy bank load, one cached index per screen.
  - `type Step`, `decide(match: Match): Step`, `answerOf(understood: string): 'yes' | 'no' | null`.
  - `useVoiceInput(interpret, { autoListen?, understanding?: { screen: ScreenId; act?: (label: string) => Reply | Promise<Reply> } })` now also returns `choices: Choice[]`.
  - `interface Choice { label: string; onPress: () => void }`.
  - `AiHelperBar` gains the prop `choices?: Choice[]`.

- [ ] **Step 1: `load.ts`**

```ts
import type { ScreenId } from './bank/types.ts'
import { learnable, prepare } from './features.ts'
import { buildIndex, classify, type Match, type MatchIndex } from './matcher.ts'

// The bank is large; it loads with the first sentence the rules did not understand, not with the page.
let bank: Promise<typeof import('./bank/index.ts')> | undefined
const indexes = new Map<ScreenId, MatchIndex>()

async function indexFor(screen: ScreenId): Promise<MatchIndex> {
  const known = indexes.get(screen)
  if (known) return known
  bank ??= import('./bank/index.ts')
  const { trainingFor } = await bank
  const built = buildIndex(trainingFor(screen).map((entry) => ({ text: learnable(entry.say), label: entry.label })))
  indexes.set(screen, built)
  return built
}

/** What an understood sentence most likely means on this screen. */
export async function matchOn(screen: ScreenId, understood: string): Promise<Match> {
  return classify(await indexFor(screen), prepare(understood))
}
```

`load.test.ts`: `matchOn('ACT2', understandThai('อยากรู้ว่าวันนี้ขายได้เท่าไหร่').text)` returns `label: 'intent:sales'`. Building the S3 index the first time completes in < 500 ms (Task 7 tightens this to 100 ms once the bank is full).

- [ ] **Step 2: `understandingStep.ts` — failing tests first**

```ts
import { describe, expect, it } from 'vitest'
import { SURE_MARGIN, SURE_SCORE } from '@/ai/understanding/matcher.ts'
import { answerOf, decide } from './understandingStep.ts'

const match = (label: string, score: number, margin: number, ranked = [label, 'back', 'next']) => ({ label, score, margin, ranked })

describe('decide', () => {
  it('acts when sure', () => {
    expect(decide(match('next', SURE_SCORE, SURE_MARGIN))).toEqual({ kind: 'act', label: 'next' })
  })

  it('never acts on a blocked label, however sure', () => {
    expect(decide(match('submit', 1, 1))).toEqual({ kind: 'blocked', label: 'submit' })
    expect(decide(match('act2:confirm', 0.5, 0))).toEqual({ kind: 'blocked', label: 'act2:confirm' })
  })

  it('asks back when unsure, keeping the next two as the fallback', () => {
    expect(decide(match('pin', 0.6, 0.1, ['pin', 'here', 'none', 'back']))).toEqual({ kind: 'ask', label: 'pin', rest: ['here', 'back'] })
  })

  it('offers the two best real labels when lost', () => {
    expect(decide(match('none', 0.9, 0.9, ['none', 'here', 'pin']))).toEqual({ kind: 'lost', options: ['here', 'pin'] })
    expect(decide({ label: 'none', score: 0, margin: 0, ranked: [] })).toEqual({ kind: 'lost', options: [] })
  })

  it('keeps blocked labels off the buttons', () => {
    expect(decide(match('none', 0.9, 0.9, ['none', 'submit', 'back']))).toEqual({ kind: 'lost', options: ['back'] })
  })
})

describe('answerOf', () => {
  it('hears yes and no, central and regional (already through the language layer)', () => {
    for (const said of ['ใช่', 'ใช่ค่ะ', 'ได้', 'โอเค', 'ถูกแล้ว']) expect(answerOf(said), said).toBe('yes')
    for (const said of ['ไม่ใช่', 'ไม่', 'ไม่ใช่ค่ะ', 'ผิด']) expect(answerOf(said), said).toBe('no')
    expect(answerOf('ขอดูยอดขาย')).toBeNull()
  })
})
```

Note that "แม่น", "เจ้า" and "ช่าย" become "ใช่" in the language layer, which runs first.

`understandingStep.ts`:

```ts
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { BLOCKED } from '@/ai/understanding/labels.ts'
import { levelOf, type Match } from '@/ai/understanding/matcher.ts'

/** What the companion does with the matcher's guess. */
export type Step =
  | { kind: 'act'; label: string }
  | { kind: 'blocked'; label: string }
  | { kind: 'ask'; label: string; rest: string[] }
  | { kind: 'lost'; options: string[] }

const OFFERED = 2
const offerable = (labels: string[]) => labels.filter((label) => label !== 'none' && !BLOCKED.has(label))

/** sure → act; unsure → ask about the top label; lost → offer the two best real labels. Blocked labels never act. */
export function decide(match: Match): Step {
  if (BLOCKED.has(match.label)) return { kind: 'blocked', label: match.label }
  const level = levelOf(match)
  if (level === 'sure') return { kind: 'act', label: match.label }
  if (level === 'unsure') return { kind: 'ask', label: match.label, rest: offerable(match.ranked.slice(1)).slice(0, OFFERED) }
  return { kind: 'lost', options: offerable(match.ranked).slice(0, OFFERED) }
}

const ANSWERS = [
  { id: 'yes' as const, phrases: ['ใช่', 'ใช่แล้ว', 'ได้', 'ได้เลย', 'โอเค', 'ถูกแล้ว', 'ถูกต้อง', 'เอา', 'เอาเลย'] },
  { id: 'no' as const, phrases: ['ไม่ใช่', 'ไม่', 'ไม่เอา', 'ผิด', 'ไม่ถูก', 'ไม่ใช่อันนี้'] },
]

/** The merchant's answer to "หมายถึง … ใช่ไหมคะ", or null when they said something else. */
export const answerOf = (understood: string): 'yes' | 'no' | null => matchCommand(understood, ANSWERS)
```

- [ ] **Step 3: The hook**

In `useVoiceInput.ts`:
- Add to the options: `understanding?: { screen: ScreenId; act?: (label: string) => Reply | Promise<Reply> }`.
- Keep the latest options in a ref, the same way as `latestInterpret`.
- Add `const [choices, setChoices] = useState<Choice[]>([])` and `const pending = useRef<{ label: string; rest: string[] } | null>(null)`.
- Export `interface Choice { label: string; onPress: () => void }` from `src/components/assistant/companionState.ts`, a non-component module.

Add one helper inside the hook. It performs a label and turns the outcome into a notice:

```ts
  // Performs a label: blocked ones get the tap-only line, topics ask their question, the rest replay their
  // canonical phrase through the screen's own rules (or the screen's own act, when it has one).
  const perform = useCallback(async (label: string, isCurrent: () => boolean): Promise<Reply> => {
    const blocked = blockedReply(label)
    if (blocked) return blocked
    const own = latestOptions.current.understanding?.act
    if (own) return own(label)
    const question = topicQuestion(label)
    if (question) return question
    const phrase = canonicalPhrase(label)
    return phrase ? latestInterpret.current(understandThai(phrase).text, isCurrent) : false
  }, [])
```

Then, inside `hear`'s timeout, replace the single `replyTo` line with this order:
1. **A question is waiting** (`pending.current`): clear it and the choices.
   - `answerOf(heard.text) === 'yes'`: the reply is `await perform(label, isCurrent)`.
   - `'no'`: the reply is `th.understanding.declined`, and the choices become the `rest` labels.
   - Anything else: fall through to step 2.
2. **The rules:** `reply = await replyTo(heard, …)` as now.
3. **The matcher**, if the reply is `false`, the screen has `understanding` and `heard.text` is not empty: `const step = decide(await matchOn(screen, heard.text))`. Check `isCurrent()` after the await.
   - `act`: `reply = await perform(step.label, isCurrent)`.
   - `blocked`: `reply = blockedReply(step.label)`.
   - `ask`: set `pending.current = { label, rest }`; `reply = th.understanding.ask(labelName(label))`; choices are [ใช่ → resolve yes] and [ไม่ใช่ → resolve no].
   - `lost`: `reply = th.understanding.unsure` with the options as choices (each → perform that label). If there are no options, `reply` stays `false`, which gives the usual "not understood".
4. `setNotice(noticeFor(reply, takeGreeting()))` as now.

**A tap on a choice** runs the same path as a spoken answer through a helper `resolve(answer)`, or `runLabel(label)` for lost-state buttons. These helpers must:
- start a fresh turn with `guard.current.begin()`;
- clear `pending` and the choices;
- set the notice from the reply.

**Clear `choices` and `pending`** when a new mic turn starts in `listen`, and whenever the rules understood a sentence. Return `choices` from the hook.

**Wrap matcher errors** (for example a failed bank import): `.catch(() => null)` treats it as "no step", so the reply stays `false`.

- [ ] **Step 4: `AiHelperBar` choices**

Add `choices?: Choice[]`. When it is non-empty, render under the line:

```tsx
        {choices && choices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={choice.onPress}
                className="min-h-12 cursor-pointer rounded-full bg-surface px-4 text-base font-medium text-action ring-1 ring-action active:bg-ok-bg"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
```

- [ ] **Step 5: Run everything; Step 6: Commit and push**

Focused tests, then `npm test && npm run lint && npm run build`. Existing tests must pass unchanged, because screens do not pass `understanding` yet.

Commit: "Ask back when unsure: the matcher runs after the rules, in the voice hook, with yes/no and best-two buttons".

---

### Task 4: Wire every listening screen

**Files:**
- Modify:
  - Act 1: `src/screens/signup/G0Welcome.tsx`, `S1Service.tsx`, `S2Account.tsx`, `S2Phone.tsx`, `S3Business.tsx`, `S4Shop.tsx`, `S5Owner.tsx`, `S6Bank.tsx`, `S7Confirm.tsx`
  - Home: `src/screens/home/H1Home.tsx`, `H2Menu.tsx`, `H3Hours.tsx`
  - Act 2: `src/screens/act2-grow/1-dashboard/DashboardScreen.tsx`

**Interfaces:**
- **Consumes:** Task 3's `understanding` option and `choices`.

- [ ] **Step 1:** In each screen, add `understanding: { screen: '<ScreenId>' }` to the `useVoiceInput` options, keeping `autoListen` as it is. Pass `choices={choices}` (from the hook's return) to the screen's `AiHelperBar`.

| File | ScreenId | Note |
|---|---|---|
| G0Welcome | `G0` | |
| S1Service | `S1` | |
| S2Account | `S2_ACCOUNT` | Only when it uses the hook; if it does not listen, skip it and say so. |
| S2Phone | `S2_PHONE` | |
| S3Business | `S3` | Also pass `choices` to the TalkSheet's helper line if the talk sheet hides the bar. |
| S4Shop | `S4` | |
| S5Owner, S6Bank | `S5`, `S6` | |
| S7Confirm | `S7` | `submit` / `consentTick` stay tap-only (blocked). |
| H1Home | `H1` | **Custom `act`:** `task:menu` → `dispatch({ type: 'GO', screen: 'H2_MENU' })`, `task:hours` → `dispatch({ type: 'GO', screen: 'H3_HOURS' })`. Both return `true`. Check the reducer's `GO` event shape in `src/app/journey/journeyMachine.ts` and use it exactly. |
| H2Menu, H3Hours | `H2`, `H3` | |
| DashboardScreen (Act 2) | `ACT2` | **Only** add the option and `choices={voice.choices}` on its `AiHelperBar`. No other change. |

- [ ] **Step 2:** `npm test && npm run lint && npm run build`.

- [ ] **Step 3: Quick check**

Run `npm run dev` and use the presenter panel's "พูดเอง" box:
- **On S1:** a sentence the rules miss but the bank has a near neighbour for, e.g. "ขายพวกอาหารการกินค่ะ" → it acts or asks back.
- **On S7:** "ส่งไปเลยเถอะ", which must give the tap-only line.

Stop the server.

- [ ] **Step 4: Commit and push**

Commit: "Every listening screen asks back when its rules do not understand; Act 2 gets the same option, nothing else".

---

### Task 5: Bank — Act 1 sign-up and Home, written by hand

**Files:**
- Create: `src/ai/understanding/bank/signup.ts`, `src/ai/understanding/bank/home.ts`
- Modify: `src/ai/understanding/bank/index.ts` (add them to `BANK`)

**Interfaces:**
- **Consumes:** `BankEntry`, `ScreenId`, `SCREEN_LABELS`.
- **Produces:** `SIGNUP_BANK: BankEntry[]`, `HOME_BANK: BankEntry[]`, both with `source: 'written'`.

- [ ] **Step 1: Write the sentences**

The sentences must be **different from** the ones in `FROM_CORPUS`. Each must be something a real small-shop owner would say to a phone assistant while signing up: varied length, word order and politeness; some vague, some indirect ("ไม่รู้จะกดตรงไหน ไปต่อให้หน่อย"), some with hesitations ("เอ่อ…", "คือว่า"). Dialect sentences must use real words of that dialect (Isan, คำเมือง, Southern), including words that are not yet in `dialect.ts`. The layer passes unknown words through, so the matcher learns them as they are. Use `screens: 'any'` for `next`, `back` and `none`; otherwise list the screens.

**Minimum written sentences per label and region** (central / isan / north / south):

| Labels | each region |
|---|---|
| `register`, `login`, `food`, `mart`, `yes`, `personal`, `company`, `shoot`, `here`, `pin`, `typeInstead`, `listenSummary` | 8 |
| `next`, `back` (`screens: 'any'`) | 12 |
| `topic:storeName`, `topic:location`, `topic:category`, `topic:building`, `topic:address` (S3), `topic:menu` (H2), `topic:hours` (H3) | 8 |
| `task:menu`, `task:hours` (H1) | 8 |
| `submit`, `consentTick` (S7, blocked) | 4 |

That is about 900 sentences at minimum. **Aim for 1,000 or more.**

Topic sentences are ones the parsers do **not** turn into a value: the merchant talks *about* the field without giving it. Examples:
- "อยากใส่ชื่อร้านแต่ยังคิดไม่ออก"
- "ร้านอยู่หลังวัดอะ บอกไม่ถูก"
- "ขายหลายอย่างเลย ไม่รู้เลือกประเภทไหน"

- [ ] **Step 2: Check and commit**

`npx vitest run src/ai/understanding` (structure tests), then `npm test && npm run lint && npm run build`. Commit "Bank: about 1,000 hand-written sign-up and Home sentences in four regions" and push.

---

### Task 6: Bank — Act 2 and "none", written by hand

**Files:**
- Create: `src/ai/understanding/bank/act2.ts`, `src/ai/understanding/bank/none.ts`
- Modify: `src/ai/understanding/bank/index.ts`

**Interfaces:** `ACT2_BANK: BankEntry[]` (`screens: ['ACT2']`), `NONE_BANK: BankEntry[]` (`screens: 'any'`, `label: 'none'`), all `source: 'written'`.

- [ ] **Step 1: Write the sentences**

Same quality rules as Task 5. Act 2 sentences come from an owner running their shop: asking about sales, rain, promotions, sold-out items, reviews, opening pages, pressing buttons. Read `src/ai/navigator/scripts.ts`, `openPage.ts` and `buttons.ts` for what each label does, and `th.act2` for page names.

Minimums (each region):

| Labels | each region |
|---|---|
| `intent:sales`, `intent:forecast`, `intent:promo`, `intent:soldOut`, `intent:feedback` | 10 |
| `control:home`, `control:back`, `control:stop` | 8 |
| every `open:<GridId>` (13) | 3 |
| every `button:<id>` | 3 |
| `act2:confirm` (blocked) | 4 |
| `none` (`none.ts`) | 80 (320 total) |

`none` covers:
- chit-chat ("วันนี้ร้อนจัง", "ลูกค้าเยอะมากเมื่อวาน");
- life and complaints that are not commands ("เหนื่อยจังวันนี้");
- questions the app does not handle ("ร้านแถวนี้อันไหนอร่อย");
- fillers ("อืม", "เอ่อ", "เดี๋ยวนะ");
- recogniser fragments ("ยอด", "เปิด ห", "ค่ะ ค่ะ").

**Do not** write `none` sentences that a real label should take.

- [ ] **Step 2: Check and commit**

As in Task 5. Commit "Bank: Act 2 and none sentences in four regions" and push.

---

### Task 7: Templates, calibration, size and metric gates, README

**Files:**
- Create: `src/ai/understanding/bank/templates.ts`, `src/ai/understanding/bank/metrics.test.ts`
- Modify: `src/ai/understanding/bank/index.ts`, `src/ai/understanding/matcher.ts` (calibrated constants), `README.md`

- [ ] **Step 1: Templates**

`templates.ts` exports `TEMPLATE_BANK: BankEntry[]` (`source: 'template'`).
- **Slot lists:**
  - 40+ dishes (central and regional: ส้มตำ, ลาบ, ข้าวซอย, ไส้อั่ว, แกงไตปลา, คั่วกลิ้ง…);
  - prices said in words, including ซาว / ฮ้อย forms;
  - times and days in each region's words;
  - landmarks (หน้าวัด, ข้างโรงเรียน, ตรงข้ามเซเว่น, หลังตลาด…);
  - regional particles and openers.
- **Templates per label:** commands, topics and intents only, e.g. "{opener}{dish}{price}{particle}" for `topic:menu`, "ร้านอยู่{landmark}{particle}" for `topic:location`, "{opener}ขอดูยอดขาย{time}{particle}" for `intent:sales`.
- **Expansion:** deterministic, using a seeded pseudo-random pick with a fixed seed, so the output is the same every build.
- **Cap:** at most 30% of `BANK`. Add `...TEMPLATE_BANK` to `BANK`.

- [ ] **Step 2: Size gates**

Add these to `bank.test.ts`:
- `BANK.length >= 3000`;
- each region `>= 600`;
- written `>= 0.7 * BANK.length`;
- `none >= 300`;
- the per-label-per-region minimums of Tasks 5–6, counting written entries only and including `FROM_CORPUS`.

The minimums are: 8 for commands, topics, tasks, intents and controls (12 for `next` / `back`, 10 for intents); 3 for `open:*` and `button:*`; 4 for blocked labels. A failing minimum means writing more sentences for that label and region, never lowering it.

- [ ] **Step 3: Calibrate and gate**

`metrics.test.ts` takes, for every screen, the held-out sentences, runs `decide(classify(...))` on the screen's training index, and counts each outcome:
- **right:** act on the right label, or ask about the right label;
- **wrong without asking:** act on a wrong label;
- **asked wrong:** ask about a wrong label;
- **lost:** for a held-out `none`, lost counts as right.

It prints a table per region and screen (`console.table` inside the test is fine) and asserts:
- wrong without asking ≤ 2% overall;
- right ≥ 85% in each region.

Calibrate `SURE_SCORE`, `SURE_MARGIN` and `ASK_SCORE` once. Try a small grid (sure 0.6–0.9, margin 0.1–0.5, ask 0.3–0.6) in a throwaway script, choose the values that meet both gates with the fewest asks, write them into `matcher.ts` with a comment giving the date and the measured numbers, and delete the script.

If no setting meets the gates, add sentences to the weakest region and labels (Tasks 5–6 rules) until one does. Never loosen the gates.

- [ ] **Step 4: Speed**

`load.test.ts` asserts that building the S3 and ACT2 indexes takes < 100 ms each (measured with `performance.now()`). After `npm run build`, the lazy bank chunk must be < 150 KB gzipped. Read the size from the Vite output and record it in the report.

- [ ] **Step 5: README**

Under the dialect bullet, add "**Understanding new sentences:**" with:
- one line on how it works (rules first; a matcher learned from ~3,000 sentences asks back when unsure);
- a table per region of held-out right %, ask %, and wrong-without-asking %;
- three example sentences to try that are not in the bank.

- [ ] **Step 6: Run everything; Step 7: Commit and push**

Commit: "Templates, calibrated thresholds, size and accuracy gates on held-out sentences, README metrics".

The controller then checks in the browser. Use two **unseen** sentences per region on 3/7, Home, menu and Act 2, and check:
- a sure action;
- an ask-back answered by voice with "แม่น" / "เจ้า";
- an ask-back answered "ไม่ใช่", which gives the next buttons;
- a lost state with its two buttons;
- S7 "ส่งเลยนะ" stays tap-only.

---

## Self-review (done while writing)

- **Spec coverage:**
  - §2 flow → Tasks 3–4
  - §3 labels → Task 2
  - §4 matcher → Task 1 and Task 7 (calibration)
  - §5 bank → Tasks 2, 5, 6, 7
  - §6 integration → Tasks 3–4
  - §7 safety → Task 2 (`BLOCKED`, `blockedReply`), Task 3 (`decide` never acts on blocked labels; tests)
  - §8 tests and metrics → Tasks 1, 2, 3, 7
  - §9 out of scope respected
- **Interface names used across tasks:** `prepare`, `learnable`, `ngrams`, `buildIndex`, `classify`, `levelOf`, `Match`, `SCREEN_LABELS`, `BLOCKED`, `canonicalPhrase`, `topicQuestion`, `blockedReply`, `labelName`, `BankEntry`, `ScreenId`, `BANK`, `isHeldOut`, `trainingFor`, `heldOutFor`, `matchOn`, `decide`, `answerOf`, `Choice`. Each is defined once, in the task named in its Interfaces block.
- **Risk to watch:** a canonical phrase that no longer routes because a later edit changes `SAY` or Act 2's registries. `labels.test.ts` catches it.
