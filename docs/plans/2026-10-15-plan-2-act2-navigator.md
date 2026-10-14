# Plan 2: Act 2, the voice navigator — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner talks and the AI drives a mock GrabMerchant app: it names where it is going, moves a visible cursor, taps, and says one sentence. Five scripts (sales, rain forecast, rain promotion, sold-out dish, complaints) prove Forecast → Action → Learn.

**Architecture:**
- **Scripts are data.** `src/ai/navigator/scripts.ts` holds five `Script`s. A pure runner plays the steps through a small `RunnerIO`; the screens only show state.
- **Trust rule.** The AI prepares drafts and moves the cursor. `src/ai/guardrail/confirmAndExecute.ts` is the only module that calls the write API, and only `ConfirmBar.tsx` calls it. Voice never confirms.
- **Reuse.** `matchCommand`, `useVoiceInput`, `AiHelperBar`, `speak()`, `demoBus` and `DemoPanel` from Act 1.

**Tech stack:** unchanged. No new dependencies.

**Spec:** `docs/specs/2026-10-15-act2-voice-navigator-design.md`. It replaces §7.3 of `2026-10-13-merchant-companion-design.md`.

## Global constraints

- Same code style, copy and commit rules as `2026-10-14-plan-1c-grab-style-signup.md` (no semicolons, single quotes, explicit `.ts`/`.tsx` imports, every string in `src/copy/th.ts`, plain-sentence commits).
- `src/ai/**` never imports React. Vitest runs in Node and only picks up `*.test.ts`.
- All simulated data says "ตัวอย่าง". Forecast and impact are ranges labelled "ประมาณการ". The rain lift (+10–25%) and bundle lift (+40–70%) are demo assumptions.
- Build order if time runs short: 1 sales → 3 promo → 4 sold-out → 2 forecast → 5 feedback.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/data/merchant.json`, `Merchant` in `src/types/domain.ts`, `getMerchant()` | create | the simulated Day-30 shop |
| `src/ai/guardrail/promoMath.ts`, `checks.ts` | create | profit, impact range, spec 6.5 checks (promo and sold-out) |
| `src/ai/guardrail/confirmAndExecute.ts` | create | the only path from a draft to the write API |
| `src/services/merchantApi.write.ts` | modify | `openPromotion`, `stopPromotion`, `markSoldOut` (mock) |
| `src/ai/navigator/types.ts`, `insights.ts`, `drafts.ts` | create | state, figures behind each answer, the rain bundle, item lookup, reopening times |
| `src/ai/navigator/scripts.ts`, `matchIntent.ts`, `runner.ts` | create | the five scripts, sentence → script, step player |
| `src/services/speech/voiceProvider.ts` | create | `VoiceProvider` wrapper over the browser voice |
| `src/components/navigator/NavCursor.tsx`, `mark.ts` | create | the visible finger and the highlight outline |
| `src/screens/act2-grow/1-dashboard/*` | create/replace | host, home grid, insights, boost, menu, feedback, confirm bar |
| `src/architecture.test.ts` | modify | confirmAndExecute is a writer; only `ConfirmBar.tsx` imports it |
| `src/app/demo/DemoPanel.tsx`, `README.md` | modify | Act 2 buttons and the presenter steps |

## Tasks

Each task: write the failing test, make it pass, run `npm test`, `npm run lint`, `npm run build`, commit.

- [x] **T1. Shop data and guardrail maths.** `merchant.json`, `promoMath` (profit per bundle ฿29.3 vs ฿24.3; 7-day impact ฿615–1,025), `checks` (MARGIN_FLOOR, BUDGET_CAP, NO_OVERLAP, SCHEDULE_VALID, REVERSIBLE; ITEM_EXISTS, UNTIL_CHOSEN).
- [x] **T2. Figures and drafts.** `insights` (sales vs last week, rain range 51–58, complaint topics), `drafts` (rain bundle, `findItem`, `BACK_TIMES`).
- [x] **T3. Scripts and matcher.** At least five phrasings per script, including split words and misheard spellings ("ฟิตแบ็ค"). Confirm words ("ยืนยัน", "ตกลง", "เปิดใช้งาน") start nothing.
- [x] **T4. Runner.** Steps advance go → say; cancelling stops it even mid-line; `{item}` / `{itemId}` are filled in; no script step confirms.
- [x] **T5. The one write path.** `confirmDraft` blocks a failed check and reports API failure; the architecture test lets only `ConfirmBar.tsx` import it.
- [x] **T6. Voice provider.** `VoiceProvider` over `textToSpeech.ts`; used for the lesson's read-aloud.
- [x] **T7. Mock app screens.** Host with cursor, skip (button and `S` key), banner; five screens; confirm bar; "หยุดโปรนี้".
- [x] **T8. Presenter tools.** DemoPanel jump and five buttons; example chips on the phone; README section.
- [x] **T8b. GrabMerchant look.** White headers, 4-column icon grid, underlined tabs, menu switches with "วันนี้" / "ไม่มีกำหนด", star rating and menu share (`ratingSummary`, `menuShare`, tested first).
- [x] **T8c. Open any home item by voice.** `matchOpen` + `openScript` (13 items, other names, polite padding; questions left to the scripts), all tiles tappable, `PageScreen` for the nine items without a demo screen.
- [ ] **T9. Real microphone and voice check.** Not done: needs Chrome or Edge with a mic, and the voice decision from the spec's open questions.
