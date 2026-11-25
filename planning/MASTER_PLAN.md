# Hard R Cycles — Master Plan & Phase 2 Community Blueprint

**Status:** v1 Live in Production (`https://hardrcycles.com`) — Phase 2 Expansion & Community Blueprint Locked (Ready for Wave 0 Execution)  
**Workspaces:**
- `d:\HardRCyclessite` — Unified 3D Dealership, Storefront & *Flat Rate Panic*
- `d:\HardRToons` — Automated 2D Cartoon Production Pipeline
- `d:\hardrgame` — Preserved v0 mini-game backup
**Google Doc Single Source of Truth:** [Hard R Cycles — Master Plan & Phase 2 Blueprint](https://docs.google.com/document/d/1t6dCbM2Xdex_CzDz3-dyrU3u1hTIVmtUwNgS2z6BSBI/edit) (`Original Phase 2 Draft (Archive)` tab preserved for history)

---

## 1. Current v1 Live State Audit (What Is Built Today)

Everything planned across original Phases 0 through 4 is live in production, along with user SSO profiles and the Flat Rate Master wall poster. Only original Phase 5 (Service Counter VIN Diagnostics) remains queued, now integrated cleanly into Wave 3 below.

| Plan Phase | Actual Status Today | Live Implementation & Remaining Scope |
| :--- | :--- | :--- |
| **Phase 0 — Brand & Assets** | **Done (Live)** | Clean stencil logo (`public/brand/hard-r-cycles-logo.png`, `.svg`, `og-card.png`) from `planning/brand/hard_r_cycles_logo.jpg`; Asset Sheets `01` through `08` generated, sliced, and cache-busted via `src/utils/spriteVersion.ts`. |
| **Phase 1 — 3D Dealership & 18+ Door** | **Done (Upgraded)** | Option A true volumetric cel-shaded 3D dealership and props (`src/components/canvas/DealershipScene.tsx`, `src/components/canvas/DealershipProps3D.tsx`) paired with 2D `HardRToons` staff and customers, 18+ Front Door attestation gate (`src/components/shop/FrontDoorGateModal.tsx`), ~112-degree camera orbit + pinch-to-zoom, and mobile Quick-Nav HUD (`src/components/shop/ShopFloorHUD.tsx`). |
| **Phase 2 — Storefront, Checkout & Admin** | **Done (Live)** | Quick Shop & Cart drawer (`src/components/shop/ShopDrawer.tsx`), `/admin` console (`src/components/admin/AdminDashboardClient.tsx`), Stripe Checkout + idempotent webhook (`src/app/api/webhooks/stripe/route.ts`), Printful POD draft-dispatch scaffold (`src/lib/fulfillment.ts`), and 19 launch MotophileUSA bridge items (`checkout_mode = 'shopify_link'`). |
| **Phase 3 — *Flat Rate Panic* + Live Bays** | **Done (Live)** | Unified playable Bays 1–3 (`src/components/canvas/ShopScene.tsx`), Supabase Realtime Presence + 3 NPC Bay Techs (`src/hooks/useLiveBayPresence.ts`), `public.repair_orders` leaderboard, and server-verified Stripe coupon rewards (`public.reward_claims`). |
| **Phase 4 — Staff Chat & Ambient Chaos** | **Done (Live)** | 100% local zero-API dialogue engine (`src/data/staffDialogue.ts`) for V, Dick, and Scooter with dynamic mood portraits, catalog Q&A, 30-second loitering barks, and ambient customer spawns. |
| **Bonus — Supabase SSO & Rider Profiles** | **Done (Live)** | **Google & Apple SSO-only** authentication + `public.profiles` (`garage_bikes`, `mechanic_handle`, shipping defaults, `role`, and `user_id` foreign keys across `orders`, `repair_orders`, `reward_claims` in `supabase/migrations/004_user_profiles_and_roles.sql`, `src/components/shop/AccountModal.tsx`, `src/components/auth/SsoSignInButtons.tsx`). |
| **Bonus — Flat Rate Master 3D Poster** | **Done (Needs Ref URL + Analytics)** | Interactive animated wall poster & modal (`src/components/canvas/FlatRateMasterPoster.tsx`, `src/components/shop/FlatRateMasterModal.tsx`). Queued in Wave 0 to swap outbound CTA to `https://app.motophileusa.com/sign-up?ref=ZUPH9BXM` and log clicks. |
| **Original Phase 5 — VIN Diagnostics** | **Queued (Wave 3)** | `src/components/shop/ServiceCounterModal.tsx` currently displays a Phase 5 placeholder card; full NHTSA decode + rate-limited troubleshooting + Roast Card share generator scheduled in Wave 3. |

---

## 2. Locked Architecture, Merch & Security Guardrails

### Business Boundary & Merch Rack Strategy (Decision #1)

- **Hard R Cycles Native Storefront (Primary Racks):** Native Hard R Cycles apparel, accessories, and stickers (drop-shipped via Printful POD API `stripe_pod` or packed in-house `stripe_diy`) occupy the primary showroom racks:
  - `rack_1_humor` — Hard R Originals & Shop Humor
  - `episode_drops` / `rack_2` — Limited Weekly Cartoon Episode Drops & Signature Lines
  - `parts_shelf` — Parts, Stickers & Shop Gear
  - `vip_secret_stash` — Locked VIP-only apparel unlocked via `customer_memory`
- **Native Payment & Memory Loop:** Every native Hard R sale runs through Stripe Checkout -> `/api/webhooks/stripe` -> `public.orders` -> `public.customer_memory` + Printful/DIY fulfillment dispatch.
- **MotophileUSA Partner Rack (Isolated & Separate):** Existing MotophileUSA Shopify bridge products (`checkout_mode = 'shopify_link'`, 19 items in `planning/shopify_catalog_export.json`) consolidate onto a **single dedicated Partner Rack (`motophile_partner`)**. MotophileUSA remains strictly separate legally, financially, and operationally from Hard R Cycles.

### Minimal LLM Budget Guardrail (Decision #2)

- **Zero-API Core (`USD 0/month`):** Normal staff chat (`V`, `Dick`, `Scooter`), `customer_memory` tier personalization, and `episode_knowledge` cartoon lore references remain **100% local (`USD 0/month`)** via deterministic template interpolation and structured keyword/tag matching in `src/data/staffDialogue.ts`. No `pgvector` embeddings or per-turn chat LLM calls are needed.
- **Free VIN Decoding (`USD 0/month`):** Vehicle VIN lookups use the public **NHTSA vPIC API** with automatic Year/Make/Model fallback.
- **Strictly Bounded LLM Usage:** External LLM API calls are minimized and restricted solely to rate-limited **VIN Diagnostic troubleshooting** in Wave 3 (cached for common bike/symptom pairs and capped per SSO user/day). Roast Cards use local-first character punchline templates, with optional tightly capped AI generation only if explicitly enabled later.

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

### 3.4 Service Counter VIN Diagnostics (Original Phase 5) & Shareable Roast Cards

- **VIN & Symptom Terminal (`src/components/shop/ServiceCounterModal.tsx`):**
  - 17-character **NHTSA vPIC API** VIN decode (free) + Year/Make/Model fallback.
  - Auto-saves decoded bikes into `public.profiles.garage_bikes` and increments `diagnostic_count`, `last_diagnosed_bike`, and `last_symptom` in `public.customer_memory`.
  - Rate-limited LLM troubleshooting response with cached fault patterns, daily SSO usage caps, and a clear mechanical safety disclaimer.
- **One-Tap Shareable Q&A / Roast Cards:** Client-side canvas generator renders a bold cel-shaded comic PNG featuring the character portrait (`Dick`, `V`, or `Scooter`), the rider's question/symptom, a punchy roast response (local-first template engine), and `hardrcycles.com` branding for instant Web Share or download.

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

### Migration `005_phase2_memory_atlas_and_racks.sql`

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

### Migration `006_selfie_contests.sql`

- `public.selfie_contests` — Active daily/weekly contest cycles (`id`, `title`, `cadence`, `starts_at`, `ends_at`, `status`: `active | voting | closed`, `winner_selfie_id`).
- `public.character_selfies` — User submissions (`id`, `contest_id`, `user_id` FK, `character_name`: `scooter | v | dick`, `social_platform`, `user_social_handle`, `image_url`, `moderation_status`: `pending | approved | rejected`, `vote_count`, `external_post_url`).
- `public.selfie_votes` — SSO vote ledger (`contest_id`, `selfie_id`, `user_id` FK, unique `(selfie_id, user_id)`).
- Supabase Storage `selfies` bucket with size/MIME limits and RLS policies.

### Migration `007_skit_madlibs.sql`

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

**Phase 2 Asset Queue:**
- 3D Shop Wall Atlas board art + glowing cluster node markers
- VIP Secret Stash rack signage & Motophile Partner Rack header plaque
- In-shop Selfie Contest Winner Board frame + Photo Mode borders (`Dick`, `V`, `Scooter`)
- Shop TV / Weekly Mad-Libs Skit Archive console prop
- Remaining v1 deferred character/prop polish: Customer 1–3 & Dyna Bro expansion poses, Cinderblock Chopper Easter egg, VIN Diagnostic Counter terminal UI

---

## 6. Ordered Execution Roadmap & Verification Gates

### Wave 0 — Quick Wins, Referral Attribution & Deep-Link Router (Est. ~1 Day)
- Update `src/components/shop/FlatRateMasterModal.tsx` outbound CTA to `https://app.motophileusa.com/sign-up?ref=ZUPH9BXM` and log `poster_click_flatratemaster` analytics events.
- Implement App Router query parameter routing (`?dept=...`, `?drop=...`, `?ref=...`) in `src/app/page.tsx` and `src/store/useShopStore.ts` to auto-focus 3D zones, racks, or bays on entry.
- **Verification Gate:** Deep links open directly onto targeted racks/bays/modals after passing the 18+ door; clicking the Flat Rate Master poster preserves `ref=ZUPH9BXM` and records the click event.

### Wave 1 — Migration `005`, Rack Split & Dick's Customer Memory (Est. ~2–3 Days)
- Deploy `supabase/migrations/005_phase2_memory_atlas_and_racks.sql`.
- Consolidate all 19 MotophileUSA Shopify items onto the single `motophile_partner` rack; launch native Hard R Cycles POD/dropship SKUs (`stripe_pod` / `stripe_diy`) across primary showroom racks and `vip_secret_stash`.
- Wire `/api/webhooks/stripe` and `/api/repair-orders` to upsert `public.customer_memory`.
- Hydrate `customer_memory` in `useShopStore` on SSO sign-in and wire Dick's 4 tiers, dynamic loiter timers (`60s` / standard / `10m`), and VIP Secret Stash unlock into zero-API `src/data/staffDialogue.ts`.
- **Verification Gate:** Synthetic Stripe CLI `checkout.session.completed` test creates an order, updates `customer_memory`, and transitions test profiles cleanly from `Window Shopper` -> `First-Time Buyer` -> `VIP Supporter` (unlocking Secret Stash).

### Wave 2 — Modular 3D Shop Wall Atlas ("Sign the Guest Book") (Est. ~3–4 Days)
- Build standalone `src/features/atlas/` module and mount the cel-shaded 3D Shop Wall Atlas board in `src/components/canvas/DealershipProps3D.tsx` + `CAMERA_PRESETS.ATLAS`.
- Build SSO-gated `POST /api/atlas/checkin` (Vercel IP headers -> `0.1`-degree grid fuzzing -> raw IP dropped immediately -> upserts `visitor_pins` with bike from `profiles.garage_bikes`) and `GET /api/atlas/pins`.
- Build the zero-cost cartoon SVG/Canvas map overlay modal, first-stop Guest Book prompt, and `src/app/privacy/page.tsx` disclosure update.
- **Verification Gate:** Unauthenticated visitors see a clean Google/Apple SSO sign-in prompt; signed-in visitors plot a ~11km fuzzed pin displaying their chosen visibility (`public`, `anonymized`, `hidden`) and saved bike.

### Wave 3 — Service Counter VIN Diagnostics (Phase 5) & Local Roast Cards (Est. ~3–5 Days)
- Build the free **NHTSA vPIC API** VIN decoder + Year/Make/Model fallback inside `src/components/shop/ServiceCounterModal.tsx`, auto-saving bikes to `profiles.garage_bikes` and syncing `customer_memory`.
- Connect strictly rate-limited, cached LLM troubleshooting diagnostics with mechanical safety disclaimer.
- Build the One-Tap Shareable Q&A / Roast Card comic PNG exporter (zero-API local character templates + Web Share / download).
- **Verification Gate:** Valid 17-character VIN decodes at `USD 0`, saves to garage, increments `diagnostic_count`, unlocks Dick's `Repeat Diagnostic` greeting, and exports a clean branded Roast Card PNG.

### Wave 4 — Modular In-Site Selfie Contest Station (Est. ~4–5 Days)
- Deploy `supabase/migrations/006_selfie_contests.sql` and build `src/features/selfie-contest/`.
- Implement 3D Photo Mode composer with Scooter (open SSO), V (opt-in Exclusive Circle + witty roast), and Dick (verified buyer `total_orders >= 1` + merch roast) gates.
- Add instant personal download/share, contest submission to `/admin` moderation queue, SSO upvoting gallery, and in-shop Winner Board.
- **Verification Gate:** Non-buyers are gated and roasted by Dick; V enforces opt-in circle logic; `/admin` approval publishes entries to the gallery; 1 vote per SSO user is enforced; top entry highlights as Winner.

### Wave 5 — Weekly Community Mad-Libs Skit Engine, `HardRToons` Sync & Official-API Social Pipeline (Est. ~5–7 Days)
- Deploy `supabase/migrations/007_skit_madlibs.sql` and build `src/features/skit-madlibs/` (`/admin` template builder, SSO blank submission with Veo 3.1 policy filters, SSO voting, `EpisodeManifest` JSON exporter with community writer credits).
- Build `POST /api/admin/episodes` sync into `public.episode_knowledge`, wiring zero-API local keyword matching into `staffDialogue.ts` plus an in-shop **Shop TV / Skit Archive** modal.
- Connect the 4 manually-created official social channels via official publishing APIs (or a single official multi-channel scheduler API) for weekly episode drops, cross-tags, `?dept=...&drop=...` deep links, and the weekly winning selfie shoutout.
- **Verification Gate:** Test skit contest exports a valid `EpisodeManifest` matching `d:\HardRToons`; syncing an episode causes Dick, V, and Scooter to quote the community gag locally; official-API dry-run schedules multi-channel posts with working 3D shop deep links.

---

## 7. Lean Monthly Operating Cost Estimate

- **Vercel Hosting:** Vercel Hobby (`USD 0/month`) during staging or Vercel Pro (`USD 20/month`) in production.
- **Supabase (Postgres, Auth SSO, Realtime, Storage):** Free (`USD 0/month`) -> Pro (`USD 25/month` as traffic and storage grow).
- **Domain:** ~`USD 1/month`.
- **Payments & Fulfillment:** Stripe `2.9% + USD 0.30` per native Hard R sale (Printful POD and Pirate Ship DIY labels carry `USD 0/month` fixed fees).
- **Minimal LLM Diagnostics Budget:** ~`USD 0` to `USD 5/month` (NHTSA VIN decode, normal NPC staff chat, `customer_memory`, and `episode_knowledge` stay `USD 0/month`).
- **Official Social Publishing API (Optional):** `USD 0/month` via direct platform APIs or ~`USD 15` to `USD 25/month` for an official multi-channel scheduler API.
