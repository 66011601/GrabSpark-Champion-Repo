# Understanding new sentences, and asking back — Design Spec (D1)

Date: 2026-10-15 · Status: approved in chat · Sub-project **D1** of three (D1 understanding → D2 FAQ answers → D3 speech-recogniser mistakes). Builds on `2026-10-14-thai-language-design.md`: its language layer (`understandThai`) still runs first. Its sentence bank becomes training data here.

## 1. Why

The prototype uses no LLM, so it can run on GitHub Pages. Today it understands a sentence only when a word list or parser knows its exact words, and anything else gets "หนูยังไม่เข้าใจค่ะ". To feel closer to an LLM, the companion should:
- understand sentences it has never seen if they mean the same as ones it knows;
- ask back ("หมายถึง … ใช่ไหมคะ") when it is unsure, instead of failing.

The sentence bank stops being only a test list and becomes what the companion learns from.

Decisions taken in chat:
- **Approach:** rules first, a learned matcher only when the rules do not understand. Nothing that works today changes.
- **Bank size:** about 3,000 sentences over central Thai, Isan, Northern and Southern. At least 70% are written one by one; templates cover slot-like variety only.
- **Decomposition:** D1 now, then D2 (FAQ answers), then D3 (speech-recogniser mistakes, after collecting real dialect speech).

## 2. Flow

```
sentence → understandThai (language layer) → the screen's rules (interpret)
                                              │ understood → as today
                                              ▼ not understood (false)
                             matcher: picks among what THIS screen can do
            ┌──────────────────┬───────────────────────┬─────────────────────┐
         sure                unsure                   lost / "none"
   act(label) now        "หมายถึง … ใช่ไหมคะ"         "หนูยังไม่แน่ใจค่ะ"
 (safe labels only)       [ใช่] [ไม่ใช่]               + the 2 best labels as buttons
```

**Answering an ask-back.** While a question is waiting:
- **Yes:** "ใช่", "แม่น", "เจ้า", "ช่าย", "ได้", "โอเค" (after the language layer) or a tap on [ใช่] runs `act(label)`.
- **No:** "ไม่ใช่" or a tap on [ไม่ใช่] offers the next two labels as buttons.
- **Something else:** the question expires and the sentence is handled normally.

**The matcher only decides what a sentence is about.** Values (names, prices, times, addresses) still come only from the existing parsers. A `topic:*` label never fills a field; its `act` asks the field's follow-up question or offers its input buttons.

## 3. Labels

Every bank sentence has `{ say, region: 'central' | 'isan' | 'north' | 'south', screens, label, source: 'written' | 'template' }`.

| Kind | Examples | Where |
|---|---|---|
| Screen command | `register`, `login`, `food`, `mart`, `next`, `back`, `yes`, `personal`, `company`, `shoot`, `here`, `pin`, `typeInstead`, `listenSummary` | the `SAY` keys each screen uses |
| Blocked command | `submit`, `consentTick`, `act2:confirm` | learned so they are not mistaken for others, but never acted on: the reply is the tap-only line |
| Field topic | `topic:storeName`, `topic:location`, `topic:category`, `topic:building`, `topic:address`, `topic:menu`, `topic:hours` | 3/7, menu, hours |
| Home task | `task:menu`, `task:hours` | H1 Home |
| Act 2 | `intent:sales/forecast/promo/soldOut/feedback`, `control:home/back/stop`, `open:<GridId>`, `button:<id>` | G1 dashboard |
| None | `none` | every screen: chit-chat, complaints, weather, "อืม / เอ่อ", recogniser fragments |

`screens` is a list of screen ids, or `'any'` for labels that mean the same everywhere (`next`, `back`, `none`). A screen's matcher sees only the sentences whose label it allows, plus `none`.

## 4. Matcher (`src/ai/understanding/`, pure, no React)

- **Features:**
  1. Run `understandThai(say).text`.
  2. Remove the trailing particles.
  3. Remove spaces.
  4. Take character n-grams of length 2–4 and weight them with TF-IDF over the training sentences.
- **Scoring:** cosine similarity to every training sentence of the allowed labels. The top 5 vote, weighted by similarity. Result: `{ label, score, margin, top2: [label, label] }`. `score` is the top similarity; `margin` is the top label's share of the vote minus the runner-up's.
- **Index:** built lazily on first use from the bank (a separate lazy chunk), once per screen label-set, and cached.
- **Levels** (initial values; the plan's calibration task sets the final numbers from the held-out data and writes them into the code with a comment):

| Level | Rule (initial) | Companion |
|---|---|---|
| sure | score ≥ 0.75 and margin ≥ 0.3 and label ≠ none | `act(label)`; a blocked label gets the tap-only line |
| unsure | score ≥ 0.45 | ask back about the top label |
| lost | otherwise, or the top label is none | "หนูยังไม่แน่ใจค่ะ" + the two best non-none labels as buttons |

## 5. Bank (`src/ai/understanding/bank/`)

**Size, enforced by tests:**
- **Total:** ≥ 3,000 sentences.
- **Per region:** ≥ 600 each for central, isan, north and south.
- **Written by hand:** ≥ 70% (`source: 'written'`).
- **`none`:** ≥ 300 sentences.
- **Per label:**
  - commands, topics, home tasks and Act 2 intents/controls: ≥ 8 written sentences in **each** region;
  - `open:*` and `button:*`: ≥ 3 in each region;
  - blocked labels: ≥ 4 in each region.
- **Existing sentences:** the 430 from `src/ai/language/corpus/` are converted into bank entries. The old corpus tests stay as they are.
- **Templates** (`templates.ts`): slot lists cover dishes (central and regional), prices (with ซาว / ฮ้อย), times and days, landmarks ("หน้าวัด", "ข้างโรงเรียน", "ตรงข้ามเซเว่น"), and regional particles. Expansion is deterministic (seeded) and capped so templates stay ≤ 30%.

**Held-out split:**
- **20% of the written sentences are the test set,** chosen by a stable hash of the sentence.
- **Templates are training only,** so the metric measures natural speech.
- **The test set never enters the index,** and a test enforces it.

## 6. Integration

- **`useVoiceInput(interpret, { autoListen, understanding })`:** `understanding = { screen, labels, act }`.
  - `act: (label) => Reply | Promise<Reply>` performs a label using the screen's existing handlers.
  - The hook runs the matcher only when the rules returned `false`. It holds the waiting ask-back and returns `choices: { label: string; onPress: () => void }[]`.
  - The decision (rules → matcher → act / ask / lost, and resolving yes/no) is a pure function in `src/components/assistant/understandingStep.ts`, so it is tested without a DOM.
- **`AiHelperBar`:** gains `choices` and renders them as chips (48px tall) under the companion's line.
- **Screens:** every listening screen adds its label list and an `act` map. G0, S1, S2 account, S2 phone, S3, S4, S5, S6, S7, H1, H2 and H3 are ours. **Act 2's `DashboardScreen.tsx` is edited minimally:** it adds the `understanding` option, and its `act` calls the existing `start(script(id))`, `openScript`, `pressScript`, `goHome` and `backScript`. Its scripts and button registry are not edited. The PR asks the teammate to review it.
- **Copy:** `th.understanding`: `ask(label)`, `unsure`, `yes`, `no`, and a readable name per label. Act 2 names come from `th.act2.grid` and the button registry's titles.

## 7. Safety

- **Blocked labels are never acted on:** `submit`, `consentTick` and `act2:confirm`. If one is predicted with any confidence, the reply is the existing tap-only line. A test asserts this for every screen.
- **Topics never fill a field.**
- **Architecture:** `src/ai/understanding/**` imports no React and no write API (the existing rules), and the bank is data only.

## 8. Tests and metrics

- **Matcher units:** n-grams, TF-IDF, cosine, voting, levels.
- **Bank structure:**
  - counts and per-label minimums are met;
  - every label is valid on its screens;
  - no test sentence is in the training index;
  - templates stay ≤ 30%.
- **Metric gates on the held-out set** (computed in a test and printed as a table):
  - wrong without asking ≤ 2%;
  - right, counting ask-back-then-yes on the right label, ≥ 85% in each region.

  If a region misses, add that region's sentences; never loosen the gates.
- **Speed:** building one screen's index takes < 100 ms in the test environment, and the lazy bank chunk is < 150 KB gzipped.
- **README:** a table of held-out accuracy, ask rate and wrong-without-asking per region.
- **Browser check:** two unseen sentences per region on 3/7, Home, menu and Act 2. Check "sure" acting, ask-back with a voice "แม่น" / "เจ้า" answer, and the lost state's buttons.

## 9. Not in D1

- FAQ answers (D2).
- Speech-recogniser mistake fixes (D3).
- Any LLM or large model download.
- The matcher filling values.
- Dialect replies.
