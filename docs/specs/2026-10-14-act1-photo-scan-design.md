# Act 1 · Fill-in method choice and photo scan — Design Spec

Date: 2026-10-14 · Status: approved in chat, extends `2026-10-13-merchant-companion-design.md` (the "main spec")

## 1. Why

The team's Act 1 brief asks for three ways to sign up: talk, photograph documents, or type. It also asks for the ID card and bank book, which the main spec left out of Act 1 (§4 "Out of scope"). This spec adds both to the voice onboarding that is already built. Nothing already built is thrown away. Every path ends in the same A2 review and confirmation guardrail.

Decisions taken in chat:

- **Extend, do not replace.** The voice flow (R3 → A1) stays. Photo and typing are added beside it.
- **The choice lives on R2 Account.** It is not a new screen.
- **The scanner is simulated.** It uses sample documents drawn in code. There is no camera and no real OCR, so it works offline and cannot fail on stage.
- **Every path scans the ID card and bank book.** Nobody should read an ID number aloud. Only the photo path also scans the paper menu.

## 2. Flow

```
R1 Welcome ─► R2 Account + method choice
                 ├─ พูด   (voice, default) ─► R3 Store ─► A1 Talk ─► S1 Scan [ID, bank book] ─┐
                 ├─ ถ่ายรูป (photo)          ─► S1 Scan [ID, bank book, menu] ─► A1 Talk (gaps only) ─┤
                 └─ พิมพ์   (type)           ─► R3 Store ─► A1 Talk (typing open) ─► S1 Scan [ID, bank book] ─┤
                                                                               A2 Review ◄─┘ ─► A3 ─► Transition ─► G1
Returning merchant (เข้าสู่ระบบ): R1 ─► R2 ─► A1 Talk ─► S1 Scan [ID, bank book] ─► A2   (no method choice)
```

- When A1 has heard every talk field it goes to S1 if a document is still missing, otherwise to A2.
- The photo path scans first. A1 then opens on its first follow-up question (not the open "tell me about your shop" prompt) and asks only for what the photos could not give: location, hours and phone, and category if it was not guessed.
- The photo path skips R3. The optional building name (ชื่ออาคาร) is simply absent.
- The A1 chip "ถ่ายรูปเมนูแทน" (scan the menu instead) now opens S1 for the menu only and returns to A1. Before, it only showed a toast.

## 3. Screens

### 3.1 R2 Account: method choice (register mode only)

- Below the password field is a section titled "อยากกรอกข้อมูลร้านแบบไหนคะ?". It is a `radiogroup` of three large cards, each with an icon, a title and one line of explanation:
  - 🎤 **พูดสมัครด้วยเสียง**: "เล่าให้หนูฟัง หนูกรอกให้". Pre-selected, with an "แนะนำ" badge.
  - 📷 **สมัครด้วยการถ่ายภาพเอกสาร**: "ถ่ายบัตร สมุดบัญชี และเมนู".
  - ⌨️ **พิมพ์เอง**: "กรอกทีละช่อง".
- Each card is at least 64px tall, so the whole card is the tap target. The selected card has a green ring and a check mark.
- The existing ต่อไป button submits email, password and method together. It stays the one primary action on the screen.
- Voice commands select a card; they never submit:
  - "พูด" or "เสียง" selects voice.
  - "ถ่ายรูป" or "รูป" selects photo.
  - "พิมพ์" selects typing.
  - "ต่อไป" works as today.
- The trust rule is unchanged: email and password are never taken by ear.
- The companion's bubble after the merchant leaves the password box is "เลือกวิธีกรอกข้อมูลร้านได้เลยค่ะ ถ้าไม่แน่ใจ ลองพูดกับหนูดูนะคะ" (pick how to fill in the shop info; if unsure, try talking to me).
- The choice is skipped in login mode.

### 3.2 S1 Scan (new): `screens/act1-onboarding/S1-scan/`

- **Header:** OnboardingShell titled "ถ่ายรูปเอกสาร" (photograph documents), with progress such as "2/3". A row of step chips sits below it, e.g. บัตรประชาชน ✓ · สมุดบัญชี · เมนู.
- **Viewfinder:** a dark area with corner brackets showing the current sample document, drawn in code:
  - `IdCardSample`, `BankBookSample` and `PaperMenuSample` are generic designs with no real logos and no copy of the official card layout.
  - Each carries a diagonal "ตัวอย่าง" (sample) stamp.
  - A line of guidance under the frame reads "วางบัตรให้อยู่ในกรอบ" (place the card inside the frame).
- **States:**
  - `aim` (aiming): the dock shows a primary "ถ่ายรูป" (take photo) button and a ghost "ข้าม" (skip) button.
  - `scanning`: a green scan line sweeps the frame for about 1.2s and the bubble says "กำลังอ่าน…" (reading…).
  - `read`: the fields appear one by one in a results list, with ✓ or an amber ⚠ when confidence is below 0.8. The dock shows a primary "ใช้รูปนี้" (use this photo) and a secondary "ถ่ายใหม่" (retake).
- **Upload:** a ghost "อัปโหลดรูปแทน" (upload a photo instead) opens a file picker for images. The chosen image is shown in the frame from a local object URL and never leaves the browser. The result is still the mock data, labelled "โหมดสาธิต: ใช้ข้อมูลตัวอย่าง" (demo mode: using sample data).
- **Companion lines:**
  - **After the ID card:** "อ่านได้แล้วค่ะ คุณแดง ใจดี บัตรลงท้ายด้วย 0121" (got it: Khun Daeng Jaidee, card ending in 0121).
  - **After the bank book:** "บัญชี{ธนาคาร} ลงท้ายด้วย 7890 ค่ะ" (account at {bank}, ending in 7890).
  - **After the menu:** "อ่านเมนูได้ 5 รายการค่ะ ราคา{เมนู}ไม่ค่อยชัด ช่วยดูอีกทีตอนตรวจนะคะ" (read 5 dishes; the price of {dish} is unclear, please check it at review).
  - A full ID or account number is never spoken or shown unmasked outside the results list.
- **Voice commands:** "ถ่าย" or "ถ่ายเลย" (shoot), "ถ่ายใหม่" (retake), "ใช้รูปนี้" or "ต่อไป" (use this / next), "ข้าม" (skip). The mic auto-listens only when the method is voice.
- **Skip:** skipping a document leaves its field empty. A2 then shows the card as empty with a "ถ่ายรูป" button, and submit stays blocked (ALL_CONFIRMED).

### 3.3 A2 Review: two new cards

- **เจ้าของร้าน (owner):** shows the name and the masked ID `x-xxxx-xxxx0-12-1`, keeping the last 4 digits.
- **บัญชีรับเงิน (payout account):** shows the bank, the masked number `xxx-x-xx789-0` (last 4 digits), and the account name.
- **Source line:** the source of a scanned value reads "ที่มา: รูปบัตรประชาชน" (source: ID card photo), "รูปสมุดบัญชี" (bank book photo) or "รูปเมนู" (menu photo). Add these to `NON_SPEECH_SOURCES` so they are never labelled "ได้ยินว่า" (heard).
- **แก้ไข (edit):** on these two cards, edit means rescan. It opens S1 for that one document and returns to A2.
- **Phone card:** the "เจ้าของ: … (จากบัญชี)" line is removed, because the owner card now covers it.
- **Bubble line:** "หนูกรอกข้อมูลและดึงรายการเมนูให้แล้วนะคะ กรุณาตรวจสอบความถูกต้องก่อนเปิดร้าน" (I've filled in your info and pulled your menu; please check it before opening the shop). It replaces `th.review.subtitle`.
- **Submit button:** reads "ยืนยันข้อมูลและปักหมุดที่ตั้ง" (confirm info and pin the location).
- **Spoken summary:** includes the owner name and "บัญชีลงท้ายด้วย 7890" (account ending in 7890), never the full numbers.

### 3.4 A3 and Transition

- **A3:**
  - The steps become "Grab ตรวจสอบข้อมูล (1–3 วันทำการ)" (Grab checks your info, 1–3 working days) → "เปิดรับออเดอร์" (start taking orders). The first step is marked "ต่อไป" (next).
  - The dock line becomes "เอกสารครบแล้วค่ะ รอ Grab ตรวจสอบแป๊บเดียว เดี๋ยวหนูบอกนะคะ" (documents complete; Grab will check shortly and I'll let you know).
  - The elapsed line works for every path: it counts from the first heard or scanned value and reads "ใช้เวลาแค่ {duration} ก็เสร็จ" (took only {duration}), because the photo path never "talked" (คุยกัน).
- **Transition:**
  - The body becomes the brief's line: "เปิดร้านบน Grab เรียบร้อยแล้ว! พร้อมเรียนรู้ฟีเจอร์ช่วยเพิ่มยอดขายในสเต็ปถัดไป" (your shop is open on Grab; ready to learn sales features in the next step).
  - The title "30 วันต่อมา…" (30 days later…) stays.
  - The line belongs here, after the time skip, because "open" is only true once Grab has checked the application.

### 3.5 Typing path

- R3 and A1 start with the mic idle instead of auto-listening.
- A1 opens with the `TypeInstead` box already open.
- The companion still speaks its lines, and tapping its face still starts the mic.

## 4. Data and logic

### 4.1 Types (`types/domain.ts`)

```ts
export type FillMethod = 'voice' | 'photo' | 'type'
export type DocKind = 'idCard' | 'bankBook' | 'menu'

export interface OwnerIdentity { title: string; name: string; idNumber: string } // idNumber: 13 digits, no dashes
export interface PayoutAccount { bankName: string; accountNumber: string; accountName: string } // accountNumber: digits only

// ProfileFields gains:
owner: ProfileField<OwnerIdentity>
payout: ProfileField<PayoutAccount>
```

### 4.2 Field groups (`ai/onboarding/profile.ts`)

- `TALK_FIELDS` holds the six fields A1 asks about. It is today's `PROFILE_FIELDS`, renamed.
- `DOC_FIELDS = ['owner', 'payout']` holds the fields only S1 fills.
- `REVIEW_FIELDS = [...TALK_FIELDS, ...DOC_FIELDS]` is what A2 lists and what ALL_CONFIRMED counts.
- `pickFollowUp` and `isReadyForReview` look only at `TALK_FIELDS`, so A1 never asks for an ID by voice.
- New helper `missingDocs(profile, method)` lists the documents still needed: `idCard` while `owner` is empty, and `bankBook` while `payout` is empty.

### 4.3 Journey (`app/journey/journeyMachine.ts`)

- **State:**
  - `method: FillMethod`, default `'voice'`.
  - `scan: { queue: DocKind[]; returnTo: Screen } | null`.
- **Screen:** `S1_SCAN`.
- **Events:**
  - `AUTHENTICATED`: gains `method`. The method sets the first step:
    - voice or type → `R3_STORE`;
    - photo → `S1_SCAN` with queue `[idCard, bankBook, menu]` and returnTo `A1_TALK`;
    - login → `A1_TALK`, as today.
  - `START_SCAN { docs, returnTo }`: used by the A1 menu chip and by A2's rescan.
  - `SCANNED { doc, updates, at }`: applies the updates as `heard`, sets `startedAt` if it is still null, and drops `doc` from the queue. When the queue is empty, it moves to `returnTo`.
  - `SKIP_DOC { doc }`: drops `doc` from the queue without updates. It moves on the same way.
  - `TALK_DONE`: dispatched by A1 instead of `GO A2_REVIEW`. It goes to `S1_SCAN` with queue `missingDocs` and returnTo `A2_REVIEW`. If no document is missing, it goes straight to `A2_REVIEW`.
- `REASK_FIELD` on `owner` or `payout` routes to `S1_SCAN` for that single document, with returnTo `A2_REVIEW`. On any other field it routes to A1, as today.
- **Stale results:**
  - S1 is keyed on `runId`.
  - A scan that resolves after the screen left, or after RESET, is dropped. This uses the same `mounted`/`isCurrent` guard pattern as A1.
  - `SCANNED` is ignored unless `screen === 'S1_SCAN'` and `doc` is at the head of the queue.

### 4.4 Mock OCR (`services/ocr/mockOcr.ts`, `data/ocr-samples.json`)

- `readDocument(kind: DocKind): Promise<ScanResult>` resolves after about 1.2s with the sample for that kind.
- `ScanResult` is a list of `{ label, value, confidence }` lines for the results list, plus the raw values.
- `ai/onboarding/documents/scanToUpdates.ts` turns a `ScanResult` into `ProfileUpdates` with `heardFrom` set to the source label.
- Sample data matches the existing demo store, so the voice and photo paths reach the same A2:

| Document | Values (all fake) | Confidence |
|---|---|---|
| ID card | title นาง, name แดง ใจดี, ID `1234567890121` (valid checksum, deliberately sequential) | 0.97 |
| Bank book | ธนาคารกสิกรไทย, account `1234567890`, name นาง แดง ใจดี | 0.95 |
| Paper menu | header ครัวป้าแดง → storeName (0.9); category อาหารไทย guessed from dishes (0.75, amber); the five dishes from `onboarding-script.json`, all at 0.95 except น้ำพริกกะปิปลาทู ฿89 at 0.6 (smudged, amber) | per row |

- A menu's confidence is the lowest of its rows. That is how one smudged price turns the whole menu card amber in A2.
- A scan fills only fields that are still empty: a menu header never replaces a store name or category the merchant already gave, and never un-confirms a field.

### 4.5 New deterministic checks (`ai/onboarding/submit.ts`)

| id | Rule | Pass message | Fail message |
|---|---|---|---|
| ID_VALID | 13 digits; Thai checksum: `(11 − Σ dᵢ·(13−i) mod 11) mod 10` equals the last digit | เลขบัตรถูกต้อง (ID number valid) | เลขบัตรไม่ถูกต้อง ถ่ายใหม่อีกครั้งนะคะ (ID number invalid; please retake) |
| PAYOUT_NAME_MATCH | The account name equals the ID name after removing titles (นาย, นาง, นางสาว, น.ส., ด.ช., ด.ญ.) and spaces | ชื่อบัญชีตรงกับบัตร (account name matches the card) | ชื่อบัญชีต้องตรงกับชื่อบนบัตรค่ะ (account name must match the card) |

- These live in `ai/onboarding/documents/thaiId.ts` and `nameMatch.ts`. Both are pure and unit-tested.
- `submitProfile` stays the only path to `merchantApi.write.ts`. Scanning never confirms anything.

### 4.6 Formatting (`lib/format.ts`)

- `maskIdNumber('1234567890121')` returns `'x-xxxx-xxxx0-12-1'`.
- `maskAccount('1234567890')` returns `'xxx-x-xx789-0'`.
- `lastFour(digits)` returns the last four digits, for spoken lines.

## 5. Privacy and trust

- All documents and values are fictional. The sample visuals carry a "ตัวอย่าง" stamp, with no real bank logos and no imitation of the official ID card design.
- An uploaded image stays in the browser as an object URL and is revoked on leaving S1.
- Full ID and account numbers appear only in S1's results list. They are masked everywhere else and are never spoken.
- Voice can select a method, shoot, retake or skip. It can never enter an ID or account number, and it can never submit.
- The architecture test is extended: nothing under `services/ocr/` or `screens/` imports `merchantApi.write.ts`, and `ai/onboarding/documents/` has no React.

## 6. Out of scope

- Real camera (`getUserMedia`) and real OCR. The production path, for the Q&A: Grab's existing document OCR, or a vision model behind Grab's backend.
- Face or liveness check, business registration and VAT documents, menu photos per dish.
- Changing the font. Noto Sans Thai Looped stays because looped Thai letters are easier for older merchants to read. The brief's Prompt/Kanit suggestion is not taken.

## 7. Testing

- **Unit tests:**
  - ID checksum, both valid and invalid;
  - name match, with titles, spaces and a mismatch;
  - both masks and `lastFour`;
  - `scanToUpdates` for each document kind, including the menu's minimum confidence;
  - `missingDocs`;
  - the two new guardrail checks, and ALL_CONFIRMED counting eight fields.
- **Journey tests:**
  - each method's route;
  - `SCANNED` and `SKIP_DOC` queue handling;
  - `TALK_DONE` routing with and without documents;
  - rescan from A2 returning to A2;
  - a stale `SCANNED` being ignored.
- **Architecture test:** the extensions described in §5.
- **Manual:** the build is checked in the browser for each of the three paths at 390×844 and at 1366×768.

## 8. Main-spec changes

- §4 Out of scope: "ID card / bank book capture" is now in scope. See this spec.
- §7.1a: R2 gains the method choice. The flow diagram above replaces the register-phase arrow.
- §7.2 A3: the steps change as described in §3.4.
