# Tasks: Makita Tools Price Comparison Marketplace

**Input**: Design documents from `/specs/001-price-comparison/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/rest-api.md ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure, tooling, and config files.

- [ ] T001 Create top-level directory structure: `backend/`, `frontend/`, `config/` with all subdirectories per plan.md
- [ ] T002 Initialize backend TypeScript/Node.js project — create `backend/package.json` (Express, Prisma, Playwright, node-cron, cors, dotenv) and `backend/tsconfig.json`
- [ ] T003 [P] Initialize frontend Vite+React+TypeScript project — create `frontend/package.json` (React 18, React Router v6, TanStack Query, Tailwind CSS) and `frontend/tsconfig.json`
- [ ] T004 [P] Configure backend ESLint + Prettier in `backend/.eslintrc.js` and `backend/.prettierrc`
- [ ] T005 [P] Configure frontend ESLint + Prettier in `frontend/.eslintrc.js` and `frontend/.prettierrc`
- [ ] T006 [P] Configure Tailwind CSS in `frontend/tailwind.config.js` and `frontend/postcss.config.js`
- [ ] T007 [P] Create `config/stores.json` with sample store entry (name, base_url, is_active fields)
- [ ] T008 [P] Create `config/tools.json` with 2–3 sample Makita tool entries (model_number, name, category, image_url, description)
- [ ] T009 [P] Create `backend/.env.example` and `frontend/.env.example` with documented variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure — DB schema, Express app, config sync, and React app shell. All user story work depends on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T010 Define Prisma schema in `backend/prisma/schema.prisma` — Tool, Store, and PriceListing models with all fields, relations, and unique constraints from data-model.md
- [ ] T011 Run initial Prisma migration (`prisma migrate dev --name init`) and verify `backend/prisma/migrations/` is generated
- [ ] T012 Implement config loader in `backend/src/config/loader.ts` — reads `config/stores.json` and `config/tools.json`, returns typed arrays
- [ ] T013 Implement DB seeder in `backend/src/config/seeder.ts` — upserts stores and tools from config into the database on startup; marks removed entries `is_active = false` without hard-deleting
- [ ] T014 [P] Set up Express app in `backend/src/app.ts` — CORS, JSON body parser, centralized error handler middleware, and route mounting stubs
- [ ] T015 [P] Create backend entry point `backend/src/index.ts` — connects to DB, runs seeder, starts Express server on configured port
- [ ] T016 [P] Scaffold React app shell in `frontend/src/main.tsx` and `frontend/src/App.tsx` — React Router `<BrowserRouter>`, global TanStack Query `<QueryClientProvider>`, placeholder routes for `/` and `/tools/:modelNumber`
- [ ] T017 [P] Implement typed API client in `frontend/src/services/api.ts` — typed `fetch` wrappers for `GET /api/tools`, `GET /api/tools/:modelNumber`, and `GET /api/categories`; base URL from `VITE_API_URL`

**Checkpoint**: Backend starts cleanly and seeds DB from config. Frontend renders app shell at `localhost:5173`.

---

## Phase 3: User Story 1 — Browse Tools on Main Page (Priority: P1) 🎯 MVP

**Goal**: Visitor sees the full tool catalog on the main page — each tool showing name, image, model number, category, and lowest available price.

**Independent Test**: Start backend + frontend, verify main page at `/` renders a grid of tools from `config/tools.json` with model numbers and prices (or empty-state message if no price listings exist yet).

### Implementation

- [ ] T018 Implement `GET /api/tools` route handler in `backend/src/api/tools.ts` — queries all active tools joined with their lowest available PriceListing price; supports optional `?category=` and `?q=` query params (substring match on name/model_number); returns response shaped per contracts/rest-api.md
- [ ] T019 Implement `GET /api/categories` route handler in `backend/src/api/categories.ts` — returns distinct category values from active tools
- [ ] T020 Mount `/api/tools` and `/api/categories` routes in `backend/src/app.ts`
- [ ] T021 [P] [US1] Create `PriceBadge` component in `frontend/src/components/PriceBadge.tsx` — formats a numeric price as NIS currency (₪), handles null/undefined with a "–" placeholder
- [ ] T022 [P] [US1] Create `LoadingState` component in `frontend/src/components/LoadingState.tsx` — skeleton card grid for the tool list loading state
- [ ] T023 [P] [US1] Create `ErrorState` component in `frontend/src/components/ErrorState.tsx` — error message with retry button
- [ ] T024 [P] [US1] Create `ToolCard` component in `frontend/src/components/ToolCard.tsx` — displays tool image, name, model number, category chip, and lowest price via `PriceBadge`; entire card is a React Router `<Link>` to `/tools/:modelNumber`
- [ ] T025 [US1] Implement `HomePage` in `frontend/src/pages/HomePage.tsx` — uses TanStack Query to fetch `/api/tools`; renders a responsive grid of `ToolCard` components; shows `LoadingState` while fetching, `ErrorState` on failure, and an empty-state message when the catalog has no tools; includes a category filter dropdown populated from `/api/categories`
- [ ] T026 [US1] Register `HomePage` at route `/` in `frontend/src/App.tsx`

**Checkpoint**: Main page fully functional — tool catalog visible with images, model numbers, and lowest prices.

---

## Phase 4: User Story 2 — Compare Prices Across Stores (Priority: P2)

**Goal**: Clicking a tool navigates to its comparison page showing all stores that carry it, sorted by price lowest-first.

**Independent Test**: Click any tool on the main page; verify the comparison page at `/tools/:modelNumber` renders a list of store rows sorted by price ascending, with store name and price visible. Verify that a tool carried by only one store shows an appropriate single-result message.

### Implementation

- [ ] T027 Implement `GET /api/tools/:modelNumber` route handler in `backend/src/api/tools.ts` — queries the tool by model number; joins all PriceListings with store name; sorts by price ascending; returns 404 with error body if tool not found; response shaped per contracts/rest-api.md
- [ ] T028 Mount updated route in `backend/src/app.ts` (if not already covered by T020)
- [ ] T029 [P] [US2] Create `StoreRow` component in `frontend/src/components/StoreRow.tsx` — displays store name, formatted price via `PriceBadge`, and a "View at Store" button; button links to `product_url` with `target="_blank" rel="noopener noreferrer"`; renders a "price unavailable" state when `is_available` is false
- [ ] T030 [US2] Implement `ComparisonPage` in `frontend/src/pages/ComparisonPage.tsx` — reads `:modelNumber` from route params; uses TanStack Query to fetch `/api/tools/:modelNumber`; renders tool header (name, image, model number, category) and a list of `StoreRow` components sorted by price; shows `LoadingState`, `ErrorState`, 404 message, and a "last scraped" timestamp from the most recent `last_scraped_at` value; shows a note when only one store carries the tool
- [ ] T031 [US2] Register `ComparisonPage` at route `/tools/:modelNumber` in `frontend/src/App.tsx`

**Checkpoint**: Full browse → compare flow works end-to-end. Click a tool card → comparison page shows all stores with prices.

---

## Phase 5: User Story 3 — Navigate to Store Product Page (Priority: P3)

**Goal**: Clicking a store entry opens the exact product URL in a new browser tab.

**Independent Test**: On the comparison page, click a "View at Store" button — verify the correct store product URL opens in a new tab. Verify listings with `is_available: false` show a "price unavailable" state with no broken link.

### Implementation

- [ ] T032 [US3] Harden `StoreRow` in `frontend/src/components/StoreRow.tsx` — add defensive check: only render the "View at Store" link when `product_url` is a non-empty string; show a disabled/greyed-out state for unavailable listings; confirm `rel="noopener noreferrer"` is present on all external links

**Checkpoint**: All three user stories fully functional. Browse → compare → navigate to store works end-to-end.

---

## Phase 6: Scraper & Operator Tools

**Purpose**: Implements the data pipeline that populates price listings. Required for real data; user story UIs can be built and tested with manually seeded data before this phase.

- [ ] T033 Implement `ScraperService` in `backend/src/services/scraper.ts` — launches Playwright headless browser; accepts a store config entry and a tool model number; navigates to the store, finds the product page, extracts price and product URL; returns structured result or marks `is_available: false` on failure; includes retry logic (max 2 retries) and closes browser on error
- [ ] T034 Implement store adapter pattern in `backend/src/services/scraper.ts` — each store in `config/stores.json` can carry an optional `selectors` object (`priceSelector`, `productUrlPattern`) so scraping logic is data-driven per store without code changes
- [ ] T035 Implement `PriceService` in `backend/src/services/prices.ts` — orchestrates full scrape: iterates all active stores × all active tools, calls `ScraperService`, upserts results into `PriceListing` table; tracks in-memory run status (idle/running/completed/failed) with start time, counts, and error count
- [ ] T036 Implement operator scrape endpoints in `backend/src/api/scrape.ts` — `POST /api/scrape/run` (protected by `X-Scrape-Secret` header, rejects if already running, accepts optional `?modelNumber=` for single-tool scrape, runs `PriceService` async, returns 202) and `GET /api/scrape/status` (returns current run state from `PriceService`)
- [ ] T037 Mount `/api/scrape` routes in `backend/src/app.ts`
- [ ] T038 Implement nightly scheduler in `backend/src/scheduler/index.ts` — node-cron job at `0 2 * * *` (02:00 nightly) that calls `PriceService`; exports a `startScheduler()` function called from `backend/src/index.ts`

**Checkpoint**: Manual scrape via `curl -X POST .../api/scrape/run -H "X-Scrape-Secret: ..."` populates price listings and they appear on the comparison page.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Add responsive Tailwind breakpoints to `ToolCard` in `frontend/src/components/ToolCard.tsx` — grid stacks to single column on small screens, image scales correctly
- [ ] T040 [P] Add responsive Tailwind breakpoints to `ComparisonPage` in `frontend/src/pages/ComparisonPage.tsx` — store rows readable on small screens, price and store name remain visible
- [ ] T041 [P] Add `<title>` and meta description to `HomePage` and `ComparisonPage` via `frontend/src/App.tsx` or a `<Helmet>`-equivalent — e.g. "Makita Price Comparison" and "Compare [Tool Name] prices across authorized stores"
- [ ] T042 [P] Add `stores` config section note to `backend/src/config/loader.ts` — log a warning on startup if `config/stores.json` has no active entries, and if `config/tools.json` has no entries
- [ ] T043 Validate full setup against `specs/001-price-comparison/quickstart.md` — install deps, configure `.env`, run migration, seed, trigger manual scrape, verify main page and comparison page render correctly with real data

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion; can proceed in priority order
- **Scraper (Phase 6)**: Depends on Phase 2 (DB schema); independent of US phases — can be built in parallel with US2/US3 if desired
- **Polish (Phase 7)**: Depends on all user story phases completing

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 only — no dependency on US2 or US3
- **US2 (P2)**: Requires Phase 2 + US1 (needs `ToolCard` link and comparison route)
- **US3 (P3)**: Requires US2 (`StoreRow` hardening is an extension of US2 work)

### Within Each Phase

- Models (Prisma schema) before services
- Services before API route handlers
- API route handlers before frontend pages
- Shared components (`PriceBadge`, `LoadingState`, `ErrorState`) before pages that use them

### Parallel Opportunities

- T002 ↔ T003 — backend and frontend init run in parallel
- T004 ↔ T005 ↔ T006 — all linting/tooling setup in parallel
- T007 ↔ T008 — config JSON files in parallel
- T014 ↔ T015 ↔ T016 ↔ T017 — Express app, entry point, React shell, API client in parallel (after T010–T013)
- T021 ↔ T022 ↔ T023 ↔ T024 — all US1 components in parallel (after T020)
- T029 (StoreRow) — can be built in parallel with T027–T028 (backend endpoint)
- T033 ↔ T035 scraper work is largely sequential, but T036 (endpoints) can start once T035 interface is defined

---

## Parallel Example: Phase 3 (US1)

```text
After T020 (routes mounted), launch in parallel:
  T021 — PriceBadge component
  T022 — LoadingState component
  T023 — ErrorState component
  T024 — ToolCard component

Then sequentially:
  T025 — HomePage (uses all of the above)
  T026 — Register route
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (main page with catalog)
4. **STOP and VALIDATE**: Seed config, verify tool grid renders with model numbers and prices
5. Demo-ready: static catalog works without a running scraper

### Incremental Delivery

1. Setup + Foundational → project boots, DB seeded from config
2. US1 → main page shows tool catalog (prices shown as "–" until scraper runs)
3. US2 → comparison page per tool
4. US3 → store link hardening
5. Phase 6 (Scraper) → real price data flows in; manual trigger available
6. Phase 7 (Polish) → mobile responsiveness, meta tags, final validation

---

## Notes

- [P] tasks = different files, no blocking dependencies between them
- [Story] label maps each task to its user story for traceability
- US1 and US2/US3 can be demonstrated with manually seeded `PriceListing` rows before the scraper is built
- Each phase ends with a checkpoint — validate that phase independently before moving on
- Commit after each task or logical group
