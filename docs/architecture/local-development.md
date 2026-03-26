---
sidebar_position: 11
title: Local Development
description: Setting up and running ViralToby locally
slug: /architecture/local-development
---

# Local Development

ViralToby runs locally with a full-stack setup: Vite dev server for the frontend, FastAPI for the backend, and a Supabase branch database for isolated data.

## Architecture

```
LOCAL DEVELOPMENT:

  Browser
    |
    v
  Vite Dev Server (:5173)  --proxy-->  FastAPI Backend (:8000)
                                            |
                                            v
                                       Supabase Branch DB
                                       (direct :5432, dev-local)
                                            |
                                            v
                                       Supabase Storage + Auth + Realtime
                                       (shared with production project)


PRODUCTION:

  Browser
    |
    v
  FastAPI (:8080) serves /dist (static frontend)
    |
    v
  Supabase Production DB
  (pooler :6543, PgBouncer transaction mode)
```

**Key difference:** Local dev uses a **direct connection** (port 5432) to the branch DB with a small connection pool (5+5). Production uses **PgBouncer** (port 6543) with a larger pool (40+35).

## Prerequisites

- **Node.js** (18+) and npm
- **Python 3.11+** with a virtual environment
- **FFmpeg** installed and on PATH
- `.env` file (production config, checked into git or provided)
- `.env.local` file (local overrides, gitignored)

## Quick Start

```bash
# 1. Verify prerequisites
npm run dev:setup

# 2. Seed test data into the branch database
npm run dev:seed

# 3. Start full stack (frontend + backend concurrently)
npm run dev:local
```

After starting, the frontend is at `http://localhost:5173` and the backend at `http://localhost:8000`.

## Environment Files

### `.env` (Production)

Loaded first by `app/__init__.py`. Contains production credentials for all services. This file is used by both local dev and Railway.

### `.env.local` (Local Overrides)

Loaded second with `override=True`, so local values take precedence. This file is **gitignored** and never deployed.

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Branch direct URL (port 5432) | Isolated dev database |
| `VITE_API_URL` | `http://localhost:8000` | Frontend API target |
| `VITE_SUPABASE_URL` | `https://csfbpglduirrwbzlmkij.supabase.co` | Frontend Auth + Realtime on branch |
| `VITE_SUPABASE_ANON_KEY` | Branch anon key | Auth JWT signing for branch |

:::danger Never Use Production DATABASE_URL Locally
The `.env.local` `DATABASE_URL` must always point to the **branch** database (port 5432, ref `csfbpglduirrwbzlmkij`). Using the production URL locally risks accidental data corruption.
:::

## Dev Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev:local` | `concurrently "backend" "frontend"` | Full stack: backend (:8000) + frontend (:5173) |
| `npm run dev:backend-only` | `uvicorn app.main:app` | Backend only, logs to `logs/backend.log` |
| `npm run dev` | `vite` | Frontend only (Vite dev server) |
| `npm run dev:seed` | `python3 scripts/seed_dev.py` | Seed test data into branch DB |
| `npm run dev:seed-clean` | `python3 scripts/seed_clean.py` | Remove all seeded data |
| `npm run dev:setup` | `python3 scripts/setup_check.py` | Verify prerequisites (venv, node_modules, .env.local, ports) |

## Supabase Dev Branch

| Property | Value |
|----------|-------|
| **Branch name** | `dev-local` |
| **Branch ref** | `csfbpglduirrwbzlmkij` |
| **Parent project** | `kzsbyzroknbradzyjvrc` (production) |
| **Connection** | Direct (port 5432), no PgBouncer |
| **Schema** | Full copy of production schema |
| **Data** | Empty by default -- use `npm run dev:seed` |

The branch shares Supabase Auth and Storage with the parent project. Auth tokens work across branches (same Supabase project). Schedulers and Toby run safely on the branch with isolated data.

## Debugging Workflow

### Start the Backend

```bash
npm run dev:backend-only
# Backend starts on :8000, logs to logs/backend.log
```

### Hit Endpoints

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v2/brands -H "Authorization: Bearer <token>"
```

### Read Logs

```bash
# Read the backend log file
cat logs/backend.log

# Or tail it for live output
tail -f logs/backend.log
```

### Query the Dev Database

Use the Supabase MCP with the **branch** project ID:

```sql
-- Query the dev branch
-- Project ID: csfbpglduirrwbzlmkij
SELECT * FROM brands LIMIT 5;
SELECT * FROM toby_state WHERE enabled = true;
```

To query the **production** database for comparison:

```sql
-- Project ID: kzsbyzroknbradzyjvrc
SELECT count(*) FROM generation_jobs;
```

### Stop the Server

```bash
lsof -ti:8000 | xargs kill
```

### Reset Data

```bash
npm run dev:seed-clean   # Remove all seeded data
npm run dev:seed         # Re-populate with fresh test data
```

## Two Databases: Keeping Schema in Sync

There are two databases: **production** (`kzsbyzroknbradzyjvrc`) and **branch** (`csfbpglduirrwbzlmkij`). Schema changes must reach both.

### How Migrations Work

```
                  run_migrations() in db_connection.py
                           |
              +------------+------------+
              |                         |
     Railway deploy                Local dev start
     (production DB)               (branch DB)
              |                         |
              v                         v
     Migrations auto-run          Migrations auto-run
     on server startup            on server startup
```

`init_db()` runs on every server start:
1. `Base.metadata.create_all()` creates new tables that don't exist
2. `run_migrations()` runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for new columns

### Adding a Database Change

1. Add the migration SQL to `run_migrations()` in `app/db_connection.py`:

```python
def run_migrations():
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_column VARCHAR DEFAULT 'value'"
        ))
        conn.commit()
```

2. Update the SQLAlchemy model in `app/models/`:

```python
class MyModel(Base):
    new_column = Column(String, default="value")
```

3. Test locally: `npm run dev:local` -- migration auto-applies to the branch DB
4. Push to main -- migration auto-applies to production on Railway deploy

### Schema Drift Recovery

If the branch schema drifts too far from production:

```bash
pg_dump "$PROD_DB_URL" --schema-only | psql "$DEV_DB_URL"
```

This copies the production schema to the branch without data.

## Rules

:::warning Local Development Rules
1. **Always test locally before pushing** -- push to `main` deploys immediately to Railway
2. **Never use the production DATABASE_URL in `.env.local`** -- always use the branch URL
3. **Branch data is disposable** -- `npm run dev:seed-clean && npm run dev:seed` resets everything
4. **Auth tokens work across branches** -- you can log in with your real Supabase account on the branch
5. **All schedulers run on branch data** -- Toby, publishers, analytics all use the isolated branch DB
:::
