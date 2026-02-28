# Quickstart: Makita Tools Price Comparison Marketplace

**Branch**: `001-price-comparison` | **Date**: 2026-03-01

---

## Prerequisites

- Node.js 20+
- npm or pnpm
- No database server required (SQLite is file-based)

---

## Setup

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

Create `backend/.env`:
```env
DATABASE_URL="file:./data/makita.db"
SCRAPE_SECRET="your-secret-here"
PORT=3001
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Configure stores and tools

Edit `config/stores.json` — add the authorized store URLs:
```json
[
  {
    "name": "Store Name",
    "base_url": "https://www.example-store.co.il",
    "is_active": true
  }
]
```

Edit `config/tools.json` — add the tool catalog:
```json
[
  {
    "model_number": "DHP484Z",
    "name": "Makita 18V Brushless Combi Drill",
    "category": "Drills",
    "image_url": "https://...",
    "description": ""
  }
]
```

### 4. Initialize the database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed        # syncs config/stores.json and config/tools.json into the DB
```

---

## Running in Development

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Running a Scrape

**Nightly schedule**: The scraper runs automatically at 02:00 every night (configurable in `backend/src/scheduler/`).

**Manual trigger** (any time):
```bash
curl -X POST http://localhost:3001/api/scrape/run \
  -H "X-Scrape-Secret: your-secret-here"
```

**Scrape a single tool**:
```bash
curl -X POST "http://localhost:3001/api/scrape/run?modelNumber=DHP484Z" \
  -H "X-Scrape-Secret: your-secret-here"
```

**Check scrape status**:
```bash
curl http://localhost:3001/api/scrape/status \
  -H "X-Scrape-Secret: your-secret-here"
```

---

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## Build for Production

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
# Output: frontend/dist/ — serve as static files
```
