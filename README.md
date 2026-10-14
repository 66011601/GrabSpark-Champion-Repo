# Grab-
แชมป์ GrabSpark เท่านั้น แชมป์ แชมป์ แชมป์ แชมป์ ไม่แชมป์ไม่เลิก

 ตังค์อยากได้เมียจ๊วดๆดีๆแบบคนอื่นเค้าบ้าง

## Prototype: Grab Merchant Companion

Design: [docs/specs/2026-10-13-merchant-companion-design.md](docs/specs/2026-10-13-merchant-companion-design.md)

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit + architecture tests
```

### Presenting the demo

- Open on a desktop browser: the phone frame is on the left, the **Demo panel** on the right (press `D` to hide or show it).
- **Register (R1-R2):** the demo opens on R1. Tap **ลงทะเบียน** → on R2 type any email and password, then choose how to fill in the shop: **พูด** (default), **ถ่ายภาพเอกสาร** or **พิมพ์เอง** → **ต่อไป**.
- **Act 1 by voice:** on R3 play "บรรทัด 1" from the panel (or speak it) → **ต่อไป** → on A1 play "บรรทัด 2–3", tap **ใช่** for the phone → **ต่อไป** → S1 asks for the ID card and bank book: tap **ถ่ายรูป** → **ใช้รูปนี้** for each → A2.
- **Act 1 by photo:** S1 scans the sample ID card, bank book and paper menu (one price is smudged on purpose and comes back amber) → A1 asks only for the location, hours and phone → A2. The panel's "S1 · ถ่ายรูปเอกสาร" jumps straight there.
- **A2:** confirm each card (the owner and bank cards show masked numbers; **ถ่ายใหม่** rescans) → **ยืนยันข้อมูลและปักหมุดที่ตั้ง**. The guardrail checks the ID checksum and that the bank account is in the owner's name.
- All documents are fictional samples stamped "ตัวอย่าง". An uploaded photo stays in the browser and still returns the sample data.
- "จำลองระบบล่ม" shows how a failed submit is handled; "เริ่มใหม่ทั้งหมด" resets.
- Act 2 arrives with Plan 2.
