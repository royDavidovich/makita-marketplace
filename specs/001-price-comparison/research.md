# Research: Makita Tools Price Comparison Marketplace

**Branch**: `001-price-comparison` | **Date**: 2026-03-01
**Purpose**: Resolve all technical decisions before design and implementation

---

## Decision 1: Web Scraping Technology

**Decision**: Playwright (Node.js, headless Chromium)

**Rationale**:
Israeli tool e-commerce retailers typically serve product pages via client-side rendered SPAs (React/Angular/Vue) or hybrid SSR+hydration setups. Plain HTML scrapers (Cheerio + Axios) will fail silently when prices are injected after JS execution. Playwright launches a real browser, executes JavaScript, waits for DOM elements to stabilize, and reliably extracts prices regardless of rendering strategy. Since scraping runs nightly on a handful of stores (~5–15), the performance overhead of a headless browser is entirely acceptable — the daily batch is not latency-sensitive.

**Alternatives Considered**:
- **Cheerio + Axios** — Fast and lightweight, but will silently produce wrong or empty results on JS-heavy product pages. Rejected due to reliability risk.
- **Puppeteer** — Functionally near-identical to Playwright. Playwright offers a cleaner API, better cross-browser support, and is more actively maintained.
- **Commercial scraping API** — Adds cost and external dependency. Overkill for a handful of known, stable URLs. Rejected per YAGNI.

---

## Decision 2: Database and ORM

**Decision**: SQLite + Prisma ORM

**Rationale**:
This is a personal project with a small, stable dataset (hundreds of tools, handful of stores, one price record per tool-store pair updated daily). SQLite is a single-file embedded database — no server to install, configure, or maintain. Deployment is as simple as including the `.db` file or generating it on first run. Prisma supports SQLite natively and provides the same type-safe TypeScript client and migration workflow as with PostgreSQL, so the development experience is identical while operational complexity drops to near-zero. Growth for this project is expected to be moderate and data volume will remain well within SQLite's proven limits.

**Alternatives Considered**:
- **PostgreSQL** — More powerful and production-grade. Overkill for a personal project with no concurrent write workload and moderate data volume. Requires a running server process.
- **Raw `better-sqlite3`** — Maximum performance, but no type generation or migration tooling. More boilerplate.

---

## Decision 3: Frontend Data Fetching

**Decision**: TanStack Query (React Query v5)

**Rationale**:
Tool catalog and price listings are classic server state: they live on the server, change on a schedule (nightly scrape), and are shared across users. TanStack Query manages fetching, caching, background refetch, and loading/error states declaratively. This eliminates the need for custom state management — the entire frontend state requirement is covered by TanStack Query + React's built-in local state for UI interactions.

**Alternatives Considered**:
- **SWR** — Similar in concept but fewer features (no devtools, less granular invalidation).
- **Plain `useEffect` + `fetch`** — Works but requires manual cache management and loading/error state boilerplate. Rejected as needless complexity.
- **Redux Toolkit Query** — Over-engineered for a project with no global client state. Rejected per YAGNI.

---

## Decision 4: Price Refresh Scheduling

**Decision**: `node-cron` (embedded in the backend process) + manual trigger endpoint

**Rationale**:
The spec requires a daily nightly price refresh. `node-cron` runs scheduled jobs within the Node.js process using cron syntax. In addition, a dedicated backend endpoint (`POST /api/scrape/run`) allows the operator to trigger a full scrape manually at any time — useful for checking mid-day price changes without waiting for the nightly schedule. Both the scheduled and manual paths invoke the same underlying ScraperService, ensuring identical behavior. No external infrastructure (separate worker, message queue, task runner) is needed.

**Manual trigger design**:
- `POST /api/scrape/run` — triggers a full scrape immediately, returns a job status or confirmation
- This endpoint is protected (not exposed publicly) to prevent abuse — e.g., requires a secret header or is bound only to localhost
- Optionally accepts a `modelNumber` query param to scrape a single tool rather than the full catalog

**Alternatives Considered**:
- **Bull / BullMQ with Redis** — Robust job queue with retry logic and monitoring. Overkill for a daily batch plus occasional manual runs. Rejected per YAGNI.
- **OS-level cron** — Decoupled but no easy manual trigger and requires deployment-level configuration outside the codebase.

---

## Decision 5: Styling Approach

**Decision**: Tailwind CSS — desktop-first with responsive mobile support

**Rationale**:
The primary audience is desktop users (comparing prices on a marketplace is typically a desktop activity), but the site must also work correctly on mobile screens. Tailwind CSS makes responsive design straightforward with its breakpoint utilities — the default styles target desktop and `sm:`/`md:` modifiers handle smaller screens. The constitution permits Tailwind as the chosen styling approach, and its utility-first model allows rapid UI development without custom CSS files.

**Responsiveness approach**: Design for desktop first. Use Tailwind's responsive prefixes to adapt layouts for mobile — e.g., stack columns on small screens, collapse price tables into card views. The site must be fully usable on mobile but is not architected mobile-first.

**Alternatives Considered**:
- **CSS Modules** — Also permitted by constitution. More explicit but slower for building a UI-dense comparison interface.

---

## Decision 6: Tool and Store Configuration

**Decision**: JSON config files (`config/stores.json` and `config/tools.json`) at repository root

**Rationale**:
FR-007 requires store URLs to be configurable without code changes. FR-011 requires a manually curated tool catalog. JSON files are human-readable, version-controlled, and easily edited. The backend loads these on startup to seed/sync the SQLite database. Simplest solution that satisfies both requirements.

**Alternatives Considered**:
- **Database-backed admin UI** — Significantly larger scope. Rejected per YAGNI.
- **YAML files** — Equivalent to JSON but requires an extra parsing library. JSON is natively supported.

---

## Summary of All Decisions

| Area | Decision | Key Reason |
|------|----------|------------|
| Scraping | Playwright (headless Chromium) | Handles JS-rendered pages reliably |
| Database | SQLite + Prisma ORM | Personal project, zero-server simplicity, Prisma type-safety |
| Frontend data | TanStack Query v5 | Declarative server-state management, no Redux needed |
| Scheduling | node-cron + manual `POST /api/scrape/run` | Nightly auto + on-demand operator trigger |
| Styling | Tailwind CSS (desktop-first, responsive for mobile) | Rapid UI development, mobile support without mobile-first architecture |
| Configuration | JSON files in `config/` | Version-controlled, no admin UI needed |
