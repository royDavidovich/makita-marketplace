# Makita Marketplace

Price comparison tool for Makita power tools across authorized Israeli retailers.

Scrapes live prices from 7 stores, stores results in a local SQLite database, and presents a browsable catalog with side-by-side price comparison.

## What it does

- Browse the Makita tool catalog by category
- Compare prices across all authorized retailers for any tool
- Prices are refreshed automatically on a cron schedule, or on-demand via a protected API endpoint
- Retailers are configured in `config/stores.json` — adding a new store requires only a new entry there (no code changes)

## Authorized retailers

KSP, Makita Israel, MG Tools, Electro Slil, Brand Tools, Atlas Tools, Dror Tools

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 20, Express, TypeScript |
| Database | SQLite via Prisma |
| Scraper | Playwright (headless Chromium) |
| Frontend | React 18, Vite, TanStack Query, React Router v6, Tailwind CSS |
| Scheduling | node-cron |

## Project structure

```
backend/        Express API + Playwright scraper
frontend/       React SPA
config/
  stores.json   Retailer definitions (URLs, CSS selectors)
  tools.json    Tool catalog
```

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Backend

```bash
cd backend
cp .env.example .env          # edit DATABASE_URL / SCRAPE_SECRET / PORT
npm install
npx prisma migrate deploy     # creates the SQLite DB
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env          # set VITE_API_URL if backend is not on :3001
npm install
npm run dev
```

## Configuration

### `config/stores.json`

Each entry defines one retailer. Fields vary by store type:

- `searchUrlPattern` — URL with `{model_number}` placeholder (for URL-based search)
- `searchFormPageUrl` / `searchInputSelector` — for form-based search
- `productLinkSelector` — CSS selector that identifies product links on the results page
- `priceSelector` / `searchPagePriceSelector` — CSS selector for the price element

### `config/tools.json`

Manually curated list of Makita model numbers, names, and categories. The seeder loads this on every backend startup.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tools` | Paginated tool list (filterable by category / search) |
| GET | `/api/tools/:id` | Tool detail with latest prices per store |
| GET | `/api/categories` | All categories |
| GET | `/api/stores` | Active store names |
| POST | `/api/scrape/run` | Trigger a full scrape (requires `X-Scrape-Secret` header) |

## Triggering a manual scrape

```bash
curl -X POST http://localhost:3001/api/scrape/run \
  -H "X-Scrape-Secret: your-secret-here"
```

## Development

```bash
# backend tests
cd backend && npm test

# frontend lint
cd frontend && npm run lint
```
