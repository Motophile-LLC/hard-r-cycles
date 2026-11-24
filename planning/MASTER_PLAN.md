# Hard R Cycles — Master Pre-Production Plan & Asset Spec

> **Status:** Pre-Production & Planning (No app code built yet)  
> **Workspace:** `d:\HardRCyclessite` (`d:\hardrgame` preserved untouched as a backup)

---

## 1. Brand Identity & Official Logo

- **Business Boundary:** **Hard R Cycles** operates completely independently from **Motophile LLC** (separate storefront domain, separate Stripe account/profile, no permanent Shopify lock-in) so explicit adult-humor merch and unfiltered character dialogue stay insulated.
- **Official Logo:** [hard_r_cycles_logo.jpg](file:///d:/HardRCyclessite/planning/brand/hard_r_cycles_logo.jpg) — bold black-and-white double-bordered industrial stencil (`HARD R / CYCLES`).
  - **Pre-Build Prep Note:** Clean off the tiny bottom-right generator watermark sparkle and convert into a crisp vector `.svg` + transparent `.png` so it stays razor-sharp on the 3D shop overhead sign, 18+ Front Door gate, site header/favicon, and future Hard R Cycles merch drops.

---

## 2. Core Architecture & Tech Stack (Locked)

- **Unified Application:** Storefront + living 3D dealership + *Flat Rate Panic* mini-game run inside **one Next.js App Router application** in `d:\HardRCyclessite` (migrating and upgrading the working engine from `d:\hardrgame`).
- **Lean Stack:**
  - **Frontend & 3D World:** Next.js (App Router) + React Three Fiber (`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`) + Zustand + Tailwind CSS. *(No separate Phaser.js engine.)*
  - **Backend, Optional Auth & Live Bays:** **Supabase** (`https://szrkpwtavfzmnzctsixx.supabase.co`, saved in [.env.local](file:///d:/HardRCyclessite/.env.local)) for Postgres catalog/orders, optional user login, and Realtime Presence for live players in the Service Bays. *(No Clerk needed.)*
  - **Payments:** **Stripe Checkout** (Cards, Apple Pay, Google Pay, optional Stripe Tax) with decoupled fulfillment (`shopify_link`, `stripe_diy`, `stripe_pod`).
  - **Staff Chat & Product Q&A:** **100% Local Zero-API Engine** (\$0/month).

---

## 3. Visual Style, Entry Gate & Navigation (Locked)

- **Visual Style (Option A):** Sims / Diablo ~40° isometric cutaway **3D cel-shaded dealership** populated with **2D hand-inked `HardRToons` characters**, paired with a mobile Quick-Nav HUD (`Floor | Apparel | Parts | Play | Cart`) and a 1-tap **Quick Shop List** toggle for mobile shoppers.
- **Entry Gate:** **1-click Front Door 18+ / Explicit Humor Disclaimer** (no forced login wall; account sign-in stays optional for leaderboards, earned game coupons, and order history).
- **Navigation:** **Direct click** on zones, racks, staff, and service lifts (no walkable customer avatar).

---

## 4. Launch Merch Strategy (Stocking the Shelves)

- **Exported Bridge Catalog:** [shopify_catalog_export.json](file:///d:/HardRCyclessite/planning/shopify_catalog_export.json) (20 live products pulled from `MotophileUSA.com`; duplicate `dyna-bros-who-needs-hoes-1` flagged `activeOnHardR: false`, leaving **19 unique active items**).
- **Launch Shelf Mapping (All Active Collections Featured):**
  - **Rack 1 — Shop Humor (6 items):** `Dyna-cologist`, `Dyna-Bros Who needs Hoes`, `"I Ride a Sportster" Funny Biker T-Shirt`, `Dyna Bros Area Codes`, `Dyna-Bro Area Codes Hoodie`, `Chopper Math`.
  - **Rack 2 — Motophile Definition (9 items + `Definition Cage Hoodie`):** `Definition Apex`, `Definition Cage`, `Definition Dopamine`, `Definition Drugs`, `Definition Fragrance`, `Definition Horizon`, `Definition Manifest`, `Definition Now`, `Definition Primal`, plus `Definition Cage Hoodie`.
  - **Feature Wall / Table — Talkin Braap (2 hoodies + `Talkin Braap Podcast t-shirt`):** `Talkin Braap Hoodie`, `Talkin Braap Hoodie White Ink`, and `Talkin Braap  Podcast t-shirt`.
- **Checkout & Fulfillment Flexibility:**
  - Launch items start with `checkoutMode: "shopify_link"` so shoppers discover items on V's racks and check out smoothly via your existing Ninja POD Shopify pipeline while Hard R Cycles exclusive products are developed.
  - Adding future Hard R Cycles items requires no code changes: a private `/admin` page saves products directly into Supabase (`shopify_link`, `stripe_diy` for in-house packing/shipping, or `stripe_pod` for future POD APIs).

---

## 5. Staff Personalities & Live *Flat Rate Panic* Bays

- **Zero-API Staff Chat & Q&A (\$0/month):** Clicking **V**, **Dick**, or **Scooter** opens a comic RPG dialogue box with dynamic mood portraits, quick-tap topic buttons, inline clickable product cards, catalog-matched Q&A (real sizes `XS–4XL`/`S–4XL`, prices, cotton/fleece fabric notes), loitering/cart triggers, and cross-shop banter.
- **Live Service Bays (Bays 1–3):**
  - Clicking any lift swoops the camera directly into *Flat Rate Panic*.
  - Active players broadcast lightweight **Supabase Realtime Presence** event pulses (`WRENCHING`, `SPARKS`, `BREAKER_BLOWN`, `CHAOS_SMOKE`, `JOB_DONE`) so shoppers browsing the floor see live wrenching, sparks, smoke, and floating player badges.
  - Automatic **NPC Bay Techs** populate empty bays so the shop never looks dead, and qualifying scores hit a server route to issue verified, rate-limited single-use Stripe Promotion Codes.

---

## 6. Pre-Production Asset Sheet Tracker

| Sheet | Asset | Status | File / Source |
| :--- | :--- | :--- | :--- |
| **Brand** | Official Hard R Cycles Stencil Logo | **LOCKED** | [hard_r_cycles_logo.jpg](file:///d:/HardRCyclessite/planning/brand/hard_r_cycles_logo.jpg) |
| **Sheet 01** | Master Dealership Floorplan & Isometric Layout | **LOCKED** | [Sheet_01_Master_Floorplan.jpg](file:///d:/HardRCyclessite/planning/asset-sheets/Sheet_01_Master_Floorplan.jpg) |
| **Sheet 02** | "V" — Master Character & Mood Sheet | **LOCKED** | [Sheet_02_V_Master.jpg](file:///d:/HardRCyclessite/planning/asset-sheets/Sheet_02_V_Master.jpg) |
| **Sheet 03** | Dick — Expansion Sheet (Back-3/4, Counter Poses, 6–8 Moods) | Pending (cooldown) | Builds on `d:\HardRToons\Assets\Dick_Color_Sheet.jpeg` |
| **Sheet 04** | Scooter — Expansion Sheet (Back-3/4, Floor Poses, 6 Moods) | Pending (cooldown) | Builds on `d:\HardRToons\Assets\Apprentice_Color_Sheet.jpeg` |
| **Sheet 05** | Live Bay Tech Variants (2–3 isometric wrenching mechanics) | Pending (cooldown) | Prevents 3 identical Dicks in Bays 1–3 |
| **Sheet 06** | Props, Signage & Surfaces Kit (with Official Stencil Logo) | Pending (cooldown) | Racks, hat wall, counter, 18+ Front Door, textures |
| **Sheet 07** | Isometric Bikes, VFX & UI Kit | Pending (cooldown) | Aligns 3 existing bikes + sparks/smoke/zaps + comic HUD |

*(Saved for Phase 2+: Customer 1–3 & Dyna Bro expansion poses, Cinderblock Chopper Easter egg, VIN Diagnostic Counter UI.)*

---

## 7. Phased Build Roadmap & Estimated Costs

### Build Phases (When Ready to Start)
1. **Phase 0 (Current):** Finish Asset Sheets 03–07 & clean vector logo.
2. **Phase 1 — 3D Dealership Shell & Front Door:** Isometric room in `d:\HardRCyclessite`, 1-click 18+ Gate, clickable zones, V/Dick/Scooter on floor, mobile Quick-Nav HUD.
3. **Phase 2 — Shoppable Racks & Flexible Store:** Product drawers stocked with the 19 exported bridge items + Quick Shop List, private `/admin` catalog/order page, Stripe Checkout + idempotent Supabase webhook ready for DIY/POD drops.
4. **Phase 3 — Unified *Flat Rate Panic* + Live Bays:** Migrate `d:\hardrgame` into Bays 1–3, smooth zoom-in/out camera, Supabase Realtime Presence bay animations (+ NPC auto-fill), server-verified Stripe coupon rewards.
5. **Phase 4 — Clickable Staff Chat, Banter & Ambient Chaos:** Zero-API RPG dialogue UI, catalog Q&A, loitering/cart roasts, cross-shop banter, random Customer chaos events at the Roll-Up Door.
6. **Phase 5 — Service Counter VIN Diagnostics:** Port working VIN Diagnostic tool from **Flat Rate Master** behind Dick's counter (rate-limited, Year/Make/Model fallback, safety disclaimer).

### Monthly Operating Cost Estimate
- **Build & Testing:** **\$0/month** (Vercel Hobby, Supabase Free, Stripe Test Mode, Zero-API local chat).
- **Live Production Store:** **~\$20–\$45/month fixed** (Vercel Pro \$20/mo + Supabase Free \$0 → Pro \$25/mo + ~\$1/mo domain) + **2.9% + \$0.30 per Stripe sale** (optional Stripe Tax ~0.5% where applicable). Fulfillment (Pirate Ship DIY or POD) has \$0 monthly fee.
