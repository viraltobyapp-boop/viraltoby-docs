---
sidebar_position: 2
title: API Reference
description: All API endpoints and their purposes
slug: /architecture/api-reference
---

# API Reference

All API routes are registered in `app/main.py`. Each domain has its own route file under `app/api/`.

## Authentication Pattern

Every authenticated endpoint uses the `get_current_user` dependency:

```python
from app.api.auth.middleware import get_current_user

@router.get("/api/example")
def example(user=Depends(get_current_user), db: Session = Depends(get_db)):
    # user["id"] is the authenticated Supabase user ID
    ...
```

Brand ownership is verified by querying `Brand.user_id == user["id"]` before any operation. This prevents IDOR across users.

## Error Format

All errors are returned as `HTTPException` with a JSON body:

```json
{
  "detail": "Human-readable error message",
  "guidance": "Actionable suggestion for the user (optional)"
}
```

## Route Groups

### `/reels/` -- Content Generation & Scheduling

Registered via `app/api/routes.py` which aggregates sub-routers.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/reels/generate-caption` | Generate a caption for given content |
| POST | `/reels/rate-content` | Score content quality (5 dimensions) |
| POST | `/reels/generate-reel` | Generate a complete reel (image + video + caption) |
| POST | `/reels/schedule` | Schedule a reel for future publishing |
| POST | `/reels/publish/{schedule_id}` | Manually publish a scheduled reel now |
| POST | `/reels/manual/upload` | Upload manually created content (user's own media) |
| GET | `/reels/jobs` | List generation jobs for the current user |
| GET | `/reels/jobs/{job_id}` | Get a single job's status and outputs |
| POST | `/reels/feedback` | Submit user feedback on generated content |
| GET | `/reels/status` | System status and statistics |

### `/api/toby/` -- Toby Agent

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/toby/status` | Current Toby state (enabled, phase, last actions) |
| POST | `/api/toby/enable` | Enable Toby for the current user |
| POST | `/api/toby/disable` | Disable Toby |
| GET | `/api/toby/config` | Get per-brand Toby configuration |
| PUT | `/api/toby/config` | Update Toby config (slots/day, content types, etc.) |
| GET | `/api/toby/activity` | Activity log (recent actions, generations, scores) |
| GET | `/api/toby/insights` | Learning insights (top strategies, experiments) |
| GET | `/api/toby/budget` | Budget status (daily spend, limits) |
| GET | `/api/toby/experiments` | Active and completed A/B experiments |

### `/api/v2/brands/` -- Brand Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/brands` | List all brands for the current user |
| POST | `/api/v2/brands` | Create a new brand |
| GET | `/api/v2/brands/{brand_id}` | Get brand details |
| PUT | `/api/v2/brands/{brand_id}` | Update brand settings (colors, handles, logos) |
| DELETE | `/api/v2/brands/{brand_id}` | Delete a brand |
| GET | `/api/v2/brands/{brand_id}/niche-config` | Get niche configuration |
| PUT | `/api/v2/brands/{brand_id}/niche-config` | Update niche configuration |
| GET | `/api/v2/brands/{brand_id}/caption-templates` | Get caption templates |
| PUT | `/api/v2/brands/{brand_id}/caption-templates` | Update caption templates |
| POST | `/api/v2/brands/{brand_id}/test-connection` | Test platform credentials |

### `/api/brands/{brand_id}/dna/` -- Content DNA Profiles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/brands/{brand_id}/dna` | List DNA profiles for a brand |
| POST | `/api/brands/{brand_id}/dna` | Create a new DNA profile |
| GET | `/api/brands/{brand_id}/dna/{dna_id}` | Get a DNA profile |
| PUT | `/api/brands/{brand_id}/dna/{dna_id}` | Update a DNA profile |
| DELETE | `/api/brands/{brand_id}/dna/{dna_id}` | Delete a DNA profile |
| GET | `/api/dna-templates` | List available DNA templates |

### `/api/auth/` -- Authentication & OAuth

**User auth:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/email` | Update user email (admin API, instant) |

**Instagram OAuth (Meta Business Login):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/instagram-oauth` | Start Instagram OAuth flow (redirect to Meta) |
| GET | `/auth/instagram-oauth/callback` | Handle OAuth callback, store tokens |
| POST | `/auth/instagram-oauth/disconnect/{brand_id}` | Disconnect Instagram from brand |

**Facebook OAuth:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/facebook-oauth` | Start Facebook OAuth flow |
| GET | `/auth/facebook-oauth/callback` | Handle callback, page selection |
| POST | `/auth/facebook-oauth/disconnect/{brand_id}` | Disconnect Facebook |

**Threads OAuth:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/threads-oauth` | Start Threads OAuth flow |
| GET | `/auth/threads-oauth/callback` | Handle callback |
| POST | `/auth/threads-oauth/disconnect/{brand_id}` | Disconnect Threads |

**TikTok OAuth:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/tiktok-oauth` | Start TikTok OAuth flow |
| GET | `/auth/tiktok-oauth/callback` | Handle callback |
| POST | `/auth/tiktok-oauth/disconnect/{brand_id}` | Disconnect TikTok |

**Bluesky (App Password, not OAuth):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/bluesky/connect/{brand_id}` | Connect with handle + app password |
| POST | `/auth/bluesky/disconnect/{brand_id}` | Disconnect Bluesky |

### `/api/analytics/` -- Analytics

**V1 (legacy):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/{brand_id}` | Get cached analytics for a brand |
| POST | `/api/analytics/{brand_id}/refresh` | Refresh analytics from platform APIs |

**V2 (detailed dashboard):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/v2/{brand_id}/overview` | Reach time-series, follower gains, likes (28 days) |
| GET | `/api/analytics/v2/{brand_id}/posts` | Paginated media list with per-post insights |
| GET | `/api/analytics/v2/{brand_id}/answers` | Best day/hour/type/frequency analysis |
| GET | `/api/analytics/v2/{brand_id}/audience` | Demographics from Meta API |

**Home chart (persistent snapshots):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/home-chart` | Aggregated daily snapshots (query param: `days=7`) |

### `/api/billing/` -- Stripe Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/status` | Current billing status for all brands |
| POST | `/api/billing/checkout` | Create a Stripe Checkout session |
| POST | `/api/billing/portal` | Create a Stripe Customer Portal session |
| POST | `/api/billing/webhook` | Stripe webhook receiver (signature-verified) |

### `/api/youtube/` -- YouTube

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/youtube/channels` | List connected YouTube channels |
| POST | `/api/youtube/connect` | Connect YouTube via Google OAuth |
| GET | `/api/youtube/analytics/{channel_id}` | Channel analytics |

### `/api/threads/` -- Threads Content

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/threads/generate` | Generate Threads-specific text content |
| POST | `/api/threads/publish` | Publish a Threads post or chain |

### `/api/content/` -- Content Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/content/generate` | Generate content (unified endpoint) |
| POST | `/api/content/test-prompt` | Test a prompt without generating media |
| POST | `/api/content/format-b/generate` | Generate Format B content (story-based) |
| POST | `/api/content/format-b/design` | Get/update Format B design preferences |
| GET | `/api/content/music` | List available music tracks |
| POST | `/api/content/music/upload` | Upload a custom music track |
| DELETE | `/api/content/music/{track_id}` | Delete a music track |

### `/api/pipeline/` -- Content Approval Workflow

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pipeline/pending` | List jobs pending review |
| POST | `/api/pipeline/approve` | Approve jobs (bulk) |
| POST | `/api/pipeline/reject` | Reject jobs (bulk) |
| GET | `/api/pipeline/stats` | Pipeline statistics |

### `/api/system/` -- System & Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update app settings |
| GET | `/api/logs` | Query log entries (paginated, filterable) |
| GET | `/api/admin/users` | List all users (admin only) |
| PUT | `/api/admin/users/{user_id}` | Update user profile (admin only) |
| GET | `/api/system/health-check` | Deep health check (DB, storage, APIs) |
| GET | `/api/system/api-usage` | API usage statistics (admin) |
| GET | `/api/privacy-policy` | Privacy policy page (Meta App Review) |
| POST | `/api/data-deletion` | Data deletion callback (Meta compliance) |

### `/health` -- Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Lightweight health check (no DB call). Used by Railway for readiness probes. |

## Route Registration

All routers are registered in `app/main.py`:

```python
app.include_router(reels_router)                                    # /reels/*
app.include_router(brands_router, prefix="/api/v2")                 # /api/v2/brands/*
app.include_router(toby_router)                                     # /api/toby/*
app.include_router(billing_router, prefix="/api/billing")           # /api/billing/*
app.include_router(pipeline_router)                                 # /api/pipeline/*
# ... and 20+ more routers
```

:::warning Critical Module Verification
At startup, `main.py` imports all route modules eagerly. If any import fails (e.g., missing dependency), the server logs the error and exits. This is intentional -- a partially loaded server is worse than a failed deploy.
:::
