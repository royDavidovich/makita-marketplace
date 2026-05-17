# REST API Contract: Makita Tools Price Comparison Marketplace

**Branch**: `001-price-comparison` | **Date**: 2026-03-01
**Base URL**: `/api`
**Format**: JSON request/response bodies. All responses include a top-level `data` key on success or `error` on failure.

---

## Public Endpoints

### GET /api/tools

Returns the full list of active tools with the lowest available price across all stores.

**Request**: No parameters required.

**Optional query params**:
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category (e.g. `Drills`) |
| `q` | string | Search by name or model number (substring match) |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "model_number": "DHP484Z",
      "name": "Makita 18V Brushless Combi Drill",
      "category": "Drills",
      "image_url": "https://...",
      "lowest_price": 459.00,
      "lowest_price_store": "Tool Station",
      "currency": "ILS",
      "listing_count": 3
    }
  ]
}
```

**Response 200 (empty catalog)**:
```json
{ "data": [] }
```

---

### GET /api/tools/:modelNumber

Returns a single tool's details plus all store price listings for that tool, sorted by price ascending.

**Path params**:
| Param | Type | Description |
|-------|------|-------------|
| `modelNumber` | string | Makita model number, e.g. `DHP484Z` |

**Response 200**:
```json
{
  "data": {
    "id": 1,
    "model_number": "DHP484Z",
    "name": "Makita 18V Brushless Combi Drill",
    "category": "Drills",
    "image_url": "https://...",
    "description": "Optional description",
    "listings": [
      {
        "store_id": 2,
        "store_name": "Tool Station",
        "price": 459.00,
        "currency": "ILS",
        "product_url": "https://www.toolstation.co.il/product/dhp484z",
        "is_available": true,
        "last_scraped_at": "2026-03-01T02:00:00Z"
      },
      {
        "store_id": 5,
        "store_name": "Ivory Tools",
        "price": 489.00,
        "currency": "ILS",
        "product_url": "https://www.ivory.co.il/...",
        "is_available": true,
        "last_scraped_at": "2026-03-01T02:00:00Z"
      }
    ]
  }
}
```

**Response 404**:
```json
{ "error": "Tool not found", "model_number": "XYZ123" }
```

---

### GET /api/categories

Returns the distinct list of tool categories present in the catalog.

**Response 200**:
```json
{
  "data": ["Drills", "Grinders", "Saws", "Sanders"]
}
```

---

## Operator Endpoints (Protected)

These endpoints are not exposed to the public. They require a `X-Scrape-Secret` header matching a server-side secret configured via environment variable. Requests without the correct header return `401`.

### POST /api/scrape/run

Triggers a full scrape of all active stores for all active tools. Runs asynchronously — the response confirms the job was started, not that it completed.

**Request headers**:
```
X-Scrape-Secret: <secret>
```

**Optional query params**:
| Param | Type | Description |
|-------|------|-------------|
| `modelNumber` | string | If provided, scrapes only this tool across all stores |

**Response 202** (accepted, scrape started):
```json
{
  "data": {
    "status": "started",
    "scope": "full",
    "started_at": "2026-03-01T14:30:00Z"
  }
}
```

**Response 401** (missing or wrong secret):
```json
{ "error": "Unauthorized" }
```

**Response 409** (scrape already in progress):
```json
{ "error": "A scrape is already running", "started_at": "2026-03-01T14:28:00Z" }
```

---

### GET /api/scrape/status

Returns the status of the most recent scrape run (scheduled or manual).

**Request headers**:
```
X-Scrape-Secret: <secret>
```

**Response 200**:
```json
{
  "data": {
    "status": "completed",
    "started_at": "2026-03-01T02:00:00Z",
    "completed_at": "2026-03-01T02:04:37Z",
    "tools_scraped": 87,
    "stores_scraped": 6,
    "errors": 2
  }
}
```

`status` values: `idle` | `running` | `completed` | `failed`

---

## Error Response Format

All error responses follow this shape:
```json
{
  "error": "Human-readable message",
  "<optional-field>": "<contextual detail>"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 202 | Accepted (async job started) |
| 400 | Bad request (invalid params) |
| 401 | Unauthorized (missing/wrong secret on operator endpoint) |
| 404 | Resource not found |
| 409 | Conflict (e.g. scrape already running) |
| 500 | Internal server error |
