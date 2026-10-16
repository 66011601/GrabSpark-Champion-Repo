# Speech-recogniser mistakes — Design Spec (D3)

Date: 2026-10-16 · Status: started on request in chat · Sub-project **D3** of three (D1 understanding → D2 FAQ answers → D3 speech-recogniser mistakes). Builds on the language layer (`understandThai`) and the D1 matcher.

## 1. Why

The browser's Thai recogniser (Chrome / Android Chrome, `th-TH`) writes what it heard in central Thai spelling. Merchants who speak a dialect, drop the ร/ล of a cluster, mix in English, or stutter get sentences the screens do not understand, although the rules and the matcher would understand the intended sentence.

The D1 spec planned D3 "after collecting real dialect speech". No recordings exist yet, so D3 does two things:
1. **Fixes the mistakes the recogniser is known to make** (below), as small rules with tests.
2. **Starts the collection:** an opt-in local log of what the recogniser heard, so the team can test with real merchants and turn their sentences into new rules and bank entries.

## 2. Mistakes and fixes

| Mistake | Heard | Meant | Fix |
|---|---|---|---|
| Dialect word written as a central word | เห็ดจั่งได๋, แหล่งไทย, บ้อแม่น | เฮ็ดจั่งใด๋, แหลงไทย, บ่แม่น | `fixHeard`: a table of mishearings, each guarded by the words around it (ผัดเห็ด stays a dish) |
| Dialect word in a non-word spelling | เบิ้ง, มื่อวาน, จ้มหยัง, แหล่ว, ไจ้, จ้าว (at the end), จักบาด, จังได | เบิ่ง, มื้อวาน, จ่มหยัง, แล้ว, ใจ้, เจ้า, จักบาท, จั่งใด๋ | `fixHeard` |
| A short answer in English | OK, okay, next, back, yes, no, food, mart | โอเค, ถัดไป, ย้อนกลับ, ใช่, ไม่ใช่, อาหาร, ของชำ | `fixHeard`, only when the English word is the whole sentence (a shop may be called "OK Coffee") |
| Stutter and repeats (Android Chrome repeats finished words) | ถัดไป ถัดไป, ต่อ ต่อไป, ถัดไปถัดไป, ใช่ๆ | ถัดไป, ต่อไป, ใช่ | `fixHeard` (never for number words or digits: a phone number repeats them); `joinFinal` in the recogniser wrapper drops a result that repeats or contains the one before |
| Numbers written oddly | ฿50, 50฿, 1,200 บาท, ห้า สิบ บาท, 8 AM ถึง 8 PM, +66 81 234 5678 | 50 บาท, 1200 บาท, ห้าสิบ บาท, 08:00 ถึง 20:00, 081 234 5678 | `fixHeard`; `parsePhone` reads +66 |
| Cluster dropped (ร / ล) | หมูกอบหมดแล้ว | หมูกรอบหมดแล้ว | `findItem` compares dish names with ร / ล after a consonant ignored, on both sides |
| A closing word in another spelling | …หมดแล้วเดอ | …เด้อ | `endsWithClosingWord` accepts เดอ |
| The recogniser's first guess is wrong | top guess not understood | the 2nd or 3rd guess is | `maxAlternatives = 3`; when the rules do not understand the first guess, they try the others before the matcher guesses |

**Order in a turn:** `cutAtEndWord` → `fixHeard` → `understandThai` → waiting question → rules (first guess, then the other guesses) → matcher. Typed text and chips go through `fixHeard` too: every rule is guarded so ordinary typed Thai is unchanged, and a test checks the corpus sentences pass through untouched.

## 3. Collecting real speech (`src/services/speech/heardLog.ts`)

- **Off by default.** Turned on by opening the app with `?heardlog`, or the checkbox in the demo panel; `?heardlog=off` turns it off. The setting is kept in `localStorage`.
- **What is kept**, for each mic turn, newest 300 only, on the device only (nothing is sent anywhere): time, screen, the recogniser's words and other guesses, the text after `fixHeard`, and the outcome (`done`, `asked`, `offered`, `lost`).
- **Never on 2/7 email and password** (`S2_ACCOUNT`).
- **Export:** while it is on, a small button in the corner (phone and desktop) downloads the log as JSON; the demo panel shows the count, download and clear.
- **Use:** testers with Isan, Northern and Southern merchants send the files back. A sentence that was `lost` or `offered` becomes a `fixHeard` rule (with a test) or a bank sentence.

## 4. Tests

- `heard.test.ts`: every row of the table; guards (ผัดเห็ด, แหล่งท่องเที่ยว, ร้าน OK Coffee, phone digits repeated, เจ้าของ); every corpus sentence (`src/ai/language/corpus/`) is unchanged by `fixHeard`.
- A heard bank (`heardBank.ts`, ≥ 60 pairs over the four regions): `understandThai(fixHeard(heard)).text` equals `understandThai(meant).text`.
- `speechToText.test.ts`: repeated and cumulative results; alternatives passed to `onFinal`.
- `understandingStep.test.ts`: an alternative the rules understand wins before the matcher.
- `heardLog.test.ts`: off by default, cap, S2 skipped, clear.

## 5. Not in D3

- Recorded voice for the companion (sub-project C).
- Rules built from real recordings: they come after the log has been used with merchants.
- Any server, upload or LLM.
