# Grab Merchant Companion — Prototype Design Spec

- **Date:** 2026-10-13
- **Status:** Draft for team review
- **Challenge:** GrabSpark business case — AI assistant inside GrabMerchant for Thai MSMEs
- **Stack:** Vite + React + TypeScript + Tailwind CSS v4

---

## 1. Problem

Grab offers merchants a large toolbox (GrabAds, promotions, menu optimization, Merchant Cash Advance, POS integration), but most traditional and MSME merchants find it overwhelming. They want to grow but don't know where or how to start, and they have no time or analytics staff. This is a **learning and skills gap**, not a motivation gap.

The gap starts before merchants ever see those tools: **registration itself is a drop-off point.** Many merchants abandon sign-up because it is a long typed form on a small screen.

**Target persona:** non-tech-savvy street-food sellers, neighborhood restaurant owners and older entrepreneurs in Thailand. Demo persona: **ป้าแดง**, owner of **ครัวป้าแดง**, a home-style Thai food shop at ลาดพร้าว 71, Bangkok.

## 2. Positioning against what Grab already has

| Existing Grab feature | What it does | Gap we fill |
|---|---|---|
| Merchant Menu Assistant (Jan 2025) | Photo of a paper menu → AI extracts item names/prices → merchant reviews and publishes | Covers the menu step only, and needs a printed menu. Store profile, location and hours are still typed. We hand off to it rather than rebuild it. |
| AI Merchant Assistant (Apr 2025) | In-app chat, insights, photo prompts, proactive recommendations on the home page | Built for merchants already selling on Grab. Suggests, but the merchant still has to find and fill the tool themselves. |
| Voice-based sign-up | None found in our research | Our Act 1. |

*To verify with the team:* whether Grab's current sign-up flow already includes the menu scan, and where merchants actually drop off. Field data on drop-off would make Act 1's case much stronger.

Grab's AI already surfaces proactive recommendations, so **proactivity alone is not our differentiator.** Our edge:

1. **Voice-first onboarding**: register by talking, before the merchant ever reaches the in-app AI.
2. **Pre-fill + one-tap execute**: the AI doesn't just suggest a promotion, it builds the complete, validated promotion and the merchant only confirms.
3. **Guardrail by construction**: the AI can never execute anything itself.

Pitch line: *"Grab's AI helper is waiting behind the door merchants can't get through. We open the door, then keep walking with them."*

Sources: [Merchant Menu Assistant](https://www.grab.com/sg/inside-grab/stories/grabs-new-ai-tool-makes-menu-management-a-snap-for-merchants/) · [AI Merchant Assistant](https://www.grab.com/inside-grab/stories/grabx-ai-merchant-assistant/) · [Grab Thailand press release](https://www.grab.com/th/en/press/others/grabfood6040_merchant_ai/)

## 3. Core principles

1. **The trust rule.** The AI only turns words into a structured draft. Deterministic code does all money math and safety checks. Nothing is submitted or executed until the merchant taps confirm. This applies to both acts.
2. **One thing at a time.** One main suggestion, one question, one primary action per screen.
3. **Show why.** Every AI-chosen value carries a one-line reason in plain Thai.
4. **Talk, don't type.** Voice is the default input; tap-chips are the fallback; the keyboard is the last resort.
5. **Honest numbers.** Impact is shown as conservative ranges labeled ประมาณการ, never as promises.
6. **No pre-ticked spending, always reversible.** Any option that costs money starts off. Stopping a promotion is always one tap away.

## 4. Scope

**In scope (prototype):**
- Act 1: voice onboarding for store profile, location + hours, menu + prices.
- Act 2: proactive nudge → intent → pre-filled promotion preview + guardrail → success (+ optional recap).
- Simulated AI (rule-based Thai parsers) behind swappable interfaces.
- Mock Grab backend with simulated latency and failure.
- Presenter tools (DemoPanel) and demo-safe fallbacks.

**Out of scope:**
- ID card / bank book capture (shown only as a "next step" on A3).
- Real Grab APIs, authentication, persistence beyond the browser session.
- Real LLM calls (the adapter interface exists; see §12).
- Languages other than Thai in the UI (see open questions).

## 5. User journey

```
ACT 1 · Day 0 — Register by talking
  A1 Talk ──► A2 Review & confirm ──► A3 Submitted
                                          │
                                   "30 วันต่อมา…" (ActTransition)
                                          ▼
ACT 2 · Day 30 — Grow with the same companion
  G1 Dashboard + nudge ──► G2 Intent ──► G3 Preview + guardrail ──► G4 Success ──► (G5 Recap, optional)
```

Both acts tell one story: the menu, hours and location ป้าแดง speaks in Act 1 are the same data the Act 2 bundle promotion uses.

## 6. Architecture

### 6.1 Data flow

```
ACT 1
 Thai voice/text ──► [Onboarding Extractor] ──► field updates {value, confidence}
                         │                         │
                         │                    [Follow-up Picker] ──► ONE question + chips
                         ▼
                   OnboardingProfile (empty → heard → confirmed)
                         ▼
                   [Submission Guardrail] ── merchant taps ยืนยันและส่งสมัคร ──► mock submitApplication()

ACT 2
 mock merchant data ──► [Nudge Engine] ──► ranked Recommendation cards ──┐
                          detectors + scoring                            │ tap "ให้ AI จัดการให้"
                                                                         ▼
 Thai voice/text ─────► [Action Parser] ──► ParsedIntent {action, slots, confidence}
                                               │ missing slot → ONE question + chips
                                               ▼
                        [Pre-fill Handler] ──► ActionDraft (every field filled + "why")
                                               ▼
                        [Guardrail] checks ── merchant taps ยืนยันและเปิดใช้งาน ──► [Executor → mock API]
                                                                                       ▼
                                                                    [Impact Estimator] ──► G4
```

### 6.2 Modules

All `src/ai/` code is pure TypeScript with no React imports, so it can be unit-tested and later moved to a server.

| Module | Path | Job | Prototype implementation | Production path |
|---|---|---|---|---|
| Onboarding Extractor | `ai/onboarding/extractProfile.ts` | Utterance + profile so far → field updates with confidence | Rule-based Thai parsers (§6.4) | LLM restricted to the profile schema |
| Follow-up Picker | `ai/onboarding/followUp.ts` | Choose the next empty field → one question + chips. Low-confidence fields are flagged in A2, not re-asked. | Fixed priority order: storeName → category → location → hours → menu → phone | Same, plus conversation history |
| Nudge Engine | `ai/nudge-engine/` | Detect opportunities, rank, explain | Detector functions over mock JSON; `score = impact × confidence × urgency` | Live order events + a model predicting promo lift |
| Action Parser | `ai/action-parser/` | Thai voice/text → `ParsedIntent` | Thai keyword/slot word list (`thaiLexicon.ts`) | LLM restricted to the action schema |
| Pre-fill Handler | `ai/prefill/` | Intent + merchant data → complete `ActionDraft` | One filler per action type; v1: `fillers/bundlePromo.ts` | Same, plus merchant history and policy |
| Guardrail | `ai/guardrail/` | Run checks, gate execution | Pure check functions; `confirmAndExecute.ts` is the only code allowed to call write APIs | Same checks re-run on the server |
| Impact Estimator | `ai/impact/estimateImpact.ts` | Conservative impact ranges | Formula in §6.6 | Measured against real promo results |

**Executor isolation.** Write functions (`submitApplication`, later `createPromotion`) live in their own module, `services/merchantApi.write.ts`. Only `ai/onboarding/submit.ts` and `ai/guardrail/confirmAndExecute.ts` may import it. An architecture test (`src/architecture.test.ts`) scans every source file and fails if anything else does, so "the AI can't execute on its own" is a property of the code, not just the UI.

**Swappable AI.** `parseIntent` and `extractProfile` are chosen through an adapter selected by `VITE_AI_MODE=mock|llm`. v1 ships `mock` only; `llm` is a stub. A real LLM requires a small server proxy because API keys cannot be shipped to the browser.

### 6.3 Shared contracts (`src/types/domain.ts`)

```ts
type FieldStatus = 'empty' | 'heard' | 'confirmed';

interface ProfileField<T> {
  value: T | null;
  status: FieldStatus;
  confidence?: number;       // 0–1, set when status = 'heard'
  heardFrom?: string;        // the words the value came from (shown in A2)
}

interface OnboardingProfile {
  sessionId: string;
  fields: {
    storeName: ProfileField<string>;
    category:  ProfileField<string>;
    location:  ProfileField<{ text: string; lat: number; lng: number }> & { needsPinCheck?: boolean };
    hours:     ProfileField<{ open: string; close: string; closedDays: Weekday[] }>;
    menu:      ProfileField<{ name: string; priceTHB: number }[]>;
    phone:     ProfileField<string> & { suggestFromAccount?: boolean };
  };
}

// Computed from the profile by the Follow-up Picker, not stored in it.
interface FollowUpQuestion {
  field: keyof OnboardingProfile['fields'] | null;   // null = the open "tell me about your shop" prompt
  text: string;
  chips: { label: string; kind: 'say' | 'startMic' | 'useAccountPhone' | 'useDeviceLocation' | 'scanMenu' }[];
  // 'say' chips are fed to the extractor as if the merchant had spoken the label
}

type ActionType = 'CREATE_BUNDLE_PROMO';   // v1; more later (AD_BOOST, ADD_MENU_PHOTO…)

interface ParsedIntent {
  action: ActionType;
  slots: Record<string, unknown>;
  source: 'card' | 'voice' | 'text';
  utterance?: string;
  confidence: number;        // 1.0 when source = 'card'
  missingSlots: string[];
}
// A Recommendation's suggestedIntent has the same {action, slots} shape, so the tap path
// and the voice path meet at one contract.

interface DraftField {
  key: string; label: string; value: unknown;
  was?: unknown;             // original value, e.g. normal price
  why?: string; editable: boolean;
  min?: number; max?: number; step?: number; unit?: string;
}

interface GuardrailCheck { id: string; pass: boolean; message: string }
```

### 6.4 Thai parsing rules (Act 1)

**Spoken time words** (`parsers/thaiTime.ts`). Thai uses a six-hour clock in everyday speech:

| Spoken | Time |
|---|---|
| เจ็ดโมงเช้า / เจ็ดโมง | 07:00 |
| สิบโมง / สิบโมงเช้า | 10:00 |
| เที่ยง / เที่ยงวัน | 12:00 |
| บ่ายโมง | 13:00 |
| บ่ายสาม / บ่ายสามโมง | 15:00 |
| ห้าโมงเย็น | 17:00 |
| หกโมงเย็น | 18:00 |
| ทุ่มนึง / หนึ่งทุ่ม | 19:00 |
| สองทุ่ม | 20:00 |
| สามทุ่ม | 21:00 |
| เที่ยงคืน | 00:00 |
| ตีหนึ่ง … ตีห้า | 01:00 … 05:00 |

Also handle digit forms ("10 โมง", "20:00", "20.00 น.") and days off ("หยุดวันอาทิตย์", "เปิดทุกวัน").

**Spoken numbers** (`parsers/thaiNumber.ts`). Speech recognition may return words or digits. Handle หนึ่ง–เก้า, สิบ, ยี่สิบ, เอ็ด (unit 1 after tens: สิบเอ็ด = 11, ยี่สิบเอ็ด = 21), ร้อย, พัน. Examples: แปดสิบเก้า → 89, หกสิบห้า → 65, ร้อยยี่สิบ → 120.

**Menu items** (`parsers/menuItems.ts`). One sentence → many items, split on a price followed by optional บาท: "น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้าบาท" → `[{name: "น้ำพริกกะปิปลาทู", priceTHB: 89}, {name: "กะเพราหมูสับ", priceTHB: 65}]`.

**Location** (`parsers/location.ts`). Landmark phrases ("ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น") → lookup in `data/landmarks.json` (mock geocode) → pin + confidence. Landmark-based results always set `needsPinCheck: true`.

**Confidence.** Values from an exact pattern match get ≥ 0.9; partial or inferred matches (category guessed from dish names, landmark lookups) get < 0.8 and show amber in A2.

### 6.5 Guardrail checks

**Act 1 submission** (`ai/onboarding/submit.ts`):

| Check | Rule |
|---|---|
| ALL_CONFIRMED | Every field has status `confirmed` |
| PIN_CONFIRMED | Location pin was confirmed by the merchant on the map |
| MENU_VALID | ≥ 1 item; every price > 0 |
| HOURS_VALID | open ≠ close (overnight hours allowed) |
| PHONE_VALID | Thai mobile format (10 digits, starts with 0) |

**Act 2 promotion** (`ai/guardrail/checks.ts`):

| Check | Rule | Message shown |
|---|---|---|
| MARGIN_FLOOR | Profit per bundle after commission > 0 | ยังมีกำไร ~฿29 ต่อชุด |
| BUDGET_CAP | dailyCap × discount ≤ merchant `maxDailyPromoSpendTHB` | ส่วนลดรวมไม่เกิน ฿300/วัน |
| NO_OVERLAP | No active promotion on the same items in the same time window | ไม่ซ้ำกับโปรที่มีอยู่ |
| SCHEDULE_VALID | Time window is inside opening hours | อยู่ในเวลาเปิดร้าน |
| REVERSIBLE | Informational, always passes | หยุดโปรได้ทุกเมื่อ |

A failed check shows amber with a plain-Thai explanation and disables the confirm button until the field is fixed.

### 6.6 Promotion math (demo values)

- Bundle: น้ำพริกกะปิ ปลาทูทอด (฿89, cost ฿38) + ชาไทยเย็น (฿35, cost ฿9). Normal price ฿124 → bundle ฿109 (discount ฿15).
- Commission (mock): 30%.
- Profit per bundle = 109 × 0.70 − 47 = **฿29.3**. Profit selling the dish alone = 89 × 0.70 − 38 = **฿24.3**.
  → The bundle earns *more* per order than the dish alone because the high-margin drink absorbs the discount. This is the key AI insight to highlight in the pitch.
- Daily cap 20 bundles × ฿15 = ฿300/day ≤ merchant limit ฿500/day.

**Impact estimate** (`estimateImpact`):
```
baselineWindowOrders = sum of baseline orders for hours in the window   // 14,15,16 → 3+2+2 = 7/day
extraPerDay[i]  = round(baselineWindowOrders × liftPct[i] / 100)       // 7×40% = 3, 7×70% = 5
extraOrders[i]  = extraPerDay[i] × durationDays                         // 21 – 35
extraRevenue[i] = extraOrders[i] × bundlePrice                          // ฿2,289 – ฿3,815
extraProfit[i]  = floor(extraOrders[i] × profitPerBundle)               // ฿615 – ฿1,025
```
Money is computed in integer satang (฿1 = 100 satang) to avoid floating-point drift, and rounded down to whole baht to stay conservative. v1 ignores cannibalization (customers who would have bought anyway); note this if judges ask.

**Costs.** Act 1 does not ask for ingredient costs. Act 2's Day-30 mock data includes them. In production, the companion would ask for an approximate cost (with chips) the first time a feature needs margin math.

## 7. Screen blueprint

### 7.1 Shared shell
- `DeviceFrame`: phone frame (390 × 844) on desktop, full screen on mobile.
- `MerchantShell` (Act 2 only): `AppHeader` (store name, open/closed status), mock GrabMerchant `BottomNav`, persistent `AssistantBar` with a big mic button.
- `OnboardingShell` (Act 1): simple header with progress, no bottom nav.
- `DemoPanel` (presenter only, beside the phone on desktop, toggled with `D`): jump to any screen, reset state, set simulated time, play scripted utterances.

### 7.2 Act 1 · Day 0

**A1 · Tell me about your shop** (`screens/act1-onboarding/A1-talk/TalkScreen.tsx`)
- Companion greeting: *"สวัสดีค่ะ แค่เล่าเรื่องร้านให้ฟัง ไม่ต้องพิมพ์เลยนะคะ ใช้เวลาประมาณ 3 นาที"*
- `MicButton` (idle / listening / processing / error) + live `TranscriptBubble`.
- `LiveProfileChecklist`: rows ชื่อร้าน · ประเภทอาหาร · ที่ตั้ง · เวลาเปิด-ปิด · เมนู · เบอร์ติดต่อ; each row animates to ✓ when heard.
- `FollowUpPrompt`: one question for the next missing field, with `ClarifyChips` (e.g. [10:00] [เจ็ดโมงเช้า] [พูดเอง]).
- `MenuItemList`: grows live as items are heard. A wrong item is removed with × and said again. Chip "ถ่ายรูปเมนูแทน" → mock hand-off to Grab's existing Menu Assistant scan.
- Phone and owner name are offered from the logged-in account as a chip: *"ใช้เบอร์ 08x-xxx-4217 ที่ล็อกอินอยู่ไหมคะ?"* [ใช่] [ใช้เบอร์อื่น].
- "พิมพ์แทน" link to a text fallback.
- Primary button "ตรวจทานข้อมูล" enabled once every field is at least `heard`.

**A2 · Review — AI ฟังได้ว่า…** (`A2-review/ReviewScreen.tsx`)
- `StorePreviewCard`: "ลูกค้าจะเห็นร้านแบบนี้".
- Section cards with edit buttons: `ProfileSummaryCard`, `MapPinConfirm` (static map + pin, "หมุดถูกไหมคะ?" [ถูกแล้ว] [ขยับหมุด]), `HoursCard`, `MenuReviewList`.
- Fields with confidence < 0.8 are amber: "ช่วยเช็คหน่อยค่ะ". Tapping ✓ ถูกแล้ว marks a field `confirmed`.
- แก้ไข clears that field and returns to A1, where the companion asks for it again by voice (no keyboard forms).
- `ListenButton`: reads the whole summary aloud (Thai text-to-speech; hidden if no Thai voice is available).
- Sticky `ConfirmBar`: **ยืนยันและส่งสมัคร**, with *"ยังไม่ส่งข้อมูลจนกว่าคุณจะกดยืนยัน"*.

**A3 · Submitted** (`A3-submitted/SubmittedScreen.tsx`)
- `SuccessHero`: "ส่งข้อมูลร้านแล้วค่ะ 🎉" and the real time spent, measured from the first utterance to submit ("คุยกันแค่ 2 นาที 40 วินาที ก็เสร็จ"). No invented typing benchmark.
- `NextStepsTimeline`: ถ่ายรูปบัตรประชาชนและสมุดบัญชี (หนูจะพาทำ) → Grab ตรวจสอบ → เปิดรับออเดอร์. Not interactive in the prototype.
- `ActTransition`: "30 วันต่อมา…" card → G1.

### 7.3 Act 2 · Day 30

**G1 · Proactive nudge** (`act2-grow/1-dashboard/DashboardScreen.tsx`), simulated time 13:30 Tuesday
- `TodaySummaryCard`: two big numbers only (sales, orders).
- `NudgeCard` (hero): slides in about 1.5 s after load, unprompted. Headline, `MiniCompareBar` (บ่าย 7 vs เที่ยง 21 ออเดอร์), impact chip, primary **ให้ AI จัดการให้**, secondary ไว้ทีหลัง.
- `SecondaryNudge`: one collapsed extra idea ("เมนู 2 รายการยังไม่มีรูป").
- The nudge fires *before* the 14:00–17:00 slow period so there is time to act.

**G2 · Intent** (`2-intent/IntentScreen.tsx`)
- From a tap: `ThinkingSteps` shows the work in plain steps: ✓ ดูยอดขาย 4 สัปดาห์ ✓ เลือกเมนูขายดี ✓ เลือกเครื่องดื่มกำไรดี ✓ คำนวณราคาที่ยังมีกำไร.
- From voice: `VoiceCaptureSheet` with `MicButton`, `TranscriptBubble`, `ExampleChips` ("ทำโปรช่วงบ่าย", "ลดราคาเมนูขายดี").
- `ClarifyQuestion` if a slot is missing or confidence < 0.7.

**G3 · Pre-filled preview + guardrail** (`3-preview/PreviewScreen.tsx`)
- Header: "AI เตรียมโปรให้แล้ว ตรวจดูก่อนเปิดนะคะ".
- `CustomerPreviewCard`: "ลูกค้าจะเห็นแบบนี้" — ชุดบ่ายดี, ~~฿124~~ ฿109, badge "เฉพาะ 14:00–17:00".
- `PrefilledField` rows, each with "AI เลือกเพราะ…"; edit opens `FieldEditorSheet` with ± steppers and chips (no keyboard).
- `SafetyChecklist`: results of §6.5.
- `BoostToggle`: "เพิ่มการมองเห็น ฿50/วัน", labeled แนะนำ, **off by default**.
- `ListenButton`.
- Sticky `ConfirmBar`: **ยืนยันและเปิดใช้งาน** + แก้ไข, with *"ยังไม่มีอะไรเปลี่ยนจนกว่าคุณจะกดยืนยัน"*. Shows "กำลังเปิดโปร…" while the mock API runs.

**G4 · Success & value** (`4-success/SuccessScreen.tsx`)
- `SuccessHero`: animated check, "เปิดโปร 'ชุดบ่ายดี' แล้วค่ะ", "เริ่มวันนี้ 14:00 น.".
- `ImpactEstimateCard`: 7-day ranges from §6.6, "อ้างอิงร้านคล้ายกันแถวลาดพร้าว".
- `WhatHappensNext`: โปรเริ่ม 14:00 · สรุปผลทุกคืน 20:00 · ครบ 7 วันถามว่าจะต่อไหม.
- **หยุดโปรนี้** always visible. "กลับหน้าหลัก".

**G5 · Recap (optional)** (`5-recap/RecapScreen.tsx`)
- "3 วันผ่านไป": ออเดอร์ช่วงบ่ายเพิ่ม 12 ออเดอร์ (เฉลี่ย 4/วัน) · กำไรเพิ่ม ~฿351 · "อยู่ในช่วงที่คาดไว้" (mock: 12 × 29.3 = 351.6, floored).
- **ต่อโปรอีก 7 วัน** → back through G3's guardrail.

## 8. UX rules and design tokens

Defined once in `src/styles/index.css` (Tailwind v4 `@theme`) so every screen follows them.

| Rule | Value |
|---|---|
| Body text | ≥ 18px |
| Money and key numbers | 28–40px, bold |
| Tap targets | ≥ 56px tall |
| Primary action | One per screen, full width, bottom (thumb zone) |
| Font | **Noto Sans Thai Looped** (looped มีหัว letterforms read easier for older eyes) |
| Accent green | `#00B14F` (Grab green) — fills and accents only; **2.8:1 on white, fails WCAG AA for text** |
| Action green | `#007A3D` — buttons with white text and green text (~5.5:1 on white) |
| Warning | Amber background + dark text, never color alone (always icon + words) |
| Number format | `Intl.NumberFormat('th-TH')`, "฿1,025", "14:00 น." |

**Copy and tone** (all strings in `src/copy/th.ts`):
- Plain Thai only. Never ROI, CTR, conversion. Say ขายเพิ่ม, กำไร, บาท.
- Warm and polite. The companion refers to itself as หนู and ends sentences with ค่ะ/คะ, playing the role a child or grandchild (หลาน) usually plays when setting up the app.
- Short sentences, one idea each.

## 9. Mock data (`src/data/`)

### 9.1 `merchant.json` (Act 2, Day 30)
```json
{
  "merchant": {
    "id": "GM-TH-BKK-004217",
    "storeName": "ครัวป้าแดง",
    "ownerDisplayName": "ป้าแดง",
    "area": "ลาดพร้าว 71, กรุงเทพฯ",
    "category": "อาหารไทยตามสั่ง",
    "hours": { "open": "10:00", "close": "20:00", "closedDays": [] },
    "commissionRate": 0.30,
    "settings": { "maxDailyPromoSpendTHB": 500, "voiceEnabled": true, "textSize": "large" }
  },
  "menu": [
    { "id": "M01", "name": "น้ำพริกกะปิ ปลาทูทอด ผักลวก", "type": "main",  "priceTHB": 89, "costTHB": 38, "sold28d": 530, "hasPhoto": true,  "tags": ["bestseller"] },
    { "id": "M02", "name": "ข้าวกะเพราหมูสับไข่ดาว",        "type": "main",  "priceTHB": 65, "costTHB": 28, "sold28d": 410, "hasPhoto": true },
    { "id": "M03", "name": "แกงเขียวหวานไก่ราดข้าว",        "type": "main",  "priceTHB": 75, "costTHB": 32, "sold28d": 210, "hasPhoto": false },
    { "id": "D01", "name": "ชาไทยเย็น",                     "type": "drink", "priceTHB": 35, "costTHB": 9,  "sold28d": 380, "hasPhoto": true },
    { "id": "D02", "name": "น้ำกระเจี๊ยบ",                   "type": "drink", "priceTHB": 30, "costTHB": 6,  "sold28d": 95,  "hasPhoto": false }
  ],
  "activePromotions": [],
  "hourlyOrders": {
    "baseline": { "label": "เฉลี่ยวันอังคาร 4 สัปดาห์", "byHour": { "10": 2, "11": 6, "12": 9, "13": 6, "14": 3, "15": 2, "16": 2, "17": 4, "18": 7, "19": 5 } },
    "today":    { "date": "2026-10-13", "asOf": "13:30", "byHour": { "10": 2, "11": 5, "12": 9, "13": 3 } }
  },
  "areaInsights": {
    "searchTrends": [{ "term": "ชาไทย", "window": "14:00-17:00", "changePct": 38 }],
    "benchmarks": { "afternoonBundleLiftPct": [40, 70], "sampleSize": 120 }
  }
}
```

### 9.2 Recommendation card (Nudge Engine output)
```json
{
  "id": "rec_afternoon_bundle_20261013",
  "type": "AFTERNOON_SLUMP_BUNDLE",
  "status": "new",
  "priority": 0.92,
  "triggeredAt": "2026-10-13T13:30:00+07:00",
  "expiresAt": "2026-10-13T17:00:00+07:00",
  "headline": "ช่วงบ่ายยอดตก ลองทำโปรชุดน้ำพริกคู่ชาไทยเย็นไหมคะ?",
  "why": "บ่าย 2–5 โมงขายได้ 7 ออเดอร์ น้อยกว่าช่วงเที่ยง 3 เท่า และคนแถวนี้ค้นหาชาไทยช่วงบ่ายเพิ่ม 38%",
  "evidence": [
    { "kind": "compare", "label": "ออเดอร์ บ่าย vs เที่ยง", "value": 7, "baseline": 21, "unit": "ออเดอร์/วัน" },
    { "kind": "trend", "label": "ค้นหา \"ชาไทย\" ช่วงบ่าย", "changePct": 38 }
  ],
  "estimatedImpact": { "periodDays": 7, "extraOrders": [21, 35], "extraProfitTHB": [615, 1025], "confidence": "medium" },
  "suggestedIntent": {
    "action": "CREATE_BUNDLE_PROMO",
    "slots": { "anchorItemId": "M01", "addOnItemId": "D01", "window": ["14:00", "17:00"], "durationDays": 7 }
  },
  "cta": { "primary": "ให้ AI จัดการให้", "secondary": "ไว้ทีหลัง" }
}
```
Detector rule (`afternoonSlump.ts`): fire when the baseline 14:00–17:00 window averages ≤ 50% of the 11:00–14:00 lunch window (here 7 vs 21 = 33%) and the current time is 0–60 minutes before the window starts. Anchor = top `sold28d` main. Add-on = the highest-margin drink (`(price − cost) / price`) **among drinks that already sell well** (`sold28d` ≥ 200). น้ำกระเจี๊ยบ has the higher margin (80%) but only 95 sales, so ชาไทยเย็น (74%, 380 sales) is chosen. Pairing with a drink customers already buy keeps the bundle believable.

### 9.3 Action draft (Pre-fill Handler output)
```json
{
  "draftId": "draft_7f3a",
  "action": "CREATE_BUNDLE_PROMO",
  "name": "ชุดบ่ายดี",
  "fields": [
    { "key": "items",        "label": "เมนูในชุด",   "value": ["M01", "D01"],     "why": "น้ำพริกปลาทูขายดีอันดับ 1 + ชาไทยเย็นกำไรดีและขายดี", "editable": true },
    { "key": "bundlePrice",  "label": "ราคาชุด",     "value": 109, "was": 124,    "why": "ลด 15 บาท แต่ยังกำไรมากกว่าขายน้ำพริกเดี่ยว", "editable": true, "min": 99, "max": 124, "step": 5 },
    { "key": "window",       "label": "ช่วงเวลา",    "value": ["14:00", "17:00"], "why": "ช่วงที่ครัวว่างที่สุด", "editable": true },
    { "key": "durationDays", "label": "ระยะเวลา",    "value": 7, "unit": "วัน",   "editable": true },
    { "key": "dailyCap",     "label": "จำกัดต่อวัน", "value": 20, "unit": "ชุด",   "why": "ส่วนลดรวมไม่เกิน ฿300/วัน", "editable": true },
    { "key": "promoCode",    "label": "รหัสโปร",     "value": "BAIDEE15",         "editable": false }
  ],
  "addOns": { "adBoost": { "enabled": false, "dailyBudgetTHB": 50, "recommended": true } },
  "economics": { "unitCostTHB": 47, "profitPerBundleTHB": 29.3, "profitDishAloneTHB": 24.3 }
}
```
`economics` is computed by the guardrail from the menu and commission rate. The AI never sets it.

### 9.4 Onboarding profile (A1/A2 state, mid-conversation)
```json
{
  "sessionId": "onb_001",
  "fields": {
    "storeName": { "value": "ครัวป้าแดง", "status": "heard", "confidence": 0.93, "heardFrom": "ร้านชื่อครัวป้าแดงค่ะ" },
    "category":  { "value": "อาหารไทย", "status": "heard", "confidence": 0.9, "heardFrom": "ขายน้ำพริกปลาทู อาหารไทยบ้านๆ" },
    "location":  { "value": { "text": "ลาดพร้าว 71 ตรงข้ามเซเว่น", "lat": 13.8016, "lng": 100.6033 }, "status": "heard", "confidence": 0.62, "needsPinCheck": true },
    "hours":     { "value": { "open": "10:00", "close": "20:00", "closedDays": [] }, "status": "heard", "confidence": 0.95, "heardFrom": "สิบโมงเช้าถึงสองทุ่ม ทุกวัน" },
    "menu":      { "value": [{ "name": "น้ำพริกกะปิ ปลาทูทอด", "priceTHB": 89 }, { "name": "ชาไทยเย็น", "priceTHB": 35 }], "status": "heard", "confidence": 0.9 },
    "phone":     { "value": null, "status": "empty", "suggestFromAccount": true }
  },
  "nextQuestion": { "field": "phone", "text": "ใช้เบอร์ 08x-xxx-4217 ที่ล็อกอินอยู่ไหมคะ?", "chips": ["ใช่", "ใช้เบอร์อื่น"] }
}
```
Coordinates are mock values for the demo. Category is 0.9 here because the merchant said "อาหารไทย" outright; it would be 0.74 (amber) if only guessed from dish names like น้ำพริก.

### 9.5 Demo script (`onboarding-script.json`)

Used by the DemoPanel and by the speech fallback (text "types out" as if heard). The live parser must handle these exactly, plus small variations.

| # | Companion asks | Merchant says | Fills |
|---|---|---|---|
| 1 | เล่าเรื่องร้านให้ฟังหน่อยค่ะ | ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น | storeName, category, location |
| 2 | ร้านเปิดกี่โมงถึงกี่โมงคะ? | สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน | hours |
| 3 | มีเมนูอะไรบ้างคะ บอกพร้อมราคาได้เลย | น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้า แกงเขียวหวานเจ็ดสิบห้า ชาไทยเย็นสามสิบห้า น้ำกระเจี๊ยบสามสิบบาท | menu (5 items) |
| 4 | ใช้เบอร์ 08x-xxx-4217 ที่ล็อกอินอยู่ไหมคะ? | (taps ใช่) | phone |

The five menu items match `merchant.json`, which keeps both acts in one story.

### 9.6 Other data files
- `landmarks.json`: mock geocode table, e.g. `{ "label": "ลาดพร้าว 71", "match": ["ลาดพร้าว 71", "ลาดพร้าวซอย 71"], "lat": 13.8016, "lng": 100.6033 }`. Spoken numbers are normalized before matching, so "ลาดพร้าวซอยเจ็ดสิบเอ็ด" matches too. The location parser receives this table as an argument (read through `merchantApi.getLandmarks()`), which keeps it pure and testable.
- `account.json`: mock logged-in account (owner name, phone, masked phone, device location) for the one-tap phone and "ใช้ตำแหน่งปัจจุบัน" chips.

## 10. Error handling

| Situation | Behavior |
|---|---|
| Mic permission denied / speech not supported | Show chips and "พิมพ์แทน"; offer scripted demo line |
| Noisy room / no speech detected | "หนูยังไม่ได้ยินค่ะ ลองอีกครั้งนะคะ" + tap-chips |
| Parser confidence < 0.7 or missing slot | One question with big tap-chips (never a free-text form) |
| Landmark not found | Ask again for a nearby landmark or soi number; offer the "ใช้ตำแหน่งปัจจุบัน" chip (pin is then checked in A2) |
| Guardrail check fails | Amber explanation, confirm disabled until fixed |
| Mock API failure (simulated via DemoPanel) | "ตอนนี้ระบบช้าอยู่ค่ะ ลองกดอีกครั้งนะคะ" + retry; nothing half-applied |

## 11. Tech, structure, testing

**Stack:** Vite 8 + React 19 + TypeScript 6 + Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react` icons, Vitest for tests, oxlint for linting (the current Vite template default). Act 1 uses CSS animations; `motion` is added in Act 2 for the nudge slide-in if CSS is not enough. Speech uses the browser Web Speech API (`SpeechRecognition` with `lang = 'th-TH'`, works in Chrome/Edge/Android Chrome; `speechSynthesis` for read-aloud).

**State:** one typed reducer (`app/journey/journeyMachine.ts`) with states `A1_TALK → A2_REVIEW → A3_SUBMITTED → TRANSITION → G1_DASHBOARD → G2_INTENT → G3_PREVIEW → G4_SUCCESS → G5_RECAP`. No router; the DemoPanel can jump to any state.

```
GrabSpark-Champion-Repo/
├── docs/specs/
├── public/images/menu/
└── src/
    ├── main.tsx · App.tsx
    ├── styles/index.css                 # @theme tokens (§8)
    ├── app/
    │   ├── journey/                     # journeyMachine.ts, JourneyContext.tsx
    │   └── demo/DemoPanel.tsx
    ├── ai/                              # pure TS, no React
    │   ├── onboarding/                  # extractProfile, followUp, submit, parsers/{thaiTime,thaiNumber,menuItems,location}
    │   ├── nudge-engine/                # index, scoring, detectors/{afternoonSlump,trendingItem,missingPhoto}
    │   ├── action-parser/               # index (adapter), mockParser, thaiLexicon, llmParser (stub)
    │   ├── prefill/                     # index, fillers/bundlePromo
    │   ├── guardrail/                   # checks, confirmAndExecute
    │   └── impact/                      # estimateImpact
    ├── services/
    │   ├── merchantApi.ts               # reads: account, landmarks, merchant data
    │   ├── merchantApi.write.ts         # submitApplication / createPromotion (simulated delay/failure)
    │   ├── demoFlags.ts                 # presenter switches (e.g. simulate API outage)
    │   └── speech/                      # speechToText, scripted fallback, textToSpeech
    ├── data/                            # §9
    ├── types/domain.ts                  # §6.3
    ├── copy/th.ts
    ├── lib/format.ts
    ├── components/{ui,shell,assistant}/
    └── screens/
        ├── act1-onboarding/{A1-talk,A2-review,A3-submitted}/
        └── act2-grow/{1-dashboard,2-intent,3-preview,4-success,5-recap}/
```

**Testing:**
- Architecture test: only the guardrail modules import `merchantApi.write.ts`, and `src/ai/` never imports React.
- Unit tests (Vitest), written before the code, for everything in `src/ai/`: Thai time and number parsing (every row of §6.4), menu splitting, every demo-script line in §9.5, the afternoon-slump detector, the draft filler, every guardrail check (pass and fail), and the impact formula (must reproduce the §6.6 numbers exactly).
- Screens are checked visually in the browser at phone size (390 × 844), in both acts, including the error states in §10.

## 12. Production path (for the pitch Q&A)

- **AI:** replace the rule-based parsers with an LLM restricted to the same schemas (`OnboardingProfile`, `ParsedIntent`). Free-form Thai speech is where an LLM adds the most value, especially in Act 1.
- **Guardrail:** the same deterministic checks run server-side; the LLM never decides money or validity.
- **Nudges:** detectors run on live order streams; lift benchmarks come from measured promo outcomes.
- **Execution:** the executor calls real GrabMerchant promotion/ads and onboarding APIs.

## 13. Open questions

1. **Companion name.** Working name "Merchant Companion"; a friendly Thai name (one constant in `copy/th.ts`) is still to be chosen.
2. **English for judges.** If some judges don't read Thai, add a DemoPanel toggle that shows English captions under the Thai copy.
3. **Live LLM.** If judges may try the demo with unscripted speech, move the LLM adapter (and its server proxy) earlier in the plan.
