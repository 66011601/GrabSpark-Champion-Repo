# Act 1 in Grab Merchant's own screens — Design Spec

Date: 2026-10-14 · Status: approved in chat · Replaces the Act 1 screen flow of `2026-10-13-merchant-companion-design.md` §7.1a–§7.2 and `2026-10-14-act1-photo-scan-design.md` §2–§3. Their data, parsing, scanning and guardrail rules still apply unless this spec says otherwise.

## 1. Why

The demo is for merchants who want GrabMerchant but give up on its sign-up. Judges should see **the real GrabMerchant sign-up**, with an AI companion that does the hard part on every step. Today Act 1 uses its own screens (R1–R3, A1, S1, A2, A3). This spec rebuilds Act 1 as GrabMerchant's real seven steps, taken from Grab's guide "ขั้นตอนสมัครเป็นพาร์ทเนอร์ร้านค้า GrabFood บนแอป GrabMerchant" (merchant.grab.com, Step 1 Getting started), and puts the AI on top.

Decisions taken in chat:
- **Fidelity.** Rebuild the real 7 steps, with the AI on top of every step.
- **AI pattern.** Step by step. Each step's companion offers the easiest way to fill *that* step. Typing always works.
- **Menu and hours.** These come after submitting, as in the real app: Home → "ตั้งค่าร้านให้เรียบร้อย" (finish setting up the shop).
- **Companion look.** A slim helper bar above the green bottom button. It expands into a sheet.

## 2. Flow

```
G0 Welcome ──ลงทะเบียน──► 1/7 Choose service ─► 2/7 Email + password ─► 2/7 Phone + OTP
   │ เข้าสู่ระบบ
   └──► L1 Log in ─► H1 Home
3/7 Business info ─► 4/7 Shop details ─► 5/7 Your info ─► 6/7 Bank ─► 7/7 Summary + consent ─► [ส่งใบสมัคร]
                                                                                  │
H1 Home "รอการอนุมัติ 1–3 วันทำการ" · card "ตั้งค่าร้านให้เรียบร้อย" ─► H2 Add menu ─► H3 Opening hours ─► H1 (all done)
                                                                                  │
                                                                 Transition "30 วันต่อมา…" ─► G1 (Act 2)
```

- Back on any step returns to the previous step. Its values are kept.
- **Log in** (a returning merchant) goes to H1 with the demo profile already submitted and set-up tasks still open. This is a presenter shortcut into the second half.

## 3. Look and feel (all screens)

The screens are recreated to look like GrabMerchant. **No Grab logo files or screenshots are copied.** The "GrabMerchant" wordmark on G0 is text in Grab green.

- **Background and headings:** white background. Body text uses the existing tokens (ink, ink-muted, line, Noto Sans Thai Looped, minimum 16px).
- **Step header:** a back arrow, "ขั้นตอนที่ N จาก 7" and a ⓘ help icon. A 7-segment progress strip sits under the header, with the steps done in green.
- **Page heading:** a large bold title with one grey line under it.
- **Sections:** a bold section heading where the step has several groups (for example "ข้อมูลธุรกิจ").
- **Fields:**
  - A label above the box, with a red "*" when required.
  - A rounded box with a 1px border, which turns green on focus.
  - A hint or error line under the box.
  - Selects use the same box with a chevron. Pickers (map, date) use the same box with an icon.
- **Bottom bar:** one full-width green **ต่อไป** button, pinned, disabled until the step is valid. On 7/7 the button is **ส่งใบสมัคร** (submit application).
- **AI marks on fields:**
  - A field the AI filled shows a small ✨ chip, "AI กรอกให้" (filled by AI), and its source under the box (e.g. "อ่านจากรูปบัตรประชาชน", read from the ID card photo).
  - A low-confidence value (< 0.8) shows the box in amber with "ช่วยเช็คหน่อยค่ะ" (please check) and a ✓ button.
  - Typing in a field removes its AI mark.

## 4. The companion (`AiHelperBar`, `TalkSheet`, `ScanSheet`)

- **`AiHelperBar`** sits just above the bottom button on every step and on H2/H3.
  - The durian avatar on the left.
  - One line saying what the companion can do here.
  - One action button on the right (🎤 or 📷) and a speaker toggle.
  - It speaks its line (existing TTS rules and mute).
  - A field error replaces its line ("ใส่อีเมลก่อนนะคะ", put in your email first).
- **Tapping the bar or its button opens a bottom sheet.** The sheet covers the lower part of the screen, with the form still visible above it.
  - **`TalkSheet`** (reuses the A1 voice parts):
    - The companion's question and the live transcript.
    - Answer chips, the mic (avatar) and "พิมพ์แทน" (type instead).
    - Each answer fills this step's fields at once, and the companion asks only for what is still missing on this step.
    - It closes by itself when the step's fields are all filled, or when the merchant taps "เสร็จแล้ว" (done).
  - **`ScanSheet`** (reuses S1's viewfinder, sample documents, scan line and results list):
    - Shoot, retake or upload.
    - "ใช้รูปนี้" (use this photo) fills this step's fields and closes the sheet.
- **Voice commands** that work on every step: "ต่อไป" (next), "ย้อนกลับ" (back), "ถ่ายรูป" (take photo), "พิมพ์แทน" (type instead). The "จ้า" end word and the 8-second silence rule are unchanged.
- **What voice never does** (trust rule):
  - Enter an email, password or OTP by ear.
  - Tick the consent boxes.
  - Press **ส่งใบสมัคร**.
  - Saying "ส่ง" on 7/7 gets "ข้อนี้ต้องกดเองนะคะ" (you need to press this one yourself).

## 5. Screens

Copy in quotes is the Thai text to show. The companion line is the helper bar's default.

### G0 Welcome
- A green top area with the "GrabMerchant" wordmark and a headline: "เปิดร้านบน Grab ง่าย ๆ มีผู้ช่วย AI กรอกให้" (open your shop on Grab the easy way, with an AI assistant to fill things in).
- Three plain points, the same as R1 today.
- Buttons: **ลงทะเบียน** (primary) and **เข้าสู่ระบบ** (outline).
- Companion: "เคยสมัครรึยังคะ?" (have you signed up before?) Voice "สมัคร"/"ยัง" or "เข้าสู่ระบบ"/"เคย" presses a button, as today.

### L1 Log in
- Email and password, typed only, as R2 today.
- **เข้าสู่ระบบ** → H1 (loads the demo profile as submitted).

### 1/7 เลือกบริการ (choose service)
- Two large cards with an icon, title, one-line description and chevron:
  - **GrabFood**: "ขายอาหาร ของหวาน และเครื่องดื่ม" (sell food, desserts and drinks)
  - **GrabMart**: "ขายสินค้าในชีวิตประจำวัน" (sell everyday goods)
- Tapping a card selects it and enables ต่อไป.
- Companion: "ขายอาหารใช่ไหมคะ? เลือก GrabFood ได้เลย" (you sell food, right? pick GrabFood). Voice "อาหาร"/"GrabFood" or "ของใช้"/"GrabMart" selects a card.
- **GrabMart in the prototype:** selectable, but the next steps behave the same and the copy stays food-oriented. The companion warns on selection: "ในเดโมนี้หนูจะพาสมัครแบบร้านอาหารนะคะ" (in this demo I'll take you through the food-shop sign-up).

### 2/7 ตั้งค่าอีเมลและรหัสผ่าน (set email and password)
- Subtitle: "อีเมลนี้ใช้ลงทะเบียนและเข้าสู่ระบบแอป GrabMerchant" (this email is for signing up and logging in to GrabMerchant).
- Fields:
  - อีเมล * (email)
  - รหัสผ่าน * (password), at least 8 characters, with a show/hide eye.
  - The toggle "บันทึกข้อมูลไว้ใช้เข้าสู่ระบบ" (save login details), decorative.
- Companion: "อีเมลกับรหัสผ่านพิมพ์เองนะคะ หนูหลับตาให้" (type the email and password yourself, I'll close my eyes). The avatar covers its eyes while the password box has focus.
- ต่อไป → **2/7 ยืนยันเบอร์โทรศัพท์** (verify phone number), the same step number:
  - **Phone stage:**
    - Field: เบอร์โทรศัพท์ * (phone), 10 digits starting with 0.
    - Companion chip: "ใช้เบอร์ 08x-xxx-4217 ในเครื่องนี้" (use 08x-xxx-4217 on this phone), which fills the field from `account.json`.
    - ต่อไป sends a mock OTP.
  - **OTP stage:**
    - Six digit boxes, a 30-second resend countdown, and "ส่งรหัสอีกครั้ง" (resend code).
    - After about 1.5 s the companion says "ได้รับ SMS แล้ว กรอกให้นะคะ" (SMS received, I'll fill it in) and fills **123456** in the boxes, marked ✨. The merchant can also type it.
    - Any 6 digits that equal the mock code verify the phone. Others show "รหัสไม่ถูกต้อง" (wrong code).
    - ต่อไป → 3/7.

### 3/7 ลงทะเบียน · ข้อมูลธุรกิจ (business info)
- Subtitle: "โปรดกรอกข้อมูลเพื่อแสดงให้ลูกค้าดู" (please fill this in for customers to see).
- Fields:
  - ชื่อร้านค้า * (shop name)
  - ชื่ออาคาร/ถนน * (building/street)
  - ที่ตั้งร้านค้า * (shop location): a map picker with a pin icon and chevron. Tapping it opens the existing place search and map pin check (Google Places, or sample landmarks). The pin must be confirmed here.
  - ที่อยู่ร้านค้า * (address): free text, pre-filled from the map's full address when there is one.
  - ประเภทอาหาร * (food type): a select from `CATEGORY_LABELS`.
- Companion 🎤: "เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ ร้านชื่ออะไร อยู่ตรงไหน ขายอะไร" (tell me about your shop: its name, where it is, what it sells).
  - The TalkSheet uses `extractProfile` and `parseBuilding`, with the Google Maps lookup as today. It asks follow-ups only for the 3/7 fields still empty.
  - Demo script line 1 fills name, building, location and category.
- **Location confirmation:**
  - A location the AI heard opens the pin check inline under the field ("หมุดถูกไหมคะ?", is the pin right?, with ✓).
  - ต่อไป stays disabled until the pin is confirmed.

### 4/7 ข้อมูลร้าน (shop details)
- Subtitle: "โปรดกรอกข้อมูลร้าน ช่องทางการติดต่อ และเอกสารสำหรับตรวจสอบยืนยัน" (shop details, contact channels and documents for verification).
- Fields:
  - **ข้อมูลธุรกิจ** (business info): ประเภทธุรกิจ * (business type), a select of "ธุรกิจส่วนตัว (บุคคลธรรมดา)" (sole owner) or "นิติบุคคล (บริษัท/ห้างหุ้นส่วน)" (company or partnership).
  - **ช่องทางการติดต่อเจ้าของธุรกิจ** (owner's contact channels):
    - เบอร์เจ้าของธุรกิจ * (owner's phone), pre-filled from 2/7 and editable.
    - อีเมลเจ้าของธุรกิจ * (owner's email), pre-filled from 2/7 and editable.
- A privacy note row with a shield icon: "ข้อมูลจะใช้ตามนโยบายความเป็นส่วนตัวของ Grab" (data is used under Grab's privacy policy).
- Companion: "ร้านทั่วไปเลือก 'ธุรกิจส่วนตัว' ได้เลยค่ะ เบอร์กับอีเมลหนูใส่ให้แล้ว" (most shops pick sole owner; I've filled in your phone and email). Its chip sets the business type to personal, marked ✨.

### 5/7 ข้อมูลของคุณ (your info)
- An info note: "Grab ให้ความสำคัญกับความเป็นส่วนตัวของคุณ ข้อมูลนี้ใช้ยืนยันตัวตนเท่านั้น" (Grab values your privacy; this is used only to verify your identity).
- Fields:
  - เลขประจำตัวประชาชน * (13-digit ID number)
  - คำนำหน้า * (title): select นาย / นาง / นางสาว
  - ชื่อ-นามสกุลเจ้าของร้าน * (owner's full name), with the note "กรอกชื่อ-นามสกุล ไม่ต้องมีคำนำหน้า" (name only, no title)
  - วัน/เดือน/ปีเกิด (พ.ศ.) * (date of birth, Buddhist calendar)
  - วันหมดอายุบัตรประชาชน * (ID card expiry date)
- **Field formats:**
  - The ID number shows grouped (1-2345-67890-12-1) while editing on this step. This is the one place outside the scan results where it is unmasked.
  - Dates show as "1 มกราคม 2513" (1 January 2513 BE). They are stored as ISO strings (CE).
- Companion 📷: "ถ่ายรูปบัตรประชาชน หนูกรอกให้ทั้งหน้าเลยค่ะ" (photograph your ID card and I'll fill in this whole page).
  - The ScanSheet reads the sample ID card and fills all five fields, marked ✨ with the source "อ่านจากรูปบัตรประชาชน".
  - The companion says only the last 4 digits.

### 6/7 ข้อมูลธนาคาร (bank details)
- Subtitle: "บัญชีสำหรับรับเงินจากการขาย" (the account that receives your sales income).
- Fields:
  - ชื่อบัญชี * (account name)
  - ชื่อธนาคาร * (bank): a select of Thai banks (กสิกรไทย, ไทยพาณิชย์, กรุงเทพ, กรุงไทย, กรุงศรีอยุธยา, ทหารไทยธนชาต, ออมสิน)
  - เลขบัญชี * (account number)
- **เอกสารที่ต้องใช้** (required documents): "รูปถ่ายสมุดบัญชีธนาคาร *" (bank book photo). Shows as an upload row with a thumbnail, a "อัปโหลดสำเร็จ" (uploaded) tick and a trash icon.
- Info note: "ชื่อเจ้าของบัญชีต้องตรงกับชื่อที่ลงทะเบียน" (the account holder's name must match the registered name).
- Companion 📷: "ถ่ายรูปหน้าแรกสมุดบัญชี หนูกรอกให้และแนบรูปให้เลย" (photograph the first page of your bank book; I'll fill it in and attach the photo).
  - The scan fills the three fields and attaches the photo, which is the sample drawing or the merchant's upload, kept as a local object URL.
- **Name check:**
  - If the account name does not match the name from 5/7 (titles ignored, same rule as PAYOUT_NAME_MATCH), the field shows an error and ต่อไป is disabled.
  - Error text: "ชื่อบัญชีต้องตรงกับชื่อเจ้าของร้านในขั้นตอนที่ 5" (the account name must match the owner's name from step 5).

### 7/7 คำยืนยัน (confirmation)
- **Summary card "ตรวจข้อมูลก่อนส่ง"** (check before sending). One row per step (3–6), each with its key values and a "แก้ไข" (edit) link back to that step:
  - shop name and address;
  - business type;
  - owner name and masked ID (x-xxxx-xxxx0-12-1);
  - bank and masked account (xxx-x-xx789-0).
- **"ฟังสรุป"** (listen to the summary) reads it aloud, with the last 4 digits only.
- **Two consent checkboxes** (both required, merchant-ticked only):
  1. "ข้าพเจ้ายอมรับข้อตกลงการใช้งาน Grab ข้อกำหนดและเงื่อนไขร้านค้า และประกาศความเป็นส่วนตัว" (I accept Grab's terms of use, merchant terms and privacy notice). The underlined phrases are mock links with no destination.
  2. "ข้าพเจ้ายืนยันว่าข้อมูลที่กรอกถูกต้องตามความเป็นจริง" (I confirm the information is true).
- Companion: "หนูช่วยกรอกให้ครบแล้วค่ะ ตรวจอีกครั้ง แล้วติ๊กยืนยันกับกดส่งเองนะคะ" (I've filled everything in; check once more, then tick and press send yourself). Voice can read the summary but never ticks or sends.
- **Bottom button: "ส่งใบสมัคร"** (submit application). It runs the guardrail (§7). Failures are listed above the button with links to the step.
- Success → H1.

### H1 หน้าหลัก (Home), after submitting
- **Top bar:** shop name, with a bell icon.
- **Status card:** "อยู่ระหว่างตรวจสอบ" (under review) and "Grab จะแจ้งผลภายใน 1–3 วันทำการ" (Grab will reply within 1–3 working days), with the elapsed sign-up time "สมัครเสร็จใน {n} นาที" (signed up in {n} minutes).
- **Task card "ตั้งค่าร้านให้เรียบร้อย"** (finish setting up your shop), with two rows and a check when done:
  - "เพิ่มเมนู" (add menu) → H2
  - "ตั้งเวลาเปิด-ปิด" (set opening hours) → H3
- **When both are done:**
  - The card turns green: "ร้านพร้อมเปิดรับออเดอร์เมื่ออนุมัติ" (your shop is ready to take orders once approved).
  - A button "ดูต่อ: 30 วันต่อมา" (continue: 30 days later) → Transition.
- **Bottom nav** (decorative, only หน้าหลัก is active): หน้าหลัก (home) · ออเดอร์ (orders) · เมนู (menu) · บัญชี (account).
- Companion: "สมัครเสร็จแล้วค่ะ! ระหว่างรอ มาเพิ่มเมนูกันไหมคะ ถ่ายรูปเมนูกระดาษก็ได้" (sign-up done! while you wait, shall we add your menu? a photo of your paper menu works).

### H2 เพิ่มเมนู (add menu)
- Header: back arrow and "เพิ่มเมนู".
- A list of dish rows (name + price) with remove ×, and "+ เพิ่มรายการ" (add item), which adds an empty row to type into.
- Companion 📷 "ถ่ายรูปเมนูกระดาษ" (photograph your paper menu) or 🎤 "พูดชื่อเมนูกับราคา" (say dish names and prices):
  - The scan reads the sample menu, including the smudged price shown amber with ✓.
  - Voice uses the menu parser (demo script line 3).
- **Scans only fill empty fields.** A menu scan here fills the menu only, and never replaces the shop name or category (rule from the photo-scan spec, still applies).
- Bottom button: **บันทึกเมนู** (save menu), which runs the set-up guardrail (§7), then → H1.

### H3 เวลาเปิด-ปิด (opening hours)
- Fields:
  - เวลาเปิด * (open) and เวลาปิด * (close), as time selects.
  - วันหยุด (closed days): seven day chips.
- Companion 🎤 "บอกเวลาเปิดปิดได้เลยค่ะ" (just tell me your opening hours), using the hours parser (demo script line 2), plus the existing chips 10:00–20:00 and 07:00–15:00.
- Bottom button: **บันทึก** (save), with the set-up guardrail, then → H1.

### Transition and Act 2
- The Transition text stays as it is now ("30 วันต่อมา…", then "เปิดร้านบน Grab เรียบร้อยแล้ว! …").
- G1 is the existing placeholder.

## 6. Data

### 6.1 Profile fields (`types/domain.ts`)

The existing `ProfileField<T>` (value, empty → heard → confirmed, confidence, heardFrom) is kept. Fields:

| Key | Type | Step |
|---|---|---|
| storeName | string | 3 |
| building | string | 3 (now a profile field; was `JourneyState.building`) |
| location | GeoPoint (+ needsPinCheck) | 3 |
| address | string | 3 |
| category | string | 3 |
| businessType | `'personal' \| 'company'` | 4 |
| phone | string | 2 (verified) → shown in 4 |
| contactEmail | string | 4 (pre-filled from the account email) |
| owner | OwnerIdentity + `birthDate`, `idExpiry` (ISO yyyy-mm-dd) | 5 |
| payout | PayoutAccount + `bookPhoto: string \| null` (`'sample'` or a local object URL) | 6 |
| menu | MenuEntry[] | H2 |
| hours | OpeningHours | H3 |

### 6.2 Field groups and sample data

- **`STEP_FIELDS`** maps each step to its fields: `{ 3: [...], 4: [...], 5: ['owner'], 6: ['payout'] }`.
- **`SUBMIT_FIELDS`** = steps 3–6 plus phone.
- **`SETUP_FIELDS`** = menu, hours.
- `TALK_FIELDS`, `DOC_FIELDS` and `REVIEW_FIELDS` are removed. `pickFollowUp` takes the list of fields to ask about.
- **Sample ID card** (`ocr-samples.json`) gains `birthDate: "1970-01-01"` (shown as "1 มกราคม 2513") and `idExpiry: "2031-01-01"`, both fictional.

### 6.3 Journey (`app/journey/journeyMachine.ts`)

**Screens:** `G0_WELCOME`, `L1_LOGIN`, `S1_SERVICE`, `S2_ACCOUNT`, `S2_PHONE`, `S3_BUSINESS`, `S4_SHOP`, `S5_OWNER`, `S6_BANK`, `S7_CONFIRM`, `H1_HOME`, `H2_MENU`, `H3_HOURS`, `TRANSITION`, `G1_DASHBOARD`.

**State:**
- `service`
- `email`
- `phoneVerified`
- `profile`
- `consents: { terms, accurate }`
- `startedAt`, `submittedAt`, `setupDone: { menu, hours }`
- `runId`

The old `method`, `scan` queue and `building` are removed.

**Events:**
- `CHOOSE_SERVICE`, `ACCOUNT_SET`, `PHONE_VERIFIED`
- `FILL` (updates + `at`; applies them as heard and starts the clock; scans only fill empty fields)
- `TYPE_FIELD` (a typed value, confidence 1, source `typed`)
- `CONFIRM_FIELD`
- `NEXT` (confirms every heard field on the current step, then goes to the next screen; ignored unless the step is valid)
- `BACK`, `GO`
- `SET_CONSENT`
- `SUBMITTED` (ignored unless on S7 with the same profile, as today)
- `SETUP_SAVED { part: 'menu' | 'hours' }`
- `LOAD_PROFILE`, `RESET`

`NEXT`, `SUBMITTED` and `SETUP_SAVED` ignore events that arrive for a screen the merchant has already left.

**Step validity** is a pure function, `stepStatus(state, step)`. It returns `{ valid, problems[] }`:
- every required field is non-empty;
- no amber field is left unchecked;
- the pin is confirmed (step 3);
- the name matches (step 6).

The bottom button and the 7/7 failure list both use it.

## 7. Guardrails (`ai/onboarding/submit.ts`, the only module that writes)

- **`submitApplication`** (on 7/7) checks:
  - ALL_CONFIRMED over SUBMIT_FIELDS
  - PIN_CONFIRMED
  - PHONE_VALID and PHONE_VERIFIED
  - EMAIL_VALID
  - ID_VALID (checksum)
  - ID_NOT_EXPIRED (expiry after today)
  - PAYOUT_NAME_MATCH
  - BOOK_PHOTO_ATTACHED
  - CONSENTS_GIVEN

  It then calls `merchantApi.write.submitApplication`.
- **`saveStoreSetup(part, profile)`** (H2 and H3) checks MENU_VALID (at least one item, every price > 0, amber items checked) or HOURS_VALID (open ≠ close). It then calls a new `merchantApi.write.saveStoreSetup`.
- The architecture test keeps the rules:
  - only `submit.ts` imports the write API;
  - only S7 and H2/H3 import `submit.ts`.

## 8. What is reused, what goes

**Reused:**
- All parsers and `extractProfile`.
- Places and maps (search, pin check UI).
- Mock OCR, `scanToUpdates` and `onlyEmptyFields`.
- `thaiId` and `nameMatch`.
- Masks and formats.
- Speech-to-text, TTS, earcon, scripted lines and `useVoiceInput`.
- `CompanionAvatar`.
- `Viewfinder`, `SampleDocument`, `ScanResults` and `scanLines`.
- `DeviceFrame`, the demo bus and the demo panel (new jumps).

**Removed:**
- **Screens:**
  - Register screens: R1 Welcome, R2 Account (plus MethodPicker), R3 Store.
  - Act 1 onboarding screens: A1 Talk (plus LiveProfileChecklist), S1 Scan screen, A2 Review, A3 Submitted.
  - The `CompanionDock` layout used by those screens. The avatar stays.
- **Code:** `FillMethod`, the journey's scan queue, and method phrases.
- **Copy and tests:** the `th` sections and the tests for removed code. Each is rewritten or deleted with the screen it covers.

**Demo panel:** jumps to every screen. "ข้อมูลตัวอย่าง" (sample data) loads a profile with steps 3–6 heard, so a presenter can start at 7/7. The three script lines map to 3/7 (line 1), H3 (line 2) and H2 (line 3).

## 9. Out of scope

- Real OTP, real camera or OCR, real file upload or storage.
- GrabMart-specific forms, a company (นิติบุคคล) document list, and signing the contract after approval.
- Act 2. It stays a placeholder.

## 10. Testing

- **Unit tests:**
  - `stepStatus` for each step (missing field, amber unchecked, pin not confirmed, name mismatch);
  - `NEXT` confirms only the current step's heard fields;
  - routing forwards and back;
  - OTP mock verification;
  - `FILL` with scans filling only empty fields;
  - every new guardrail check, and the `saveStoreSetup` checks;
  - date formatting (CE → BE Thai long date);
  - sample data shape;
  - the architecture test.
- **Manual (controller, in the browser at 390×844 and 1366×768):**
  - the whole register path with the AI on 3/7, 5/7 and 6/7;
  - typing-only on one step;
  - a name mismatch on 6/7;
  - submit;
  - H2 scan and H3 voice chips;
  - Transition;
  - log in → H1.
