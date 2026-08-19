# Equipment Cleaning Log

A small full-stack app for logging equipment cleaning events with a full field-level
audit trail: PostgreSQL, a Node/TypeScript/Express API, and a React/TypeScript front-end.

## Stack

- **Database:** PostgreSQL. Schema lives in `backend/db/schema.sql` and is applied with a
  small migration script (see below) rather than a heavier migration framework.
- **API:** Node.js + TypeScript + Express, talking to Postgres with the `pg` driver and
  hand-written parameterized SQL (no ORM — see `NOTES.md` for why).
- **Front-end:** React + TypeScript, built with Vite. Plain `fetch`, no state library.



## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally, **or** Docker (see the one-command option below)

## Option A: run everything with Docker

```bash
docker compose up --build
```

This starts Postgres, runs the schema migration, seeds a couple of demo records, and
starts the API on `http://localhost:4000` and the front-end on `http://localhost:5173`.

## Option B: run it locally

### 1. Database

Create a database and a user (adjust names/password as you like):

```bash
psql -U postgres -c "CREATE USER cleaning_user WITH PASSWORD 'cleaning_pass' CREATEDB;"
psql -U postgres -c "CREATE DATABASE cleaning_log OWNER cleaning_user;"
```

### 2. API

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL if yours differs
npm install
npm run db:migrate        # applies backend/db/schema.sql
npm run db:seed           # optional: adds a couple of equipment + cleaning records
npm run dev                # http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

### 3. Front-end

```bash
cd frontend
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173`. Pick a piece of equipment on the left, add or edit a
cleaning record, and open a record's "View" action to see its audit trail.

There's a "Acting as" field in the header — since there's no real login, this value is
sent as the `x-current-user` header and is what shows up as `cleanedBy`'s and the audit
trail's "who".

## Running tests

```bash
cd backend
cp .env.test.example .env.test   # if you don't already have one, point at a test DB
npm test
```

`npm test` migrates the test database (`.env.test`) before running, so point
`DATABASE_URL` in `.env.test` at a database you're fine wiping — it's cleared before the
suite runs.

## API overview

All responses are `{ "data": ... }`, with `{ "data": [...], "pagination": {...} }` for
the paginated list endpoint. Errors are `{ "error": string, "details"?: [...] }`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/equipment` | List equipment. `?status=active\|retired` to filter. |
| POST | `/api/equipment` | Create equipment. |
| GET | `/api/equipment/:id` | Get one. |
| PATCH | `/api/equipment/:id` | Update. |
| DELETE | `/api/equipment/:id` | Delete. |
| GET | `/api/equipment/:equipmentId/cleaning-records` | Paginated list. `?page=&pageSize=&status=`. |
| POST | `/api/equipment/:equipmentId/cleaning-records` | Create a cleaning record. |
| GET | `/api/cleaning-records/:id` | Get one. |
| PATCH | `/api/cleaning-records/:id` | Update; writes an audit entry for changed fields. |
| GET | `/api/cleaning-records/:id/audit-log` | Field-level change history, newest first. |

Send `x-current-user: <name>` on writes to control who shows up as the audit "who" —
otherwise it falls back to `"system"`.

## Project layout

```
backend/
  db/schema.sql          -- the whole schema, safely re-runnable
  scripts/migrate.ts      -- applies db/schema.sql
  scripts/seed.ts          -- demo data
  src/
    db/                   -- repositories: parameterized SQL, one file per table
    routes/               -- Express routers
    services/audit.ts      -- the old->new diff logic
    validation.ts           -- zod schemas
  tests/

frontend/
  src/
    api/client.ts          -- thin fetch wrapper
    components/
    App.tsx
```

See `NOTES.md` for the reasoning behind these choices and what's deliberately left out.
