---
sidebar_position: 12
title: Deployment
description: Railway deployment and CI/CD
slug: /architecture/deployment
---

# Deployment

ViralToby deploys automatically to Railway on every push to `main`. The build produces a Docker image that serves both the FastAPI backend and the pre-built Vite frontend.

## Deployment Platform

| Property | Value |
|----------|-------|
| **Platform** | Railway |
| **Trigger** | Push to `main` branch |
| **Build** | Docker (via `Dockerfile`) |
| **Runtime** | Python 3.11+ with Node.js (for Konva carousel rendering) |
| **Port** | 8080 (production) |

## Railway Configuration

`railway.json`:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile",
    "useDockerfile": true,
    "dockerfileBuildArgs": {
      "VITE_SUPABASE_URL": "${{VITE_SUPABASE_URL}}",
      "VITE_SUPABASE_ANON_KEY": "${{VITE_SUPABASE_ANON_KEY}}"
    }
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "overlapSeconds": 60,
    "drainingSeconds": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `healthcheckPath` | `/health` | Railway pings this endpoint to verify the server is alive |
| `healthcheckTimeout` | 300s | 5-minute window for the server to become healthy after deploy |
| `overlapSeconds` | 60s | Old instance stays alive for 60s while new instance spins up |
| `drainingSeconds` | 30s | Active connections get 30s to complete before shutdown |
| `restartPolicyType` | `ON_FAILURE` | Auto-restart on crashes |
| `restartPolicyMaxRetries` | 5 | Maximum restart attempts before giving up |

## Build Process

```
Push to main
    |
    v
Railway detects change, starts build
    |
    v
Docker build:
  1. npm install + npm run build  -->  /dist (frontend static files)
  2. pip install -r requirements.txt
  3. Copy app/ and dist/ into image
    |
    v
Railway deploys new container
    |
    v
Startup:
  1. uvicorn app.main:app --host 0.0.0.0 --port 8080
  2. /health endpoint becomes available (no DB, instant 200)
  3. Background thread: init_db() + run_migrations()
  4. Background thread: startup recovery tasks
  5. APScheduler starts (if this worker wins the lock)
    |
    v
Railway health check passes --> old container drained
```

### Frontend Build

Vite builds the React frontend at Docker build time. The `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are injected as build args so they're baked into the static JavaScript bundle:

```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build
```

At runtime, FastAPI serves the `/dist` directory:
- `/assets/*` -- hashed static files (long cache)
- `/` and `/*` -- SPA catch-all returns `index.html` (no-cache headers)

## Health Endpoint

```python
@app.get("/health")
async def health_check():
    """Always returns 200 instantly. No DB call."""
    return Response(
        content='{"status":"healthy","timestamp":"..."}',
        status_code=200,
        media_type="application/json",
    )
```

:::info Why No DB in Health Check
The health endpoint intentionally avoids any database call. During Supabase SSL hiccups, synchronous DB operations in an async handler block the event loop, causing the health check to hang and triggering Railway to restart the container. The health endpoint must always respond instantly.
:::

A separate **deep health check** at `GET /api/system/health-check` tests DB connectivity, storage access, and external API reachability. This is for debugging, not for Railway's readiness probe.

## Worker Election

On multi-worker deployments (multiple uvicorn workers or Railway replicas), only one worker should run background jobs. This is enforced with a file lock:

```python
_scheduler_lock_path = Path("/tmp/.viraltoby_scheduler.lock")
_scheduler_lock_file = open(_scheduler_lock_path, "w")
try:
    fcntl.flock(_scheduler_lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    _is_scheduler_worker = True  # This worker runs APScheduler
except (IOError, OSError):
    _is_scheduler_worker = False  # Another worker already holds the lock
```

The elected worker runs:
- Publish checker (60s)
- Toby tick (5m)
- Analytics refresh (1h)
- Token refresh (6h)
- Cost aggregation (daily)
- Schedule recovery (15m)

Non-elected workers only serve HTTP requests.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler, port 6543) |
| `DEEPSEEK_API_KEY` | DeepSeek API key for text generation |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key (for admin operations) |
| `VITE_SUPABASE_URL` | Supabase URL (baked into frontend at build time) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (baked into frontend at build time) |

### OAuth Credentials

| Variable | Platform |
|----------|----------|
| `META_APP_ID`, `META_APP_SECRET` | Instagram + Facebook |
| `THREADS_APP_ID`, `THREADS_APP_SECRET` | Threads (separate Meta app) |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins |
| `DEFAULT_USER_ID` | none | Default user for seeding |
| `BRAND_GENERATION_TIMEOUT_SECONDS` | 600 | Per-brand generation timeout |

## Database Migrations on Deploy

Migrations run automatically on every deploy:

```
Container starts
    |
    v
init_db() in background thread
    |
    v
Base.metadata.create_all()  -->  Creates any new tables
    |
    v
run_migrations()  -->  ALTER TABLE ADD COLUMN IF NOT EXISTS ...
                       CREATE TABLE IF NOT EXISTS ...
                       CREATE INDEX IF NOT EXISTS ...
    |
    v
Server is ready
```

All migration SQL is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`). Running the same migration twice is a no-op.

## QA Pipeline

A GitHub Action runs `reviewer_guardrails.py` on every push to `main`:

### Guardrail Checks

| Check | What It Catches |
|-------|----------------|
| **Hardcoded brand names/colors/IDs** | Must use dynamic brand system, not string literals |
| **React Rules of Hooks** | No hooks after early returns in `.tsx` files |
| **Model changes vs migration pairing** | If `app/models/*.py` changed, a migration SQL must be in the same diff |
| **API route auth checks** | New routes must have authentication |
| **Platform integration vs legal pages** | Platform changes require legal page updates |

### Running Guardrails Locally

```bash
python3 scripts/reviewer_guardrails.py
```

### Checking QA Pipeline After Push

```bash
export GH_TOKEN=$(grep GH_TOKEN .env | cut -d= -f2)
gh run list --workflow="QA Pipeline" --limit=1 --json status,conclusion,displayTitle,headSha
```

:::warning Always Check After Push
The QA Pipeline runs asynchronously after push. Always verify it passes. If it fails, fix immediately in a follow-up commit.
:::

## Pre-Deploy Checklist

1. Run guardrails locally: `python3 scripts/reviewer_guardrails.py`
2. Test locally: `npm run dev:local` and verify the change works
3. If model changes: verify migration SQL is in `run_migrations()`
4. Push to main: `git push origin main`
5. Check QA Pipeline: `gh run list --workflow="QA Pipeline" --limit=1`
6. Verify deployment: check Railway dashboard or `GET /health`

## Rollback

Railway supports **instant rollback** to any previous deployment:

1. Open the Railway dashboard
2. Navigate to the service's Deployments tab
3. Click on a previous successful deployment
4. Click "Rollback"

The previous Docker image is redeployed immediately. Database migrations are forward-only (idempotent `ADD COLUMN IF NOT EXISTS`), so rolling back the code does not roll back schema changes. This is safe because:
- New columns have defaults, so old code ignores them
- No columns are ever dropped in migrations
- `create_all()` never deletes existing tables

## Monitoring with MCP Servers

For production debugging, use the configured MCP servers:

| Server | Use Case |
|--------|---------|
| **Supabase** (project: `kzsbyzroknbradzyjvrc`) | Query DB tables, check user state, Toby state, generation jobs |
| **Stripe** | Check subscriptions, payment failures, webhook delivery |
| **Railway** | View logs, deployment status, restart services |
