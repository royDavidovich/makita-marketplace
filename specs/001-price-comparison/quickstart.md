# Quickstart: Makita Tools Price Comparison Marketplace

**Branch**: `001-price-comparison` | **Date**: 2026-03-01

> **Windows note**: Use separate commands instead of `&&`. Examples below use PowerShell syntax.

---

## Prerequisites

- Node.js 20+
- npm
- No database server required (SQLite is file-based)

---

## Setup

### 1. Install dependencies

```powershell
# Terminal 1 — backend
cd backend
npm install

# Terminal 2 — frontend
cd frontend
npm install
```

### 2. Configure environment

Copy the example files and edit if needed:

```powershell
# Backend
cd backend
copy .env.example .env

# Frontend
cd frontend
copy .env.example .env
```

`backend/.env` contents:
```env
DATABASE_URL="file:./data/makita.db"
SCRAPE_SECRET="your-secret-here"
PORT=3001
```

`frontend/.env` contents:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Configure stores and tools

Edit `config/stores.json` — add authorized store URLs:
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

```powershell
cd backend
npx prisma migrate dev --name init
```

The seeder runs automatically on startup — no separate seed command needed.

---

## Running in Development

Open **two terminals**:

```powershell
# Terminal 1 — backend (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

## Running a Scrape

**Nightly schedule**: The scraper runs automatically at 02:00 every night.

**Manual trigger** (PowerShell):
```powershell
Invoke-WebRequest -Method POST http://localhost:3001/api/scrape/run `
  -Headers @{ "X-Scrape-Secret" = "your-secret-here" }
```

**Scrape a single tool** (PowerShell):
```powershell
Invoke-WebRequest -Method POST "http://localhost:3001/api/scrape/run?modelNumber=DHP484Z" `
  -Headers @{ "X-Scrape-Secret" = "your-secret-here" }
```

**Check scrape status** (PowerShell):
```powershell
Invoke-WebRequest http://localhost:3001/api/scrape/status `
  -Headers @{ "X-Scrape-Secret" = "your-secret-here" }
```

> If you have curl installed (curl.exe on Windows 10+), you can also use:
> ```powershell
> curl.exe -X POST http://localhost:3001/api/scrape/run -H "X-Scrape-Secret: your-secret-here"
> ```

---

## Running Tests

```powershell
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

---

## Build for Production

```powershell
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
# Output: frontend/dist/ — serve as static files
```
