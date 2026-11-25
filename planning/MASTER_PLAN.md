# Hard R Cycles — Master Plan & Phase 2 Community Blueprint

**Status:** v1 + Phase 2 **Waves 0–3 Completed & Live** (`https://hardrcycles.com`) — **Next Up: Wave 4 (Modular In-Site Selfie Contest Station)**  
**Supabase Project:** `szrkpwtavfzmnzctsixx` (Migrations `001`–`005` applied in production; `006_orders_delivered_status.sql` authored locally as optional run; Next migration: `007_selfie_contests.sql`)  
**Workspaces:**
- `d:\HardRCyclessite` — Unified 3D Dealership, Storefront & *Flat Rate Panic*
- `d:\HardRToons` — Automated 2D Cartoon Production Pipeline
- `d:\hardrgame` — Preserved v0 mini-game backup
**Google Doc Single Source of Truth:** [Hard R Cycles — Master Plan & Phase 2 Blueprint](https://docs.google.com/document/d/1t6dCbM2Xdex_CzDz3-dyrU3u1hTIVmtUwNgS2z6BSBI/edit?tab=t.tu10mtddzr24) (`Original Phase 2 Draft (Archive)` tab `t.0` preserved for history)

---

## 1. Current v1 Live State Audit (What Is Built Today)

Everything planned across original Phases 0 through 5 and Phase 2 Waves 0–3 is now implemented and verified in production (`d:\HardRCyclessite`). Phase 2 community Waves 4–5 remain queued below.

| Plan Phase | Actual Status Today | Live Implementation & Remaining Scope |
| :--- | :--- | :--- |
| **Phase 0 — Brand & Assets** | **Done (Live)** | Clean stencil logo (`public/brand/hard-r-cycles-logo.png`, `.svg`, `og-card.png`) from `planning/brand/hard_r_cycles_logo.jpg`; Asset Sheets `01` through `08` generated, sliced, and cache-busted via `src/utils/spriteVersion.ts`. |
| **Phase 1 — 3D Dealership & 18+ Door** | **Done (Upgraded)** | Option A true volumetric cel-shaded 3D dealership and props (`src/components/canvas/DealershipScene.tsx`, `src/components/canvas/DealershipProps3D.tsx`) paired with 2D `HardRToons` staff and customers, 18+ Front Door attestation gate (`src/components/shop/FrontDoorGateModal.tsx`), ~112-degree camera orbit + pinch-to-zoom, and mobile Quick-Nav HUD (`src/components/shop/ShopFloorHUD.tsx`). |
| **Phase 2 — Storefront, Checkout & Admin** | **Done (Live)** | Quick Shop & Cart drawer (`src/components/shop/ShopDrawer.tsx`), `/admin` console (`src/components/admin/AdminDashboardClient.tsx`), Stripe Checkout + idempotent webhook (`src/app/api/webhooks/stripe/route.ts`), Printful POD draft-dispatch scaffold (`src/lib/fulfillment.ts`), and 19 launch MotophileUSA bridge items (`checkout_mode = 'shopify_link'`). |
| **Phase 3 — *Flat Rate Panic* + Live Bays** | **Done (Live)** | Unified playable Bays 1–3 (`src/components/canvas/ShopScene.tsx`), Supabase Realtime Presence + 3 NPC Bay Techs (`src/hooks/useLiveBayPresence.ts`), `public.repair_orders` leaderboard, and server-verified Stripe coupon rewards (`public.reward_claims`). |
| **Phase 4 — Staff Chat & Ambient Chaos** | **Done (Live)** | 100% local zero-API dialogue engine (`src/data/staffDialogue.ts`) for V, Dick, and Scooter with dynamic mood portraits, catalog Q&A, 30-second loitering barks, and ambient customer spawns. |
| **Bonus — Supabase SSO & Rider Profiles** | **Done (Live)** | **Google & Apple SSO-only** authentication + `public.profiles` (`garage_bikes`, `mechanic_handle`, shipping defaults, `role`, and `user_id` foreign keys across `orders`, `repair_orders`, `reward_claims` in `supabase/migrations/004_user_profiles_and_roles.sql`, `src/components/shop/AccountModal.tsx`, `src/components/auth/SsoSignInButtons.tsx`). |
| **Bonus — Flat Rate Master 3D Poster** | **Done (Live — Wave 0)** | Interactive animated wall poster & modal (`src/components/canvas/FlatRateMasterPoster.tsx`, `src/components/shop/FlatRateMasterModal.tsx`) wired to `https://app.motophileusa.com/sign-up?ref=ZUPH9BXM` with outbound `poster_open_flatratemaster` and `poster_click_flatratemaster` tracking. |
| **Original Phase 5 — VIN Diagnostics** | **Done (Wave 3 Option B)** | `src/components/shop/ServiceCounterModal.tsx` runs free NHTSA vPIC VIN decode (+ Year/Make/Model fallback), `$0` local Dick bench triage, `profiles.garage_bikes` + `customer_memory` sync, Shareable Roast Card PNGs, and tracked referral handoff (`?ref=ZUPH9BXM`) into Flat Rate Master. |

---

## 2. Locked Architecture, Merch & Security Guardrails

### Business Boundary & Merch Rack Strategy (Decision #1)

- **Hard R Cycles Native Storefront (Primary Racks):** Native Hard R Cycles apparel, accessories, and stickers (drop-shipped via Printful POD API `stripe_pod` or packed in-house `stripe_diy`) occupy the primary showroom racks:
  - `rack_1_humor` — Hard R Originals & Shop Humor
  - `episode_drops` / `rack_2` — Limited Weekly Cartoon Episode Drops & Signature Lines
  - `parts_shelf` — Parts, Stickers & Shop Gear
  - `vip_secret_stash` — Locked VIP-only apparel unlocked via `customer_memory`
- **Native Payment & Memory Loop:** Every native Hard R sale runs through Stripe Checkout -> `/api/webhooks/stripe` -> `public.orders` -> `public.customer_memory` + Printful/DIY fulfillment dispatch.
- **MotophileUSA Partner Rack (Isolated & Separate):** Existing MotophileUSA Shopify bridge products (`checkout_mode = 'shopify_link'`, 19 items in `planning/shopify_catalog_export.json`) intentionally remain on their existing launch showroom racks for now while the catalog fills the floor, until native Hard R dropship products (`stripe_pod` / `stripe_diy`) are ready to launch, at which point Motophile items consolidate onto the single dedicated `motophile_partner` rack. MotophileUSA remains strictly separate legally, financially, and operationally from Hard R Cycles.

### Minimal LLM Budget Guardrail (Decision #2)

- **Zero-API Core (`USD 0/month`):** Normal staff chat (`V`, `Dick`, `Scooter`), `customer_memory` tier personalization, `episode_knowledge` cartoon lore references, Wave 3 Service Counter VIN bench triage, and client-side Canvas Roast Cards remain **100% local (`USD 0/month`)** via deterministic template interpolation and structured keyword/tag matching. No `pgvector` embeddings or per-turn chat LLM calls are needed.
- **Free VIN Decoding + Flat Rate Master Handoff (`USD 0/month`):** Vehicle VIN lookups use the public **NHTSA vPIC API** with Year/Make/Model fallback (`Option B`), then hand off riders who want deep AI repair diagnostics and flat-rate labor guides directly into **Flat Rate Master** via partner referral URL (`?ref=ZUPH9BXM`, preserving `?vin=...` when entered).

### SSO-Only Identity & Security Policy (Decision #3)

- **Google & Apple SSO Only (No Passwords, No Clerk):** All visitor identity uses the existing Supabase Auth setup (`Google` and `Apple` OAuth in `src/components/auth/SsoSignInButtons.tsx`). Zero customer email/password logins eliminates password storage, credential stuffing, and account-takeover surfaces.
- **18+ Front Door Attestation Gate Remains Mandatory:** Because neither Google nor Apple OAuth provides verified age or date of birth to third-party apps, `src/components/shop/FrontDoorGateModal.tsx` remains the required 18+ adult humor entry gate alongside SSO identity.
- **Permission Split:**
  - **Public / Frictionless:** Browsing the 3D dealership, viewing racks, checking out, chatting with staff, and playing *Flat Rate Panic* work without forcing sign-in first.
  - **Google/Apple SSO Required:** Dropping or updating a Shop Wall Atlas pin, entering or voting in the Selfie Contest, submitting or voting in Weekly Mad-Libs Skits, saving garage bikes, and persisting `customer_memory`.

### B2B Dealership Digital Twin Modularity

Engineer all Phase 2 community systems as clean, swappable feature modules so they can be white-labeled into future B2B powersports dealership digital twin deployments:
- `src/features/atlas/` — Shop Wall Atlas & IP-fuzzed Guest Book
- `src/features/npc-memory/` — Customer Memory resolver & loyalty tier rules
- `src/features/selfie-contest/` — Character Photo Mode & moderated voting gallery
- `src/features/skit-madlibs/` — Community Mad-Libs Skit prompt, voting & manifest exporter

---

## 3. Phase 2 Feature Specifications

### 3.1 Flat Rate Master Referral Poster & Deep-Link Attribution

- **Partner URL & Click Logging:** Update `src/components/shop/FlatRateMasterModal.tsx` primary CTA to `https://app.motophileusa.com/sign-up?ref=ZUPH9BXM` so Flat Rate Master partner conversions track in the Partner Portal (`https://app.motophileusa.com/partner`), and record outbound `poster_click_flatratemaster` events into `public.analytics_events`.
- **Deep-Link Camera Router:** Parse Next.js App Router query parameters (`?dept=service|apparel|parts|arcade|atlas|selfies|skit`, `?drop=<handle>`, `?ref=<staff>`) in `src/app/page.tsx` and `src/store/useShopStore.ts` so social links swoop visitors straight to the target 3D rack, counter, bay, or community modal upon entering the front door.

### 3.2 Dick's Customer Memory System (Persistent Local NPC Engine)

- **Server-Side Persistence:** `public.customer_memory` keyed on `user_id UUID REFERENCES auth.users(id)` tracks `total_orders`, `lifetime_spend`, `purchased_skus`, `last_order_date`, `last_purchased_item`, `diagnostic_count`, `last_diagnosed_bike`, `last_symptom`, `flat_rate_high_score`, and `loiter_kick_count`.
- **Automatic Sync Triggers:** Updated by `/api/webhooks/stripe` on paid native Hard R orders, `/api/repair-orders` on completed shifts, and Wave 3 VIN diagnostics.
- **Dynamic Dialogue, Loiter Timers & Secret Stash Tiers:**

| Customer Tier | Trigger Criteria | NPC Disposition & Dialogue | System Effect |
| :--- | :--- | :--- | :--- |
| **Window Shopper** | `total_orders = 0` AND `visit_count >= 2` | Hostile, impatient (*"This ain't a museum. Buy a shirt or grab a broom."*) | Shorter loiter kick timer (`60s`). |
| **First-Time Buyer** | `total_orders = 1` | Grudging recognition referencing `last_purchased_item`. | Standard shop interactions. |
| **VIP Supporter** | `total_orders >= 3` OR `lifetime_spend >= 150` | Sarcastic loyalty (*"Big Spender's back. Kept the riff-raff off your gear."*) | Extended `10m` idle timer + unlocks `vip_secret_stash` apparel rack. |
| **Repeat Diagnostic** | `diagnostic_count >= 2` | Cynical mechanic referencing `last_diagnosed_bike` and `last_symptom`. | Pre-fills VIN Diagnostic terminal with saved garage bike. |

### 3.3 3D Shop Wall Atlas ("Sign the Guest Book")

- **3D Placement & Focus:** Mount a cel-shaded global/US Shop Wall Atlas board behind the parts/service wall in `src/components/canvas/DealershipProps3D.tsx` displaying glowing LED cluster nodes + `CAMERA_PRESETS.ATLAS`.
- **SSO-Only Pin Drop (`POST /api/atlas/checkin`):**
  - Requires active Google/Apple SSO session (`auth.uid()`).
  - Reads Vercel edge headers (`x-vercel-ip-city`, `x-vercel-ip-region`, `x-vercel-ip-country`, `x-vercel-ip-latitude`, `x-vercel-ip-longitude`), rounds coordinates to a `0.1`-degree grid (~11km privacy radius), **drops raw IP immediately without persisting it**, and links `favorite_bike` from `public.profiles.garage_bikes`.
  - Respects user visibility toggle in `AccountModal.tsx`: `public` (handle + city + bike), `anonymized` (`Rider from [City]`), or `hidden`.
- **Zero-Cost Stylized Comic Map (`GET /api/atlas/pins`):** Renders a custom pan/zoom cartoon SVG/Canvas atlas UI matching the Hard R aesthetic (zero Mapbox fees) with zoom-based GeoJSON pin clustering.
- **Onboarding & Privacy:** Show a welcoming first-stop *"Sign the Shop Wall"* prompt after passing the 18+ gate, and update `src/app/privacy/page.tsx` to document coarse city-level pin storage and visibility controls.

### 3.4 Service Counter VIN Diagnostics (Option B) & Shareable Roast Cards

- **VIN & Symptom Terminal (`src/features/diagnostics/` + `ServiceCounterModal.tsx` + `POST /api/diagnostics`):**
  - 17-character **NHTSA vPIC API** VIN decode (free `$0`) with automatic Year/Make/Model fallback when older choppers or unrecognized VINs fail decode.
  - Auto-saves decoded bikes into `public.profiles.garage_bikes` and increments `diagnostic_count`, `last_diagnosed_bike`, and `last_symptom` in `public.customer_memory` for signed-in Google/Apple SSO riders.
  - Generates instant `$0` local Dick bench triage (3–4 archetype-aware inspection steps + comic roast + mechanical safety disclaimer) and hands off deep AI troubleshooting & labor audits to **Flat Rate Master** (`https://app.motophileusa.com/sign-up?ref=ZUPH9BXM&vin=...`, logging `diagnostic_frm_handoff`).
- **One-Tap Shareable Q&A / Roast Cards (`src/features/roast-card/`):** Client-side HTML5 Canvas comic PNG generator (`Square 1:1` and `Story 9:16`) featuring the character portrait (`Dick`, `V`, or `Scooter`), the rider's question or bike/symptom, their response/roast, and `hardrcycles.com` branding for instant Web Share or PNG download from both `StaffDialogueBox` and `ServiceCounterModal`.

### 3.5 In-Site Selfie Contest ("Selfie of the Week / Day") — Anti-Spam Model (Decision #4)

Replaces automated all-day social auto-posting (which causes follower fatigue and unfollows) with a sticky community contest loop:

- **Conditional 3D Photo Mode Gates (SSO Required):**
  - **Scooter:** Open to any Google/Apple SSO rider on the floor.
  - **V ("Exclusive Circle"):** Playful opt-in profile/prompt eligibility gate (explicitly chosen by the rider rather than unreliable OAuth gender claims) with an in-character refusal line if declined.
  - **Dick (Paying Customer Gate):** Requires verified Hard R order (`total_orders >= 1` in `customer_memory`); non-buyers get roasted and linked straight to Hard R apparel racks.
- **Instant Personal Download + Contest Entry:** Every rider can immediately download and share their branded 3D shop selfie PNG to their own socials. To compete, SSO users submit their snapshot + social handle to the active daily/weekly contest (`public.selfie_contests`, `public.character_selfies`).
- **Moderation & SSO Voting:** Submissions go through a 1-click `/admin` approval queue (`pending` -> `approved` / `rejected`) before entering the public gallery. Signed-in SSO users cast upvotes (`public.selfie_votes`, enforced at 1 vote per user per entry).
- **Winner Spotlight:** The #1 voted selfie at cycle end is pinned on the in-shop **Winner Board** and receives **one curated official social shoutout** on that character's social channel tagging the winning handle.

### 3.6 Weekly Community Mad-Libs Skit Engine ("Write the Episode") & `HardRToons` Pipeline (Decisions #4 & #5)

Turns the automated `HardRToons` production workflow into a weekly user-written cartoon event:

1. **Weekly Skit Template (`/admin`):** Admin publishes a structured cartoon premise (`public.skit_contests`, `public.skit_blanks`) with typed fill-in-the-blanks such as `[BIKE_PART]`, `[ABSURD_TOOL]`, `[SHOP_EXCUSE]`, and `[DICK_PUNCHLINE]` across fixed character roles.
2. **Submit Blanks (Mon–Wed, SSO-Only):** Signed-in users submit comedic words/phrases (`public.skit_submissions`) scrubbed against automated profanity/slur/policy filters so Google Flow Veo 3.1 prompts remain clean and policy-safe.
3. **Community Vote (Thu–Fri, SSO-Only):** Signed-in users vote on the best entries (`public.skit_votes`, 1 vote per user per blank) with `/admin` moderation override before locking the winning script.
4. **Canonical `EpisodeManifest` Export (Sat):** Winning entries compile with community writer credits (`@Handle`) into a canonical `EpisodeManifest` JSON matching `d:\HardRToons` `prompt_pack.json`:

```json
{
  "episode_id": "ep_2026_004",
  "slug": "blinker-fluid-prank",
  "title": "Scooter Buys Premium Blinker Fluid",
  "winning_writers": ["@DynaDave", "@GarageQueen"],
  "hard_cut_beats": [
    { "beat_id": 1, "duration_sec": 8, "prompt": "Flat 2D hand-drawn adult cartoon animation... Dick tells the apprentice to fetch [ABSURD_TOOL]" },
    { "beat_id": 2, "duration_sec": 8, "prompt": "Flat 2D hand-drawn adult cartoon animation... Scooter panics by the parts shelf" },
    { "beat_id": 3, "duration_sec": 8, "prompt": "Flat 2D hand-drawn adult cartoon animation... V delivers [DICK_PUNCHLINE]" }
  ],
  "character_appearances": ["Dick", "Scooter", "V"],
  "catchphrases": ["Check the viscosity, kid"],
  "merch_drop_sku": "episode-004-viscosity-tee",
  "npc_memory_summary": "Dick tricked Scooter over [ABSURD_TOOL]; V roasted them both."
}
```

5. **Production, Premiere, POD Drop & Zero-API NPC Sync (Sun/Mon):**
   - `d:\HardRToons` renders pure 2D keyframes -> Google Flow Veo 3.1 Frames-to-Video -> FFmpeg `xfade` assembly (`Final_Short.mp4`).
   - `/api/admin/episodes` ingests the finished `EpisodeManifest` into `public.episode_knowledge` so Dick, V, and Scooter immediately reference the community episode and promote any tied drop SKU via **zero-API local keyword/tag matching**, while the finished short appears inside an in-shop **Shop TV / Skit Archive** modal.
- **Safe Official-API Social Distribution (Decision #5):**
  - Manually create and verify the 4 official channels once (`Hard R Cycles`, `Dick`, `V`, `Scooter`). **Never** automate account registration via headless browsers or disposable inboxes (avoids CAPTCHA blocks, platform ToS violations, and permanent bans).
  - Publish weekly episode cuts, cross-tags, deep-link captions (`?dept=apparel&drop=<slug>`), and the single weekly Selfie Contest winner shoutout via **official platform APIs** (YouTube Data API v3, Meta Graph API, TikTok Content Posting API, X API v2) or a single official multi-channel publishing API triggered from `/admin`.

---

## 4. Supabase Schema Roadmap (All `auth.users(id)` UUIDs + Strict RLS)

### Migration `005_phase2_memory_atlas_and_racks.sql` **(Applied in Supabase Production)**

```sql
-- Expand rack slots to isolate Motophile Partner Rack and add VIP / Episode racks
alter table public.products
  drop constraint if exists products_rack_slot_check;

alter table public.products
  add constraint products_rack_slot_check check (
    rack_slot in (
      'rack_1_humor',
      'rack_2_definition',
      'wall_braap',
      'parts_shelf',
      'hard_r_originals',
      'motophile_partner',
      'episode_drops',
      'vip_secret_stash'
    )
  );

-- Extend SSO profiles with social handle, atlas visibility, and V gate opt-in
alter table public.profiles
  add column if not exists social_handle text not null default '',
  add column if not exists atlas_visibility text not null default 'public'
    check (atlas_visibility in ('public', 'anonymized', 'hidden')),
  add column if not exists v_circle_opt_in boolean not null default false,
  add column if not exists visit_count integer not null default 1 check (visit_count >= 1);

-- Persistent customer memory for zero-API Dick / V / Scooter recognition
create table if not exists public.customer_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_orders integer not null default 0 check (total_orders >= 0),
  lifetime_spend numeric(10,2) not null default 0.00 check (lifetime_spend >= 0),
  purchased_skus text[] not null default '{}',
  last_order_date timestamptz,
  last_purchased_item text,
  diagnostic_count integer not null default 0 check (diagnostic_count >= 0),
  last_diagnosed_bike text,
  last_symptom text,
  flat_rate_high_score numeric(6,2) not null default 0,
  loiter_kick_count integer not null default 0 check (loiter_kick_count >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Fuzzed 0.1-degree Guest Book / Shop Wall Atlas pins (SSO-only check-in)
create table if not exists public.visitor_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous Rider',
  city text not null default 'Unknown',
  region text not null default 'Unknown',
  country text not null default 'US',
  lat_approx numeric(8,4) not null,
  lng_approx numeric(8,4) not null,
  visit_count integer not null default 1 check (visit_count >= 1),
  favorite_bike text not null default 'Custom Chopper',
  visibility text not null default 'public' check (visibility in ('public', 'anonymized', 'hidden')),
  first_seen_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_visitor_pins_coords on public.visitor_pins (lat_approx, lng_approx);
create index if not exists idx_visitor_pins_last_seen on public.visitor_pins (last_seen_at desc);

-- Synced episode lore for zero-API keyword/tag NPC matching and Shop TV archive
create table if not exists public.episode_knowledge (
  id uuid primary key default gen_random_uuid(),
  episode_id text unique not null,
  slug text unique not null,
  title text not null,
  character_appearances text[] not null default '{}',
  summary text not null,
  catchphrases text[] not null default '{}',
  keywords text[] not null default '{}',
  associated_sku text,
  winning_writers text[] not null default '{}',
  video_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Lightweight referral and deep-link attribution log
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);
```

### Migration `006_orders_delivered_status.sql` **(Authored Locally — Optional / Ready in Supabase SQL Editor)**

- Extends `public.orders.status` check constraint with `'delivered'` alongside `'paid'`, `'fulfilling'`, `'shipped'`, `'cancelled'`, and `'refunded'`, supporting explicit `/admin → Orders` delivery status marking (the app also automatically treats orders marked `'shipped'` for `>= 5` days as delivered so NPC walk-in greetings work before applying).

### Migration `007_selfie_contests.sql` **(Queued for Wave 4)**

- `public.selfie_contests` — Active daily/weekly contest cycles (`id`, `title`, `cadence`, `starts_at`, `ends_at`, `status`: `active | voting | closed`, `winner_selfie_id`).
- `public.character_selfies` — User submissions (`id`, `contest_id`, `user_id` FK, `character_name`: `scooter | v | dick`, `social_platform`, `user_social_handle`, `image_url`, `moderation_status`: `pending | approved | rejected`, `vote_count`, `external_post_url`).
- `public.selfie_votes` — SSO vote ledger (`contest_id`, `selfie_id`, `user_id` FK, unique `(selfie_id, user_id)`).
- Supabase Storage `selfies` bucket with size/MIME limits and RLS policies.

### Migration `008_skit_madlibs.sql` **(Queued for Wave 5)**

- `public.skit_contests` — Weekly script competitions (`id`, `slug`, `title`, `premise`, `template_beats` JSONB, `submission_closes_at`, `voting_closes_at`, `status`: `submitting | voting | locked | published`, `exported_manifest` JSONB).
- `public.skit_blanks` — Ordered fill-in slots per contest (`id`, `contest_id`, `blank_key`, `prompt_label`, `max_chars`).
- `public.skit_submissions` — SSO user entries per blank (`id`, `contest_id`, `blank_id`, `user_id` FK, `writer_handle`, `entry_text`, `moderation_status`: `approved | flagged | rejected`, `vote_count`).
- `public.skit_votes` — SSO voting table (`id`, `contest_id`, `blank_id`, `submission_id`, `user_id` FK, unique `(blank_id, user_id)`).

---

## 5. Asset Sheet Tracker (v1 Complete + Phase 2 Queue)

| Sheet | Asset | Status | File / Source |
| :--- | :--- | :--- | :--- |
| **Brand** | Official Hard R Cycles Stencil Logo | **DONE / LIVE** | `planning/brand/hard_r_cycles_logo.jpg` -> `public/brand/hard-r-cycles-logo.png` |
| **Sheet 01** | Master Dealership Floorplan & Isometric Layout | **DONE / LIVE** | `planning/asset-sheets/Sheet_01_Master_Floorplan.jpg` |
| **Sheet 02** | "V" — Master Character & Mood Sheet | **DONE / LIVE** | `planning/asset-sheets/Sheet_02_V_Master.jpg` |
| **Sheet 03** | Dick — Expansion Sheet (Back-3/4, Counter Poses, 6 Moods) | **DONE / LIVE** | `planning/asset-sheets/Sheet_03_Dick_Expansion.jpg` |
| **Sheet 04** | Scooter — Expansion Sheet (Back-3/4, Floor Poses, 6 Moods) | **DONE / LIVE** | `planning/asset-sheets/Sheet_04_Scooter_Expansion.jpg` |
| **Sheet 05** | Live Bay Tech Variants (3 isometric wrenching mechanics) | **DONE / LIVE** | `planning/asset-sheets/Sheet_05_Live_Bay_Techs.jpg` |
| **Sheet 06** | Props, Signage & Surfaces Kit (with Official Stencil Logo) | **DONE / LIVE** | `planning/asset-sheets/Sheet_06_Props_Signage_Kit.jpg` |
| **Sheet 07** | Isometric Bikes, VFX & UI Kit | **DONE / LIVE** | `planning/asset-sheets/Sheet_07_Isometric_Bikes_VFX_UI.jpg` |
| **Sheet 08** | Parts Shelving, Pegboard, Roll-Up Door, Tool Chest, Tires & Drum | **DONE / LIVE** | `planning/asset-sheets/Sheet_08_Parts_Garage_Props.jpg` |

**Phase 2 Asset Progress:**
- **DONE (Wave 2):** 3D Shop Wall Atlas board art + pulsing LED pin markers (`src/features/atlas/ShopWallAtlas3D.tsx`)
- **DONE (Wave 3):** Live Option B VIN Diagnostic Counter terminal UI (`src/components/shop/ServiceCounterModal.tsx`) + `$0` Shareable Roast Card Canvas exporter (`src/features/roast-card/RoastCardModal.tsx`)
- **Queued:** VIP Secret Stash rack signage & Motophile Partner Rack header plaque (once native dropship products launch)
- **Queued (Wave 4):** In-shop Selfie Contest Winner Board frame + Photo Mode borders (`Dick`, `V`, `Scooter`)
- **Queued (Wave 5):** Shop TV / Weekly Mad-Libs Skit Archive console prop
- **Queued (Deferred Polish):** Customer 1–3 & Dyna Bro expansion poses, Cinderblock Chopper Easter egg

---

## 6. Ordered Execution Roadmap & Verification Gates

### Wave 0 — Quick Wins, Referral Attribution & Deep-Link Router **(Completed / Live — Commit `bbab426`)**
- Updated `src/components/shop/FlatRateMasterModal.tsx` outbound CTA to `https://app.motophileusa.com/sign-up?ref=ZUPH9BXM`, created `src/lib/analytics.ts` + `POST /api/events` collector into `public.analytics_events`.
- Implemented `src/components/shop/ShopDeepLinkRouter.tsx` (`?dept=...`, `?drop=...`, `?rack=...`, `?bay=...`, `?ref=...`) inside `<Suspense>` in `src/app/page.tsx`, plus featured drop sorting/banners in `useShopStore.ts` and `ShopDrawer.tsx`.

### Wave 1 — Migration `005`, Customer Memory, Order Status & Delivered Greetings **(Completed / Live — Commits `bbab426`, `86598dd`)**
- Applied `supabase/migrations/005_phase2_memory_atlas_and_racks.sql` in production and kept the 19 existing MotophileUSA items untouched until native dropship launch.
- Built `src/features/npc-memory/` (`NEWCOMER`, `WINDOW_SHOPPER` 60s kick, `FIRST_TIME_BUYER`, `VIP_SUPPORTER` 10m grace + Secret Stash unlock, `REPEAT_DIAGNOSTIC`), wired server sync on Stripe webhooks, repair orders, `/api/memory/loiter`, `/api/profile`, and `/admin → Users` 1-click **Test Dick's Tier** presets.
- Extended zero-API `staffDialogue.ts` and `ShopFloorHUD.tsx` with direct-site order/tracking queries (`"Where's my order?"` across Dick, V, and Scooter) plus personalized V & Dick walk-in greetings referencing delivered gear (paired with optional `006_orders_delivered_status.sql` + 5-day shipped fallback).

### Wave 2 — Modular 3D Shop Wall Atlas ("Sign the Guest Book") **(Completed / Live — Commit `bbab426`)**
- Built standalone `src/features/atlas/` (`ShopWallAtlas3D.tsx`, `AtlasMapSvg.tsx`, `ShopWallAtlasModal.tsx`, `geo.ts`), mounted on the unobstructed Left Entry Wall with `CAMERA_PRESETS.ATLAS` and dismissible first-stop Guest Book prompt.
- Built SSO-gated `POST /api/atlas/checkin` (`0.1`-degree ~11km grid fuzzing, zero raw IP persistence) and `GET /api/atlas/pins`, synced `social_handle` + `atlas_visibility` in `AccountModal.tsx` / `PATCH /api/profile`, and disclosed coarse location pins in `src/app/privacy/page.tsx`.

### Wave 3 — Service Counter VIN Diagnostics (Option B) & Local Roast Cards **(Completed / Verified)**
- Built modular `src/features/diagnostics/` (free **NHTSA vPIC API** VIN decoder + Year/Make/Model fallback + `$0` bike-aware Dick triage & bench checklist) and `POST /api/diagnostics`, syncing `profiles.garage_bikes` and `customer_memory` (`diagnostic_count`, `last_diagnosed_bike`, `last_symptom`).
- Wired primary referral CTA into Flat Rate Master (`buildFlatRateMasterReferralUrl` with `ref=ZUPH9BXM` and optional `vin`) plus `diagnostic_decode` / `diagnostic_frm_handoff` analytics events.
- Built modular `src/features/roast-card/` client-side HTML5 Canvas comic PNG exporter (`Square 1:1` & `Story 9:16`, Web Share API + PNG download + caption copy) accessible from both `StaffDialogueBox.tsx` and `ServiceCounterModal.tsx`.
- **Verification Gate Passed:** Unit tests (`jiti`), `eslint .`, `tsc --noEmit`, `next build` (`29/29`), and local `127.0.0.1:3099` API probes all passed.

### Wave 4 — Modular In-Site Selfie Contest Station **(Next Up — Est. ~4–5 Days)**
- Author and apply `supabase/migrations/007_selfie_contests.sql` (`selfie_contests`, `character_selfies`, `selfie_votes`, Storage `selfies` bucket + RLS) and build `src/features/selfie-contest/`.
- Implement 3D Photo Mode composer with Scooter (open SSO), V (opt-in Exclusive Circle + witty roast), and Dick (verified buyer `total_orders >= 1` + merch roast) gates.
- Add instant personal download/share, contest submission to `/admin` moderation queue, SSO upvoting gallery, and in-shop Winner Board.
- **Verification Gate:** Non-buyers are gated and roasted by Dick; V enforces opt-in circle logic; `/admin` approval publishes entries to the gallery; 1 vote per SSO user is enforced; top entry highlights as Winner.

### Wave 5 — Weekly Community Mad-Libs Skit Engine, `HardRToons` Sync & Official-API Social Pipeline **(Queued — Est. ~5–7 Days)**
- Author and apply `supabase/migrations/008_skit_madlibs.sql` and build `src/features/skit-madlibs/` (`/admin` template builder, SSO blank submission with Veo 3.1 policy filters, SSO voting, `EpisodeManifest` JSON exporter with community writer credits).
- Build `POST /api/admin/episodes` sync into `public.episode_knowledge`, wiring zero-API local keyword matching into `staffDialogue.ts` plus an in-shop **Shop TV / Skit Archive** modal.
- Connect the 4 manually-created official social channels via official publishing APIs (or a single official multi-channel scheduler API) for weekly episode drops, cross-tags, `?dept=...&drop=...` deep links, and the weekly winning selfie shoutout.
- **Verification Gate:** Test skit contest exports a valid `EpisodeManifest` matching `d:\HardRToons`; syncing an episode causes Dick, V, and Scooter to quote the community gag locally; official-API dry-run schedules multi-channel posts with working 3D shop deep links.

---

## 7. Lean Monthly Operating Cost Estimate

- **Vercel Hosting:** Vercel Hobby (`USD 0/month`) during staging or Vercel Pro (`USD 20/month`) in production.
- **Supabase (Postgres, Auth SSO, Realtime, Storage):** Free (`USD 0/month`) -> Pro (`USD 25/month` as traffic and storage grow).
- **Domain:** ~`USD 1/month`.
- **Payments & Fulfillment:** Stripe `2.9% + USD 0.30` per native Hard R sale (Printful POD and Pirate Ship DIY labels carry `USD 0/month` fixed fees).
- **Minimal LLM Diagnostics Budget:** `USD 0/month` under Option B (NHTSA VIN decode, Dick bench triage, client-side Canvas Roast Cards, normal NPC staff chat, `customer_memory`, and `episode_knowledge` stay `USD 0/month`; deep AI diagnostics & flat-rate labor guides hand off into Flat Rate Master).
- **Official Social Publishing API (Optional):** `USD 0/month` via direct platform APIs or ~`USD 15` to `USD 25/month` for an official multi-channel scheduler API.
