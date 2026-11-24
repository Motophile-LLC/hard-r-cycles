# Hard R Cycles — Remaining Asset Sheet Prompts (Sheets 03–07)

Use these prompts in Google Flow / Imagen 3 / Gemini Image Generation whenever you want to expand or replace the temporary placeholders/cropped characters with dedicated storefront sprites. All prompts match the **Hard R Cycles** flat 2D adult cartoon cel-shaded aesthetic.

---

## Global Style Anchor (Paste at Start of Every Prompt)
> `Flat 2D hand-drawn adult cartoon animation, cel-shaded, thick black ink outlines, bold comic book ink shadows, traditional 2D animation style. No photorealism, no 3D rendering, no live-action textures, solid plain warm cream #F5F1E6 background.`

---

## Sheet 03 — "V" Extended Wardrobe & Shop Poses (Front Desk / Parts Clerk)
- **Aspect Ratio:** `16:9` (or `4:3` turnaround)
- **Attach Reference:** `planning/asset-sheets/Sheet_02_V_Master.jpg`
- **Prompt:**
  > `Flat 2D hand-drawn adult cartoon animation, cel-shaded, thick black ink outlines, bold comic book ink shadows, traditional 2D animation style. No photorealism, no 3D rendering, no live-action textures, solid plain warm cream #F5F1E6 background. Character continuation sheet of V from the attached sheet: sarcastically unbothered female biker parts clerk in black Harley-style cropped vest, white tank top, fingerless leather gloves, septum ring, high ponytail, faded charcoal denim. 4 full-body poses cleanly separated side-by-side with empty background around each figure: (1) leaning on elbow holding a brass "TAKE A NUMBER" desk bell, (2) holding a folded black Hard R Cycles hoodie on a hanger, (3) pointing downward toward the clearance rack with a deadpan smirk, (4) holding a steaming black shop mug. Clean isolated ink lines around shoes and hands.`
- **Target outputs after slicing:** `public/sprites/characters/v/{desk-bell,holding-hoodie,pointing-rack,coffee-break}.png`

---

## Sheet 04 — Master Apparel & Rack Merchandise Pack
- **Aspect Ratio:** `16:9`
- **Attach Reference:** `planning/brand/hard_r_cycles_logo.jpg`
- **Prompt:**
  > `Flat 2D hand-drawn adult cartoon animation, cel-shaded, thick black ink outlines, bold comic book ink shadows, traditional 2D animation style. No photorealism, no 3D rendering, no live-action textures, solid plain warm cream #F5F1E6 background. 6 isolated prop cutouts spaced cleanly apart: (1) heavyweight black streetwear t-shirt on wire hanger with distressed white stencil "HARD R CYCLES" chest graphic, (2) charcoal shop zip hoodie with orange sleeve stripe, (3) distressed black mechanic snapback cap with stencil patch, (4) black-and-white ceramic "SHED BUILT" shop mug, (5) brass/chrome knuckle keychain fob, (6) die-cut "NO RULES — ALL WRENCH" vinyl sticker pack.`
- **Target outputs after slicing:** `public/sprites/props/apparel/{tee-rack,hoodie-rack,snapback,mug,keychain,sticker-pack}.png`

---

## Sheet 05 — Visiting Customer Pack (Chaos Archetypes — Transparent Standees)
- **Aspect Ratio:** `16:9`
- **Attach References:** `D:\HardRToons\Assets\Customer_Color_Sheet.jpeg`, `Customer_02_Color_Sheet.jpeg`, `Customer_03_Color_Sheet.jpeg`, `DynaBro_Color_Sheet.jpeg`
- **Prompt:**
  > `Flat 2D hand-drawn adult cartoon animation, cel-shaded, thick black ink outlines, bold comic book ink shadows, traditional 2D animation style. No photorealism, no 3D rendering, no live-action textures, solid plain warm cream #F5F1E6 background. Full-body 3/4 standing poses spaced cleanly apart with zero overlap: (1) exasperated Dyna-Bro pointing at his phone screen claiming "I read on Reddit it's just a fuse", (2) confused touring rider clutching an owner's manual upside down, (3) smug chrome-bagger owner flexing keys while asking "Can you just plug in your computer for free?". Clean dark ink outlines down to boot soles.`
- **Target outputs after slicing:** Currently using cropped turnarounds in `public/sprites/characters/customers/customer-{1,2,3}.png`; upgrade anytime via `npm run prepare-assets`.

---

## Sheet 06 — Storefront Interior Wall Banners, Breaker Panel & Counter Props
- **Aspect Ratio:** `16:9`
- **Attach Reference:** `planning/asset-sheets/Sheet_01_Master_Floorplan.jpg`
- **Prompt:**
  > `Flat 2D hand-drawn adult cartoon animation, cel-shaded, thick black ink outlines, bold comic book ink shadows, traditional 2D animation style. No photorealism, no 3D rendering, no live-action textures, solid plain warm cream #F5F1E6 background. Isolated 2D garage wall signage and counter props spaced cleanly apart: (1) distressed steel "HARD R CYCLES" hanging tin sign, (2) "SHOP LABOR RATE: $125/HR — WATCHING: $175/HR — HELPING: $250/HR" wall placard, (3) grey industrial high-voltage breaker cabinet with yellow lightning decal and red lockout handle, (4) counter card reader & brass service bell, (5) neon open sign reading "WRENCH & MERCH OPEN".`
- **Target outputs after slicing:** `public/sprites/props/signage-*.png`, `public/sprites/props/breaker-box.png`

---

## Sheet 07 — 3/4 Motorcycle Showroom Cuts (Track Bagger, Big-Wheel Bagger, Club-Style Dyna)
- **Aspect Ratio:** `16:9`
- **Attach References:** `D:\HardRToons\Assets\Bike_Track_Bagger.jpeg`, `Bike_BigWheel_Bagger.jpeg`, `Bike_ClubStyle_Dyna.jpeg`
- **Prompt:**
  > `Flat 2D hand-drawn adult cartoon animation, cel-shaded, thick black ink outlines, bold comic book ink shadows, traditional 2D animation style. No photorealism, no 3D rendering, no live-action textures, solid plain warm cream #F5F1E6 background. Three isolated 3/4 custom V-twin motorcycles with generous whitespace between them: (1) matte charcoal performance Track Bagger with gold inverted forks and short titanium 2-into-1 exhaust, (2) candy-orange 26-inch Big-Wheel Custom Bagger with stretched bags, (3) black T-bar Club-Style Dyna with quarter fairing and tall sissy bar. Clean flat cel colors and crisp dark outlines around tires.`
- **Target outputs after slicing:** `public/sprites/props/showroom-{track-bagger,bigwheel-bagger,club-dyna}.png`
