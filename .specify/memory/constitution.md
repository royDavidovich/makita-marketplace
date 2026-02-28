# Makita Marketplace Constitution

## Core Principles

### I. Component-First UI
Build the UI as composable, reusable components. Each component has a single responsibility and is independently renderable. No shared mutable state between unrelated components.

### II. API-Driven Architecture
Frontend and backend communicate exclusively via a well-defined REST/JSON API. No direct database access from the frontend. API contracts are documented and versioned.

### III. Security by Default
All user input is validated on the server. Authentication is required for all non-public routes. Follow OWASP top-10 mitigations: sanitize inputs, use parameterized queries, enforce HTTPS, store passwords hashed.

### IV. Simplicity (YAGNI)
Build only what is required for the current feature. No speculative abstractions, no unused configuration options, no premature generalization. If it isn't needed now, don't build it.

## Technology Stack

- **Frontend**: React (with TypeScript)
- **Backend**: Node.js / Express (or equivalent)
- **Database**: Relational (PostgreSQL preferred) or document store — chosen per feature needs
- **Auth**: JWT or session-based; no rolling your own crypto
- **Styling**: CSS Modules or Tailwind — one approach per project, not mixed

## Development Workflow

- Features are spec'd before implementation begins
- Each feature has a spec → plan → tasks lifecycle
- No code is merged without passing linting and tests
- Breaking API changes require a version bump and migration note

## Governance

This constitution supersedes all other practices. Any deviation must be documented with a justification. Amendments require updating this file and noting the date.

All PRs must verify compliance with the principles above before merge.

**Version**: 1.0.0 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-01
