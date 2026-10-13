# Plan 1: Foundation + Act 1 (Voice Onboarding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable phone-frame web prototype where a Thai merchant registers their shop by talking (A1), reviews what the AI heard (A2), submits through a guardrail (A3), and reaches the "30 วันต่อมา…" hand-off to Act 2.

**Architecture:** Vite + React app. All AI logic lives in pure TypeScript under `src/ai/` (rule-based Thai parsers, profile state, follow-up picker, submission guardrail) and is fully unit-tested. React screens read one typed reducer (`src/app/journey/`). The only path to the mock "write" API is the guardrail's `submitProfile`, enforced by an architecture test.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Tailwind CSS 4, Vitest 5, oxlint, lucide-react, browser Web Speech API.

**Spec:** [docs/specs/2026-10-13-merchant-companion-design.md](../specs/2026-10-13-merchant-companion-design.md). Act 2 (G1–G5: nudge engine, promo guardrail, impact) is Plan 2, written after this plan ships.

## Global Constraints

- **Exact versions** (no `^`): react 19.3.0, react-dom 19.3.0, lucide-react 1.56.0, vite 8.3.4, @vitejs/plugin-react 6.1.2, typescript 6.0.3, tailwindcss 4.3.3, @tailwindcss/vite 4.3.3, vitest 5.0.4, oxlint 1.87.0, @types/react 19.3.0, @types/react-dom 19.3.0, @types/node 22.20.5. TypeScript stays on 6.0.x (the Vite template pins `~6.0`).
- **Code style** (matches the Vite template): no semicolons, single quotes, 2-space indent, trailing commas in multi-line literals, explicit `.ts`/`.tsx` extensions in relative and `@/` imports, `import type` for type-only imports (`verbatimModuleSyntax`), no `enum` and no constructor parameter properties (`erasableSyntaxOnly`).
- **Imports:** `@/` maps to `src/`.
- **Purity:** nothing under `src/ai/` imports React.
- **Executor isolation:** only `src/ai/onboarding/submit.ts` may import `src/services/merchantApi.write.ts` (tests excepted). Enforced by `src/architecture.test.ts`.
- **Copy:** every merchant-facing string lives in `src/copy/th.ts`. Presenter-only text in `DemoPanel` is exempt.
- **UX tokens (spec §8):** body text ≥ 18px (`text-base` = 1.125rem), tap targets ≥ 56px (`min-h-14` / `size-14`), 16px side gutter (`px-4`), buttons and green text use `action` (#007A3D); `grab` (#00B14F) is for fills/accents only, never text.
- **Shell:** Git Bash on Windows; run every command from the repo root.
- **Commits:** end each commit message with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (passed as a second `-m`).

## File Structure

```
.claude/launch.json                         dev-server entry for the Claude browser preview
package.json · package-lock.json · index.html · vite.config.ts · .oxlintrc.json · .gitignore
tsconfig.json · tsconfig.app.json · tsconfig.node.json
public/favicon.svg
src/
  main.tsx · App.tsx                        mounts providers, frame, screen switch
  architecture.test.ts                      executor isolation + ai purity
  styles/index.css                          Tailwind import + @theme tokens
  types/domain.ts                           shared contracts (spec §6.3)
  copy/th.ts                                all Thai UI strings
  lib/format.ts                             ฿, time, hours, phone, duration formatting
  data/landmarks.json · account.json · onboarding-script.json
  ai/onboarding/
    parsers/thaiNumber.ts                   spoken Thai numbers ↔ digits
    parsers/thaiTime.ts                     spoken times → "HH:MM", opening hours
    parsers/menuItems.ts                    one sentence → menu items with prices
    parsers/location.ts                     landmark phrase → GeoPoint
    parsers/particles.ts                    strip polite particles (ค่ะ/ครับ…)
    parsers/storeName.ts · category.ts · phone.ts
    profile.ts                              profile state transitions (empty → heard → confirmed)
    extractProfile.ts                       utterance → ProfileUpdates
    followUp.ts                             next question + chips
    submit.ts                               submission checks + the only call to the write API
  services/
    merchantApi.ts                          reads (account, landmarks)
    merchantApi.write.ts                    submitApplication (simulated delay/failure)
    demoFlags.ts                            presenter switches
    speech/speechToText.ts · scripted.ts · textToSpeech.ts
  app/journey/journeyMachine.ts · JourneyContext.ts · JourneyProvider.tsx
  app/demo/demoBus.ts · demoProfile.ts · DemoPanel.tsx
  components/ui/Button.tsx · Card.tsx · Chip.tsx
  components/shell/DeviceFrame.tsx · OnboardingShell.tsx
  components/assistant/MicButton.tsx · TranscriptBubble.tsx · CompanionBubble.tsx · ListenButton.tsx
  screens/
    ScreenStub.tsx                          temporary (Task 10), deleted in Task 14
    ActTransition.tsx
    act1-onboarding/summarizeField.ts
    act1-onboarding/A1-talk/TalkScreen.tsx · LiveProfileChecklist.tsx · MenuItemList.tsx · TypeInstead.tsx
    act1-onboarding/A2-review/ReviewScreen.tsx · ReviewFieldCard.tsx · StorePreviewCard.tsx · MapPinConfirm.tsx
    act1-onboarding/A3-submitted/SubmittedScreen.tsx
    act2-grow/1-dashboard/DashboardScreen.tsx   placeholder until Plan 2
```

---

### Task 1: Project scaffold, design tokens, shared types, formatting helpers

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `.oxlintrc.json`, `.gitignore`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `public/favicon.svg`, `.claude/launch.json`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`, `src/types/domain.ts`, `src/lib/format.ts`
- Test: `src/lib/format.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: every type in `src/types/domain.ts` (used by all later tasks); `formatTHB(amount: number): string`, `formatTime(hhmm: string): string`, `formatHours(hours: OpeningHours): string`, `formatPhone(phone: string): string`, `formatDuration(ms: number): string`; Tailwind tokens `bg-action`, `text-action`, `bg-grab`, `text-ink`, `text-ink-muted`, `bg-surface`, `bg-canvas`, `ring-line`, `bg-ok-bg`, `bg-warn-bg`, `text-warn-ink`, `text-money`, `animate-pop`.

- [ ] **Step 1: Write the project config files**

`package.json`:
```json
{
  "name": "grab-merchant-companion",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "1.56.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.3.3",
    "@types/node": "22.20.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "oxlint": "1.87.0",
    "tailwindcss": "4.3.3",
    "typescript": "6.0.3",
    "vite": "8.3.4",
    "vitest": "5.0.4"
  }
}
```

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] },

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

`.oxlintrc.json`:
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

`.gitignore`:
```
# Logs
logs
*.log
npm-debug.log*

node_modules
dist
dist-ssr
coverage
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.sw?
```

`.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "web", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

- [ ] **Step 2: Write the HTML shell, favicon, tokens and entry files**

`index.html`:
```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai+Looped:wght@400;500;700&display=swap" rel="stylesheet" />
    <title>Merchant Companion</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#007A3D"/><path d="M16 6l2.6 7.4L26 16l-7.4 2.6L16 26l-2.6-7.4L6 16l7.4-2.6z" fill="#fff"/></svg>
```

`src/styles/index.css`:
```css
@import "tailwindcss";

@theme {
  --font-sans: "Noto Sans Thai Looped", ui-sans-serif, system-ui, sans-serif;

  /* Grab green is 2.8:1 on white: fills and accents only, never text. */
  --color-grab: #00b14f;
  /* Buttons with white text and any green text (~5.5:1 on white). */
  --color-action: #007a3d;
  --color-action-pressed: #00602f;
  --color-ink: #1a1a1a;
  --color-ink-muted: #5c5c5c;
  --color-surface: #ffffff;
  --color-canvas: #f4f6f5;
  --color-line: #e2e6e4;
  --color-ok-bg: #e6f6ec;
  --color-warn-bg: #fff4d6;
  --color-warn-ink: #7a4b00;

  /* Older eyes: nothing smaller than 15px, body at 18px. */
  --text-xs: 0.9375rem;
  --text-sm: 1rem;
  --text-base: 1.125rem;
  --text-base--line-height: 1.6;
  --text-money: 2rem;
  --text-money--line-height: 1.2;

  --animate-pop: pop 0.4s ease-out both;

  @keyframes pop {
    0% { transform: scale(0.6); opacity: 0; }
    70% { transform: scale(1.08); opacity: 1; }
    100% { transform: scale(1); }
  }
}

@layer base {
  html,
  body,
  #root {
    height: 100%;
  }

  body {
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    line-height: 1.6;
  }
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (temporary; replaced in Task 10):
```tsx
function App() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <p className="text-money font-bold text-action">สวัสดีค่ะ ครัวป้าแดง</p>
    </main>
  )
}

export default App
```

- [ ] **Step 3: Write the shared contracts**

`src/types/domain.ts`:
```ts
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

export interface ProfileFields {
  storeName: ProfileField<string>
  category: ProfileField<string>
  location: ProfileField<GeoPoint> & { needsPinCheck?: boolean }
  hours: ProfileField<OpeningHours>
  menu: ProfileField<MenuEntry[]>
  phone: ProfileField<string> & { suggestFromAccount?: boolean }
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
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: completes, creates `package-lock.json`, no peer-dependency errors.

- [ ] **Step 5: Write the failing formatting tests**

`src/lib/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { formatDuration, formatHours, formatPhone, formatTHB, formatTime } from './format.ts'

describe('formatTHB', () => {
  it('adds the baht sign and a thousands separator', () => {
    expect(formatTHB(1025)).toBe('฿1,025')
  })

  it('rounds down so money is never overstated', () => {
    expect(formatTHB(1025.9)).toBe('฿1,025')
  })
})

describe('formatTime', () => {
  it('adds the Thai "น." suffix', () => {
    expect(formatTime('14:00')).toBe('14:00 น.')
  })
})

describe('formatHours', () => {
  it('says "เปิดทุกวัน" when there are no days off', () => {
    expect(formatHours({ open: '10:00', close: '20:00', closedDays: [] })).toBe('10:00 – 20:00 น. · เปิดทุกวัน')
  })

  it('lists days off in Thai', () => {
    expect(formatHours({ open: '07:00', close: '15:00', closedDays: ['sat', 'sun'] })).toBe('07:00 – 15:00 น. · หยุดวันเสาร์ อาทิตย์')
  })
})

describe('formatPhone', () => {
  it('groups a 10-digit Thai number', () => {
    expect(formatPhone('0812344217')).toBe('081-234-4217')
  })

  it('leaves other lengths unchanged', () => {
    expect(formatPhone('12345')).toBe('12345')
  })
})

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(160_000)).toBe('2 นาที 40 วินาที')
  })

  it('drops zero seconds', () => {
    expect(formatDuration(120_000)).toBe('2 นาที')
  })

  it('shows only seconds under a minute', () => {
    expect(formatDuration(45_000)).toBe('45 วินาที')
  })
})
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL, cannot resolve `./format.ts`.

- [ ] **Step 7: Implement the formatting helpers**

`src/lib/format.ts`:
```ts
import type { OpeningHours, Weekday } from '@/types/domain.ts'

const baht = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })

const WEEKDAY_TH: Record<Weekday, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
  sat: 'เสาร์',
  sun: 'อาทิตย์',
}

/** "฿1,025". Rounds down so money is never overstated. */
export function formatTHB(amount: number): string {
  return `฿${baht.format(Math.floor(amount))}`
}

/** "14:00" → "14:00 น." */
export function formatTime(hhmm: string): string {
  return `${hhmm} น.`
}

/** "10:00 – 20:00 น. · เปิดทุกวัน" */
export function formatHours({ open, close, closedDays }: OpeningHours): string {
  const days = closedDays.length === 0 ? 'เปิดทุกวัน' : `หยุดวัน${closedDays.map((day) => WEEKDAY_TH[day]).join(' ')}`
  return `${open} – ${close} น. · ${days}`
}

/** "0812344217" → "081-234-4217" */
export function formatPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}` : phone
}

/** 160000 → "2 นาที 40 วินาที" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} วินาที`
  return seconds === 0 ? `${minutes} นาที` : `${minutes} นาที ${seconds} วินาที`
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 9: Verify build, lint and the page**

Run: `npm run build && npm run lint`
Expected: build succeeds (writes `dist/`), oxlint reports 0 errors.

Start the `web` dev server (Claude browser preview `preview_start` with name `web`, or `npm run dev`) and open http://localhost:5173.
Expected: centered green text "สวัสดีค่ะ ครัวป้าแดง" in a looped Thai font (letters have small loops/heads).

- [ ] **Step 10: Add run instructions to the README**

Append to `README.md`:
````markdown

## Prototype: Grab Merchant Companion

Design: [docs/specs/2026-10-13-merchant-companion-design.md](docs/specs/2026-10-13-merchant-companion-design.md)

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit + architecture tests
```
````

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts .oxlintrc.json .gitignore tsconfig.json tsconfig.app.json tsconfig.node.json public/favicon.svg .claude/launch.json src README.md
git commit -m "Scaffold Vite + React + Tailwind prototype with design tokens and shared types" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Thai number parsing

**Files:**
- Create: `src/ai/onboarding/parsers/thaiNumber.ts`
- Test: `src/ai/onboarding/parsers/thaiNumber.test.ts`

**Interfaces:**
- Produces:
  - `interface NumberMatch { start: number; end: number; value: number; kind: 'digits' | 'words' }`
  - `normalizeThaiDigits(text: string): string` — "๘๙" → "89", same length as input
  - `scanNumbers(text: string): NumberMatch[]` — every number in the text, digits or Thai words, with positions in the original string
  - `parseThaiNumber(text: string): number | null` — the whole text as one number
  - `numbersToDigits(text: string): string` — "สิบโมงถึงสองทุ่ม" → "10โมงถึง2ทุ่ม"; digit runs kept as written

- [ ] **Step 1: Write the failing tests**

`src/ai/onboarding/parsers/thaiNumber.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizeThaiDigits, numbersToDigits, parseThaiNumber, scanNumbers } from './thaiNumber.ts'

describe('parseThaiNumber', () => {
  it.each([
    ['แปดสิบเก้า', 89],
    ['หกสิบห้า', 65],
    ['ร้อยยี่สิบ', 120],
    ['สิบเอ็ด', 11],
    ['ยี่สิบเอ็ด', 21],
    ['สามสิบ', 30],
    ['หนึ่งร้อยห้าสิบ', 150],
    ['สองพันห้าร้อย', 2500],
    ['สิบ', 10],
    ['89', 89],
    ['๘๙ บาท', 89],
    ['฿35', 35],
  ])('%s → %i', (spoken, expected) => {
    expect(parseThaiNumber(spoken)).toBe(expected)
  })

  it.each([['สองสาม'], ['สิบร้อย'], ['เอ็ด'], ['ยี่'], ['ข้าว'], ['']])('rejects %j', (spoken) => {
    expect(parseThaiNumber(spoken)).toBeNull()
  })
})

describe('scanNumbers', () => {
  it('finds a spoken soi number inside an address', () => {
    const text = 'ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น'
    const matches = scanNumbers(text)
    expect(matches.map((m) => m.value)).toEqual([71])
    expect(text.slice(matches[0].start, matches[0].end)).toBe('เจ็ดสิบเอ็ด')
    expect(matches[0].kind).toBe('words')
  })

  it('finds digit prices', () => {
    expect(scanNumbers('ข้าวมันไก่ 50 ต้มเลือดหมู 40 บาท').map((m) => m.value)).toEqual([50, 40])
  })
})

describe('normalizeThaiDigits', () => {
  it('turns Thai digits into Arabic digits without changing length', () => {
    expect(normalizeThaiDigits('โทร ๐๘๑')).toBe('โทร 081')
  })
})

describe('numbersToDigits', () => {
  it('replaces number words with digits', () => {
    expect(numbersToDigits('สิบโมงเช้าถึงสองทุ่ม')).toBe('10โมงเช้าถึง2ทุ่ม')
  })

  it('keeps digit runs exactly as written', () => {
    expect(numbersToDigits('10:00 – 20:00')).toBe('10:00 – 20:00')
  })

  it('reads colloquial "นึง" as one', () => {
    expect(numbersToDigits('ทุ่มนึง')).toBe('ทุ่ม1')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/parsers/thaiNumber.test.ts`
Expected: FAIL, cannot resolve `./thaiNumber.ts`.

- [ ] **Step 3: Implement**

`src/ai/onboarding/parsers/thaiNumber.ts`:
```ts
const DIGIT_WORDS: Record<string, number> = {
  'ศูนย์': 0,
  'หนึ่ง': 1,
  'นึง': 1,
  'เอ็ด': 1,
  'สอง': 2,
  'ยี่': 2,
  'สาม': 3,
  'สี่': 4,
  'ห้า': 5,
  'หก': 6,
  'เจ็ด': 7,
  'แปด': 8,
  'เก้า': 9,
}

const MULTIPLIERS: Record<string, number> = {
  'สิบ': 10,
  'ร้อย': 100,
  'พัน': 1000,
  'หมื่น': 10000,
  'แสน': 100000,
}

// Longest first, so a longer word always wins over a shorter one at the same position.
const WORDS = [...Object.keys(DIGIT_WORDS), ...Object.keys(MULTIPLIERS)].sort((a, b) => b.length - a.length)

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'

interface NumberWord {
  word: string
  value: number
  isMultiplier: boolean
}

export interface NumberMatch {
  start: number
  end: number
  value: number
  kind: 'digits' | 'words'
}

/** "๘๙" → "89". One character in, one character out, so positions stay valid. */
export function normalizeThaiDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
}

function wordAt(text: string, index: number): NumberWord | null {
  const word = WORDS.find((candidate) => text.startsWith(candidate, index))
  if (!word) return null
  return word in MULTIPLIERS
    ? { word, value: MULTIPLIERS[word], isMultiplier: true }
    : { word, value: DIGIT_WORDS[word], isMultiplier: false }
}

/** Reads a run of number words ("แปด", "สิบ", "เก้า") as a number, or null if the run is not valid Thai. */
function wordsToNumber(words: NumberWord[]): number | null {
  let total = 0
  let pending: number | null = null
  let lastMultiplier = Infinity
  for (const [index, word] of words.entries()) {
    if (word.isMultiplier) {
      if (word.value >= lastMultiplier) return null // "สิบร้อย"
      total += (pending ?? 1) * word.value
      pending = null
      lastMultiplier = word.value
      continue
    }
    if (pending !== null) return null // two digits in a row: "สองสาม"
    if (word.word === 'ยี่' && words[index + 1]?.word !== 'สิบ') return null
    if (word.word === 'เอ็ด' && lastMultiplier === Infinity) return null
    pending = word.value
  }
  return total + (pending ?? 0)
}

/** Every number in the text, written as digits or spoken as Thai words. */
export function scanNumbers(input: string): NumberMatch[] {
  const text = normalizeThaiDigits(input)
  const matches: NumberMatch[] = []
  let i = 0
  while (i < text.length) {
    const digits = /^\d+/.exec(text.slice(i))
    if (digits) {
      matches.push({ start: i, end: i + digits[0].length, value: Number(digits[0]), kind: 'digits' })
      i += digits[0].length
      continue
    }
    const words: NumberWord[] = []
    let j = i
    for (let word = wordAt(text, j); word; word = wordAt(text, j)) {
      words.push(word)
      j += word.word.length
    }
    if (words.length === 0) {
      i += 1
      continue
    }
    const value = wordsToNumber(words)
    if (value !== null) matches.push({ start: i, end: j, value, kind: 'words' })
    i = j
  }
  return matches
}

/** "แปดสิบเก้า" → 89, "๘๙ บาท" → 89. Null unless the whole text is one number. */
export function parseThaiNumber(input: string): number | null {
  const text = input.replace(/\s+|บาท|฿/g, '')
  if (!text) return null
  const matches = scanNumbers(text)
  const [only] = matches
  return matches.length === 1 && only.start === 0 && only.end === text.length ? only.value : null
}

/** "สิบโมงถึงสองทุ่ม" → "10โมงถึง2ทุ่ม". Digit runs are kept as written, so "20:00" stays "20:00". */
export function numbersToDigits(input: string): string {
  const text = normalizeThaiDigits(input)
  let out = ''
  let cursor = 0
  for (const match of scanNumbers(text)) {
    const written = match.kind === 'digits' ? text.slice(match.start, match.end) : String(match.value)
    out += text.slice(cursor, match.start) + written
    cursor = match.end
  }
  return out + text.slice(cursor)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/parsers/thaiNumber.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/ai/onboarding/parsers/thaiNumber.ts src/ai/onboarding/parsers/thaiNumber.test.ts
git commit -m "Add Thai spoken-number parser" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Thai time and opening-hours parsing

**Files:**
- Create: `src/ai/onboarding/parsers/thaiTime.ts`
- Test: `src/ai/onboarding/parsers/thaiTime.test.ts`

**Interfaces:**
- Consumes: `numbersToDigits` (Task 2); `OpeningHours`, `Weekday` (Task 1).
- Produces:
  - `findTimes(text: string): { index: number; length: number; time: string }[]` — every time expression, in spoken order
  - `parseThaiTime(text: string): string | null` — first time as "HH:MM"
  - `parseClosedDays(text: string): Weekday[]`
  - `parseOpeningHours(text: string): OpeningHours | null` — needs two times

- [ ] **Step 1: Write the failing tests**

`src/ai/onboarding/parsers/thaiTime.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parseClosedDays, parseOpeningHours, parseThaiTime } from './thaiTime.ts'

describe('parseThaiTime', () => {
  // Every row of spec §6.4, plus digit forms and half hours.
  it.each([
    ['เจ็ดโมงเช้า', '07:00'],
    ['เจ็ดโมง', '07:00'],
    ['สิบโมง', '10:00'],
    ['สิบโมงเช้า', '10:00'],
    ['เที่ยง', '12:00'],
    ['เที่ยงวัน', '12:00'],
    ['บ่ายโมง', '13:00'],
    ['บ่ายสาม', '15:00'],
    ['บ่ายสามโมง', '15:00'],
    ['ห้าโมงเย็น', '17:00'],
    ['หกโมงเย็น', '18:00'],
    ['ทุ่มนึง', '19:00'],
    ['หนึ่งทุ่ม', '19:00'],
    ['สองทุ่ม', '20:00'],
    ['สามทุ่ม', '21:00'],
    ['เที่ยงคืน', '00:00'],
    ['ตีหนึ่ง', '01:00'],
    ['ตีห้า', '05:00'],
    ['สองโมง', '14:00'],
    ['สิบโมงครึ่ง', '10:30'],
    ['สองทุ่มครึ่ง', '20:30'],
    ['10 โมง', '10:00'],
    ['20:00', '20:00'],
    ['20.00 น.', '20:00'],
  ])('%s → %s', (spoken, expected) => {
    expect(parseThaiTime(spoken)).toBe(expected)
  })

  it('returns null when there is no time', () => {
    expect(parseThaiTime('ขายน้ำพริกปลาทู')).toBeNull()
  })
})

describe('parseClosedDays', () => {
  it('reads days after "หยุด"', () => {
    expect(parseClosedDays('หยุดวันเสาร์กับวันอาทิตย์')).toEqual(['sat', 'sun'])
  })

  it('is empty when open every day', () => {
    expect(parseClosedDays('เปิดทุกวัน')).toEqual([])
  })
})

describe('parseOpeningHours', () => {
  it('reads the demo script line', () => {
    expect(parseOpeningHours('สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน')).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
  })

  it('reads afternoon close and a day off', () => {
    expect(parseOpeningHours('เจ็ดโมงเช้าถึงบ่ายสาม หยุดวันอาทิตย์')).toEqual({ open: '07:00', close: '15:00', closedDays: ['sun'] })
  })

  it('reads the tap-chip form', () => {
    expect(parseOpeningHours('10:00 – 20:00')).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
  })

  it('reads days off said first', () => {
    expect(parseOpeningHours('หยุดวันเสาร์อาทิตย์ เปิดแปดโมงถึงห้าโมงเย็น')).toEqual({ open: '08:00', close: '17:00', closedDays: ['sat', 'sun'] })
  })

  it('needs both an opening and a closing time', () => {
    expect(parseOpeningHours('เปิดสิบโมง')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/parsers/thaiTime.test.ts`
Expected: FAIL, cannot resolve `./thaiTime.ts`.

- [ ] **Step 3: Implement**

`src/ai/onboarding/parsers/thaiTime.ts`:
```ts
import type { OpeningHours, Weekday } from '@/types/domain.ts'
import { numbersToDigits } from './thaiNumber.ts'

interface TimeRule {
  pattern: RegExp
  toTime: (match: RegExpMatchArray) => string | null
}

export interface TimeMatch {
  index: number
  length: number
  time: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const at = (hour: number, minute = 0) => (hour <= 24 && minute < 60 ? `${pad(hour % 24)}:${pad(minute)}` : null)
const half = (group: string | undefined) => (group ? 30 : 0)

// Patterns run on text where number words are already digits ("บ่ายสาม" → "บ่าย3").
// Where two patterns overlap, the longer match wins (see findTimes).
const RULES: TimeRule[] = [
  { pattern: /เที่ยงคืน/g, toTime: () => '00:00' },
  { pattern: /(\d{1,2})[:.](\d{2})/g, toTime: (m) => at(Number(m[1]), Number(m[2])) },
  { pattern: /ตี\s*(\d)(ครึ่ง)?/g, toTime: (m) => at(Number(m[1]), half(m[2])) },
  { pattern: /บ่าย\s*(?:(\d{1,2})\s*(?:โมง)?|โมง)(ครึ่ง)?/g, toTime: (m) => at(12 + Number(m[1] ?? 1), half(m[2])) },
  { pattern: /(\d{1,2})\s*โมง\s*เย็น(ครึ่ง)?/g, toTime: (m) => at(12 + Number(m[1]), half(m[2])) },
  { pattern: /(\d)\s*ทุ่ม(ครึ่ง)?/g, toTime: (m) => at(18 + Number(m[1]), half(m[2])) },
  { pattern: /ทุ่ม(?:\s*(\d))?(ครึ่ง)?/g, toTime: (m) => at(18 + Number(m[1] ?? 1), half(m[2])) },
  { pattern: /(\d{1,2})\s*โมง\s*เช้า(ครึ่ง)?/g, toTime: (m) => at(Number(m[1]), half(m[2])) },
  {
    // Plain "โมง": 1–5 means afternoon in everyday speech ("สองโมง" = 14:00); 6–12 as said.
    pattern: /(\d{1,2})\s*โมง(ครึ่ง)?/g,
    toTime: (m) => {
      const hour = Number(m[1])
      if (hour >= 1 && hour <= 5) return at(12 + hour, half(m[2]))
      return hour <= 12 ? at(hour, half(m[2])) : null
    },
  },
  { pattern: /เที่ยง(?:วัน)?(ครึ่ง)?/g, toTime: (m) => at(12, half(m[1])) },
]

const DAY_WORDS: [string, Weekday][] = [
  ['จันทร์', 'mon'],
  ['อังคาร', 'tue'],
  ['พุธ', 'wed'],
  ['พฤหัส', 'thu'],
  ['ศุกร์', 'fri'],
  ['เสาร์', 'sat'],
  ['อาทิตย์', 'sun'],
]

/** Every time expression in the text, in the order it was said. */
export function findTimes(input: string): TimeMatch[] {
  const text = numbersToDigits(input)
  const found: TimeMatch[] = []
  for (const { pattern, toTime } of RULES) {
    for (const match of text.matchAll(pattern)) {
      const time = toTime(match)
      if (time) found.push({ index: match.index ?? 0, length: match[0].length, time })
    }
  }
  found.sort((a, b) => b.length - a.length)
  const kept: TimeMatch[] = []
  for (const candidate of found) {
    const overlaps = kept.some((k) => candidate.index < k.index + k.length && k.index < candidate.index + candidate.length)
    if (!overlaps) kept.push(candidate)
  }
  return kept.sort((a, b) => a.index - b.index)
}

/** First time in the text as "HH:MM", or null. */
export function parseThaiTime(text: string): string | null {
  return findTimes(text)[0]?.time ?? null
}

/** Days named after "หยุด" ("หยุดวันอาทิตย์" → ['sun']). */
export function parseClosedDays(text: string): Weekday[] {
  const start = text.indexOf('หยุด')
  if (start === -1) return []
  const rest = text.slice(start)
  return DAY_WORDS.filter(([word]) => rest.includes(word)).map(([, day]) => day)
}

/** "สิบโมงเช้าถึงสองทุ่ม" → { open: "10:00", close: "20:00" }. Null unless both times are present. */
export function parseOpeningHours(text: string): OpeningHours | null {
  const [open, close] = findTimes(text)
  if (!open || !close) return null
  return { open: open.time, close: close.time, closedDays: parseClosedDays(text) }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/parsers/thaiTime.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/ai/onboarding/parsers/thaiTime.ts src/ai/onboarding/parsers/thaiTime.test.ts
git commit -m "Add Thai spoken-time and opening-hours parser" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Menu items from one sentence

**Files:**
- Create: `src/ai/onboarding/parsers/menuItems.ts`
- Test: `src/ai/onboarding/parsers/menuItems.test.ts`

**Interfaces:**
- Consumes: `scanNumbers`, `NumberMatch` (Task 2); `MenuEntry` (Task 1).
- Produces: `parseMenuItems(text: string): MenuEntry[]`

- [ ] **Step 1: Write the failing tests**

`src/ai/onboarding/parsers/menuItems.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parseMenuItems } from './menuItems.ts'

describe('parseMenuItems', () => {
  it('reads the five-item demo script line', () => {
    const line = 'น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้า แกงเขียวหวานเจ็ดสิบห้า ชาไทยเย็นสามสิบห้า น้ำกระเจี๊ยบสามสิบบาท'
    expect(parseMenuItems(line)).toEqual([
      { name: 'น้ำพริกกะปิปลาทู', priceTHB: 89 },
      { name: 'กะเพราหมูสับ', priceTHB: 65 },
      { name: 'แกงเขียวหวาน', priceTHB: 75 },
      { name: 'ชาไทยเย็น', priceTHB: 35 },
      { name: 'น้ำกระเจี๊ยบ', priceTHB: 30 },
    ])
  })

  it('reads digit prices', () => {
    expect(parseMenuItems('ข้าวมันไก่ 50 ต้มเลือดหมู 40 บาท')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'ต้มเลือดหมู', priceTHB: 40 },
    ])
  })

  it('drops filler words around names', () => {
    expect(parseMenuItems('มีข้าวมันไก่ห้าสิบบาท แล้วก็ต้มเลือดหมูสี่สิบบาทค่ะ')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'ต้มเลือดหมู', priceTHB: 40 },
    ])
  })

  it('does not read number words inside other words as prices', () => {
    expect(parseMenuItems('ข้าวหอมมะลิพันธุ์ดี 60 บาท')).toEqual([{ name: 'ข้าวหอมมะลิพันธุ์ดี', priceTHB: 60 }])
  })

  it('accepts a ฿5 item and ignores amounts below that', () => {
    expect(parseMenuItems('ลูกชิ้น 5 บาท')).toEqual([{ name: 'ลูกชิ้น', priceTHB: 5 }])
    expect(parseMenuItems('น้ำแข็ง 3 บาท')).toEqual([])
  })

  it('returns nothing without prices', () => {
    expect(parseMenuItems('ยังไม่แน่ใจค่ะ')).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/parsers/menuItems.test.ts`
Expected: FAIL, cannot resolve `./menuItems.ts`.

- [ ] **Step 3: Implement**

`src/ai/onboarding/parsers/menuItems.ts`:
```ts
import type { MenuEntry } from '@/types/domain.ts'
import { scanNumbers, type NumberMatch } from './thaiNumber.ts'

const MIN_PRICE = 5
const MAX_PRICE = 5000

// A price must be followed by a pause, "บาท", a particle or the end. This keeps number
// words inside other words ("พันธุ์", "ห้าง", "แสนอร่อย") from being read as prices.
const AFTER_PRICE = /^(?:\s|$|บาท|ค่ะ|ครับ|คะ|[,.!?])/

const FILLERS = ['แล้วก็', 'เมนู', 'ราคา', 'บาท', 'ครับ', 'ค่ะ', 'คะ', 'แล้ว', 'ขาย', 'กับ', 'และ', 'มี', 'ก็']

function isPrice(text: string, match: NumberMatch): boolean {
  return match.value >= MIN_PRICE && match.value <= MAX_PRICE && AFTER_PRICE.test(text.slice(match.end))
}

function cleanName(raw: string): string {
  let name = raw.replace(/[\s,.!?]+/g, ' ').trim()
  let changed = true
  while (changed) {
    changed = false
    for (const filler of FILLERS) {
      if (name.startsWith(filler)) {
        name = name.slice(filler.length).trim()
        changed = true
      }
      if (name.endsWith(filler)) {
        name = name.slice(0, -filler.length).trim()
        changed = true
      }
    }
  }
  return name
}

/** "น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้าบาท" → two items with prices. */
export function parseMenuItems(text: string): MenuEntry[] {
  const items: MenuEntry[] = []
  let cursor = 0
  for (const price of scanNumbers(text).filter((match) => isPrice(text, match))) {
    const name = cleanName(text.slice(cursor, price.start))
    if (name) items.push({ name, priceTHB: price.value })
    cursor = price.end
  }
  return items
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/parsers/menuItems.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/onboarding/parsers/menuItems.ts src/ai/onboarding/parsers/menuItems.test.ts
git commit -m "Add menu-item parser for spoken menus with prices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Location parser and mock account/landmark data

**Files:**
- Create: `src/data/landmarks.json`, `src/data/account.json`, `src/services/merchantApi.ts`, `src/ai/onboarding/parsers/location.ts`
- Test: `src/ai/onboarding/parsers/location.test.ts`

**Interfaces:**
- Consumes: `numbersToDigits` (Task 2); `GeoPoint`, `Landmark`, `Account` (Task 1).
- Produces:
  - `LOCATION_CONFIDENCE = 0.62`
  - `normalizePlace(text: string): string`
  - `parseLocation(text: string, landmarks: Landmark[]): { value: GeoPoint; confidence: number } | null`
  - `getAccount(): Account`, `getLandmarks(): Landmark[]` from `@/services/merchantApi.ts`

- [ ] **Step 1: Write the mock data and read service**

`src/data/landmarks.json`:
```json
[
  { "label": "ลาดพร้าว 71", "match": ["ลาดพร้าว 71", "ลาดพร้าวซอย 71", "ซอยลาดพร้าว 71"], "lat": 13.8016, "lng": 100.6033 },
  { "label": "อารีย์", "match": ["อารีย์", "พหลโยธิน 7"], "lat": 13.7797, "lng": 100.5446 },
  { "label": "สามย่าน", "match": ["สามย่าน"], "lat": 13.7325, "lng": 100.5293 }
]
```

`src/data/account.json`:
```json
{
  "ownerName": "แดง ใจดี",
  "phone": "0812344217",
  "maskedPhone": "08x-xxx-4217",
  "deviceLocation": { "text": "ลาดพร้าว 71", "lat": 13.8016, "lng": 100.6033 }
}
```

`src/services/merchantApi.ts`:
```ts
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
```

- [ ] **Step 2: Write the failing tests**

`src/ai/onboarding/parsers/location.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import landmarks from '@/data/landmarks.json'
import { LOCATION_CONFIDENCE, normalizePlace, parseLocation } from './location.ts'

describe('normalizePlace', () => {
  it('turns spoken numbers into digits and drops spaces and "ซอย"', () => {
    expect(normalizePlace('ลาดพร้าวซอยเจ็ดสิบเอ็ด')).toBe('ลาดพร้าว71')
    expect(normalizePlace('ซอยลาดพร้าว 71')).toBe('ลาดพร้าว71')
  })
})

describe('parseLocation', () => {
  it('finds the demo shop and keeps the landmark phrase', () => {
    const result = parseLocation('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น', landmarks)
    expect(result).toEqual({
      value: { text: 'ลาดพร้าว 71 ตรงข้ามเซเว่น', lat: 13.8016, lng: 100.6033 },
      confidence: LOCATION_CONFIDENCE,
    })
  })

  it('works with digits and no landmark phrase', () => {
    expect(parseLocation('อยู่ซอยลาดพร้าว 71 ค่ะ', landmarks)?.value.text).toBe('ลาดพร้าว 71')
  })

  it('matches other known areas', () => {
    expect(parseLocation('ร้านอยู่แถวอารีย์', landmarks)?.value.text).toBe('อารีย์')
  })

  it('is always below the pin-check threshold', () => {
    expect(LOCATION_CONFIDENCE).toBeLessThan(0.8)
  })

  it('returns null for unknown places', () => {
    expect(parseLocation('อยู่เชียงใหม่', landmarks)).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/parsers/location.test.ts`
Expected: FAIL, cannot resolve `./location.ts`.

- [ ] **Step 4: Implement**

`src/ai/onboarding/parsers/location.ts`:
```ts
import type { GeoPoint, Landmark } from '@/types/domain.ts'
import { numbersToDigits } from './thaiNumber.ts'

/** Landmark lookups are approximate, so the merchant always checks the pin in A2. */
export const LOCATION_CONFIDENCE = 0.62

const NEAR = /(ตรงข้าม|ข้างๆ|ข้าง|ใกล้|หน้า|ติดกับ|ติด)\s*([^\s,]+)/

/** "ลาดพร้าวซอยเจ็ดสิบเอ็ด" → "ลาดพร้าว71", so spoken and written addresses compare equal. */
export function normalizePlace(text: string): string {
  return numbersToDigits(text).replace(/\s+/g, '').replace(/ซอย|ซ\.|ถนน|ถ\./g, '')
}

export function parseLocation(text: string, landmarks: Landmark[]): { value: GeoPoint; confidence: number } | null {
  const place = normalizePlace(text)
  const landmark = landmarks.find((candidate) => candidate.match.some((name) => place.includes(normalizePlace(name))))
  if (!landmark) return null
  const near = NEAR.exec(text)
  const label = near ? `${landmark.label} ${near[1]}${near[2]}` : landmark.label
  return { value: { text: label, lat: landmark.lat, lng: landmark.lng }, confidence: LOCATION_CONFIDENCE }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/parsers/location.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/landmarks.json src/data/account.json src/services/merchantApi.ts src/ai/onboarding/parsers/location.ts src/ai/onboarding/parsers/location.test.ts
git commit -m "Add landmark-based location parser and mock account data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Store name, category and phone parsers

**Files:**
- Create: `src/ai/onboarding/parsers/particles.ts`, `storeName.ts`, `category.ts`, `phone.ts` (all in `src/ai/onboarding/parsers/`)
- Test: `src/ai/onboarding/parsers/storeName.test.ts`, `category.test.ts`, `phone.test.ts`

**Interfaces:**
- Consumes: `normalizeThaiDigits` (Task 2).
- Produces:
  - `stripParticles(text: string): string`
  - `NAME_CONFIDENCE = 0.93`, `ANSWER_CONFIDENCE = 0.85`, `parseStoreName(text): { value: string; confidence: number } | null`, `parseStoreNameAnswer(text): { value: string; confidence: number } | null`
  - `CATEGORY_LABELS: string[]`, `STATED_CONFIDENCE = 0.9`, `INFERRED_CONFIDENCE = 0.74`, `GUESSED_CONFIDENCE = 0.6`, `parseCategory(text): { value: string; confidence: number } | null`, `parseCategoryAnswer(text): { value: string; confidence: number } | null`
  - `parsePhone(text: string): string | null` — 10 digits starting with 0

- [ ] **Step 1: Write the failing tests**

`src/ai/onboarding/parsers/storeName.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ANSWER_CONFIDENCE, NAME_CONFIDENCE, parseStoreName, parseStoreNameAnswer } from './storeName.ts'

describe('parseStoreName', () => {
  it('reads "ร้านชื่อ…"', () => {
    expect(parseStoreName('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู')).toEqual({ value: 'ครัวป้าแดง', confidence: NAME_CONFIDENCE })
  })

  it('reads "ชื่อร้านว่า…"', () => {
    expect(parseStoreName('ชื่อร้านว่าครัวป้าแดง')?.value).toBe('ครัวป้าแดง')
  })

  it('stops at the next verb when there is no pause', () => {
    expect(parseStoreName('ร้านของป้าชื่อครัวป้าแดงขายน้ำพริก')?.value).toBe('ครัวป้าแดง')
  })

  it('ignores sentences that do not name the shop', () => {
    expect(parseStoreName('ร้านอยู่ลาดพร้าว')).toBeNull()
  })
})

describe('parseStoreNameAnswer', () => {
  it('takes the whole answer as the name', () => {
    expect(parseStoreNameAnswer('ครัวป้าแดงค่ะ')).toEqual({ value: 'ครัวป้าแดง', confidence: ANSWER_CONFIDENCE })
  })

  it('keeps a leading "ร้าน" that is part of the name', () => {
    expect(parseStoreNameAnswer('ร้านป้าแดงครับ')?.value).toBe('ร้านป้าแดง')
  })

  it('returns null for silence', () => {
    expect(parseStoreNameAnswer('  ')).toBeNull()
  })
})
```

`src/ai/onboarding/parsers/category.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { GUESSED_CONFIDENCE, INFERRED_CONFIDENCE, STATED_CONFIDENCE, parseCategory, parseCategoryAnswer } from './category.ts'

describe('parseCategory', () => {
  it('is confident when the category is said outright', () => {
    expect(parseCategory('ขายน้ำพริกปลาทู อาหารไทยบ้านๆ')).toEqual({ value: 'อาหารไทย', confidence: STATED_CONFIDENCE })
  })

  it('is less confident when guessed from a dish', () => {
    expect(parseCategory('ขายน้ำพริกปลาทู')).toEqual({ value: 'อาหารไทย', confidence: INFERRED_CONFIDENCE })
  })

  it('recognises drink shops', () => {
    expect(parseCategory('เป็นร้านกาแฟเล็กๆ')?.value).toBe('เครื่องดื่ม')
  })

  it('returns null when nothing matches', () => {
    expect(parseCategory('ขายรองเท้า')).toBeNull()
  })
})

describe('parseCategoryAnswer', () => {
  it('falls back to the answer itself, flagged for checking', () => {
    expect(parseCategoryAnswer('ขายส้มตำค่ะ')).toEqual({ value: 'ส้มตำ', confidence: GUESSED_CONFIDENCE })
  })

  it('prefers a known category', () => {
    expect(parseCategoryAnswer('อาหารไทย')?.confidence).toBe(STATED_CONFIDENCE)
  })
})
```

`src/ai/onboarding/parsers/phone.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parsePhone } from './phone.ts'

describe('parsePhone', () => {
  it('reads digit-by-digit Thai', () => {
    expect(parsePhone('ศูนย์แปดหนึ่ง สองสามสี่ สี่สองหนึ่งเจ็ด')).toBe('0812344217')
  })

  it('reads "โท" as 2 and ignores the word "โทร"', () => {
    expect(parsePhone('เบอร์โทร ศูนย์แปดโท สองสามสี่ ห้าหกเจ็ดแปด')).toBe('0822345678')
  })

  it('reads written numbers', () => {
    expect(parsePhone('081-234-4217')).toBe('0812344217')
    expect(parsePhone('๐๘๑๒๓๔๔๒๑๗')).toBe('0812344217')
  })

  it('rejects anything that is not a 10-digit Thai number', () => {
    expect(parsePhone('1234')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/parsers/storeName.test.ts src/ai/onboarding/parsers/category.test.ts src/ai/onboarding/parsers/phone.test.ts`
Expected: FAIL, cannot resolve `./storeName.ts`, `./category.ts`, `./phone.ts`.

- [ ] **Step 3: Implement**

`src/ai/onboarding/parsers/particles.ts`:
```ts
const TRAILING_PARTICLES = /(?:นะคะ|นะครับ|ค่ะ|ครับ|คะ|จ้ะ|จ้า)$/

/** "ครัวป้าแดงค่ะ" → "ครัวป้าแดง" */
export function stripParticles(text: string): string {
  return text.trim().replace(TRAILING_PARTICLES, '').trim()
}
```

`src/ai/onboarding/parsers/storeName.ts`:
```ts
import { stripParticles } from './particles.ts'

export const NAME_CONFIDENCE = 0.93
export const ANSWER_CONFIDENCE = 0.85

// "ร้านชื่อครัวป้าแดงค่ะ", "ร้านของป้าชื่อครัวป้าแดง", "ชื่อร้านว่าครัวป้าแดง".
// The name ends at a particle, a pause, or the next verb (ขาย/อยู่/เปิด).
const NAME_PATTERN = /(?:ร้าน\S*?ชื่อ|ชื่อร้าน)(?:ว่า)?\s*(\S+?)(?=นะ|ค่ะ|ครับ|คะ|ขาย|อยู่|เปิด|\s|$)/

export function parseStoreName(text: string): { value: string; confidence: number } | null {
  const match = NAME_PATTERN.exec(text)
  return match ? { value: match[1], confidence: NAME_CONFIDENCE } : null
}

/** Used right after the companion asked "ร้านชื่ออะไรคะ?": the whole answer is the name. */
export function parseStoreNameAnswer(text: string): { value: string; confidence: number } | null {
  const stated = parseStoreName(text)
  if (stated) return stated
  const value = stripParticles(text).replace(/^ชื่อ(?:ว่า)?/, '').trim()
  return value ? { value, confidence: ANSWER_CONFIDENCE } : null
}
```

`src/ai/onboarding/parsers/category.ts`:
```ts
import { stripParticles } from './particles.ts'

export const STATED_CONFIDENCE = 0.9
export const INFERRED_CONFIDENCE = 0.74
export const GUESSED_CONFIDENCE = 0.6

// words = the merchant names the category; hints = we guess it from a dish.
const CATEGORIES = [
  { label: 'อาหารไทย', words: ['อาหารไทย'], hints: ['น้ำพริก', 'แกง', 'กะเพรา', 'ต้มยำ', 'ผัดไทย'] },
  { label: 'อาหารตามสั่ง', words: ['ตามสั่ง'], hints: ['ข้าวผัด', 'ผัดซีอิ๊ว'] },
  { label: 'ก๋วยเตี๋ยว', words: ['ก๋วยเตี๋ยว'], hints: ['เส้นเล็ก', 'เกาเหลา'] },
  { label: 'เครื่องดื่ม', words: ['เครื่องดื่ม', 'ร้านกาแฟ'], hints: ['กาแฟ', 'ชานม', 'ชาไข่มุก'] },
  { label: 'ของหวาน', words: ['ของหวาน', 'ขนม'], hints: ['บิงซู', 'ไอศกรีม', 'บัวลอย'] },
]

export const CATEGORY_LABELS = CATEGORIES.map((category) => category.label)

export function parseCategory(text: string): { value: string; confidence: number } | null {
  const stated = CATEGORIES.find((category) => category.words.some((word) => text.includes(word)))
  if (stated) return { value: stated.label, confidence: STATED_CONFIDENCE }
  const inferred = CATEGORIES.find((category) => category.hints.some((hint) => text.includes(hint)))
  return inferred ? { value: inferred.label, confidence: INFERRED_CONFIDENCE } : null
}

/** Used right after the companion asked for the category: unknown answers are kept but flagged. */
export function parseCategoryAnswer(text: string): { value: string; confidence: number } | null {
  const known = parseCategory(text)
  if (known) return known
  const value = stripParticles(text).replace(/^ขาย/, '').trim()
  return value ? { value, confidence: GUESSED_CONFIDENCE } : null
}
```

`src/ai/onboarding/parsers/phone.ts`:
```ts
import { normalizeThaiDigits } from './thaiNumber.ts'

// Phone numbers are read digit by digit; Thais often say "โท" for 2.
const PHONE_DIGITS: [string, string][] = [
  ['ศูนย์', '0'],
  ['หนึ่ง', '1'],
  ['นึง', '1'],
  ['สอง', '2'],
  ['โท', '2'],
  ['สาม', '3'],
  ['สี่', '4'],
  ['ห้า', '5'],
  ['หก', '6'],
  ['เจ็ด', '7'],
  ['แปด', '8'],
  ['เก้า', '9'],
]

/** "ศูนย์แปดหนึ่ง สองสามสี่…" → "081234…". Null unless it is a 10-digit number starting with 0. */
export function parsePhone(input: string): string | null {
  // Remove "โทร" first so its "โท" is not read as a 2.
  let text = normalizeThaiDigits(input).replace(/โทรศัพท์|โทร/g, '')
  for (const [word, digit] of PHONE_DIGITS) text = text.split(word).join(digit)
  const digits = text.replace(/\D/g, '')
  return /^0\d{9}$/.test(digits) ? digits : null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/parsers`
Expected: PASS (all parser tests from Tasks 2–6).

- [ ] **Step 5: Commit**

```bash
git add src/ai/onboarding/parsers
git commit -m "Add store-name, category and phone parsers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Profile state and the utterance extractor

**Files:**
- Create: `src/ai/onboarding/profile.ts`, `src/ai/onboarding/extractProfile.ts`
- Test: `src/ai/onboarding/profile.test.ts`, `src/ai/onboarding/extractProfile.test.ts`

**Interfaces:**
- Consumes: all parsers (Tasks 2–6); domain types (Task 1).
- Produces (`profile.ts`):
  - `PROFILE_FIELDS: ProfileFieldKey[]` = `['storeName', 'category', 'location', 'hours', 'menu', 'phone']`
  - `CHECK_THRESHOLD = 0.8`
  - `createEmptyProfile(sessionId?: string): OnboardingProfile`
  - `applyUpdates(profile, updates: ProfileUpdates): OnboardingProfile` — sets `heard`; merges menus; location → `needsPinCheck: true`
  - `confirmField(profile, key): OnboardingProfile` — location also clears `needsPinCheck`
  - `reaskField(profile, key): OnboardingProfile` — back to `empty`
  - `removeMenuItem(profile, name: string): OnboardingProfile`
  - `needsCheck(field: { status: FieldStatus; confidence?: number }): boolean`
  - `countHeard(profile): number`, `isReadyForReview(profile): boolean`
- Produces (`extractProfile.ts`):
  - `HOURS_CONFIDENCE = 0.95`, `MENU_CONFIDENCE = 0.9`, `PHONE_CONFIDENCE = 0.9`
  - `interface ExtractContext { expecting?: ProfileFieldKey; landmarks: Landmark[] }`
  - `extractProfile(utterance: string, ctx: ExtractContext): ProfileUpdates`

- [ ] **Step 1: Write the failing profile tests**

`src/ai/onboarding/profile.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  applyUpdates,
  confirmField,
  countHeard,
  createEmptyProfile,
  isReadyForReview,
  needsCheck,
  PROFILE_FIELDS,
  reaskField,
  removeMenuItem,
} from './profile.ts'

const PIN = { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }

describe('createEmptyProfile', () => {
  it('starts every field empty and offers the account phone', () => {
    const profile = createEmptyProfile()
    expect(PROFILE_FIELDS.every((key) => profile.fields[key].status === 'empty')).toBe(true)
    expect(profile.fields.phone.suggestFromAccount).toBe(true)
  })
})

describe('applyUpdates', () => {
  it('marks fields heard with confidence and source words', () => {
    const profile = applyUpdates(createEmptyProfile(), {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'ร้านชื่อครัวป้าแดงค่ะ' },
    })
    expect(profile.fields.storeName).toEqual({ value: 'ครัวป้าแดง', status: 'heard', confidence: 0.93, heardFrom: 'ร้านชื่อครัวป้าแดงค่ะ' })
  })

  it('always asks for a pin check on a new location', () => {
    const profile = applyUpdates(createEmptyProfile(), { location: { value: PIN, confidence: 0.62, heardFrom: 'x' } })
    expect(profile.fields.location.needsPinCheck).toBe(true)
  })

  it('merges menus: same name is replaced, new names are appended', () => {
    const first = applyUpdates(createEmptyProfile(), {
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 30 }], confidence: 0.9, heardFrom: 'a' },
    })
    const second = applyUpdates(first, {
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }, { name: 'น้ำกระเจี๊ยบ', priceTHB: 30 }], confidence: 0.9, heardFrom: 'b' },
    })
    expect(second.fields.menu.value).toEqual([
      { name: 'ชาไทยเย็น', priceTHB: 35 },
      { name: 'น้ำกระเจี๊ยบ', priceTHB: 30 },
    ])
  })

  it('does not change the profile it was given', () => {
    const profile = createEmptyProfile()
    applyUpdates(profile, { category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' } })
    expect(profile.fields.category.status).toBe('empty')
  })
})

describe('confirmField', () => {
  it('confirms a heard field', () => {
    const heard = applyUpdates(createEmptyProfile(), { category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' } })
    expect(confirmField(heard, 'category').fields.category.status).toBe('confirmed')
  })

  it('clears the pin check when the location is confirmed', () => {
    const heard = applyUpdates(createEmptyProfile(), { location: { value: PIN, confidence: 0.62, heardFrom: 'x' } })
    const confirmed = confirmField(heard, 'location')
    expect(confirmed.fields.location.status).toBe('confirmed')
    expect(confirmed.fields.location.needsPinCheck).toBe(false)
  })

  it('cannot confirm an empty field', () => {
    const profile = createEmptyProfile()
    expect(confirmField(profile, 'hours')).toBe(profile)
  })
})

describe('reaskField', () => {
  it('empties the field so the companion asks again', () => {
    const heard = applyUpdates(createEmptyProfile(), { storeName: { value: 'ครัว', confidence: 0.85, heardFrom: 'ครัว' } })
    expect(reaskField(heard, 'storeName').fields.storeName).toEqual({ value: null, status: 'empty', confidence: undefined, heardFrom: undefined })
  })
})

describe('removeMenuItem', () => {
  const withMenu = applyUpdates(createEmptyProfile(), {
    menu: { value: [{ name: 'ก', priceTHB: 10 }, { name: 'ข', priceTHB: 20 }], confidence: 0.9, heardFrom: 'x' },
  })

  it('removes one item', () => {
    expect(removeMenuItem(withMenu, 'ก').fields.menu.value).toEqual([{ name: 'ข', priceTHB: 20 }])
  })

  it('empties the field when the last item goes', () => {
    const none = removeMenuItem(removeMenuItem(withMenu, 'ก'), 'ข')
    expect(none.fields.menu.status).toBe('empty')
  })
})

describe('needsCheck', () => {
  it('flags heard fields below 0.8', () => {
    expect(needsCheck({ status: 'heard', confidence: 0.62 })).toBe(true)
    expect(needsCheck({ status: 'heard', confidence: 0.9 })).toBe(false)
  })

  it('never flags confirmed fields', () => {
    expect(needsCheck({ status: 'confirmed', confidence: 0.62 })).toBe(false)
  })
})

describe('progress', () => {
  it('counts heard fields and knows when review can start', () => {
    let profile = createEmptyProfile()
    expect(countHeard(profile)).toBe(0)
    expect(isReadyForReview(profile)).toBe(false)
    profile = applyUpdates(profile, {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
      category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
      location: { value: PIN, confidence: 0.62, heardFrom: 'x' },
      hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
      phone: { value: '0812344217', confidence: 1, heardFrom: 'x' },
    })
    expect(countHeard(profile)).toBe(6)
    expect(isReadyForReview(profile)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/profile.test.ts`
Expected: FAIL, cannot resolve `./profile.ts`.

- [ ] **Step 3: Implement profile state**

`src/ai/onboarding/profile.ts`:
```ts
import type {
  FieldStatus,
  MenuEntry,
  OnboardingProfile,
  ProfileFieldKey,
  ProfileFields,
  ProfileUpdates,
} from '@/types/domain.ts'

/** The order the companion asks in, and the order fields are listed on screen. */
export const PROFILE_FIELDS: ProfileFieldKey[] = ['storeName', 'category', 'location', 'hours', 'menu', 'phone']

/** Heard values below this confidence are shown amber in A2. */
export const CHECK_THRESHOLD = 0.8

export function createEmptyProfile(sessionId = 'onb_001'): OnboardingProfile {
  return {
    sessionId,
    fields: {
      storeName: { value: null, status: 'empty' },
      category: { value: null, status: 'empty' },
      location: { value: null, status: 'empty' },
      hours: { value: null, status: 'empty' },
      menu: { value: null, status: 'empty' },
      phone: { value: null, status: 'empty', suggestFromAccount: true },
    },
  }
}

function patch<K extends ProfileFieldKey>(profile: OnboardingProfile, key: K, change: Partial<ProfileFields[K]>): OnboardingProfile {
  const fields = { ...profile.fields, [key]: { ...profile.fields[key], ...change } } as ProfileFields
  return { ...profile, fields }
}

function mergeMenu(current: MenuEntry[] | null, incoming: MenuEntry[]): MenuEntry[] {
  const merged = [...(current ?? [])]
  for (const item of incoming) {
    const index = merged.findIndex((existing) => existing.name === item.name)
    if (index === -1) merged.push(item)
    else merged[index] = item
  }
  return merged
}

export function applyUpdates(profile: OnboardingProfile, updates: ProfileUpdates): OnboardingProfile {
  let next = profile
  for (const key of PROFILE_FIELDS) {
    const update = updates[key]
    if (!update) continue
    const value = key === 'menu' ? mergeMenu(next.fields.menu.value, update.value as MenuEntry[]) : update.value
    const change = { value, status: 'heard', confidence: update.confidence, heardFrom: update.heardFrom }
    next = patch(next, key, change as Partial<ProfileFields[typeof key]>)
  }
  if (updates.location) next = patch(next, 'location', { needsPinCheck: true })
  return next
}

export function confirmField(profile: OnboardingProfile, key: ProfileFieldKey): OnboardingProfile {
  if (profile.fields[key].status === 'empty') return profile
  const confirmed = patch(profile, key, { status: 'confirmed' })
  return key === 'location' ? patch(confirmed, 'location', { needsPinCheck: false }) : confirmed
}

export function reaskField(profile: OnboardingProfile, key: ProfileFieldKey): OnboardingProfile {
  return patch(profile, key, { value: null, status: 'empty', confidence: undefined, heardFrom: undefined })
}

export function removeMenuItem(profile: OnboardingProfile, name: string): OnboardingProfile {
  const menu = (profile.fields.menu.value ?? []).filter((item) => item.name !== name)
  return menu.length > 0 ? patch(profile, 'menu', { value: menu }) : reaskField(profile, 'menu')
}

export function needsCheck(field: { status: FieldStatus; confidence?: number }): boolean {
  return field.status === 'heard' && (field.confidence ?? 1) < CHECK_THRESHOLD
}

export function countHeard(profile: OnboardingProfile): number {
  return PROFILE_FIELDS.filter((key) => profile.fields[key].status !== 'empty').length
}

export function isReadyForReview(profile: OnboardingProfile): boolean {
  return countHeard(profile) === PROFILE_FIELDS.length
}
```

- [ ] **Step 4: Run the profile tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing extractor tests**

`src/ai/onboarding/extractProfile.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import landmarks from '@/data/landmarks.json'
import { extractProfile, HOURS_CONFIDENCE, MENU_CONFIDENCE } from './extractProfile.ts'

const LINE_1 = 'ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น'
const LINE_2 = 'สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน'
const LINE_3 = 'น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้า แกงเขียวหวานเจ็ดสิบห้า ชาไทยเย็นสามสิบห้า น้ำกระเจี๊ยบสามสิบบาท'

describe('extractProfile: open talk', () => {
  it('fills name, category and location from the opening sentence', () => {
    const updates = extractProfile(LINE_1, { landmarks })
    expect(Object.keys(updates).sort()).toEqual(['category', 'location', 'storeName'])
    expect(updates.storeName).toEqual({ value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: LINE_1 })
    expect(updates.category?.value).toBe('อาหารไทย')
    expect(updates.location?.value.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
  })

  it('does not read the soi number as a dish price', () => {
    expect(extractProfile(LINE_1, { landmarks }).menu).toBeUndefined()
  })

  it('reads a menu in open talk when the merchant talks about prices', () => {
    expect(extractProfile('มีเมนูข้าวมันไก่ห้าสิบบาท', { landmarks }).menu?.value).toEqual([{ name: 'ข้าวมันไก่', priceTHB: 50 }])
  })

  it('returns nothing for silence', () => {
    expect(extractProfile('   ', { landmarks })).toEqual({})
  })
})

describe('extractProfile: answering a question', () => {
  it('reads opening hours', () => {
    expect(extractProfile(LINE_2, { expecting: 'hours', landmarks }).hours).toEqual({
      value: { open: '10:00', close: '20:00', closedDays: [] },
      confidence: HOURS_CONFIDENCE,
      heardFrom: LINE_2,
    })
  })

  it('reads the full menu', () => {
    const menu = extractProfile(LINE_3, { expecting: 'menu', landmarks }).menu
    expect(menu?.value).toHaveLength(5)
    expect(menu?.confidence).toBe(MENU_CONFIDENCE)
  })

  it('takes a bare answer as the store name', () => {
    expect(extractProfile('ครัวป้าแดงค่ะ', { expecting: 'storeName', landmarks }).storeName?.value).toBe('ครัวป้าแดง')
  })

  it('reads a spoken phone number', () => {
    expect(extractProfile('ศูนย์แปดหนึ่ง สองสามสี่ สี่สองหนึ่งเจ็ด', { expecting: 'phone', landmarks }).phone?.value).toBe('0812344217')
  })

  it('only looks for the field that was asked about', () => {
    expect(Object.keys(extractProfile(LINE_1, { expecting: 'hours', landmarks }))).toEqual([])
  })

  it('returns nothing when the answer cannot be understood', () => {
    expect(extractProfile('ไม่แน่ใจค่ะ', { expecting: 'hours', landmarks })).toEqual({})
  })
})
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/extractProfile.test.ts`
Expected: FAIL, cannot resolve `./extractProfile.ts`.

- [ ] **Step 7: Implement the extractor**

`src/ai/onboarding/extractProfile.ts`:
```ts
import type { Landmark, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'
import { parseCategory, parseCategoryAnswer } from './parsers/category.ts'
import { parseLocation } from './parsers/location.ts'
import { parseMenuItems } from './parsers/menuItems.ts'
import { parsePhone } from './parsers/phone.ts'
import { parseStoreName, parseStoreNameAnswer } from './parsers/storeName.ts'
import { parseOpeningHours } from './parsers/thaiTime.ts'

export const HOURS_CONFIDENCE = 0.95
export const MENU_CONFIDENCE = 0.9
export const PHONE_CONFIDENCE = 0.9

export interface ExtractContext {
  expecting?: ProfileFieldKey // set when the companion just asked about one field
  landmarks: Landmark[]
}

/** One utterance → the profile fields it mentions. Pure: it never changes a profile itself. */
export function extractProfile(utterance: string, ctx: ExtractContext): ProfileUpdates {
  const text = utterance.trim()
  if (!text) return {}
  return ctx.expecting ? extractAnswer(text, ctx.expecting, ctx.landmarks) : extractOpenTalk(text, ctx.landmarks)
}

function extractOpenTalk(text: string, landmarks: Landmark[]): ProfileUpdates {
  const updates: ProfileUpdates = {}
  const heardFrom = text
  const storeName = parseStoreName(text)
  if (storeName) updates.storeName = { ...storeName, heardFrom }
  const category = parseCategory(text)
  if (category) updates.category = { ...category, heardFrom }
  const location = parseLocation(text, landmarks)
  if (location) updates.location = { ...location, heardFrom }
  const hours = parseOpeningHours(text)
  if (hours) updates.hours = { value: hours, confidence: HOURS_CONFIDENCE, heardFrom }
  // Only read prices when the merchant is clearly talking about the menu;
  // otherwise "ซอยเจ็ดสิบเอ็ด" would become a ฿71 dish.
  if (/บาท|เมนู/.test(text)) {
    const menu = parseMenuItems(text)
    if (menu.length > 0) updates.menu = { value: menu, confidence: MENU_CONFIDENCE, heardFrom }
  }
  return updates
}

function extractAnswer(text: string, field: ProfileFieldKey, landmarks: Landmark[]): ProfileUpdates {
  const heardFrom = text
  switch (field) {
    case 'storeName': {
      const storeName = parseStoreNameAnswer(text)
      return storeName ? { storeName: { ...storeName, heardFrom } } : {}
    }
    case 'category': {
      const category = parseCategoryAnswer(text)
      return category ? { category: { ...category, heardFrom } } : {}
    }
    case 'location': {
      const location = parseLocation(text, landmarks)
      return location ? { location: { ...location, heardFrom } } : {}
    }
    case 'hours': {
      const hours = parseOpeningHours(text)
      return hours ? { hours: { value: hours, confidence: HOURS_CONFIDENCE, heardFrom } } : {}
    }
    case 'menu': {
      const menu = parseMenuItems(text)
      return menu.length > 0 ? { menu: { value: menu, confidence: MENU_CONFIDENCE, heardFrom } } : {}
    }
    case 'phone': {
      const phone = parsePhone(text)
      return phone ? { phone: { value: phone, confidence: PHONE_CONFIDENCE, heardFrom } } : {}
    }
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding`
Expected: PASS (all onboarding tests so far).

- [ ] **Step 9: Commit**

```bash
git add src/ai/onboarding/profile.ts src/ai/onboarding/profile.test.ts src/ai/onboarding/extractProfile.ts src/ai/onboarding/extractProfile.test.ts
git commit -m "Add onboarding profile state and utterance extractor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Thai copy and the follow-up picker

**Files:**
- Create: `src/copy/th.ts`, `src/ai/onboarding/followUp.ts`
- Test: `src/ai/onboarding/followUp.test.ts`

**Interfaces:**
- Consumes: `PROFILE_FIELDS`, `applyUpdates`, `createEmptyProfile` (Task 7); `CATEGORY_LABELS` (Task 6); `getAccount` (Task 5).
- Produces:
  - `th` — every merchant-facing string (full object below; later tasks only read from it)
  - `pickFollowUp(profile: OnboardingProfile, account: Account): FollowUpQuestion | null`

- [ ] **Step 1: Write the copy file**

`src/copy/th.ts`:
```ts
/** Every merchant-facing string. Tone: warm and polite (ค่ะ/คะ), short sentences; the companion calls itself หนู. */
export const th = {
  companion: {
    name: 'ผู้ช่วยร้าน',
  },
  fields: {
    storeName: 'ชื่อร้าน',
    category: 'ประเภทอาหาร',
    location: 'ที่ตั้ง',
    hours: 'เวลาเปิด-ปิด',
    menu: 'เมนู',
    phone: 'เบอร์ติดต่อ',
  },
  onboarding: {
    title: 'เปิดร้านบน Grab',
    greeting: 'สวัสดีค่ะ แค่เล่าเรื่องร้านให้ฟัง ไม่ต้องพิมพ์เลยนะคะ ใช้เวลาประมาณ 3 นาที',
    progress: (done: number, total: number) => `เรียบร้อย ${done}/${total}`,
    notHeard: 'หนูยังไม่ได้ยินค่ะ ลองพูดอีกครั้งนะคะ',
    notUnderstood: 'หนูยังไม่เข้าใจค่ะ ลองพูดใหม่ หรือกดเลือกด้านล่างได้เลยนะคะ',
    typeInstead: 'พิมพ์แทน',
    typePlaceholder: 'พิมพ์ข้อความที่นี่',
    send: 'ส่ง',
    closeTyping: 'ปิดช่องพิมพ์',
    toReview: 'ตรวจทานข้อมูล',
    allHeard: 'ได้ข้อมูลครบแล้วค่ะ! กด "ตรวจทานข้อมูล" ได้เลย',
    scanMenuToast: 'ในแอปจริง ปุ่มนี้จะเปิด "สแกนเมนู" ของ Grab ให้ถ่ายรูปเมนูค่ะ',
    removeItem: (name: string) => `ลบ ${name}`,
  },
  followUp: {
    open: 'เล่าเรื่องร้านให้ฟังหน่อยค่ะ ร้านชื่ออะไร ขายอะไร อยู่ตรงไหน',
    storeName: 'ร้านชื่ออะไรคะ?',
    category: 'ร้านขายอาหารประเภทไหนคะ?',
    location: 'ร้านอยู่ตรงไหนคะ? บอกซอยหรือจุดสังเกตได้เลย',
    hours: 'ร้านเปิดกี่โมงถึงกี่โมงคะ?',
    menu: 'มีเมนูอะไรบ้างคะ บอกพร้อมราคาได้เลย',
    phone: (maskedPhone: string) => `ใช้เบอร์ ${maskedPhone} ที่ล็อกอินอยู่ไหมคะ?`,
  },
  chips: {
    yes: 'ใช่',
    otherPhone: 'ใช้เบอร์อื่น',
    useDeviceLocation: 'ใช้ตำแหน่งปัจจุบัน',
    scanMenu: 'ถ่ายรูปเมนูแทน',
  },
  mic: {
    idle: 'กดแล้วพูดได้เลย',
    listening: 'กำลังฟัง…',
    processing: 'กำลังคิด…',
    error: 'ไมค์ใช้ไม่ได้ กดเลือกด้านล่างแทนนะคะ',
    unsupported: 'เครื่องนี้ใช้ไมค์ไม่ได้ พิมพ์หรือกดเลือกแทนนะคะ',
  },
  review: {
    title: 'AI ฟังได้ว่า…',
    subtitle: 'ช่วยตรวจทีละข้อ ถ้าถูกแล้วกด "ถูกแล้ว" ค่ะ',
    customerSees: 'ลูกค้าจะเห็นร้านแบบนี้',
    heardFrom: 'ได้ยินว่า',
    source: 'ที่มา',
    pleaseCheck: 'ช่วยเช็คหน่อยค่ะ',
    confirm: 'ถูกแล้ว',
    edit: 'แก้ไข',
    confirmed: 'ยืนยันแล้ว',
    pinQuestion: 'หมุดถูกไหมคะ?',
    mapAlt: (place: string) => `แผนที่ร้าน: ${place}`,
    owner: 'เจ้าของร้าน',
    fromAccount: 'จากบัญชีที่ล็อกอิน',
    submit: 'ยืนยันและส่งสมัคร',
    submitting: 'กำลังส่งข้อมูล…',
    nothingSentYet: 'ยังไม่ส่งข้อมูลจนกว่าคุณจะกดยืนยัน',
    remaining: (count: number) => `เหลืออีก ${count} ข้อที่ต้องยืนยัน`,
    apiError: 'ตอนนี้ระบบช้าอยู่ค่ะ ลองกดอีกครั้งนะคะ',
    listen: 'ฟังสรุป',
    menuCount: (count: number) => `${count} รายการ`,
    moreItems: (count: number) => `และอีก ${count} เมนู`,
  },
  checks: {
    allConfirmed: 'ยืนยันข้อมูลครบแล้ว',
    unconfirmed: (count: number) => `ยังมีข้อมูลที่ต้องยืนยัน ${count} ข้อ`,
    pinOk: 'ยืนยันหมุดร้านแล้ว',
    pinMissing: 'ยังไม่ได้ยืนยันหมุดร้าน',
    menuOk: 'เมนูมีราคาครบ',
    menuMissing: 'ต้องมีอย่างน้อย 1 เมนูพร้อมราคา',
    hoursOk: 'เวลาเปิด-ปิดถูกต้อง',
    hoursInvalid: 'เวลาเปิดและเวลาปิดต้องไม่ตรงกัน',
    phoneOk: 'เบอร์โทรถูกต้อง',
    phoneInvalid: 'เบอร์โทรต้องมี 10 หลัก และขึ้นต้นด้วย 0',
  },
  submitted: {
    title: 'ส่งข้อมูลร้านแล้วค่ะ 🎉',
    elapsed: (duration: string) => `คุยกันแค่ ${duration} ก็เสร็จ`,
    nextTitle: 'ขั้นต่อไป',
    upNext: 'ต่อไป',
    steps: ['ถ่ายรูปบัตรประชาชนและสมุดบัญชี (หนูจะพาทำ)', 'Grab ตรวจสอบข้อมูล', 'เปิดรับออเดอร์'],
    continue: 'ดูต่อ: 30 วันต่อมา',
  },
  transition: {
    title: '30 วันต่อมา…',
    body: 'ครัวป้าแดงขายบน Grab มาได้ 1 เดือนแล้ว',
    cta: 'ไปที่หน้าร้าน',
  },
  act2Placeholder: {
    title: 'หน้าร้าน',
    body: 'หน้าร้านและคำแนะนำจาก AI (Act 2) จะสร้างในแผนที่ 2',
  },
}
```

- [ ] **Step 2: Write the failing follow-up tests**

`src/ai/onboarding/followUp.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { getAccount } from '@/services/merchantApi.ts'
import { pickFollowUp } from './followUp.ts'
import { applyUpdates, createEmptyProfile } from './profile.ts'

const account = getAccount()

const afterLine1 = applyUpdates(createEmptyProfile(), {
  storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
  category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
  location: { value: { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }, confidence: 0.62, heardFrom: 'x' },
})
const afterHours = applyUpdates(afterLine1, {
  hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
})
const afterMenu = applyUpdates(afterHours, {
  menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
})

describe('pickFollowUp', () => {
  it('opens with the free-talk prompt', () => {
    expect(pickFollowUp(createEmptyProfile(), account)).toEqual({ field: null, text: th.followUp.open, chips: [] })
  })

  it('asks for opening hours after the opening sentence, with time chips', () => {
    const question = pickFollowUp(afterLine1, account)
    expect(question?.field).toBe('hours')
    expect(question?.chips.map((chip) => chip.label)).toEqual(['10:00 – 20:00', '07:00 – 15:00'])
  })

  it('asks for the menu next, offering the photo scan', () => {
    const question = pickFollowUp(afterHours, account)
    expect(question?.field).toBe('menu')
    expect(question?.chips).toEqual([{ label: th.chips.scanMenu, kind: 'scanMenu' }])
  })

  it('offers the logged-in phone number last', () => {
    const question = pickFollowUp(afterMenu, account)
    expect(question?.field).toBe('phone')
    expect(question?.text).toContain('08x-xxx-4217')
    expect(question?.chips.map((chip) => chip.kind)).toEqual(['useAccountPhone', 'startMic'])
  })

  it('offers category chips when the category is missing', () => {
    const onlyName = applyUpdates(createEmptyProfile(), {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
    })
    const question = pickFollowUp(onlyName, account)
    expect(question?.field).toBe('category')
    expect(question?.chips).toHaveLength(4)
    expect(question?.chips.every((chip) => chip.kind === 'say')).toBe(true)
  })

  it('has nothing to ask once every field is heard', () => {
    const complete = applyUpdates(afterMenu, { phone: { value: account.phone, confidence: 1, heardFrom: 'x' } })
    expect(pickFollowUp(complete, account)).toBeNull()
  })

  it('does not re-ask low-confidence fields (A2 flags them instead)', () => {
    expect(pickFollowUp(afterLine1, account)?.field).not.toBe('location')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/followUp.test.ts`
Expected: FAIL, cannot resolve `./followUp.ts`.

- [ ] **Step 4: Implement**

`src/ai/onboarding/followUp.ts`:
```ts
import { th } from '@/copy/th.ts'
import type { Account, FollowUpChip, FollowUpQuestion, OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'
import { CATEGORY_LABELS } from './parsers/category.ts'
import { PROFILE_FIELDS } from './profile.ts'

const QUESTIONS: Record<ProfileFieldKey, (account: Account) => FollowUpQuestion> = {
  storeName: () => ({ field: 'storeName', text: th.followUp.storeName, chips: [] }),
  category: () => ({
    field: 'category',
    text: th.followUp.category,
    chips: CATEGORY_LABELS.slice(0, 4).map((label): FollowUpChip => ({ label, kind: 'say' })),
  }),
  location: () => ({
    field: 'location',
    text: th.followUp.location,
    chips: [{ label: th.chips.useDeviceLocation, kind: 'useDeviceLocation' }],
  }),
  hours: () => ({
    field: 'hours',
    text: th.followUp.hours,
    chips: [
      { label: '10:00 – 20:00', kind: 'say' },
      { label: '07:00 – 15:00', kind: 'say' },
    ],
  }),
  menu: () => ({
    field: 'menu',
    text: th.followUp.menu,
    chips: [{ label: th.chips.scanMenu, kind: 'scanMenu' }],
  }),
  phone: (account) => ({
    field: 'phone',
    text: th.followUp.phone(account.maskedPhone),
    chips: [
      { label: th.chips.yes, kind: 'useAccountPhone' },
      { label: th.chips.otherPhone, kind: 'startMic' },
    ],
  }),
}

/**
 * What the companion should ask next, or null when every field has been heard.
 * Only empty fields are asked about; low-confidence values are flagged in A2 instead of re-asked.
 */
export function pickFollowUp(profile: OnboardingProfile, account: Account): FollowUpQuestion | null {
  const { fields } = profile
  if (PROFILE_FIELDS.every((key) => fields[key].status === 'empty')) {
    return { field: null, text: th.followUp.open, chips: [] }
  }
  const next = PROFILE_FIELDS.find((key) => fields[key].status === 'empty')
  return next ? QUESTIONS[next](account) : null
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ai/onboarding/followUp.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/copy/th.ts src/ai/onboarding/followUp.ts src/ai/onboarding/followUp.test.ts
git commit -m "Add Thai copy and the follow-up question picker" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Submission guardrail, mock write API and the architecture test

**Files:**
- Create: `src/services/demoFlags.ts`, `src/services/merchantApi.write.ts`, `src/ai/onboarding/submit.ts`, `src/architecture.test.ts`
- Test: `src/services/merchantApi.write.test.ts`, `src/ai/onboarding/submit.test.ts`

**Interfaces:**
- Consumes: `PROFILE_FIELDS`, `applyUpdates`, `confirmField`, `createEmptyProfile` (Task 7); `th.checks` (Task 8).
- Produces:
  - `demoFlags: { simulateApiFailure: boolean }`
  - `interface ApplicationReceipt { applicationId: string; submittedAt: string }`, `class ApiUnavailableError`, `submitApplication(profile): Promise<ApplicationReceipt>` (800 ms simulated latency)
  - `runSubmissionChecks(profile): GuardrailCheck[]` (ids: `ALL_CONFIRMED`, `PIN_CONFIRMED`, `MENU_VALID`, `HOURS_VALID`, `PHONE_VALID`)
  - `class SubmissionBlockedError extends Error { readonly failed: GuardrailCheck[] }`
  - `submitProfile(profile): Promise<ApplicationReceipt>` — the only caller of `submitApplication`

- [ ] **Step 1: Write the failing write-API tests**

`src/services/merchantApi.write.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { demoFlags } from './demoFlags.ts'
import { ApiUnavailableError, submitApplication } from './merchantApi.write.ts'

afterEach(() => {
  vi.useRealTimers()
  demoFlags.simulateApiFailure = false
})

describe('submitApplication (mock)', () => {
  it('resolves with a receipt after the simulated delay', async () => {
    vi.useFakeTimers()
    const result = submitApplication(createEmptyProfile('onb_test'))
    await vi.advanceTimersByTimeAsync(800)
    await expect(result).resolves.toMatchObject({ applicationId: 'APP-ONB_TEST' })
  })

  it('fails when the presenter simulates an outage', async () => {
    vi.useFakeTimers()
    demoFlags.simulateApiFailure = true
    const assertion = expect(submitApplication(createEmptyProfile())).rejects.toBeInstanceOf(ApiUnavailableError)
    await vi.advanceTimersByTimeAsync(800)
    await assertion
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/merchantApi.write.test.ts`
Expected: FAIL, cannot resolve `./demoFlags.ts`.

- [ ] **Step 3: Implement the mock write API**

`src/services/demoFlags.ts`:
```ts
/** Presenter switches, flipped from the DemoPanel. */
export const demoFlags = {
  simulateApiFailure: false,
}
```

`src/services/merchantApi.write.ts`:
```ts
import type { OnboardingProfile } from '@/types/domain.ts'
import { demoFlags } from './demoFlags.ts'

// Write calls to the (mock) Grab backend. Only guardrail modules may import this file;
// src/architecture.test.ts enforces that.

export interface ApplicationReceipt {
  applicationId: string
  submittedAt: string
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('Mock Grab API is unavailable')
    this.name = 'ApiUnavailableError'
  }
}

const LATENCY_MS = 800

export function submitApplication(profile: OnboardingProfile): Promise<ApplicationReceipt> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (demoFlags.simulateApiFailure) {
        reject(new ApiUnavailableError())
        return
      }
      resolve({ applicationId: `APP-${profile.sessionId.toUpperCase()}`, submittedAt: new Date().toISOString() })
    }, LATENCY_MS)
  })
}
```

- [ ] **Step 4: Run the write-API tests to verify they pass**

Run: `npx vitest run src/services/merchantApi.write.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing guardrail tests**

`src/ai/onboarding/submit.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitApplication } from '@/services/merchantApi.write.ts'
import type { OnboardingProfile, ProfileUpdates } from '@/types/domain.ts'
import { applyUpdates, confirmField, createEmptyProfile, PROFILE_FIELDS } from './profile.ts'
import { runSubmissionChecks, SubmissionBlockedError, submitProfile } from './submit.ts'

vi.mock('@/services/merchantApi.write.ts', () => ({
  submitApplication: vi.fn(async () => ({ applicationId: 'APP-TEST', submittedAt: '2026-10-13T06:30:00.000Z' })),
}))

const VALID: ProfileUpdates = {
  storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
  category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
  location: { value: { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }, confidence: 0.62, heardFrom: 'x' },
  hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
  menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
  phone: { value: '0812344217', confidence: 1, heardFrom: 'x' },
}

function confirmedProfile(overrides: ProfileUpdates = {}): OnboardingProfile {
  const heard = applyUpdates(createEmptyProfile(), { ...VALID, ...overrides })
  return PROFILE_FIELDS.reduce((profile, key) => confirmField(profile, key), heard)
}

const check = (profile: OnboardingProfile, id: string) => runSubmissionChecks(profile).find((c) => c.id === id)

beforeEach(() => {
  vi.mocked(submitApplication).mockClear()
})

describe('runSubmissionChecks', () => {
  it('passes every check for a fully confirmed, valid profile', () => {
    expect(runSubmissionChecks(confirmedProfile()).every((c) => c.pass)).toBe(true)
  })

  it('counts unconfirmed fields', () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    const twoLeft = PROFILE_FIELDS.slice(0, 4).reduce((profile, key) => confirmField(profile, key), heardOnly)
    expect(check(twoLeft, 'ALL_CONFIRMED')).toEqual({ id: 'ALL_CONFIRMED', pass: false, message: 'ยังมีข้อมูลที่ต้องยืนยัน 2 ข้อ' })
  })

  it('requires the map pin to be confirmed', () => {
    const pinNotChecked = applyUpdates(createEmptyProfile(), VALID)
    expect(check(pinNotChecked, 'PIN_CONFIRMED')?.pass).toBe(false)
  })

  it('rejects a menu item without a price', () => {
    const free = confirmedProfile({ menu: { value: [{ name: 'น้ำเปล่า', priceTHB: 0 }], confidence: 0.9, heardFrom: 'x' } })
    expect(check(free, 'MENU_VALID')?.pass).toBe(false)
  })

  it('rejects identical open and close times', () => {
    const same = confirmedProfile({ hours: { value: { open: '10:00', close: '10:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' } })
    expect(check(same, 'HOURS_VALID')?.pass).toBe(false)
  })

  it('rejects a phone number that is not 10 digits', () => {
    const short = confirmedProfile({ phone: { value: '12345', confidence: 0.9, heardFrom: 'x' } })
    expect(check(short, 'PHONE_VALID')?.pass).toBe(false)
  })
})

describe('submitProfile', () => {
  it('never calls the API when a check fails', async () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    await expect(submitProfile(heardOnly)).rejects.toBeInstanceOf(SubmissionBlockedError)
    expect(submitApplication).not.toHaveBeenCalled()
  })

  it('reports which checks failed', async () => {
    const heardOnly = applyUpdates(createEmptyProfile(), VALID)
    const error = await submitProfile(heardOnly).catch((e: unknown) => e)
    expect((error as SubmissionBlockedError).failed.map((c) => c.id)).toEqual(['ALL_CONFIRMED', 'PIN_CONFIRMED'])
  })

  it('submits once every check passes', async () => {
    await expect(submitProfile(confirmedProfile())).resolves.toEqual({ applicationId: 'APP-TEST', submittedAt: '2026-10-13T06:30:00.000Z' })
    expect(submitApplication).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/ai/onboarding/submit.test.ts`
Expected: FAIL, cannot resolve `./submit.ts`.

- [ ] **Step 7: Implement the guardrail**

`src/ai/onboarding/submit.ts`:
```ts
import { th } from '@/copy/th.ts'
import { submitApplication, type ApplicationReceipt } from '@/services/merchantApi.write.ts'
import type { GuardrailCheck, OnboardingProfile } from '@/types/domain.ts'
import { PROFILE_FIELDS } from './profile.ts'

/** Deterministic checks run before anything leaves the phone (spec §6.5). */
export function runSubmissionChecks(profile: OnboardingProfile): GuardrailCheck[] {
  const { fields } = profile
  const unconfirmed = PROFILE_FIELDS.filter((key) => fields[key].status !== 'confirmed').length
  const menu = fields.menu.value ?? []
  const hours = fields.hours.value
  const pinOk = fields.location.status === 'confirmed' && !fields.location.needsPinCheck
  const menuOk = menu.length > 0 && menu.every((item) => item.priceTHB > 0)
  const hoursOk = hours !== null && hours.open !== hours.close
  const phoneOk = /^0\d{9}$/.test(fields.phone.value ?? '')
  return [
    { id: 'ALL_CONFIRMED', pass: unconfirmed === 0, message: unconfirmed === 0 ? th.checks.allConfirmed : th.checks.unconfirmed(unconfirmed) },
    { id: 'PIN_CONFIRMED', pass: pinOk, message: pinOk ? th.checks.pinOk : th.checks.pinMissing },
    { id: 'MENU_VALID', pass: menuOk, message: menuOk ? th.checks.menuOk : th.checks.menuMissing },
    { id: 'HOURS_VALID', pass: hoursOk, message: hoursOk ? th.checks.hoursOk : th.checks.hoursInvalid },
    { id: 'PHONE_VALID', pass: phoneOk, message: phoneOk ? th.checks.phoneOk : th.checks.phoneInvalid },
  ]
}

export class SubmissionBlockedError extends Error {
  readonly failed: GuardrailCheck[]

  constructor(failed: GuardrailCheck[]) {
    super(`Submission blocked: ${failed.map((check) => check.id).join(', ')}`)
    this.name = 'SubmissionBlockedError'
    this.failed = failed
  }
}

/** The only path from an onboarding profile to the (mock) Grab API. Every check runs first. */
export async function submitProfile(profile: OnboardingProfile): Promise<ApplicationReceipt> {
  const failed = runSubmissionChecks(profile).filter((check) => !check.pass)
  if (failed.length > 0) throw new SubmissionBlockedError(failed)
  return submitApplication(profile)
}
```

- [ ] **Step 8: Write the architecture test**

`src/architecture.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

// Raw source of every app file, keyed by path ("/src/...").
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

// The AI may prepare drafts but never execute them: only guardrail modules may call write APIs.
// Plan 2 adds '/src/ai/guardrail/confirmAndExecute.ts' here.
const ALLOWED_WRITERS = ['/src/ai/onboarding/submit.ts', '/src/services/merchantApi.write.ts']
const IMPORTS_WRITE_API = /(?:from\s+|import\s*\(\s*)['"][^'"]*merchantApi\.write/
const IMPORTS_REACT = /from\s+['"]react/

const appFiles = Object.entries(sources).filter(([path]) => !path.endsWith('.test.ts'))

describe('architecture', () => {
  it('sees the source tree', () => {
    expect(Object.keys(sources)).toContain('/src/ai/onboarding/submit.ts')
    expect(IMPORTS_WRITE_API.test("import { submitApplication } from '@/services/merchantApi.write.ts'")).toBe(true)
  })

  it('only lets guardrail modules import the write API', () => {
    const offenders = appFiles
      .filter(([path, source]) => !ALLOWED_WRITERS.includes(path) && IMPORTS_WRITE_API.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('keeps src/ai free of React', () => {
    const offenders = appFiles
      .filter(([path, source]) => path.startsWith('/src/ai/') && IMPORTS_REACT.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 9: Run all tests to verify they pass**

Run: `npm test`
Expected: PASS (every test file so far, including `architecture.test.ts`).

- [ ] **Step 10: Prove the architecture test catches violations**

Temporarily add `import { submitApplication } from '@/services/merchantApi.write.ts'` plus `void submitApplication` to the top of `src/ai/onboarding/followUp.ts`, run `npx vitest run src/architecture.test.ts`, and confirm it FAILS listing `/src/ai/onboarding/followUp.ts`. Then remove both lines and confirm it PASSES again.

- [ ] **Step 11: Commit**

```bash
git add src/services/demoFlags.ts src/services/merchantApi.write.ts src/services/merchantApi.write.test.ts src/ai/onboarding/submit.ts src/ai/onboarding/submit.test.ts src/architecture.test.ts
git commit -m "Add submission guardrail, mock write API and architecture test" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Journey state, app shell and UI primitives

**Files:**
- Create: `src/app/journey/journeyMachine.ts`, `src/app/journey/JourneyContext.ts`, `src/app/journey/JourneyProvider.tsx`
- Create: `src/components/ui/Button.tsx`, `Card.tsx`, `Chip.tsx`; `src/components/shell/DeviceFrame.tsx`, `OnboardingShell.tsx`; `src/screens/ScreenStub.tsx`
- Modify: `src/App.tsx` (replace entirely)
- Test: `src/app/journey/journeyMachine.test.ts`

**Interfaces:**
- Consumes: profile functions (Task 7).
- Produces:
  - `type Screen = 'A1_TALK' | 'A2_REVIEW' | 'A3_SUBMITTED' | 'TRANSITION' | 'G1_DASHBOARD'`
  - `interface JourneyState { screen: Screen; profile: OnboardingProfile; startedAt: number | null; submittedAt: number | null }`
  - `type JourneyEvent` = `GO {screen}` | `HEARD {updates, at}` | `CONFIRM_FIELD {field}` | `REASK_FIELD {field}` | `REMOVE_MENU_ITEM {name}` | `SUBMITTED {at}` | `LOAD_PROFILE {profile}` | `RESET`
  - `initialJourney(): JourneyState`, `journeyReducer(state, event): JourneyState`
  - `useJourney(): { state: JourneyState; dispatch: Dispatch<JourneyEvent> }`, `<JourneyProvider>`
  - `<Button variant? fullWidth? loading? icon? …buttonProps>` (variants `primary | secondary | ghost`), `<Card tone? className?>` (tones `default | warn`), `<Chip onClick>`, `<DeviceFrame side?>`, `<OnboardingShell title progress? footer?>`

- [ ] **Step 1: Write the failing reducer tests**

`src/app/journey/journeyMachine.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { applyUpdates, createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { initialJourney, journeyReducer } from './journeyMachine.ts'

const NAME = { storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' } }

describe('journeyReducer', () => {
  it('starts on A1 with an empty profile', () => {
    const state = initialJourney()
    expect(state.screen).toBe('A1_TALK')
    expect(state.profile.fields.storeName.status).toBe('empty')
    expect(state.startedAt).toBeNull()
  })

  it('moves between screens', () => {
    expect(journeyReducer(initialJourney(), { type: 'GO', screen: 'A2_REVIEW' }).screen).toBe('A2_REVIEW')
  })

  it('applies what was heard and remembers when talking started', () => {
    const first = journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1000 })
    const second = journeyReducer(first, { type: 'HEARD', updates: {}, at: 5000 })
    expect(second.profile.fields.storeName.value).toBe('ครัวป้าแดง')
    expect(second.startedAt).toBe(1000)
  })

  it('confirms a field', () => {
    const heard = journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1 })
    expect(journeyReducer(heard, { type: 'CONFIRM_FIELD', field: 'storeName' }).profile.fields.storeName.status).toBe('confirmed')
  })

  it('re-asking a field clears it and returns to A1', () => {
    const onReview = { ...journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1 }), screen: 'A2_REVIEW' as const }
    const next = journeyReducer(onReview, { type: 'REASK_FIELD', field: 'storeName' })
    expect(next.screen).toBe('A1_TALK')
    expect(next.profile.fields.storeName.status).toBe('empty')
  })

  it('removes a menu item', () => {
    const withMenu = journeyReducer(initialJourney(), {
      type: 'HEARD',
      updates: { menu: { value: [{ name: 'ก', priceTHB: 10 }, { name: 'ข', priceTHB: 20 }], confidence: 0.9, heardFrom: 'x' } },
      at: 1,
    })
    expect(journeyReducer(withMenu, { type: 'REMOVE_MENU_ITEM', name: 'ก' }).profile.fields.menu.value).toEqual([{ name: 'ข', priceTHB: 20 }])
  })

  it('records the submit time and shows A3', () => {
    const next = journeyReducer(initialJourney(), { type: 'SUBMITTED', at: 9000 })
    expect(next.screen).toBe('A3_SUBMITTED')
    expect(next.submittedAt).toBe(9000)
  })

  it('loads a prepared profile (presenter shortcut)', () => {
    const profile = applyUpdates(createEmptyProfile(), NAME)
    expect(journeyReducer(initialJourney(), { type: 'LOAD_PROFILE', profile }).profile).toBe(profile)
  })

  it('resets everything', () => {
    const busy = journeyReducer(journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1 }), { type: 'GO', screen: 'TRANSITION' })
    expect(journeyReducer(busy, { type: 'RESET' })).toEqual(initialJourney())
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/journey/journeyMachine.test.ts`
Expected: FAIL, cannot resolve `./journeyMachine.ts`.

- [ ] **Step 3: Implement the reducer**

`src/app/journey/journeyMachine.ts`:
```ts
import { applyUpdates, confirmField, createEmptyProfile, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import type { OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'

// Plan 2 adds G2_INTENT, G3_PREVIEW, G4_SUCCESS, G5_RECAP.
export type Screen = 'A1_TALK' | 'A2_REVIEW' | 'A3_SUBMITTED' | 'TRANSITION' | 'G1_DASHBOARD'

export interface JourneyState {
  screen: Screen
  profile: OnboardingProfile
  startedAt: number | null // first utterance, for the "คุยกันแค่…" time on A3
  submittedAt: number | null
}

export type JourneyEvent =
  | { type: 'GO'; screen: Screen }
  | { type: 'HEARD'; updates: ProfileUpdates; at: number }
  | { type: 'CONFIRM_FIELD'; field: ProfileFieldKey }
  | { type: 'REASK_FIELD'; field: ProfileFieldKey }
  | { type: 'REMOVE_MENU_ITEM'; name: string }
  | { type: 'SUBMITTED'; at: number }
  | { type: 'LOAD_PROFILE'; profile: OnboardingProfile }
  | { type: 'RESET' }

export function initialJourney(): JourneyState {
  return { screen: 'A1_TALK', profile: createEmptyProfile(), startedAt: null, submittedAt: null }
}

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'GO':
      return { ...state, screen: event.screen }
    case 'HEARD':
      return { ...state, profile: applyUpdates(state.profile, event.updates), startedAt: state.startedAt ?? event.at }
    case 'CONFIRM_FIELD':
      return { ...state, profile: confirmField(state.profile, event.field) }
    case 'REASK_FIELD':
      return { ...state, profile: reaskField(state.profile, event.field), screen: 'A1_TALK' }
    case 'REMOVE_MENU_ITEM':
      return { ...state, profile: removeMenuItem(state.profile, event.name) }
    case 'SUBMITTED':
      return { ...state, submittedAt: event.at, screen: 'A3_SUBMITTED' }
    case 'LOAD_PROFILE':
      return { ...state, profile: event.profile }
    case 'RESET':
      return initialJourney()
  }
}
```

- [ ] **Step 4: Run the reducer tests to verify they pass**

Run: `npx vitest run src/app/journey/journeyMachine.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Write the context and provider**

`src/app/journey/JourneyContext.ts`:
```ts
import { createContext, useContext, type Dispatch } from 'react'
import type { JourneyEvent, JourneyState } from './journeyMachine.ts'

export interface JourneyContextValue {
  state: JourneyState
  dispatch: Dispatch<JourneyEvent>
}

export const JourneyContext = createContext<JourneyContextValue | null>(null)

export function useJourney(): JourneyContextValue {
  const value = useContext(JourneyContext)
  if (!value) throw new Error('useJourney must be used inside <JourneyProvider>')
  return value
}
```

`src/app/journey/JourneyProvider.tsx`:
```tsx
import { useMemo, useReducer, type ReactNode } from 'react'
import { JourneyContext } from './JourneyContext.ts'
import { initialJourney, journeyReducer } from './journeyMachine.ts'

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(journeyReducer, undefined, initialJourney)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <JourneyContext value={value}>{children}</JourneyContext>
}
```

- [ ] **Step 6: Write the UI primitives**

`src/components/ui/Button.tsx`:
```tsx
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action text-white active:bg-action-pressed disabled:bg-line disabled:text-ink-muted',
  secondary: 'border-2 border-action bg-surface text-action active:bg-ok-bg disabled:border-line disabled:text-ink-muted',
  ghost: 'bg-transparent text-action underline-offset-4 hover:underline',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', fullWidth = false, loading = false, icon, className = '', disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold transition-colors ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="size-6 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}
```

`src/components/ui/Card.tsx`:
```tsx
import type { ReactNode } from 'react'

type Tone = 'default' | 'warn'

const TONES: Record<Tone, string> = {
  default: 'bg-surface ring-line',
  warn: 'bg-warn-bg ring-warn-ink/30',
}

export function Card({ tone = 'default', className = '', children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl p-5 ring-1 ${TONES[tone]} ${className}`}>{children}</div>
}
```

`src/components/ui/Chip.tsx`:
```tsx
import type { ReactNode } from 'react'

export function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-14 rounded-full border-2 border-action bg-surface px-5 text-lg font-bold text-action active:bg-ok-bg"
    >
      {children}
    </button>
  )
}
```

`src/components/shell/DeviceFrame.tsx`:
```tsx
import type { ReactNode } from 'react'

/** Full screen on a phone; a 390×844 phone frame (with an optional side panel) on desktop. */
export function DeviceFrame({ side, children }: { side?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas sm:flex sm:items-start sm:justify-center sm:gap-8 sm:p-8">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-surface sm:h-[844px] sm:w-[390px] sm:shrink-0 sm:rounded-[44px] sm:shadow-2xl sm:ring-8 sm:ring-ink">
        {children}
      </div>
      {side}
    </div>
  )
}
```

`src/components/shell/OnboardingShell.tsx`:
```tsx
import type { ReactNode } from 'react'

export function OnboardingShell({ title, progress, footer, children }: { title: string; progress?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <h1 className="text-xl font-bold">{title}</h1>
        {progress && <span className="text-base text-ink-muted">{progress}</span>}
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
      {footer && <footer className="border-t border-line bg-surface px-4 py-3">{footer}</footer>}
    </>
  )
}
```

`src/screens/ScreenStub.tsx` (temporary until each screen exists; deleted in Task 14):
```tsx
import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Screen } from '@/app/journey/journeyMachine.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'

const NEXT: Record<Screen, Screen> = {
  A1_TALK: 'A2_REVIEW',
  A2_REVIEW: 'A3_SUBMITTED',
  A3_SUBMITTED: 'TRANSITION',
  TRANSITION: 'G1_DASHBOARD',
  G1_DASHBOARD: 'A1_TALK',
}

export function ScreenStub({ screen }: { screen: Screen }) {
  const { dispatch } = useJourney()
  return (
    <OnboardingShell title={screen}>
      <Button onClick={() => dispatch({ type: 'GO', screen: NEXT[screen] })}>{`→ ${NEXT[screen]}`}</Button>
    </OnboardingShell>
  )
}
```

- [ ] **Step 7: Replace `src/App.tsx`**

```tsx
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { ScreenStub } from '@/screens/ScreenStub.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  return <ScreenStub screen={state.screen} />
}

function App() {
  return (
    <JourneyProvider>
      <DeviceFrame>
        <ScreenSwitch />
      </DeviceFrame>
    </JourneyProvider>
  )
}

export default App
```

- [ ] **Step 8: Verify**

Run: `npm test && npm run build && npm run lint`
Expected: all tests PASS, build succeeds, 0 lint errors.

Open the `web` preview at desktop width.
Expected: a phone frame (rounded, dark ring) centered on a light canvas showing header "A1_TALK" and a green button "→ A2_REVIEW"; clicking it cycles through all five screen names. At 375 px wide (mobile preset) the frame disappears and the screen fills the viewport with no horizontal scroll.

- [ ] **Step 9: Commit**

```bash
git add src/app/journey src/components/ui src/components/shell src/screens/ScreenStub.tsx src/App.tsx
git commit -m "Add journey reducer, phone frame shell and UI primitives" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Speech services and assistant components

**Files:**
- Create: `src/services/speech/speechToText.ts`, `scripted.ts`, `textToSpeech.ts`
- Create: `src/components/assistant/MicButton.tsx`, `TranscriptBubble.tsx`, `CompanionBubble.tsx`, `ListenButton.tsx`
- Test: `src/services/speech/scripted.test.ts`

**Interfaces:**
- Consumes: `th` (Task 8), `Button` (Task 10).
- Produces:
  - `type RecognitionErrorKind = 'not-allowed' | 'no-speech' | 'unsupported' | 'other'`
  - `interface ListenHandlers { onInterim(text): void; onFinal(text): void; onError(kind): void; onEnd(): void }`, `interface ListenSession { stop(): void }`
  - `isSpeechRecognitionSupported(): boolean`, `startListening(handlers): ListenSession`
  - `playScripted(text, onInterim, onFinal, durationMs = 1500): () => void` (returns cancel)
  - `getThaiVoice(): SpeechSynthesisVoice | undefined`, `onVoicesChanged(cb): () => void`, `speak(text): void`, `stopSpeaking(): void`
  - `type MicState = 'idle' | 'listening' | 'processing' | 'error'`, `<MicButton state onPress compact?>`, `<TranscriptBubble text final>`, `<CompanionBubble text>`, `<ListenButton text label?>`

- [ ] **Step 1: Write the failing scripted-speech tests**

`src/services/speech/scripted.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { playScripted } from './scripted.ts'

afterEach(() => {
  vi.useRealTimers()
})

describe('playScripted', () => {
  it('shows the line word by word, then reports it as final', () => {
    vi.useFakeTimers()
    const line = 'สิบโมงเช้าถึงสองทุ่ม'
    const interim: string[] = []
    const onFinal = vi.fn()
    playScripted(line, (partial) => interim.push(partial), onFinal, 1000)
    vi.advanceTimersByTime(1050)
    expect(onFinal).toHaveBeenCalledWith(line)
    expect(interim.length).toBeGreaterThan(1)
    expect(interim.every((partial) => line.startsWith(partial))).toBe(true)
  })

  it('can be cancelled', () => {
    vi.useFakeTimers()
    const onFinal = vi.fn()
    const cancel = playScripted('สิบโมงเช้าถึงสองทุ่ม', () => {}, onFinal, 1000)
    cancel()
    vi.advanceTimersByTime(2000)
    expect(onFinal).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/speech/scripted.test.ts`
Expected: FAIL, cannot resolve `./scripted.ts`.

- [ ] **Step 3: Implement the speech services**

`src/services/speech/scripted.ts`:
```ts
function toWords(text: string): string[] {
  const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
  return Array.from(segmenter.segment(text), (segment) => segment.segment)
}

/**
 * Plays a line as if speech recognition were hearing it word by word: the demo-safe
 * fallback for noisy rooms and browsers without a mic. Returns a cancel function.
 */
export function playScripted(text: string, onInterim: (partial: string) => void, onFinal: (text: string) => void, durationMs = 1500): () => void {
  const words = toWords(text)
  let shown = 0
  const timer = setInterval(() => {
    shown += 1
    if (shown >= words.length) {
      clearInterval(timer)
      onFinal(text)
    } else {
      onInterim(words.slice(0, shown).join(''))
    }
  }, durationMs / Math.max(words.length, 1))
  return () => clearInterval(timer)
}
```

`src/services/speech/speechToText.ts`:
```ts
// Thin wrapper over the browser Web Speech API (Chrome, Edge, Android Chrome support th-TH).
// Types are declared locally so we do not depend on which DOM lib version ships them.

export type RecognitionErrorKind = 'not-allowed' | 'no-speech' | 'unsupported' | 'other'

export interface ListenHandlers {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onError: (kind: RecognitionErrorKind) => void
  onEnd: () => void
}

export interface ListenSession {
  stop: () => void
}

interface RecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResultLike> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionConstructor = new () => RecognitionLike

function getRecognition(): RecognitionConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognition() !== undefined
}

function toKind(error: string): RecognitionErrorKind {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'not-allowed'
  return error === 'no-speech' ? 'no-speech' : 'other'
}

/** Listens for one Thai utterance. onFinal fires once with the whole transcript, then onEnd. */
export function startListening(handlers: ListenHandlers): ListenSession {
  const Recognition = getRecognition()
  if (!Recognition) {
    handlers.onError('unsupported')
    handlers.onEnd()
    return { stop: () => {} }
  }
  const recognition = new Recognition()
  recognition.lang = 'th-TH'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1
  let finalText = ''
  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) finalText += result[0].transcript
      else interim += result[0].transcript
    }
    if (interim) handlers.onInterim(finalText + interim)
  }
  recognition.onerror = (event) => handlers.onError(toKind(event.error))
  recognition.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim())
    handlers.onEnd()
  }
  recognition.start()
  return { stop: () => recognition.stop() }
}
```

`src/services/speech/textToSpeech.ts`:
```ts
const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function getThaiVoice(): SpeechSynthesisVoice | undefined {
  if (!supported()) return undefined
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('th'))
}

/** Voices load asynchronously in most browsers; subscribe to know when a Thai one appears. */
export function onVoicesChanged(callback: () => void): () => void {
  if (!supported()) return () => {}
  window.speechSynthesis.addEventListener('voiceschanged', callback)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', callback)
}

export function speak(text: string): void {
  const voice = getThaiVoice()
  if (!voice) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (supported()) window.speechSynthesis.cancel()
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/services/speech/scripted.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the assistant components**

`src/components/assistant/MicButton.tsx`:
```tsx
import { Loader2, Mic, MicOff } from 'lucide-react'
import { th } from '@/copy/th.ts'

export type MicState = 'idle' | 'listening' | 'processing' | 'error'

const LABELS: Record<MicState, string> = {
  idle: th.mic.idle,
  listening: th.mic.listening,
  processing: th.mic.processing,
  error: th.mic.error,
}

/** Big round mic. Press to start; press again while listening to stop. */
export function MicButton({ state, onPress, compact = false }: { state: MicState; onPress: () => void; compact?: boolean }) {
  const size = compact ? 'size-14' : 'size-20'
  const icon = compact ? 'size-7' : 'size-9'
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onPress}
        disabled={state === 'processing'}
        aria-label={LABELS[state]}
        aria-pressed={state === 'listening'}
        className={`relative flex ${size} items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${state === 'error' ? 'bg-ink-muted' : 'bg-action'}`}
      >
        {state === 'listening' && <span className="absolute inset-0 animate-ping rounded-full bg-grab/40" aria-hidden />}
        {state === 'processing' && <Loader2 className={`${icon} animate-spin`} aria-hidden />}
        {state === 'error' && <MicOff className={icon} aria-hidden />}
        {(state === 'idle' || state === 'listening') && <Mic className={icon} aria-hidden />}
      </button>
      {!compact && (
        <span className="text-base text-ink-muted" aria-live="polite">
          {LABELS[state]}
        </span>
      )}
    </div>
  )
}
```

`src/components/assistant/TranscriptBubble.tsx`:
```tsx
/** What the merchant said, on the right like a chat message. Interim text is grey and italic. */
export function TranscriptBubble({ text, final }: { text: string; final: boolean }) {
  return (
    <p
      aria-live="polite"
      className={`ml-auto max-w-[85%] rounded-3xl rounded-tr-md bg-canvas px-4 py-3 text-lg ${final ? 'text-ink' : 'italic text-ink-muted'}`}
    >
      {text}
    </p>
  )
}
```

`src/components/assistant/CompanionBubble.tsx`:
```tsx
import { Sparkles } from 'lucide-react'
import { th } from '@/copy/th.ts'

export function CompanionBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action text-white" aria-hidden>
        <Sparkles className="size-6" />
      </div>
      <p className="rounded-3xl rounded-tl-md bg-ok-bg px-4 py-3 text-lg">
        <span className="sr-only">{th.companion.name}: </span>
        {text}
      </p>
    </div>
  )
}
```

`src/components/assistant/ListenButton.tsx`:
```tsx
import { Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getThaiVoice, onVoicesChanged, speak } from '@/services/speech/textToSpeech.ts'

/** Reads text aloud in Thai. Hidden when the device has no Thai voice. */
export function ListenButton({ text, label = th.review.listen }: { text: string; label?: string }) {
  const [available, setAvailable] = useState(() => getThaiVoice() !== undefined)
  useEffect(() => onVoicesChanged(() => setAvailable(getThaiVoice() !== undefined)), [])
  if (!available) return null
  return (
    <Button variant="secondary" icon={<Volume2 className="size-6" aria-hidden />} onClick={() => speak(text)}>
      {label}
    </Button>
  )
}
```

- [ ] **Step 6: Verify**

Run: `npm test && npm run build && npm run lint`
Expected: all PASS, build succeeds, 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/speech src/components/assistant
git commit -m "Add Thai speech services with scripted fallback and assistant components" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Screen A1 (Tell me about your shop) and the presenter panel

**Files:**
- Create: `src/data/onboarding-script.json`, `src/app/demo/demoBus.ts`, `src/app/demo/demoProfile.ts`, `src/app/demo/DemoPanel.tsx`
- Create: `src/screens/act1-onboarding/summarizeField.ts`
- Create: `src/screens/act1-onboarding/A1-talk/TalkScreen.tsx`, `LiveProfileChecklist.tsx`, `MenuItemList.tsx`, `TypeInstead.tsx`
- Modify: `src/App.tsx`
- Test: `src/app/demo/demoBus.test.ts`, `src/app/demo/demoProfile.test.ts`, `src/screens/act1-onboarding/summarizeField.test.ts`

**Interfaces:**
- Consumes: `extractProfile` (Task 7), `pickFollowUp` (Task 8), profile helpers (Task 7), journey (Task 10), speech + assistant components (Task 11), `getAccount`/`getLandmarks` (Task 5), `formatHours`/`formatPhone`/`formatTHB` (Task 1).
- Produces:
  - `demoBus.say(text: string): void`, `demoBus.onSay(listener): () => void`
  - `scriptLines: { id: number; expecting: string | null; say: string }[]`, `demoProfile(): OnboardingProfile` (every field heard, none confirmed)
  - `summarizeField(profile, key): string`, `profileSummary(profile): string`
  - `<TalkScreen>`, `<DemoPanel>`

- [ ] **Step 1: Write the demo script data**

`src/data/onboarding-script.json` (spec §9.5; line 4 is a chip tap, not speech):
```json
{
  "lines": [
    { "id": 1, "expecting": null, "say": "ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น" },
    { "id": 2, "expecting": "hours", "say": "สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน" },
    { "id": 3, "expecting": "menu", "say": "น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้า แกงเขียวหวานเจ็ดสิบห้า ชาไทยเย็นสามสิบห้า น้ำกระเจี๊ยบสามสิบบาท" }
  ]
}
```

- [ ] **Step 2: Write the failing tests**

`src/app/demo/demoBus.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { demoBus } from './demoBus.ts'

describe('demoBus', () => {
  it('delivers lines to listeners until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = demoBus.onSay(listener)
    demoBus.say('สวัสดี')
    unsubscribe()
    demoBus.say('ลาก่อน')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('สวัสดี')
  })
})
```

`src/app/demo/demoProfile.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoProfile } from './demoProfile.ts'

describe('demoProfile', () => {
  // End-to-end check of the demo script the presenter plays.
  const profile = demoProfile()

  it('hears every field from the script, confirming none', () => {
    expect(PROFILE_FIELDS.map((key) => profile.fields[key].status)).toEqual(Array(6).fill('heard'))
  })

  it('matches the story told in Act 2', () => {
    expect(profile.fields.storeName.value).toBe('ครัวป้าแดง')
    expect(profile.fields.location.value?.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
    expect(profile.fields.hours.value).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
    expect(profile.fields.menu.value?.map((item) => item.priceTHB)).toEqual([89, 65, 75, 35, 30])
    expect(profile.fields.phone.value).toBe('0812344217')
  })
})
```

`src/screens/act1-onboarding/summarizeField.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { profileSummary, summarizeField } from './summarizeField.ts'

describe('summarizeField', () => {
  const profile = demoProfile()

  it('formats each field for the checklist', () => {
    expect(summarizeField(profile, 'storeName')).toBe('ครัวป้าแดง')
    expect(summarizeField(profile, 'hours')).toBe('10:00 – 20:00 น. · เปิดทุกวัน')
    expect(summarizeField(profile, 'menu')).toBe('5 รายการ')
    expect(summarizeField(profile, 'phone')).toBe('081-234-4217')
  })

  it('builds one paragraph for read-aloud', () => {
    expect(profileSummary(profile)).toBe(
      'ชื่อร้าน ครัวป้าแดง ประเภทอาหาร อาหารไทย ที่ตั้ง ลาดพร้าว 71 ตรงข้ามเซเว่น เวลาเปิด-ปิด 10:00 – 20:00 น. · เปิดทุกวัน เมนู 5 รายการ เบอร์ติดต่อ 081-234-4217',
    )
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/app/demo src/screens`
Expected: FAIL, cannot resolve `./demoBus.ts`, `./demoProfile.ts`, `./summarizeField.ts`.

- [ ] **Step 4: Implement the demo helpers and field summaries**

`src/app/demo/demoBus.ts`:
```ts
type SayListener = (text: string) => void

const listeners = new Set<SayListener>()

/** Lets the presenter's DemoPanel "speak" a scripted line into whichever screen is listening. */
export const demoBus = {
  say(text: string): void {
    for (const listener of listeners) listener(text)
  },
  onSay(listener: SayListener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
```

`src/app/demo/demoProfile.ts`:
```ts
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { applyUpdates, createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import script from '@/data/onboarding-script.json'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'

export const scriptLines = script.lines

/** The profile A1 ends with after the whole demo script: every field heard, nothing confirmed. */
export function demoProfile(): OnboardingProfile {
  const landmarks = getLandmarks()
  let profile = createEmptyProfile()
  for (const line of script.lines) {
    const expecting = (line.expecting ?? undefined) as ProfileFieldKey | undefined
    profile = applyUpdates(profile, extractProfile(line.say, { expecting, landmarks }))
  }
  return applyUpdates(profile, { phone: { value: getAccount().phone, confidence: 1, heardFrom: th.review.fromAccount } })
}
```

`src/screens/act1-onboarding/summarizeField.ts`:
```ts
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import { formatHours, formatPhone } from '@/lib/format.ts'
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'

/** One short line per field, for the A1 checklist and the read-aloud summary. */
export function summarizeField(profile: OnboardingProfile, key: ProfileFieldKey): string {
  const { fields } = profile
  switch (key) {
    case 'storeName':
      return fields.storeName.value ?? ''
    case 'category':
      return fields.category.value ?? ''
    case 'location':
      return fields.location.value?.text ?? ''
    case 'hours':
      return fields.hours.value ? formatHours(fields.hours.value) : ''
    case 'menu':
      return th.review.menuCount(fields.menu.value?.length ?? 0)
    case 'phone':
      return fields.phone.value ? formatPhone(fields.phone.value) : ''
  }
}

export function profileSummary(profile: OnboardingProfile): string {
  return PROFILE_FIELDS.map((key) => `${th.fields[key]} ${summarizeField(profile, key)}`).join(' ')
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/app/demo src/screens`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the A1 building blocks**

`src/screens/act1-onboarding/A1-talk/LiveProfileChecklist.tsx`:
```tsx
import { CheckCircle2, Circle } from 'lucide-react'
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import type { OnboardingProfile } from '@/types/domain.ts'
import { summarizeField } from '../summarizeField.ts'

/** Rows tick green as soon as the companion hears each field. */
export function LiveProfileChecklist({ profile }: { profile: OnboardingProfile }) {
  return (
    <ul className="divide-y divide-line rounded-3xl ring-1 ring-line">
      {PROFILE_FIELDS.map((key) => {
        const heard = profile.fields[key].status !== 'empty'
        return (
          <li key={key} className="flex min-h-14 items-center gap-3 px-4 py-2">
            {heard ? (
              <CheckCircle2 className="size-7 shrink-0 animate-pop text-action" aria-hidden />
            ) : (
              <Circle className="size-7 shrink-0 text-line" aria-hidden />
            )}
            <span className="w-28 shrink-0 font-bold">{th.fields[key]}</span>
            <span className={`min-w-0 flex-1 ${heard ? 'text-ink' : 'text-ink-muted'}`}>{heard ? summarizeField(profile, key) : '—'}</span>
          </li>
        )
      })}
    </ul>
  )
}
```

`src/screens/act1-onboarding/A1-talk/MenuItemList.tsx`:
```tsx
import { X } from 'lucide-react'
import { th } from '@/copy/th.ts'
import { formatTHB } from '@/lib/format.ts'
import type { MenuEntry } from '@/types/domain.ts'

export function MenuItemList({ items, onRemove }: { items: MenuEntry[]; onRemove: (name: string) => void }) {
  return (
    <section aria-label={th.fields.menu}>
      <h2 className="mb-2 font-bold">{th.fields.menu}</h2>
      <ul className="divide-y divide-line rounded-3xl ring-1 ring-line">
        {items.map((item) => (
          <li key={item.name} className="flex min-h-14 items-center gap-3 pl-4">
            <span className="min-w-0 flex-1">{item.name}</span>
            <span className="font-bold">{formatTHB(item.priceTHB)}</span>
            <button
              type="button"
              onClick={() => onRemove(item.name)}
              aria-label={th.onboarding.removeItem(item.name)}
              className="flex size-14 shrink-0 items-center justify-center text-ink-muted"
            >
              <X className="size-6" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`src/screens/act1-onboarding/A1-talk/TypeInstead.tsx`:
```tsx
import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

/** Keyboard fallback. Whatever is typed goes through the same extractor as speech. */
export function TypeInstead({ onSend, onClose }: { onSend: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!text.trim()) return
        onSend(text.trim())
        setText('')
      }}
    >
      <label htmlFor="type-instead" className="sr-only">
        {th.onboarding.typePlaceholder}
      </label>
      <input
        id="type-instead"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={th.onboarding.typePlaceholder}
        autoFocus
        className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line px-4 text-lg focus:border-action focus:outline-none"
      />
      <Button type="submit">{th.onboarding.send}</Button>
      <Button variant="ghost" aria-label={th.onboarding.closeTyping} onClick={onClose} icon={<X className="size-6" aria-hidden />} />
    </form>
  )
}
```

- [ ] **Step 7: Write the A1 screen**

`src/screens/act1-onboarding/A1-talk/TalkScreen.tsx`:
```tsx
import { Keyboard } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { countHeard, isReadyForReview, PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoBus } from '@/app/demo/demoBus.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionBubble } from '@/components/assistant/CompanionBubble.tsx'
import { MicButton, type MicState } from '@/components/assistant/MicButton.tsx'
import { TranscriptBubble } from '@/components/assistant/TranscriptBubble.tsx'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { playScripted } from '@/services/speech/scripted.ts'
import { startListening, type ListenSession } from '@/services/speech/speechToText.ts'
import type { FollowUpChip, ProfileUpdates } from '@/types/domain.ts'
import { LiveProfileChecklist } from './LiveProfileChecklist.tsx'
import { MenuItemList } from './MenuItemList.tsx'
import { TypeInstead } from './TypeInstead.tsx'

const THINKING_MS = 500
const DEVICE_LOCATION_CONFIDENCE = 0.7
const account = getAccount()
const landmarks = getLandmarks()

export function TalkScreen() {
  const { state, dispatch } = useJourney()
  const { profile } = state
  const question = pickFollowUp(profile, account)
  const expecting = question?.field ?? undefined
  const [mic, setMic] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState<{ text: string; final: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const session = useRef<ListenSession | null>(null)

  const record = useCallback(
    (updates: ProfileUpdates) => dispatch({ type: 'HEARD', updates, at: Date.now() }),
    [dispatch],
  )

  // Every input path (mic, scripted demo line, chip, keyboard) ends here.
  const handleUtterance = useCallback(
    (text: string) => {
      setTranscript({ text, final: true })
      setMic('processing')
      window.setTimeout(() => {
        const updates = extractProfile(text, { expecting, landmarks })
        record(updates)
        setNotice(Object.keys(updates).length === 0 ? th.onboarding.notUnderstood : null)
        setMic('idle')
      }, THINKING_MS)
    },
    [expecting, record],
  )

  const toggleMic = () => {
    if (mic === 'listening') {
      session.current?.stop()
      return
    }
    setNotice(null)
    setTranscript(null)
    setMic('listening')
    session.current = startListening({
      onInterim: (text) => setTranscript({ text, final: false }),
      onFinal: handleUtterance,
      onError: (kind) => {
        setMic('error')
        if (kind === 'no-speech') setNotice(th.onboarding.notHeard)
        else if (kind === 'unsupported') setNotice(th.mic.unsupported)
        else setNotice(th.mic.error)
      },
      onEnd: () => setMic((current) => (current === 'listening' ? 'idle' : current)),
    })
  }

  useEffect(
    () =>
      demoBus.onSay((text) => {
        setNotice(null)
        setMic('listening')
        playScripted(text, (partial) => setTranscript({ text: partial, final: false }), handleUtterance)
      }),
    [handleUtterance],
  )

  const onChip = (chip: FollowUpChip) => {
    switch (chip.kind) {
      case 'say':
        handleUtterance(chip.label)
        break
      case 'startMic':
        toggleMic()
        break
      case 'useAccountPhone':
        record({ phone: { value: account.phone, confidence: 1, heardFrom: th.review.fromAccount } })
        break
      case 'useDeviceLocation':
        record({ location: { value: account.deviceLocation, confidence: DEVICE_LOCATION_CONFIDENCE, heardFrom: th.chips.useDeviceLocation } })
        break
      case 'scanMenu':
        setNotice(th.onboarding.scanMenuToast)
        break
    }
  }

  const ready = isReadyForReview(profile)
  const menu = profile.fields.menu.value

  return (
    <OnboardingShell
      title={th.onboarding.title}
      progress={th.onboarding.progress(countHeard(profile), PROFILE_FIELDS.length)}
      footer={
        <div className="flex flex-col items-center gap-2">
          {ready && (
            <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'A2_REVIEW' })}>
              {th.onboarding.toReview}
            </Button>
          )}
          <MicButton state={mic} onPress={toggleMic} compact={ready} />
          {!typing && (
            <Button variant="ghost" icon={<Keyboard className="size-5" aria-hidden />} onClick={() => setTyping(true)}>
              {th.onboarding.typeInstead}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {question?.field === null && <CompanionBubble text={th.onboarding.greeting} />}
        <CompanionBubble text={question ? question.text : th.onboarding.allHeard} />
        {question && question.chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {question.chips.map((chip) => (
              <Chip key={chip.label} onClick={() => onChip(chip)}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
        {notice && (
          <p role="status" className="rounded-2xl bg-warn-bg px-4 py-3 text-warn-ink">
            {notice}
          </p>
        )}
        {typing && <TypeInstead onSend={handleUtterance} onClose={() => setTyping(false)} />}
        <LiveProfileChecklist profile={profile} />
        {menu && <MenuItemList items={menu} onRemove={(name) => dispatch({ type: 'REMOVE_MENU_ITEM', name })} />}
      </div>
    </OnboardingShell>
  )
}
```

- [ ] **Step 8: Write the presenter panel**

`src/app/demo/DemoPanel.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Screen } from '@/app/journey/journeyMachine.ts'
import { demoFlags } from '@/services/demoFlags.ts'
import { demoBus } from './demoBus.ts'
import { demoProfile, scriptLines } from './demoProfile.ts'

// Presenter-only tooling (desktop, beside the phone). Press D to hide or show.
const JUMPS: { label: string; screen: Screen; withProfile?: boolean }[] = [
  { label: 'A1 · คุยเปิดร้าน', screen: 'A1_TALK' },
  { label: 'A2 · ตรวจทาน (ข้อมูลตัวอย่าง)', screen: 'A2_REVIEW', withProfile: true },
  { label: 'A3 · ส่งแล้ว', screen: 'A3_SUBMITTED', withProfile: true },
  { label: '30 วันต่อมา…', screen: 'TRANSITION' },
  { label: 'G1 · หน้าร้าน', screen: 'G1_DASHBOARD' },
]

export function DemoPanel() {
  const { state, dispatch } = useJourney()
  const [visible, setVisible] = useState(true)
  const [failApi, setFailApi] = useState(demoFlags.simulateApiFailure)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (event.key.toLowerCase() === 'd' && tag !== 'INPUT' && tag !== 'TEXTAREA') setVisible((shown) => !shown)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!visible) return null

  const onA1 = state.screen === 'A1_TALK'

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-5 rounded-3xl bg-surface p-5 text-base shadow-lg ring-1 ring-line sm:flex">
      <div>
        <h2 className="text-lg font-bold">Demo panel</h2>
        <p className="text-sm text-ink-muted">กด D เพื่อซ่อน/แสดง · ตอนนี้: {state.screen}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">ไปที่หน้า</h3>
        {JUMPS.map((jump) => (
          <button
            key={jump.screen}
            type="button"
            className="min-h-12 rounded-xl px-3 text-left ring-1 ring-line hover:bg-canvas"
            onClick={() => {
              if (jump.withProfile) dispatch({ type: 'LOAD_PROFILE', profile: demoProfile() })
              dispatch({ type: 'GO', screen: jump.screen })
            }}
          >
            {jump.label}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">พูดตามบท (ที่หน้า A1)</h3>
        {scriptLines.map((line) => (
          <button
            key={line.id}
            type="button"
            disabled={!onA1}
            className="min-h-12 rounded-xl px-3 py-2 text-left ring-1 ring-line hover:bg-canvas disabled:opacity-40"
            onClick={() => demoBus.say(line.say)}
          >
            <span className="font-bold">บรรทัด {line.id}:</span> <span className="line-clamp-2 text-sm">{line.say}</span>
          </button>
        ))}
        <p className="text-sm text-ink-muted">บรรทัด 4: กดชิป "ใช่" ในแอปเพื่อใช้เบอร์ที่ล็อกอิน</p>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={failApi}
            onChange={(event) => {
              demoFlags.simulateApiFailure = event.target.checked
              setFailApi(event.target.checked)
            }}
          />
          จำลองระบบล่ม (ตอนกดส่ง)
        </label>
        <button type="button" className="min-h-12 rounded-xl px-3 text-left ring-1 ring-line hover:bg-canvas" onClick={() => dispatch({ type: 'RESET' })}>
          เริ่มใหม่ทั้งหมด
        </button>
      </section>
    </aside>
  )
}
```

- [ ] **Step 9: Wire A1 and the panel into the app**

Replace `src/App.tsx`:
```tsx
import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { TalkScreen } from '@/screens/act1-onboarding/A1-talk/TalkScreen.tsx'
import { ScreenStub } from '@/screens/ScreenStub.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  if (state.screen === 'A1_TALK') return <TalkScreen />
  return <ScreenStub screen={state.screen} />
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

- [ ] **Step 10: Verify in the browser**

Run: `npm test && npm run build && npm run lint`
Expected: all PASS, build succeeds, 0 lint errors.

Open the `web` preview at desktop width and walk the demo script:
1. A1 shows the greeting bubble, the open question, an empty 6-row checklist ("เรียบร้อย 0/6"), the mic button and "พิมพ์แทน".
2. DemoPanel → "บรรทัด 1": the transcript types out word by word; after ~0.5 s ชื่อร้าน, ประเภทอาหาร and ที่ตั้ง tick green ("เรียบร้อย 3/6") and the companion asks "ร้านเปิดกี่โมงถึงกี่โมงคะ?" with two time chips.
3. "บรรทัด 2" → เวลาเปิด-ปิด shows "10:00 – 20:00 น. · เปิดทุกวัน"; the menu question appears with the "ถ่ายรูปเมนูแทน" chip.
4. "บรรทัด 3" → 5 menu items with ฿ prices appear; the phone question shows "08x-xxx-4217" with chips ใช่ / ใช้เบอร์อื่น.
5. Tap "ใช่" → "เรียบร้อย 6/6", the companion says "ได้ข้อมูลครบแล้วค่ะ!", the green "ตรวจทานข้อมูล" button appears above a smaller mic.
6. Remove a menu item with × and confirm it disappears. Open "พิมพ์แทน", type `ส้มตำ 50 บาท`, press ส่ง, and confirm it is added.
7. Tap "ถ่ายรูปเมนูแทน" (after a reset) and confirm the amber notice explains it is a hand-off to Grab's scan.
8. At the mobile preset (375 px), confirm no horizontal scroll and the DemoPanel is hidden.
9. In Chrome with a microphone, press the mic and say "ร้านชื่อครัวป้าแดงค่ะ" → interim text appears, then ชื่อร้าน ticks. If the mic is blocked, the amber notice "ไมค์ใช้ไม่ได้…" appears and the mic turns grey.

- [ ] **Step 11: Commit**

```bash
git add src/data/onboarding-script.json src/app/demo src/screens/act1-onboarding src/App.tsx
git commit -m "Add A1 voice onboarding screen and presenter demo panel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Screen A2 (Review: AI ฟังได้ว่า…)

**Files:**
- Create: `src/screens/act1-onboarding/A2-review/ReviewScreen.tsx`, `ReviewFieldCard.tsx`, `StorePreviewCard.tsx`, `MapPinConfirm.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `runSubmissionChecks`, `submitProfile`, `SubmissionBlockedError` (Task 9); `needsCheck`, `PROFILE_FIELDS` (Task 7); `profileSummary` (Task 12); `ListenButton` (Task 11); `Card`, `Button` (Task 10).
- Produces: `<ReviewScreen>`; on a successful submit it dispatches `{ type: 'SUBMITTED', at }`.

- [ ] **Step 1: Write the review building blocks**

`src/screens/act1-onboarding/A2-review/ReviewFieldCard.tsx`:
```tsx
import { AlertTriangle, Check, CheckCircle2, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { needsCheck } from '@/ai/onboarding/profile.ts'
import { Button } from '@/components/ui/Button.tsx'
import { Card } from '@/components/ui/Card.tsx'
import { th } from '@/copy/th.ts'
import type { FieldStatus } from '@/types/domain.ts'

// Values that came from a tap rather than speech get "ที่มา" instead of "ได้ยินว่า".
const NON_SPEECH_SOURCES = [th.review.fromAccount, th.chips.useDeviceLocation]

interface ReviewFieldCardProps {
  label: string
  field: { status: FieldStatus; confidence?: number; heardFrom?: string }
  onConfirm: () => void
  onEdit: () => void
  children: ReactNode
}

export function ReviewFieldCard({ label, field, onConfirm, onEdit, children }: ReviewFieldCardProps) {
  const confirmed = field.status === 'confirmed'
  const check = needsCheck(field)
  const spoken = field.heardFrom && !NON_SPEECH_SOURCES.includes(field.heardFrom)
  return (
    <Card tone={check ? 'warn' : 'default'}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-bold">{label}</h2>
        {confirmed && (
          <span className="flex items-center gap-1 text-action">
            <CheckCircle2 className="size-5" aria-hidden />
            {th.review.confirmed}
          </span>
        )}
      </div>
      {check && (
        <p className="mt-1 flex items-center gap-2 font-bold text-warn-ink">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          {th.review.pleaseCheck}
        </p>
      )}
      <div className="mt-2 text-lg">{children}</div>
      {field.heardFrom && (
        <p className="mt-2 text-sm text-ink-muted">
          {spoken ? `${th.review.heardFrom}: “${field.heardFrom}”` : `${th.review.source}: ${field.heardFrom}`}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {!confirmed && (
          <Button variant="secondary" className="flex-1" icon={<Check className="size-5" aria-hidden />} onClick={onConfirm}>
            {th.review.confirm}
          </Button>
        )}
        <Button variant="ghost" icon={<Pencil className="size-5" aria-hidden />} onClick={onEdit}>
          {th.review.edit}
        </Button>
      </div>
    </Card>
  )
}
```

`src/screens/act1-onboarding/A2-review/MapPinConfirm.tsx`:
```tsx
import { th } from '@/copy/th.ts'
import type { GeoPoint } from '@/types/domain.ts'

/** Illustrated map with the shop pin (mock; no map tiles in the prototype). */
export function MapPinConfirm({ point }: { point: GeoPoint }) {
  return (
    <figure className="overflow-hidden rounded-2xl ring-1 ring-line">
      <svg viewBox="0 0 320 160" role="img" aria-label={th.review.mapAlt(point.text)} className="block h-40 w-full bg-canvas">
        <path d="M0 60 H320 M0 120 H320 M110 0 V160 M230 0 V160" className="stroke-line" strokeWidth="14" fill="none" />
        <path d="M110 60 L230 120" className="stroke-line" strokeWidth="8" fill="none" />
        <rect x="248" y="18" width="48" height="30" rx="6" className="fill-grab/30" />
        <g transform="translate(160 86)">
          <path d="M0 -40 C-15 -40 -24 -29 -24 -17 C-24 0 0 22 0 22 C0 22 24 0 24 -17 C24 -29 15 -40 0 -40 Z" className="fill-action" />
          <circle cx="0" cy="-17" r="8" className="fill-surface" />
        </g>
      </svg>
      <figcaption className="px-4 py-2 text-base">{point.text}</figcaption>
    </figure>
  )
}
```

`src/screens/act1-onboarding/A2-review/StorePreviewCard.tsx`:
```tsx
import { MapPin, Store } from 'lucide-react'
import { Card } from '@/components/ui/Card.tsx'
import { th } from '@/copy/th.ts'
import { formatHours, formatTHB } from '@/lib/format.ts'
import type { OnboardingProfile } from '@/types/domain.ts'

const PREVIEW_ITEMS = 3

/** "ลูกค้าจะเห็นร้านแบบนี้": the shop as a customer would see it in the Grab app. */
export function StorePreviewCard({ profile }: { profile: OnboardingProfile }) {
  const { storeName, category, hours, location, menu } = profile.fields
  const items = menu.value ?? []
  const subtitle = [category.value, hours.value ? formatHours(hours.value) : null].filter(Boolean).join(' · ')
  return (
    <section aria-label={th.review.customerSees}>
      <h2 className="mb-2 text-base text-ink-muted">{th.review.customerSees}</h2>
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-grab/20 text-action">
            <Store className="size-8" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{storeName.value}</p>
            <p className="text-base text-ink-muted">{subtitle}</p>
          </div>
        </div>
        {location.value && (
          <p className="mt-3 flex items-center gap-2 text-base">
            <MapPin className="size-5 shrink-0 text-action" aria-hidden />
            {location.value.text}
          </p>
        )}
        <ul className="mt-3 divide-y divide-line">
          {items.slice(0, PREVIEW_ITEMS).map((item) => (
            <li key={item.name} className="flex justify-between gap-3 py-2">
              <span>{item.name}</span>
              <span className="font-bold">{formatTHB(item.priceTHB)}</span>
            </li>
          ))}
        </ul>
        {items.length > PREVIEW_ITEMS && <p className="text-base text-ink-muted">{th.review.moreItems(items.length - PREVIEW_ITEMS)}</p>}
      </Card>
    </section>
  )
}
```

- [ ] **Step 2: Write the review screen**

`src/screens/act1-onboarding/A2-review/ReviewScreen.tsx`:
```tsx
import { useState } from 'react'
import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { runSubmissionChecks, SubmissionBlockedError, submitProfile } from '@/ai/onboarding/submit.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { ListenButton } from '@/components/assistant/ListenButton.tsx'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatHours, formatPhone, formatTHB } from '@/lib/format.ts'
import { getAccount } from '@/services/merchantApi.ts'
import type { ProfileFieldKey } from '@/types/domain.ts'
import { profileSummary } from '../summarizeField.ts'
import { MapPinConfirm } from './MapPinConfirm.tsx'
import { ReviewFieldCard } from './ReviewFieldCard.tsx'
import { StorePreviewCard } from './StorePreviewCard.tsx'

const account = getAccount()

export function ReviewScreen() {
  const { state, dispatch } = useJourney()
  const { profile } = state
  const { fields } = profile
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = runSubmissionChecks(profile).every((check) => check.pass)
  const remaining = PROFILE_FIELDS.filter((key) => fields[key].status !== 'confirmed').length

  const card = (key: ProfileFieldKey) => ({
    label: th.fields[key],
    field: fields[key],
    onConfirm: () => dispatch({ type: 'CONFIRM_FIELD', field: key }),
    onEdit: () => dispatch({ type: 'REASK_FIELD', field: key }),
  })

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await submitProfile(profile)
      dispatch({ type: 'SUBMITTED', at: Date.now() })
    } catch (caught) {
      setError(caught instanceof SubmissionBlockedError ? caught.failed.map((check) => check.message).join(' · ') : th.review.apiError)
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      title={th.review.title}
      progress={remaining > 0 ? th.review.remaining(remaining) : th.checks.allConfirmed}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-warn-ink">
              {error}
            </p>
          )}
          <Button fullWidth disabled={!canSubmit} loading={submitting} onClick={submit}>
            {submitting ? th.review.submitting : th.review.submit}
          </Button>
          <p className="text-center text-sm text-ink-muted">{th.review.nothingSentYet}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p>{th.review.subtitle}</p>
        <StorePreviewCard profile={profile} />
        <ListenButton text={profileSummary(profile)} />

        <ReviewFieldCard {...card('storeName')}>{fields.storeName.value}</ReviewFieldCard>
        <ReviewFieldCard {...card('category')}>{fields.category.value}</ReviewFieldCard>
        <ReviewFieldCard {...card('location')}>
          <p className="mb-2 font-bold">{th.review.pinQuestion}</p>
          {fields.location.value && <MapPinConfirm point={fields.location.value} />}
        </ReviewFieldCard>
        <ReviewFieldCard {...card('hours')}>{fields.hours.value && formatHours(fields.hours.value)}</ReviewFieldCard>
        <ReviewFieldCard {...card('menu')}>
          <ul className="divide-y divide-line">
            {(fields.menu.value ?? []).map((item) => (
              <li key={item.name} className="flex justify-between gap-3 py-2">
                <span>{item.name}</span>
                <span className="font-bold">{formatTHB(item.priceTHB)}</span>
              </li>
            ))}
          </ul>
        </ReviewFieldCard>
        <ReviewFieldCard {...card('phone')}>
          <p>{fields.phone.value && formatPhone(fields.phone.value)}</p>
          <p className="text-base text-ink-muted">
            {th.review.owner}: {account.ownerName} ({th.review.fromAccount})
          </p>
        </ReviewFieldCard>
      </div>
    </OnboardingShell>
  )
}
```

- [ ] **Step 3: Wire A2 into the app**

In `src/App.tsx`, add the import and a case, so `ScreenSwitch` becomes:
```tsx
import { ReviewScreen } from '@/screens/act1-onboarding/A2-review/ReviewScreen.tsx'
```
```tsx
function ScreenSwitch() {
  const { state } = useJourney()
  if (state.screen === 'A1_TALK') return <TalkScreen />
  if (state.screen === 'A2_REVIEW') return <ReviewScreen />
  return <ScreenStub screen={state.screen} />
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm test && npm run build && npm run lint`
Expected: all PASS, build succeeds, 0 lint errors.

In the `web` preview, DemoPanel → "A2 · ตรวจทาน (ข้อมูลตัวอย่าง)":
1. Header shows "เหลืออีก 6 ข้อที่ต้องยืนยัน"; the store preview shows ครัวป้าแดง · อาหารไทย · 10:00 – 20:00 น., the pin line, 3 menu items and "และอีก 2 เมนู".
2. The ที่ตั้ง card is amber with "ช่วยเช็คหน่อยค่ะ", the map and "หมุดถูกไหมคะ?"; the other cards are white.
3. The phone card shows "ที่มา: จากบัญชีที่ล็อกอิน" (not "ได้ยินว่า"), and spoken fields show "ได้ยินว่า: “…”".
4. "ยืนยันและส่งสมัคร" is disabled. Tap "ถูกแล้ว" on all six cards: each shows "ยืนยันแล้ว", the amber goes away, the header says "ยืนยันข้อมูลครบแล้ว", and the button enables.
5. Tick "จำลองระบบล่ม" in the DemoPanel, press submit: the button shows "กำลังส่งข้อมูล…" for ~0.8 s, then the amber alert "ตอนนี้ระบบช้าอยู่ค่ะ…" appears and the screen stays on A2. Untick, press again: the app moves to the A3 stub.
6. Reset, jump to A2 again, press "แก้ไข" on ชื่อร้าน: the app returns to A1 and the companion asks "ร้านชื่ออะไรคะ?". Type `ครัวป้าแดง` via พิมพ์แทน, then "ตรวจทานข้อมูล" returns to A2 with the other confirmations kept.
7. If the device has a Thai voice, "ฟังสรุป" reads the summary aloud; otherwise the button is not shown.

- [ ] **Step 5: Commit**

```bash
git add src/screens/act1-onboarding/A2-review src/App.tsx
git commit -m "Add A2 review screen with per-field confirmation and submit guardrail" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: A3, the act transition, the Act 2 placeholder and a full demo run

**Files:**
- Create: `src/screens/act1-onboarding/A3-submitted/SubmittedScreen.tsx`, `src/screens/ActTransition.tsx`, `src/screens/act2-grow/1-dashboard/DashboardScreen.tsx`
- Modify: `src/App.tsx`, `README.md`
- Delete: `src/screens/ScreenStub.tsx`

**Interfaces:**
- Consumes: journey state `startedAt` / `submittedAt` (Task 10); `formatDuration` (Task 1).
- Produces: `<SubmittedScreen>`, `<ActTransition>`, `<DashboardScreen>` (placeholder that Plan 2 replaces).

- [ ] **Step 1: Write the remaining screens**

`src/screens/act1-onboarding/A3-submitted/SubmittedScreen.tsx`:
```tsx
import { CheckCircle2 } from 'lucide-react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatDuration } from '@/lib/format.ts'

export function SubmittedScreen() {
  const { state, dispatch } = useJourney()
  const { startedAt, submittedAt } = state
  const elapsed = startedAt !== null && submittedAt !== null ? formatDuration(submittedAt - startedAt) : null
  return (
    <OnboardingShell
      title={th.onboarding.title}
      footer={
        <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'TRANSITION' })}>
          {th.submitted.continue}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <CheckCircle2 className="size-24 animate-pop text-action" aria-hidden />
        <h2 className="text-2xl font-bold">{th.submitted.title}</h2>
        {elapsed && <p className="text-lg">{th.submitted.elapsed(elapsed)}</p>}
      </div>
      <section className="mt-8">
        <h3 className="mb-3 font-bold">{th.submitted.nextTitle}</h3>
        <ol className="flex flex-col gap-3">
          {th.submitted.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-action text-white' : 'bg-canvas text-ink-muted'}`}
              >
                {index + 1}
              </span>
              <span className="pt-1">
                {step}
                {index === 0 && <span className="ml-2 rounded-full bg-ok-bg px-2 text-sm text-action">{th.submitted.upNext}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </OnboardingShell>
  )
}
```

`src/screens/ActTransition.tsx`:
```tsx
import { CalendarClock } from 'lucide-react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

/** "30 วันต่อมา…": the hand-off from Act 1 (sign-up) to Act 2 (growth). */
export function ActTransition() {
  const { dispatch } = useJourney()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-action px-6 text-center text-white">
      <CalendarClock className="size-16" aria-hidden />
      <h1 className="text-money font-bold">{th.transition.title}</h1>
      <p className="text-lg">{th.transition.body}</p>
      <Button variant="secondary" onClick={() => dispatch({ type: 'GO', screen: 'G1_DASHBOARD' })}>
        {th.transition.cta}
      </Button>
    </div>
  )
}
```

`src/screens/act2-grow/1-dashboard/DashboardScreen.tsx`:
```tsx
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { th } from '@/copy/th.ts'

// Placeholder: Plan 2 replaces this with the proactive-nudge dashboard (spec §7.3, G1).
export function DashboardScreen() {
  return (
    <OnboardingShell title={th.act2Placeholder.title}>
      <p className="text-ink-muted">{th.act2Placeholder.body}</p>
    </OnboardingShell>
  )
}
```

- [ ] **Step 2: Finish the screen switch and delete the stub**

Replace `src/App.tsx`:
```tsx
import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { TalkScreen } from '@/screens/act1-onboarding/A1-talk/TalkScreen.tsx'
import { ReviewScreen } from '@/screens/act1-onboarding/A2-review/ReviewScreen.tsx'
import { SubmittedScreen } from '@/screens/act1-onboarding/A3-submitted/SubmittedScreen.tsx'
import { DashboardScreen } from '@/screens/act2-grow/1-dashboard/DashboardScreen.tsx'
import { ActTransition } from '@/screens/ActTransition.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  switch (state.screen) {
    case 'A1_TALK':
      return <TalkScreen />
    case 'A2_REVIEW':
      return <ReviewScreen />
    case 'A3_SUBMITTED':
      return <SubmittedScreen />
    case 'TRANSITION':
      return <ActTransition />
    case 'G1_DASHBOARD':
      return <DashboardScreen />
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

Run: `git rm src/screens/ScreenStub.tsx`

- [ ] **Step 3: Add the demo notes to the README**

Append to `README.md`:
```markdown

### Presenting the demo

- Open on a desktop browser: the phone frame is on the left, the **Demo panel** on the right (press `D` to hide or show it).
- **Act 1:** on A1, play "บรรทัด 1–3" from the panel (or speak them in Chrome), tap **ใช่** for the phone, then **ตรวจทานข้อมูล** → confirm each card → **ยืนยันและส่งสมัคร**.
- "จำลองระบบล่ม" shows how a failed submit is handled; "เริ่มใหม่ทั้งหมด" resets.
- Act 2 arrives with Plan 2.
```

- [ ] **Step 4: Full verification**

Run: `npm test && npm run build && npm run lint`
Expected: every test file PASSES (format, 6 parser files, profile, extractProfile, followUp, submit, merchantApi.write, architecture, journeyMachine, scripted, demoBus, demoProfile, summarizeField), build succeeds, 0 lint errors.

Full demo run in the `web` preview at desktop width, starting from "เริ่มใหม่ทั้งหมด":
1. A1: lines 1–3 from the panel, tap ใช่ → "ตรวจทานข้อมูล".
2. A2: confirm all six cards → "ยืนยันและส่งสมัคร" → ~0.8 s loading.
3. A3: the check pops in; "ส่งข้อมูลร้านแล้วค่ะ 🎉"; "คุยกันแค่ … ก็เสร็จ" shows the real elapsed time; the 3-step list marks step 1 "ต่อไป".
4. "ดูต่อ: 30 วันต่อมา" → green full-screen "30 วันต่อมา…" → "ไปที่หน้าร้าน" → the Act 2 placeholder.
5. Repeat steps 1–4 at the mobile preset (375 × 812): no horizontal scroll, every button reachable, text never smaller than 15 px.
6. Jump to A3 from the panel directly: the elapsed-time line is hidden (no measurement), nothing breaks.

- [ ] **Step 5: Commit**

```bash
git add src/screens src/App.tsx README.md
git commit -m "Add A3 submitted screen, act transition and Act 2 placeholder" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Done when

- `npm test`, `npm run build` and `npm run lint` all pass.
- The full Act 1 demo (spec §9.5 script) runs end to end in the browser, on desktop with the presenter panel and at phone width.
- No merchant-facing string lives outside `src/copy/th.ts`, nothing in `src/ai/` imports React, and only `submit.ts` reaches the write API (architecture test).
- Next: write Plan 2 (Act 2: G1–G5) against spec §7.3, §9.1–9.3 and §6.5–6.6.
