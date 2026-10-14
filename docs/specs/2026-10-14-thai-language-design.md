# Understanding how merchants really talk — Design Spec

Date: 2026-10-14 · Status: approved in chat · Sub-project **A** of three (B location → **A language** → C edge-tts voice). Applies to every screen that listens: Act 1 (`2026-10-14-grab-style-signup-design.md`) and Act 2 (`2026-10-15-act2-voice-navigator-design.md`). Their rules still apply; this spec adds a language layer in front of them.

## 1. Why

The prototype stays rule-based (no LLM) so anyone can try it on GitHub Pages. That means the companion only understands what its word lists and parsers know. Real merchants:
- say the same thing many ways;
- speak Isan, Northern (คำเมือง) or Southern Thai;
- sometimes swear (at the app, or as a habit).

Decisions taken in chat:
- **Scope:** the whole app, Act 1 and Act 2. Act 2's scripts are not edited; it benefits through the shared layer.
- **Rude words:** removed quietly. They never reach a field, the transcript shows them as ***, and the rest of the sentence still works. A sentence that is only rude words gets one calm reply and fills nothing.
- **Replies:** the companion understands dialects but answers in central Thai. The first time it is sure of a region it greets once in that region's style.
- **Approach:** one pure language layer at the single entry point (`hear` in `useVoiceInput`), using the browser's Thai word breaker (`Intl.Segmenter`).

## 2. Flow

```
mic / presenter line / talk-sheet typing
        │ text
        ▼
hear(text) ──► understandThai(text)                 (src/ai/language/)
                 1. split into words (Intl.Segmenter 'th', granularity 'word')
                 2. rude words → removed from `text`, *** in `shown`
                 3. dialect function words → central Thai
                 4. region evidence for this sentence
               ◄─ { text, shown, regionWords, onlyRude }
        │
        ├─ onlyRude      → reply th.language.calm, interpret is not called
        ├─ region newly sure → greeting put in front of the companion's next line (notice)
        └─ text          → the screen's interpret(text, isCurrent), unchanged
```

- The transcript bubble shows `shown`.
- "ได้ยินว่า …" under a field shows the converted (central) sentence, because parsers only see `text`. Mapping back to the original words is not worth the complexity.
- Typing straight into a form box is the merchant's own keyboard and is not filtered.

## 3. Modules (`src/ai/language/`, pure, no React)

| File | Job |
|---|---|
| `words.ts` | `splitWords(text)`: word tokens via `Intl.Segmenter`, falling back to splitting on spaces when it is missing. `findPhrase(tokens, phrase)` matches a phrase against **one or more consecutive tokens** that start and end on token edges, because the segmenter splits some dialect words (หรอย → หรอ + ย). |
| `dialect.ts` | Word list: `{ word, central, region: 'isan' \| 'north' \| 'south' \| 'shared', kind }`. `kind` is one of `yesNo`, `verb`, `question`, `time`, `number`, `place`, `particle` (particles map to ''). Region-only words that are **not** converted (แซ่บ, ลำ, หรอย, regional dish names) carry `central: null` and only count as evidence. |
| `rude.ts` | Rude words and insult phrases (central, Isan, Northern, Southern), matched on whole words or exact phrases. Food words are never on it alone (สัตว์, ควาย, ตีน, หอย); their insult forms count only with ไอ้ / อี / บัก in front. |
| `understand.ts` | `understandThai(text)` → `{ text, shown, regionWords: Record<Region, number>, onlyRude }`. |
| `region.ts` | Session memory: `noteRegion(regionWords)` returns the region when it has just become sure, otherwise null. Sure = at least 2 region-only words in one sentence, or the same region in 2 sentences. `shared` words never count. It lasts for the page session; a reload starts fresh. `resetRegion()` is exported for tests. |
| `corpus/*.ts` | The sentence bank (§6). |

### 3.1 Conversion rules

- Only function words are converted: yes/no, commands, question words, time, numbers, verbs, place words and particles. Names are never converted. A store called "ครัวแซ่บ" stays "ครัวแซ่บ", and "ลาบลำ" stays a dish.
- Examples (the real lists are longer):

| kind | Isan | Northern | Southern | → central |
|---|---|---|---|---|
| yesNo | แม่น, แม่นแล้ว, บ่, บ่แม่น | ใจ้, บ่ใจ้ | ช่าย, ไม่ช่าย | ใช่ / ไม่ / ไม่ใช่ |
| verb | เฮ็ด, เบิ่ง | ยะ, ผ่อ, ปิ๊ก, กิ๋น | แล, หลบ | ทำ / ดู / กลับ / กิน |
| question | ไส, หยัง, จั่งใด๋, จักบาท | ตางใด, หยัง, จะใด | ไหร, พรือ, กี่ตัง | ไหน / อะไร / อย่างไร / กี่บาท |
| time | มื้อนี่, มื้ออื่น, ตอนแลง, ซู่มื้อ | วันพูก, ตอนแลง | หวันนี้, ต่อเช้า | วันนี้ / พรุ่งนี้ / ตอนเย็น / ทุกวัน |
| number | ซาว, ฮ้อย | ซาว | — | ยี่สิบ / ร้อย |
| place | ทางพุ้น | กาด, ตี้ | — | ทางโน้น / ตลาด / ที่ |
| particle (→ '') | เด้อ, เนาะ, แหน่, โลด | เจ้า, ก่, เน้อ, แต๊ | แหละ, หนิ, จัง, ฮู้ | — |

- **Shared words:** บ่ is used in both Isan and Northern, so it is `shared` and does not count as region evidence.
- **Tokenisation protects real central words:** บ่อ, แม่น้ำ, เจ้าของ and ลำปาง stay unchanged.
- **Sample places that contain a converted word also get the converted form as a match word.** For example, กาดหลวง also matches ตลาดหลวง.
- **The food-type parser learns regional dishes:**
  - ข้าวซอย, ไส้อั่ว, แกงฮังเล, น้ำพริกหนุ่ม, ขนมจีนน้ำเงี้ยว → อาหารเหนือ
  - ตำบักหุ่ง, ลาบ, ก้อย, ปิ้งไก่ → อาหารอีสาน
  - แกงไตปลา, ขนมจีนแกงใต้, คั่วกลิ้ง → อาหารใต้

  These labels are added to `CATEGORY_LABELS` if they are not there yet.

### 3.2 Rude words

- **Matched:** เหี้ย, เชี่ย, สัส, ควย, หี, เย็ด, แม่ง, มึง, กู, ฉิบหาย / ซิบหาย, ระยำ, เสือก, ส้นตีน, ดอกทอง, ไอ้สัตว์, ไอ้ควาย / อีควาย, ไอ้ห่า / บักห่า, and similar.
- **Must never match:** เหี้ยมโหด, ตีนไก่, เนื้อควาย, อาหารสัตว์, หอยทอด. Tests assert both directions.
- `onlyRude` is true when nothing but rude words and particles is left.

### 3.3 Greeting

| Region | Greeting (said once per session, before the next line) |
|---|---|
| isan | สบายดีบ่คะ พูดอีสานได้เลย หนูฟังออกค่ะ |
| north | สวัสดีเจ้า อู้คำเมืองได้เลย หนูฟังออกค่ะ |
| south | แหลงใต้ได้เลยค่ะ หนูฟังออก |

All copy lives in `th.language` (greetings, `calm`: "หนูเข้าใจค่ะ ค่อยๆ ทำไปด้วยกันนะคะ").

## 4. Integration

- **`useVoiceInput.hear`:** calls `understandThai` and shows `shown` in the transcript.
  - If `onlyRude`, it answers with `th.language.calm` and does not call the screen.
  - Otherwise it passes `text` to `interpret`.
  - If `noteRegion` returns a region, the greeting is set as the notice for this turn.
- **Unchanged:** no screen file changes its interpret logic, and Act 2's scripts, `matchIntent` and the button registry are untouched.
- **Act 2 phrases the layer cannot rescue:** recorded in the plan's report for the teammate, not patched in their files.
- **Architecture:** `src/ai/language/**` must not import React (existing rule for `src/ai`).

## 5. Limits (not in this sub-project)

- If Chrome's th-TH recogniser mishears strong dialect speech, the layer cannot recover the words; typing still works.
- No dialect replies beyond the first greeting. Act 2's spec also keeps dialect `say` lines out of scope.
- Form boxes typed directly are not filtered.
- No LLM. Edge-tts audio for the greetings comes with sub-project C.

## 6. Sentence bank and tests

**Corpus** (`src/ai/language/corpus/`): typed data files, one per area. Each entry is `{ say, region: 'central' | 'isan' | 'north' | 'south', expect }`. `expect` is one of:
- `{ command }`: matched through the screen's `SAY` lists with `matchCommand`;
- `{ fields }`: a partial of the field values, through `businessUpdates` / `extractProfile`;
- `{ intent }` or `{ control }`: through Act 2's `matchIntent` / `CONTROLS`;
- `{ masked: true | false }`: for rude-word checks.

Files:
- `signup.ts`: G0, 1/7–7/7.
- `home.ts`: menu, hours.
- `act2.ts`: scripts, controls, open-page, buttons.
- `rude.ts`.

**Counts, enforced by a test:**
- at least 300 entries in total;
- central ≥ 200;
- isan ≥ 40, north ≥ 40, south ≥ 40;
- rude/food ≥ 30;
- every screen's command list has at least one dialect entry.

**Corpus test:** one test file runs every entry through `understandThai` and then the real matcher. A failing entry is fixed in the word lists or parsers, never by weakening the expectation.

**Unit tests:**
- `splitWords` / `findPhrase`, including split dialect words;
- conversion, including the protected central words;
- rude masking, both directions;
- region evidence and the "sure" rule;
- greeting once;
- ซาว numbers;
- regional food types.

**Browser check:** the presenter panel's "พูดเอง" box on 3/7, menu, hours and Act 2, with one sentence per region and one rude sentence.
