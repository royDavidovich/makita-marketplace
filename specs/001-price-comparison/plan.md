# Implementation Plan: Makita Tools Price Comparison Marketplace

**Branch**: `001-price-comparison` | **Date**: 2026-03-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-price-comparison/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a public-facing price comparison marketplace for Makita tools. A manually-curated tool catalog is scraped nightly from a pre-approved list of authorized Israeli retailer websites. Users browse tools on the main page (with lowest price shown) and click through to a per-tool comparison page showing all store prices sorted lowest-first, with direct links to each store's product page opening in a new tab.

## Technical Context

**Language/Version**: TypeScript — Node.js 20 (backend) + React 18 (frontend)
**Primary Dependencies**: Express, Prisma (SQLite), Playwright, TanStack Query, React Router v6, Tailwind CSS, node-cron
**Storage**: SQLite (via Prisma ORM)
**Testing**: Jest + Supertest (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Web browser — desktop-first with responsive mobile support
**Project Type**: web-service (full-stack web application)
**Performance Goals**: Main page renders tool catalog in under 3 seconds; comparison page loads in under 1 second (served from pre-scraped DB data)
**Constraints**: Price data must not be staler than 24 hours; single-server deployment; public visitors always see pre-scraped data (no on-demand scraping per visitor request); operator can trigger a manual scrape at any time via a protected endpoint
**Scale/Scope**: ~100s of tools, handful of authorized stores (~5–15), one full scrape per day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First UI | ✅ Pass | React components are composable and independently renderable; no shared mutable state across unrelated components |
| II. API-Driven Architecture | ✅ Pass | Frontend communicates with backend exclusively via REST/JSON API; no direct DB access from browser |
| III. Security by Default | ✅ Pass | No public write endpoints; authorized store list is server-controlled; no user-generated input beyond URL navigation |
| IV. Simplicity (YAGNI) | ✅ Pass | No admin dashboard, no auth, no real-time scraping, no CDN — only what the spec requires |
| Tech Stack Compliance | ✅ Pass | React/TypeScript frontend, Node/Express backend, PostgreSQL, Tailwind CSS — all per constitution |

No violations. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-price-comparison/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── rest-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/             # Express route handlers (tools, health)
│   ├── services/        # ScraperService, PriceService
│   ├── scheduler/       # node-cron daily scrape job
│   └── config/          # Loader for stores.json + tools.json
├── prisma/
│   └── schema.prisma    # DB schema (Tool, Store, PriceListing)
└── tests/
    ├── integration/     # Supertest API endpoint tests
    └── unit/            # Service unit tests

frontend/
├── src/
│   ├── components/      # ToolCard, StoreRow, PriceBadge, LoadingState, ErrorState
│   ├── pages/           # HomePage, ComparisonPage
│   └── services/        # API client (typed fetch wrappers)
└── tests/               # Vitest + React Testing Library

config/
├── stores.json          # Authorized store list (name, base_url, active)
└── tools.json           # Manually curated tool catalog (model_number, name, category, image_url)
```

**Structure Decision**: Option 2 (Web application) — separate `backend/` and `frontend/` directories with a shared `config/` directory at repo root for operator-managed configuration files. Backend exposes a REST API; frontend is a separate React SPA.
