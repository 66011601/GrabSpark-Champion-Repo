# Shop location, four ways — Design Spec

Date: 2026-10-14 · Status: approved in chat · Changes the "ที่ตั้ง" and "ที่อยู่ร้านค้า" fields on step 3/7 of `2026-10-14-grab-style-signup-design.md`. Everything else in that spec still applies.

This is sub-project **B** of three agreed in chat (B location → A phrases, dialects and rude-word filter → C edge-tts voice). A and C get their own specs.

## 1. Why

Today, without a Google Maps key, the shop location can only be one of three sample places (ลาดพร้าว 71, อารีย์, สามย่าน), and the map is a drawing. The prototype will be hosted on GitHub Pages for anyone to try, so it cannot rely on a Google key. Merchants also describe where their shop is in many ways. A real merchant should be able to place their shop anywhere in Thailand, in the way that suits them.

Decisions taken in chat:
- **Methods.** All four: use my current location (GPS), a full Thai address with postcode help, a pin on a real map, and a pasted LINE or Google Maps link. Typing and speaking a place name keep working.
- **Address box.** One box, as in GrabMerchant. A helper row under it offers "ต. › อ. › จ. รหัส" completions. The parts are kept inside the app; the merchant sees one text.
- **Coordinates → address.** OpenStreetMap's free Nominatim service when online, with a local fallback (nearest sample place, the merchant finishes the address).
- **Approach.** One location resolver that every input goes through (not per-method code in the screen).

## 2. Data

```ts
/** A Thai postal address in parts. Shown to the merchant as one line. */
export interface ThaiAddress {
  houseNo?: string     // "12/3"
  moo?: string         // หมู่ "4"
  soi?: string
  road?: string
  subdistrict?: string // ตำบล / แขวง
  district?: string    // อำเภอ / เขต
  province?: string
  postcode?: string    // 5 digits
}

export interface GeoPoint {
  text: string
  address?: string      // one-line address, when known
  parts?: ThaiAddress   // NEW: the same address in parts, when known
  lat: number
  lng: number
}
```

- `Landmark` gains an optional `parts: ThaiAddress`, so sample places draft a full address with no network.
- `formatThaiAddress(parts)` gives the one line. Bangkok uses แขวง/เขต and no "จ."; elsewhere ต./อ./จ.
- **Sample places** grow from 3 to about 15, spread over Bangkok, the Northeast, the North and the South (for example ตลาดต้นตาล ขอนแก่น, ตลาดวโรรส เชียงใหม่, ตลาดกิมหยง หาดใหญ่). Each has `match` words, coordinates and address parts. Coordinates are approximate; the merchant always confirms the pin.

## 3. Modules

All network calls for maps stay inside `src/services/places/`. `architecture.test.ts` enforces it.

| File | Job |
|---|---|
| `services/places/places.ts` | The `Places` interface gains `reverse(point)` (coordinates → place) and `suggest` returns a `kind` per row (`place`, `area`, `search`). Picks the provider: Google (key set) → Nominatim (online) → local. |
| `services/places/nominatim.ts` | Nominatim search and reverse. `accept-language=th`, `countrycodes=th`, at most one call per second, a 4-second timeout, results cached in memory. Never called while the merchant is still typing. |
| `services/places/localPlaces.ts` | Today's `samplePlaces.ts`, renamed and extended: sample places, nearest sample place to a point, and postcode/ตำบล rows from the Thai address data. |
| `services/places/thaiAddressDb.ts` | Loads the Thai sub-district, district, province and postcode data on first use (dynamic import of `thai-address-database/database/db.json`, decoded by our own small reader; ISC licence). Search by postcode or by name; check that a postcode belongs to a province. |
| `services/places/linkCoords.ts` | Coordinates from a pasted link: Google Maps `@lat,lng`, `?q=lat,lng`, `?ll=`, `!3d…!4d…`, and LINE location links. Short links (`maps.app.goo.gl`, `goo.gl/maps`) are recognised and reported as unreadable. |
| `services/places/geolocation.ts` | The browser's GPS as a promise, with the presenter's "simulated location" switch (uses `account.deviceLocation`). |
| `ai/onboarding/parsers/thaiAddress.ts` | Spoken or typed address → `ThaiAddress`. Handles ต./อ./จ./ถ./ซ./ม. abbreviations, แขวง/เขต, กทม./กรุงเทพฯ, Thai digits and spoken numbers ("สิบสองทับสาม" → 12/3). |
| `components/map/PinMap.tsx` | Leaflet map (OpenStreetMap tiles, "© OpenStreetMap" credit). Read-only with a pin, for the filled field. |
| `components/map/PinSheet.tsx` | Full-screen sheet: the pin stays in the centre and the merchant moves the map; the approximate address under the pin updates when the map stops; green "ใช้ตำแหน่งนี้". |

Leaflet, `react-leaflet` and the Thai address data load only when 3/7 opens (lazy import), so the first page is not bigger. The pin is drawn with CSS, not Leaflet's image files.

## 4. Step 3/7 screen

**Location field, empty:**
- One input: "พิมพ์สถานที่ ที่อยู่ รหัสไปรษณีย์ หรือวางลิงก์".
- Two buttons under it: **📍 ใช้ตำแหน่งตอนนี้** and **🗺️ ปักหมุดบนแผนที่**.
- While typing, rows appear straight away from local data: sample places, then "ต. › อ. › จ. รหัส" areas. A last row **🔎 ค้นหา "…" บนแผนที่** calls Nominatim (or Google) only when tapped.
- A pasted link is recognised in the same input. Readable → the place is filled. Unreadable → the helper says so (§6).
- Choosing an area row fills the end of the address and opens the pin sheet near that area, because an area is not a shop.

**Location field, filled:** the Leaflet map with the pin, the place name and the address, then "✓ หมุดถูกแล้ว" (when the pin still needs checking) and "เปลี่ยน" (opens the pin sheet).

**Pin sheet:** opened by 🗺️, by "เปลี่ยน", after choosing an area, and after GPS when its accuracy is worse than 100 m. "ใช้ตำแหน่งนี้" is the merchant placing the pin, so the location becomes confirmed (no pin check). The drafted address stays amber.

**GPS:** the browser asks permission. The point is reverse-looked-up; the location is drafted with a pin check and the address amber. Refused or failed → the helper line (§6).

**Address box:** typing a postcode or ตำบล name shows "ต. › อ. › จ. รหัส" completions under the box; tapping one replaces the end of the address. If the postcode does not belong to the province written in the box, the field is amber and the helper says, e.g., "รหัสไปรษณีย์ 40000 เป็นของขอนแก่น ไม่ใช่เชียงใหม่ ช่วยเช็คหน่อยนะคะ". When the pin moves, the address is re-drafted only if the merchant has not typed it.

**Confidence (all below `CHECK_THRESHOLD` = 0.8 show amber):**

| Source | Location | Address |
|---|---|---|
| Suggestion tapped (place) | 0.9, pin check | 0.9 from map / local parts |
| Pin sheet "ใช้ตำแหน่งนี้" | confirmed | 0.7 |
| GPS | 0.75, pin check | 0.7 |
| Link | 0.85, pin check | 0.7 |
| Spoken / typed place found by search | 0.62 (as today), pin check | 0.7 |
| Spoken full address | from search, pin check | 0.75 |

## 5. Voice

| The merchant says | Result |
|---|---|
| "อยู่ที่ร้านตอนนี้", "ตรงนี้เลย", "ใช้ตำแหน่งนี้", "ใช้ตำแหน่งปัจจุบัน" | GPS (same as the button) |
| "ปักหมุด", "เลือกบนแผนที่", "ปักหมุดเอง" | Opens the pin sheet |
| "สิบสองทับสาม หมู่สี่ ตำบลในเมือง อำเภอเมือง ขอนแก่น" | Address parts → address box (amber), then a search for the pin |
| "อยู่ตรงข้ามตลาดวโรรส เชียงใหม่" | Sample places, then Nominatim |

- The location question ("ร้านอยู่ที่ไหนคะ") shows two chips: 📍 ใช้ตำแหน่งตอนนี้ and 🗺️ ปักหมุด.
- Voice place search no longer needs a Google key ([S3Business.tsx](../../src/screens/signup/S3Business.tsx) `wantsPlace`); it uses the resolver whenever the device is online.
- New phrases go in `SAY` (`here`, `pin`).

## 6. When things fail

The merchant can always carry on.

| Event | What happens |
|---|---|
| No internet, or Nominatim does not answer in 4 s | Use the nearest sample place and the local address data; helper asks the merchant to check the address. |
| Nominatim says too many requests (429) | Use the cache, else local data. No quick retries. |
| Map tiles fail to load | Show the drawn map with the name and address; "✓ หมุดถูกแล้ว" still works. |
| Link cannot be read (short link or other) | "ลิงก์นี้อ่านตำแหน่งไม่ได้ค่ะ ลองเปิดในแผนที่แล้วคัดลอกลิงก์เต็ม หรือปักหมุดแทน" |
| Point outside Thailand | Not used. "ตำแหน่งนี้อยู่นอกประเทศไทยค่ะ" |
| GPS refused or failed | "หาตำแหน่งไม่ได้ ลองพิมพ์ชื่อสถานที่หรือปักหมุดแทนนะคะ" |
| Address data still loading | Sample-place rows show now; area rows join when loaded. |

"Inside Thailand" is a bounding box (lat 5.6–20.5, lng 97.3–105.7) plus Nominatim's country code when available.

## 7. Presenter panel

A **ตำแหน่งจำลอง** switch. On: "ใช้ตำแหน่งตอนนี้" returns `account.deviceLocation` straight away (stage laptops locate badly). Off: the real browser GPS.

## 8. Testing

- Logic tests (Vitest, no screens): `parsers/thaiAddress`, `linkCoords`, `thaiAddressDb`, `nominatim` (mocked `fetch`: success, timeout, 429, outside Thailand), the resolver's fallback order, `formatThaiAddress`, and `businessUpdates` for the GPS, pin and full-address sentences.
- `architecture.test.ts`: only `src/services/places/` may reference the map services' hosts.
- Browser check: postcode typing, a pasted Google Maps link, pin sheet move, simulated GPS, a full spoken address typed in the talk sheet, and offline (network off) still filling the location.

## 9. Not in this sub-project

- Reading short links (`maps.app.goo.gl`), which needs a server.
- English address search.
- GitHub Pages deployment (a separate small task).
- Regional dialect words beyond place names (sub-project A).
