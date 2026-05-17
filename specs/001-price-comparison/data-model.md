# Data Model: Makita Tools Price Comparison Marketplace

**Branch**: `001-price-comparison` | **Date**: 2026-03-01

---

## Entities

### Tool

Represents a Makita product in the manually curated catalog.

| Field | Type | Notes |
|-------|------|-------|
| `id` | Integer (PK, auto-increment) | Internal identifier |
| `model_number` | String (unique) | Canonical Makita model code, e.g. `DHP484Z` — used to match listings across stores |
| `name` | String | Human-readable product name, e.g. `Makita 18V Cordless Drill` |
| `category` | String | Product category, e.g. `Drills`, `Saws`, `Grinders` |
| `description` | String (nullable) | Optional short description |
| `image_url` | String (nullable) | URL to product image (sourced from Makita site or a store) |
| `is_active` | Boolean (default: true) | Soft-disable a tool without removing it from the catalog |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last modification timestamp |

**Validation rules**:
- `model_number` must be non-empty and unique across all tools
- `name` must be non-empty
- `category` must be non-empty

---

### Store

Represents a pre-approved authorized retailer.

| Field | Type | Notes |
|-------|------|-------|
| `id` | Integer (PK, auto-increment) | Internal identifier |
| `name` | String | Display name shown to users, e.g. `Tool Station` |
| `base_url` | String (unique) | Root URL of the store, e.g. `https://www.toolstation.co.il` |
| `is_active` | Boolean (default: true) | Inactive stores are excluded from scraping and display |
| `created_at` | DateTime | Record creation timestamp |

**Validation rules**:
- `name` must be non-empty
- `base_url` must be a valid URL and unique across all stores
- Only stores with `is_active = true` are scraped and displayed

---

### PriceListing

Represents a tool available at a specific store, including the scraped price and direct product URL.

| Field | Type | Notes |
|-------|------|-------|
| `id` | Integer (PK, auto-increment) | Internal identifier |
| `tool_id` | Integer (FK → Tool.id) | The tool this listing belongs to |
| `store_id` | Integer (FK → Store.id) | The store this listing belongs to |
| `price` | Decimal (10, 2) | Scraped price in NIS |
| `currency` | String (default: `ILS`) | Currency code (always ILS for this project) |
| `product_url` | String | Direct URL to the product page on the store's website |
| `is_available` | Boolean | `true` if the product was found and price was scraped successfully; `false` if scraper could not locate it |
| `last_scraped_at` | DateTime | Timestamp of the most recent scrape attempt for this listing |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Constraints**:
- `(tool_id, store_id)` — unique composite index; one listing per tool per store
- `price` must be > 0 when `is_available = true`
- `product_url` must be non-empty when `is_available = true`

---

## Relationships

```text
Tool ─────────── has many ──────────── PriceListing
Store ────────── has many ──────────── PriceListing
PriceListing ─── belongs to one ────── Tool
PriceListing ─── belongs to one ────── Store
```

---

## State Transitions: PriceListing

```text
[Not Yet Scraped]
        │
        ▼ scraper runs
  is_available = true   ←──── price found, URL extracted
        │
        ▼ next scrape attempt
  is_available = true   (price updated, last_scraped_at refreshed)
        │   or
  is_available = false  (product gone / page not found)
```

A `PriceListing` record always exists once a tool-store pair is first scraped. The `is_available` flag is updated on every scrape run — it does not cascade delete.

---

## Configuration Seed Sources

The database is seeded/synced from two JSON config files:

**`config/tools.json`** — operator-maintained tool catalog:
```json
[
  {
    "model_number": "DHP484Z",
    "name": "Makita 18V Brushless Combi Drill",
    "category": "Drills",
    "image_url": "https://...",
    "description": "Optional description"
  }
]
```

**`config/stores.json`** — authorized store list:
```json
[
  {
    "name": "Tool Station",
    "base_url": "https://www.toolstation.co.il",
    "is_active": true
  }
]
```

On startup, the backend syncs these files to the database — adding new entries, updating changed fields, and marking removed entries as `is_active = false` (never hard-deletes).
