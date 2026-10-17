# Grab-
แชมป์ GrabSpark เท่านั้น แชมป์ แชมป์ แชมป์ แชมป์ ไม่แชมป์ไม่เลิก

 ตังค์อยากได้เมียจ๊วดๆดีๆแบบคนอื่นเค้าบ้าง

## Prototype: Grab Merchant Companion

Design: [docs/specs/2026-10-13-merchant-companion-design.md](docs/specs/2026-10-13-merchant-companion-design.md), [docs/specs/2026-10-14-grab-style-signup-design.md](docs/specs/2026-10-14-grab-style-signup-design.md), [docs/specs/2026-10-14-location-input-design.md](docs/specs/2026-10-14-location-input-design.md), [docs/specs/2026-10-14-thai-language-design.md](docs/specs/2026-10-14-thai-language-design.md)

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit + architecture tests
```

### Presenting the demo 

- **Every load opens on a bilingual (Thai / English) notice** that this is a prototype for the GrabSpark Business Case presentation, not a real-world launch. Nothing runs behind it; **รับทราบ เริ่มเลย · Got it, start** begins the demo (and gives the browser the tap it needs to play the companion's voice).
- Open on a desktop browser: the phone frame is on the left, the **Demo panel** on the right (press `D` to hide or show it).
- **The demo follows GrabMerchant's real sign-up** (merchant.grab.com guide "ขั้นตอนสมัครเป็นพาร์ทเนอร์ร้านค้า GrabFood บนแอป GrabMerchant"), with the AI helper bar above the green button on every step.
- **The 2.5D companion:** the companion is GrabMerchant's strawberry girl, cut straight from her artwork into four layers (body, head and the two thumbs-up hands) that move apart by depth as the pointer moves, or sway on their own: she breathes, pumps her thumbs to say hello and bobs her head while she talks. The layers come from scripts/companion-layers/build.html (about 100 kB in all). Her round face sits above each screen's green button and is the talk button; there is no helper bar or text strip. The first time each step (and Act 2) opens, the page dims, she rises at the right edge and says the advice in a wide green bubble across the phone, the way LINE's characters peek in with a tip. The bubble comes back whenever she has something to fix or buttons to pick from (yes / no, or her best guesses), and **พูดกับหนู** in it starts the mic. Tap **เข้าใจแล้ว**, the dimmed page, or Escape to go on; a voice run brings the page back by itself. With reduced motion she stands still.
- **Register:** หน้าแรก → **ลงทะเบียน** → 1/7 GrabFood → 2/7 type any email and password → phone: tap "ใช้เบอร์ … ในเครื่องนี้" → **ส่งรหัส OTP** (the companion fills 123456 from the mock SMS) → **ต่อไป**.
- **3/7:** tap 🎤 and play "บรรทัด 1" from the panel (or speak it). Name, street, pin, address and food type fill in; tap **หมุดถูกแล้ว** and ✓ any amber box → **ต่อไป**.
- **Shop location, other ways (3/7):** tap **ใช้ตำแหน่งตอนนี้** (tick "ตำแหน่งจำลอง" in the panel on a laptop), **ปักหมุดบนแผนที่** (move the map under the pin), paste a Google Maps / LINE location link, or type a postcode such as `40000` and pick the ตำบล. Saying "ใช้ตำแหน่งนี้" or "ปักหมุด" works too, and so does a full spoken address.
- **Dialects and rude words:** the companion understands Isan, Northern (คำเมือง) and Southern function words and answers in central Thai, with one greeting in the merchant's style. Try in the panel's "พูดเอง" box on 3/7: `ข้อยขายส้มตำเด้อ`, `ร้านอยู่กาดหลวงเจ้า`; on Home → menu: `ข้าวเหนียวมะม่วงซาวห้าบาทเด้อ`; in Act 2: `เบิ่งยอดขายแหน่`. Rude words show as *** and never reach a field (`แม่งเอ๊ย ต่อไปเลย`). The sentence bank in `src/ai/language/corpus/` lists every sentence that is tested.
- **Understanding new sentences:** the screen's own rules go first; when they do not understand, a matcher learned from about 4,000 sentences (central, Isan, Northern, Southern; `src/ai/understanding/bank/`) acts when it is sure, asks back ("หมายถึง…ใช่ไหมคะ?") when it is unsure, and offers two buttons when it is lost. It never fills a value and never sends or ticks for you. Measured on held-out sentences it never trained on, each sentence counted once (`bank/metrics.test.ts`):

  | Region | Right (acted or asked about the right thing) | Asked back | Wrong without asking |
  |---|---|---|---|
  | Central | 85.3% | 56.0% | 0.1% |
  | Isan | 87.2% | 58.6% | 0.0% |
  | Northern | 87.2% | 55.6% | 0.1% |
  | Southern | 86.8% | 56.1% | 0.0% |

  More than half of new sentences get an ask-back: the matcher would rather check than guess. Act 2 on its own is 85.5% right.
- **Questions about Grab (FAQ):** on any screen the merchant can ask about fees, approval time, payouts, documents, data safety or delivery riders, in any of the four regions' speech. The matcher picks the topic and the companion answers with a fixed line (`th.understanding.faq`); the answer never fills a field or moves a screen. These lines are prototype copy that points to where the real terms are shown, to be checked with the team before launch.

  Try these in "พูดเอง" (none of them is in the bank): on Home, `จะตั้งเวลาเปิดร้านค่ะ` (sure: opens the hours); on 3/7, `ร้านข้อยอยู่ใกล้วัดเด้อ` (asks "หมายถึงบอกที่ตั้งร้านใช่ไหมคะ?", answer `แม่น`); in Act 2, `มีคนติร้านเราไหม` (asks about reviews; answer `ไม่ใช่` for the next buttons).

  After changing any bank sentence or the language layer (`src/ai/language/`), refresh the stored learned forms with `npx vitest run src/ai/understanding/bank --update` (run it twice: the first run rewrites `learned.json`, the second checks it).
- **4/7:** tap "ใช้ธุรกิจส่วนตัว" → **ต่อไป**. **5/7:** tap 📷 → **ถ่ายรูป** → **ใช้รูปนี้** → **ต่อไป**. **6/7:** same with the bank book (the photo is attached) → **ต่อไป**.
- **7/7:** read the summary (**ฟังสรุป** reads it aloud, numbers by their last 4 digits), tick both boxes yourself → **ส่งใบสมัคร**. Voice cannot tick or send.
- **Home:** "อยู่ระหว่างตรวจสอบ" → **เพิ่มเมนู** (📷 paper menu: one price comes back amber, ✓ it; or play "บรรทัด 3") → **บันทึกเมนู** → **ตั้งเวลาเปิด-ปิด** (play "บรรทัด 2" or tap a chip) → **บันทึก** → **ดูต่อ: 30 วันต่อมา**.
- **เข้าสู่ระบบ** goes straight to Home with the sample shop submitted. The panel's "(ข้อมูลตัวอย่าง)" jumps load the sample merchant.
- All documents and numbers are fictional samples stamped "ตัวอย่าง". An uploaded photo stays in the browser.
- "จำลองระบบล่ม" shows how a failed submit is handled; "เริ่มใหม่ทั้งหมด" resets.

### Presenting Act 2 (the voice navigator)

- **Get there:** finish Act 1 (Home → **ดูต่อ: 30 วันต่อมา** → **ไปที่หน้าร้าน**), or press the panel's **Act 2: หน้าหลัก GrabMerchant**. You land on a mock GrabMerchant home with the 13 real menu items and five example chips. Every figure is a sample (ตัวอย่าง).
- **Ask in any of three ways:** tap the avatar and speak, tap an example chip, or press one of the five **Act 2** buttons in the Demo panel (or type a line in "พูดเอง"). They all go through the same matching.
- **What you will see:** the AI says where it is going, a finger moves there and taps, and the screen changes. **ข้าม** or the S key skips the animation (the final line is still said). Saying "หยุด" stops, "กลับหน้าหลัก" goes home.
  1. "ขอดูยอดขายหน่อย": ข้อมูลเชิงลึก → ยอดขาย → 7 วัน → compare with last week → best item.
  2. "พรุ่งนี้ฝนตก ออเดอร์จะเป็นไง": แนวโน้ม → rain on → a range (51–58 orders) and a prep suggestion; a button offers the promotion.
  3. "ทำโปรวันฝนตกให้หน่อย": เพิ่มยอดขาย → a pre-filled bundle, each row says "AI เลือกเพราะ…", the safety list, an estimate range. It **stops at ยืนยันและเปิดใช้งาน**.
  4. "หมูกรอบหมดแล้ว": เมนู → the AI slides the dish's switch off and asks how long, as GrabMerchant does: "วันนี้" or "ไม่มีกำหนด" (tap or say it). **ยืนยันปิดการขาย** is yours to tap.
  5. "ลูกค้าบ่นอะไรบ้าง": ฟีดแบก → unhappy reviews, a summary, a 2-minute lesson (**อ่านให้ฟัง**).
- **Open any of the 13 home items by voice:** say its name, alone or with "เปิด" / "ไป" / "ไปที่" / "ไปหน้า" / "เข้า" (e.g. "เปิดเมนู", "ไปที่ข้อมูลเชิงลึก", "ช่วยเปิดส่งด่วนให้หน่อย"). Other names work too: ออเดอร์, ร้านค้า, อินไซต์, ฟีดแบ็ก, สมาร์ทลิงก์, ผู้ช่วยเอไอ, ศูนย์ช่วยเหลือ. The finger taps the tile; เมนู, เพิ่มยอดขาย, ข้อมูลเชิงลึก and ฟีดแบก open their demo screens, and the other nine open a page saying what the item is for. Questions ("ขอดูยอดขายหน่อย") still run the five scripts.
- **Press any button by voice, from any screen:** say the button's name ("ส่งของข้ามสาขา", "แท็บรีวิว", "7 วัน", "อ่านให้ฟัง", "จัดโปรโมชัน"). If it is on another screen, the finger walks there: home, the tile, the tab or filter it sits under, then the button. "กลับ" closes a sub-page or the lesson, then goes home. คำสั่งซื้อ, เพิ่มยอดขาย, พนักงาน, ส่งด่วน and Smart Link now have their own buttons, each opening a sample page; the ones that would change the shop (รับคำสั่งซื้อ, เพิ่มพนักงาน, เรียกไรเดอร์, เริ่มแคมเปญ) only show a draft whose confirm button is tap-only.
- **Trust rule to show the judges:** say "ยืนยัน" on the promotion: the AI answers that only you can press the button. Only a tap opens the promotion (then **หยุดโปรนี้** is one tap).
- Forecast and impact are ranges labelled ประมาณการ. The rain and bundle lifts are demo assumptions, not Grab data. Speech works in Chrome and Edge; without a Thai voice each line stays on screen long enough to read.

### The companion's voice

She speaks with recorded lines (Google Cloud Text-to-Speech, Thai voice Leda, played a little faster and higher so she sounds like a little girl) from `public/voice/`, so she sounds the same on every device. A line with no recording, such as a dish name the merchant made up, is read by the device's own Thai voice.

After changing what she says, record the new lines (only lines without a recording are sent):

```bash
npm run voice
```

- **Key:** the script reads `GOOGLE_TTS_API_KEY` from the environment or from `.env.local`. That file is git-ignored; never commit the key.
- **Restricted key:** if the key only works from the site's address, set `TTS_REFERER` to that address.
- **Lines from the demo:** lines spoken with demo data (sample shop, prices) are listed in `scripts/voice/spoken.json`. To collect more, run the demo on the dev server, then copy `JSON.stringify([...window.__spokenLines], null, 1)` from the browser console into that file.
- **Gemini voice:** `TTS_VOICE=gemini npm run voice` uses Gemini 3.1 Flash TTS with the style "Cute, Friendly, Little Girl". It needs the Vertex AI API turned on in the Google Cloud project.

### Credits

- Map pictures and place search: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), via Nominatim, within its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Places a merchant searches, pins or locates are sent to OpenStreetMap's Nominatim to find the address. The prototype's own documents and applications are not sent anywhere.
- Nominatim allows 1 request per second, and that limit is shared by everyone using the hosted demo. When it is busy the app falls back to its own sample places and sub-district data.
- Thai sub-district and postcode data: [thai-address-database](https://github.com/Sellsuki/thai-address-database) 0.0.33 (ISC), copied as `src/data/thai-address.json`. Its licence notice is in `src/data/thai-address.LICENSE.md`.
- Map view: [Leaflet](https://leafletjs.com) (BSD-2-Clause).
