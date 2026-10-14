# Grab-
แชมป์ GrabSpark เท่านั้น แชมป์ แชมป์ แชมป์ แชมป์ ไม่แชมป์ไม่เลิก

 ตังค์อยากได้เมียจ๊วดๆดีๆแบบคนอื่นเค้าบ้าง

## Prototype: Grab Merchant Companion

Design: [docs/specs/2026-10-13-merchant-companion-design.md](docs/specs/2026-10-13-merchant-companion-design.md), [docs/specs/2026-10-14-grab-style-signup-design.md](docs/specs/2026-10-14-grab-style-signup-design.md), [docs/specs/2026-10-14-location-input-design.md](docs/specs/2026-10-14-location-input-design.md)

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
- **Shop location, other ways (3/7):** tap **ใช้ตำแหน่งตอนนี้** (tick "ตำแหน่งจำลอง" in the panel on a laptop), **ปักหมุดบนแผนที่** (move the map under the pin), paste a Google Maps / LINE location link, or type a postcode such as `40000` and pick the ตำบล. Saying "ใช้ตำแหน่งนี้" or "ปักหมุด" works too, and so does a full spoken address.
- **4/7:** tap "ใช้ธุรกิจส่วนตัว" → **ต่อไป**. **5/7:** tap 📷 → **ถ่ายรูป** → **ใช้รูปนี้** → **ต่อไป**. **6/7:** same with the bank book (the photo is attached) → **ต่อไป**.
- **7/7:** read the summary (**ฟังสรุป** reads it aloud, numbers by their last 4 digits), tick both boxes yourself → **ส่งใบสมัคร**. Voice cannot tick or send.
- **Home:** "อยู่ระหว่างตรวจสอบ" → **เพิ่มเมนู** (📷 paper menu: one price comes back amber, ✓ it; or play "บรรทัด 3") → **บันทึกเมนู** → **ตั้งเวลาเปิด-ปิด** (play "บรรทัด 2" or tap a chip) → **บันทึก** → **ดูต่อ: 30 วันต่อมา**.
- **เข้าสู่ระบบ** goes straight to Home with the sample shop submitted. The panel's "(ข้อมูลตัวอย่าง)" jumps load the sample merchant.
- All documents and numbers are fictional samples stamped "ตัวอย่าง". An uploaded photo stays in the browser.
- "จำลองระบบล่ม" shows how a failed submit is handled; "เริ่มใหม่ทั้งหมด" resets.
- Act 2 arrives with Plan 2.

### Credits

- Map pictures and place search: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), via Nominatim, within its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Thai sub-district and postcode data: [thai-address-database](https://github.com/Sellsuki/thai-address-database) 0.0.33 (ISC), copied as `src/data/thai-address.json`.
- Map view: [Leaflet](https://leafletjs.com) (BSD-2-Clause).
