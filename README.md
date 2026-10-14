# Grab-
แชมป์ GrabSpark เท่านั้น แชมป์ แชมป์ แชมป์ แชมป์ ไม่แชมป์ไม่เลิก

 ตังค์อยากได้เมียจ๊วดๆดีๆแบบคนอื่นเค้าบ้าง

## Prototype: Grab Merchant Companion

Design: [docs/specs/2026-10-13-merchant-companion-design.md](docs/specs/2026-10-13-merchant-companion-design.md), [docs/specs/2026-10-14-grab-style-signup-design.md](docs/specs/2026-10-14-grab-style-signup-design.md)

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit + architecture tests
```

### Presenting the demo

- Open on a desktop browser: the phone frame is on the left, the **Demo panel** on the right (press `D` to hide or show it).
- **The demo follows GrabMerchant's real sign-up** (merchant.grab.com guide "ขั้นตอนสมัครเป็นพาร์ทเนอร์ร้านค้า GrabFood บนแอป GrabMerchant"), with the AI helper bar above the green button on every step.
- **Register:** หน้าแรก → **ลงทะเบียน** → 1/7 GrabFood → 2/7 type any email and password → phone: tap "ใช้เบอร์ … ในเครื่องนี้" → **ส่งรหัส OTP** (the companion fills 123456 from the mock SMS) → **ต่อไป**.
- **3/7:** tap 🎤 and play "บรรทัด 1" from the panel (or speak it). Name, street, pin, address and food type fill in; tap **หมุดถูกแล้ว** and ✓ any amber box → **ต่อไป**.
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
- **Trust rule to show the judges:** say "ยืนยัน" on the promotion: the AI answers that only you can press the button. Only a tap opens the promotion (then **หยุดโปรนี้** is one tap).
- Forecast and impact are ranges labelled ประมาณการ. The rain and bundle lifts are demo assumptions, not Grab data. Speech works in Chrome and Edge; without a Thai voice each line stays on screen long enough to read.
