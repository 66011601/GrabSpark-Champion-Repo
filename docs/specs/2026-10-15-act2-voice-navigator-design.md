# Act 2: the voice navigator (design)

Status: replaces §7.3 (Act 2, G1–G5) of `2026-10-13-merchant-companion-design.md`. The trust rule (§3.1), the guardrail checks (§6.5), the promotion math (§6.6) and the UX tokens (§8) of that spec still apply.

## 1. What changed and why

The old Act 2 was nudge-led: the AI noticed a slow afternoon, then walked the merchant through a pre-filled promotion (G1 nudge → G2 intent → G3 preview → G4 success → G5 recap). The new Act 2 is **merchant-led**: the owner talks, and the AI drives the GrabMerchant app on their behalf. It says where it is going, moves a visible cursor there, taps what is needed, and reads out the result in one sentence.

What this replaces: the G1 nudge card, G2, G4 and G5. What stays: G3's idea (a pre-filled draft where every value says "AI เลือกเพราะ…", with safety checks and a confirm button), now used by the promotion feature.

## 2. Would Grab say "we already have this"?

Grab's own guide (merchant.grab.com, "วิธีการใช้แอป GrabMerchant เบื้องต้น") shows the home menu with **ผู้ช่วย AI** (answers questions) and **ข้อมูลเชิงลึก** (dashboards). So answers and dashboards exist. What we add:

| Grab has | We add |
|---|---|
| A chat assistant that answers | An assistant that **acts and guides**: it opens the right screen, taps the right controls, shows its work with a visible cursor |
| Insights dashboards the owner must read | **Forecast → Action → Learn** in one conversation (see the range for tomorrow, get the promotion prepared, learn from complaints) |
| Touch and typing | **Thai voice**, for owners who find the app hard |

**[Assumption]** Grab's assistant cannot yet navigate the app for the owner. We could not verify this. The demo UI never claims that Grab lacks it; the pitch should say "as far as we found".

## 3. Flow

1. After Act 1 and the "30 วันต่อมา…" screen, the owner lands on a mock **GrabMerchant home**: a header, the 13-item grid, five example chips, the AI helper bar (avatar bottom-right).
2. The owner speaks, taps a chip, or types in the Demo panel. `matchIntent` picks one of five scripts.
3. The **runner** plays the script step by step. Each step: show the screen, move the cursor to the target, tap it (the mock app state changes), then the companion says one line. The next step starts when the line is finished.
4. Features that prepare something (promotion, sold-out) end on a draft and a **confirm bar**. Nothing is written until the owner taps it.
5. After the run the mic reopens by itself, like in Act 1.

Controls any time: **ข้าม** button or the `S` key skips the animation (the run jumps to its end state); saying "หยุด" stops it; "กลับหน้าหลัก" goes home.

## 4. The five scripts

| # | Owner says (examples) | Screen path | On-screen work | Layer |
|---|---|---|---|---|
| 1 sales | "ขอดูยอดขายหน่อย" | home → ข้อมูลเชิงลึก | tap sales tab, set 7 days, compare with last week, highlight the best item, one sentence | Forecast |
| 2 forecast | "พรุ่งนี้ฝนตก ออเดอร์จะเป็นไง" | home → ข้อมูลเชิงลึก | open trend tab, show the forecast **range**, show a prep suggestion | Forecast → Action |
| 3 promo | "ทำโปรวันฝนตกให้หน่อย" | home → เพิ่มยอดขาย | open a promotion with every field pre-filled and a reason, run the safety checks, **stop at the confirm bar** | Action |
| 4 soldOut | "หมูกรอบหมดแล้ว" | home → เมนู | find the item, slide its switch off (draft), ask how long: "วันนี้" or "ไม่มีกำหนด" (GrabMerchant's own two choices), then the confirm bar | Action |
| 5 feedback | "ลูกค้าบ่นอะไรบ้าง" | home → ฟีดแบก | summarise the negative reviews, offer one 2-minute lesson (text, read aloud on tap) | Learn |

Build order if time runs short: 1 → 3 → 4 → 2 → 5.

**Opening any home item.** Besides the five scripts, a plain "open X" for any of the 13 home items ("เปิดเมนู", "ไปที่ส่งด่วน", or just "แคชเชียร์") plays a two-step script built from the grid (`src/ai/navigator/openPage.ts`): tap the tile, then show the screen and say what the item is for. The whole sentence must be the command (after polite padding such as ช่วย / ให้ / หน่อย is dropped), so questions still reach the five scripts. Items without a demo screen open a page with their purpose, taken from Grab's guide.

**Pressing any button.** Every button a merchant can see is in one registry (`src/ai/navigator/buttons.ts`): its data-nav id, the names an owner may say, the screen it lives on, the tab or filter it sits under (`after`), and the state it sets. A tap and a spoken press set the same state. `pressScript(id, nav)` builds the walk from where the owner is: back out of a sub-page, or through the home tile, then the prerequisite tab or filter, then the button. A spoken button press starts from the current screen, not from home. Button names never shadow a script phrase or a home item (tested), and the bare words a script owns ("ยอดขาย", "รีวิว", "พรุ่งนี้ฝนตก") stay with the script. Confirm buttons are not in the registry, so voice cannot press them; "ยืนยัน…" still gets the tap-only reply.

**Sample pages behind the buttons.** คำสั่งซื้อ (รับคำสั่งซื้อ, ประวัติคำสั่งซื้อ), เพิ่มยอดขาย (สร้างแคมเปญโฆษณา, ดูแคมเปญ, จัดโปรโมชัน; the last one is the rain promo draft), พนักงาน (เพิ่มพนักงาน, ดูบัญชีพนักงาน), ส่งด่วน (heading บริการเรียกไรเดอร์: ส่งของทันใจ; heading ตอบโจทย์: ส่งออเดอร์นอกระบบ, ส่งของข้ามสาขา) and Smart Link (ดูลิงก์ร้าน, คัดลอกลิงก์, แชร์ลิงก์). Each opens a sample page marked "ตัวอย่าง". A page that would change the shop shows a draft and a tap-only confirm that sends nothing and only says it worked. No delivery fee or other Grab number is shown.

## 5. Script format

A script is data, not a hand-coded screen:

```ts
interface Script {
  id: 'sales' | 'forecast' | 'promo' | 'soldOut' | 'feedback'
  phrases: string[]      // whole sentences; matched with matchCommand
  keywords: string[][]   // any group whose words are all in the sentence matches
  not?: string[]         // any of these words rules the script out
  steps: ScriptStep[]
}
interface ScriptStep {
  screen: NavScreen      // which mock screen is showing
  target?: string        // data-nav id the cursor moves to and taps
  highlight?: string     // data-nav id outlined, not tapped
  set?: Partial<NavState> // what the tap changes (tab, period, draft…)
  say: string            // one short line, spoken and shown in the helper bar
}
```

`{item}` inside `say` or `set` is replaced by the menu item the owner named. All `say` text comes from `src/copy/th.ts`, so a dialect line set can be added later as an optional override per key. Dialects are out of scope for now.

## 6. Guardrails

- **The AI only moves the cursor and prepares drafts.** A draft is plain state (`promo`, `soldOut`). Only `src/ai/guardrail/confirmAndExecute.ts` may import the write API, and only `ConfirmBar.tsx` may import `confirmAndExecute`. `architecture.test.ts` enforces both.
- **Voice never confirms.** No script phrase, control phrase or chip answer matches ยืนยัน, ส่ง or ติ๊ก. A test asserts it.
- **Deterministic checks decide.** Promotion: MARGIN_FLOOR, BUDGET_CAP, NO_OVERLAP, SCHEDULE_VALID, REVERSIBLE (§6.5). Sold-out: ITEM_EXISTS, UNTIL_CHOSEN. A failed check turns amber and disables the confirm button.
- **Honest numbers.** Everything simulated is labelled "ตัวอย่าง". Forecast and impact are ranges labelled "ประมาณการ". No Grab internal figure is invented. The rain effect (+10% to +25% orders) is **[Assumption]** for the demo only.
- **Promotion math** is §6.6 unchanged: bundle ฿109 (normal ฿124), 30% commission, ฿29.3 profit per bundle vs ฿24.3 for the dish alone, 20 bundles × ฿15 = ฿300/day within the ฿500 limit. The rain promotion reuses the same bundle and the 14:00–17:00 window.

## 7. Screens

All inside `src/screens/act2-grow/1-dashboard/`, driven by one host (`DashboardScreen.tsx`) that owns `NavState`:

- `HomeGrid`: white store header, a 7-day sales card, the 13 real menu items in GrabMerchant's 4-column icon grid (คำสั่งซื้อ, เมนู, ร้าน, เพิ่มยอดขาย, พนักงาน, แกร็บช้อป, ผู้ช่วย AI, ข้อมูลเชิงลึก, ฟีดแบก, แคชเชียร์, ส่งด่วน, Smart Link, ความช่วยเหลือ). Only five are wired; the rest are inert.
- `Insights`: underlined tabs (ภาพรวม, ยอดขาย, แนวโน้ม), period switch, last-week comparison switch, "ประสิทธิภาพรายการเมนู" (share of sales per dish), trend chart with the rain switch and forecast range.
- `Boost`: the promotion form with "AI เลือกเพราะ…" rows and the safety list.
- `ItemMenu`: a green switch per dish, as in GrabMerchant; switching off opens a sheet with "วันนี้" (back by itself tomorrow) or "ไม่มีกำหนด", and the confirm bar.
- `Feedback`: tabs "รีวิว" and "รายงานจากลูกค้า", the star average, an "ทั้งหมด / 1-3 ดาว" filter, the complaint summary and the lesson sheet.
- `ConfirmBar`: the only place a write starts.
- `NavCursor`: the visible finger and tap ripple; it measures `[data-nav]` elements.

Tokens follow §8: body ≥ 18px, tap targets ≥ 56px, action green `#007A3D`, the companion speaks as หนู…ค่ะ.

## 7a. Looking like GrabMerchant

The screens follow GrabMerchant's own conventions, taken from Grab's merchant guides on merchant.grab.com ("วิธีการใช้แอป GrabMerchant เบื้องต้น", "เปิด/ปิดสถานะของเมนูอาหาร", "ข้อมูลเชิงลึก", "ฟีดแบก"): white title bars with a back arrow (as in Act 1's `StepShell`), green icons on pale-green tiles, underlined green tabs, white cards on a light grey page, one full-width green button at the bottom, and the menu's on/off switch with "วันนี้" / "ไม่มีกำหนด". No Grab logo files or screenshots are used.

## 8. Voice

The default is the browser: `SpeechRecognition` (th-TH) in, `speechSynthesis` out, preferring the female Thai voices already in `textToSpeech.ts`. `VoiceProvider` (`speak`, `stop`, `isSupported`) wraps it so a pre-rendered mp3 provider can be added later, but only after the team approves a voice. No model download and no backend.

## 9. Demo safety

Every feature runs from three inputs: the mic, a Demo panel button (and its typed-line box), and an example chip on the phone. A skip key ends any animation. Without a Thai voice, each line stays on screen long enough to read.

## 10. Open questions

1. Which voice do we approve for the final pitch? (The listening-test files are in `voice_audition/`, not yet decided.)
2. Is the "stop promotion" button enough for "always reversible", or should the demo also show a stopped promotion?
3. Should the pitch show the five features in this order, or open with the promotion (the strongest Action example)?
