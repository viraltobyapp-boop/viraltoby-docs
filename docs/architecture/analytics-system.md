---
sidebar_position: 10
title: Analytics System
description: Two-tier analytics architecture
slug: /architecture/analytics-system
---

# Analytics System

ViralToby's analytics architecture is split into two tiers: **live API fetch** for the detailed analytics dashboard, and **persistent snapshots** for the Home page chart. This separation ensures the Home page loads instantly from the database while the full dashboard fetches fresh data from platform APIs on demand.

## Architecture Overview

```
                    +------------------+
                    |  Platform APIs   |
                    |  (Meta, Google,  |
                    |   TikTok, etc.)  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     | Analytics Service|          | Snapshot Service |
     | (in-memory cache)|          | (DB persistence) |
     +--------+---------+          +--------+--------+
              |                             |
     +--------v--------+          +--------v--------+
     |  /analytics/*   |          | /home-chart     |
     |  Dashboard tabs |          | Home page chart |
     +-----------------+          +-----------------+
```

## Tier 1: Analytics Dashboard (Live Fetch)

**Endpoint prefix:** `/api/analytics/v2/{brand_id}/`

The dashboard fetches data directly from platform APIs, caches results in-memory on the server, and returns rich data structures to the frontend.

### Overview Tab

```
GET /api/analytics/v2/{brand_id}/overview
```

Fetches from Meta Graph API:
- **Reach**: Daily time-series, up to 28 days (`/{ig_id}/insights?metric=reach&period=day`)
- **Follower gains**: Net new followers over the period
- **Likes**: Total likes on content

Data is cached in-memory with a short TTL. User clicks "Refresh" to re-fetch from APIs.

### Posts Tab

```
GET /api/analytics/v2/{brand_id}/posts?page=1&limit=50
```

Two-step fetch for performance:

1. **Media list** (fast): `GET /{ig_id}/media?fields=id,caption,media_type,timestamp,thumbnail_url,permalink` -- paginated, returns quickly
2. **Per-post insights** (enrichment): Only the visible page (max 50 posts) is enriched with detailed metrics

```python
# app/services/analytics/analytics_service.py
# Enrichment uses 10 concurrent threads for speed
with ThreadPoolExecutor(max_workers=10) as pool:
    futures = {
        pool.submit(fetch_post_insights, post_id): post_id
        for post_id in visible_post_ids[:50]
    }
```

Per-post insights include: `views`, `reach`, `saved`, `shares`, `likes`, `comments`.

:::warning Performance Guard
Never fetch per-post insights for ALL posts. Only enrich the visible page (max 50). The Meta API rate-limits per-post insight calls aggressively.
:::

### Answers Tab

```
GET /api/analytics/v2/{brand_id}/answers
```

Computed from the posts data (no additional API calls):

| Metric | Computation |
|--------|------------|
| Best day of week | Average likes per post, grouped by day |
| Best hour | Average likes per post, grouped by hour |
| Best content type | Average likes by `media_type` (IMAGE, VIDEO, CAROUSEL) |
| Optimal frequency | Posts per day vs engagement correlation |

### Audience Tab

```
GET /api/analytics/v2/{brand_id}/audience
```

Fetches demographics on-demand:

```
GET /{ig_id}/insights?metric=follower_demographics&period=lifetime
  &metric_type=total_value
  &breakdown=age,gender,city,country
```

Returns age/gender distribution, top cities, and top countries.

### In-Memory Cache

The analytics service caches API responses in a server-side dictionary:

```python
_cache: dict[str, CacheEntry] = {}

class CacheEntry:
    data: Any
    fetched_at: datetime
    ttl: int  # seconds
```

Cache is lost on server restart. This is acceptable because:
- The data is always re-fetchable from platform APIs
- The Home chart (Tier 2) provides persistence for the data that matters
- Dashboard data is user-initiated (click Refresh), not background

### Rate Limiting

The analytics service implements rate limiting to avoid API throttling:

- Per-brand rate limit to prevent rapid successive refreshes
- Respects `X-Business-Use-Case-Usage` headers from Meta API
- Falls back to cached data when rate-limited

## Tier 2: Home Page Chart (Persistent Snapshots)

**Endpoint:** `GET /api/analytics/home-chart?days=7`

### `analytics_snapshots` Table

Persistent daily snapshots that survive server restarts and grow beyond API history limits:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `user_id` | UUID | Owner |
| `brand_id` | VARCHAR | Brand identifier |
| `platform` | VARCHAR | Platform (instagram, facebook, etc.) |
| `date` | DATE | Snapshot date |
| `followers` | INTEGER | Current total follower count on this date |
| `views` | INTEGER | Views/reach on this date |
| `likes` | INTEGER | Likes on this date |
| `fetched_at` | TIMESTAMPTZ | When the snapshot was captured |

**Unique constraint:** `(user_id, brand_id, platform, date)` -- one snapshot per brand per platform per day.

### Snapshot Capture

Snapshots are stored on every `refresh_analytics()` call:

```python
# app/services/analytics/snapshot_service.py
def store_snapshots(user_id, brand_id, platform, metrics):
    """Persist daily snapshots from analytics data."""
    today = date.today()

    # Upsert today's snapshot (followers = current total, always fresh)
    db.execute(text("""
        INSERT INTO analytics_snapshots (user_id, brand_id, platform, date, followers, views, likes, fetched_at)
        VALUES (:user_id, :brand_id, :platform, :date, :followers, :views, :likes, now())
        ON CONFLICT (user_id, brand_id, platform, date)
        DO UPDATE SET followers = :followers, views = :views, likes = :likes, fetched_at = now()
    """), {...})
```

:::info Follower Count Accuracy
The `followers` column stores the **current total** follower count (always accurate, no 48h delay). Historical rows preserve their originally captured value. This means the time-series shows actual follower growth over time, not derived deltas.
:::

### Capture Triggers

| Trigger | When | Source |
|---------|------|--------|
| Hourly scheduler | Every hour | APScheduler `refresh_analytics()` job |
| Manual refresh | User clicks Refresh in dashboard | Dashboard Refresh button |
| OAuth connect | Immediately after connecting a platform | `trigger_post_connect_refresh()` |

### Post-Connect Backfill

When a user connects a new platform, `trigger_post_connect_refresh()` runs immediately:

```python
# app/services/analytics/snapshot_service.py
def trigger_post_connect_refresh(user_id, brand_id, platform):
    """Immediate analytics fetch + snapshot for new connections."""
    # 1. Fetch current metrics from platform API
    # 2. Backfill up to 28 days of historical views (where API supports it)
    # 3. Store all snapshots
```

This ensures new users see data within seconds of connecting, rather than waiting for the next hourly refresh.

### Home Chart API

```
GET /api/analytics/home-chart?days=7
```

Returns aggregated daily data from `analytics_snapshots` + Toby actions from `toby_activity_log`:

```json
{
  "chart_data": [
    {
      "date": "2026-03-20",
      "followers": 12450,
      "views": 8320,
      "likes": 1240,
      "toby_actions": 6
    },
    ...
  ]
}
```

The query uses `GROUP BY date` aggregation across all brands and platforms. Zero external API calls are made for this endpoint -- it reads entirely from the database.

### Frontend Integration

```typescript
// src/shared/hooks/useHomeChart.ts
function useHomeChart(days: number = 7) {
  return useQuery({
    queryKey: ["home-chart", days],
    queryFn: () => api.get(`/api/analytics/home-chart?days=${days}`),
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

Rendered as a Recharts `AreaChart` component on the Home page.

## Toby Scoring (Separate System)

Toby's content scoring is completely separate from the analytics dashboard:

```
Published post (48h+ old)
    |
    v
Toby Metrics Check (orchestrator)
    |
    v
Fetch metrics from Meta API (ONE TIME only)
    |
    v
Compute Toby Score
    |
    v
Store raw metrics in TobyContentTag.cognitive_metadata (JSONB)
    |
    v
Update strategy scores (Thompson Sampling)
```

### Key Differences from Analytics

| Aspect | Analytics Dashboard | Toby Scoring |
|--------|-------------------|-------------|
| Scope | All posts | Only `created_by == "toby"` posts |
| Frequency | On-demand + hourly | Once per post, after 48h |
| Storage | In-memory cache + snapshots | `cognitive_metadata` JSONB (permanent) |
| Purpose | User-facing metrics | Internal learning signal |
| API calls | Repeated on refresh | Once per post, never re-fetched |
| Baselines | N/A | Computed from previously scored posts in DB |

### Scoring Formula

Toby scores use weighted engagement metrics:

```python
# Default weights (configurable via TobyState.score_weights)
score = (
    views * 1.0 +
    likes * 0.2 +
    saves * 3.0 +    # High signal: user actively saved
    shares * 3.0 +   # High signal: user actively shared
    comments * 1.0
) / baseline_engagement
```

Baselines are computed from previously scored posts in the database. On cold start (no prior scores), baselines are bootstrapped from the first batch of scored content.

## Legacy System

The `analytics_daily_cache` table and `home_chart_cache.py` service still exist during the transition to the snapshot-based system. They will be removed after validation that the snapshot system is fully stable.
