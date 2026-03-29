---
sidebar_position: 6
title: Pipeline System
description: Content review, approval lifecycle, realtime progress, and scheduling architecture
slug: /architecture/pipeline-system
---

# Pipeline System

The Pipeline is ViralToby's content review and approval system. Every piece of generated content flows through the pipeline before reaching social platforms. It handles lifecycle management, bulk operations, realtime progress updates, and scheduling — all with optimistic UI and zero polling.

## Lifecycle Architecture

Content moves through 7 lifecycle stages. The lifecycle is **computed server-side** at request time — there is no stored `lifecycle` column. It's derived from `generation_jobs.status` + `generation_jobs.pipeline_status` + brand output statuses.

```
                   +-----------+
       Job created |  queued   |  status='pending'
                   +-----+-----+
                         | worker picks up
                   +-----v-----+
                   | generating |  status='generating'
                   +-----+-----+
                   +-----+-----+
              fail |           | success
          +--------v---+  +----v-----------+
          |   failed   |  | pending_review |  pipeline_status='pending'
          +------------+  +-------+--------+
                             +----+----+
                      reject |         | approve
                   +---------v-+  +----v------+
                   |  rejected |  |  accepted |  pipeline_status='approved'
                   +-----------+  +-----+-----+
                                        | all brands published
                                   +----v------+
                                   | published  |
                                   +-----------+
```

### Lifecycle Mapping Rules

The backend function `_compute_lifecycle()` in `app/api/pipeline/routes.py` maps database fields to lifecycle stages:

| DB `status` | DB `pipeline_status` | Lifecycle | Description |
|---|---|---|---|
| `pending` | any | `queued` | Waiting for a generation worker |
| `generating` | any | `generating` | Worker is processing |
| `failed` / `cancelled` | any | `failed` | Generation failed |
| `completed` | `pending` | `pending_review` | Awaiting user approval |
| `completed` | `rejected` | `rejected` | User rejected the content |
| `completed` | `approved` | `accepted` or `published` | Check brand outputs (see below) |
| `completed` | `downloadable` | `accepted` | Auto-schedule is OFF |

**Accepted vs Published:** If ALL brand outputs for a job have `status == 'published'`, the lifecycle is `published`. Otherwise it stays `accepted`. This means partially-published content (e.g., published on Instagram but not yet on TikTok) remains in the Accepted tab.

## Database Schema

The pipeline primarily uses two tables:

### `generation_jobs`

The main content table. Key pipeline-related columns:

| Column | Type | Purpose |
|--------|------|---------|
| `status` | text | Generation status: `pending`, `generating`, `completed`, `failed`, `cancelled` |
| `pipeline_status` | text | Approval status: `pending`, `approved`, `rejected`, `downloadable` |
| `brand_outputs` | jsonb | Per-brand generated content (thumbnails, videos, captions, publish status) |
| `progress_percent` | integer | 0-100 generation progress |
| `progress_message` | text | Current generation step description |
| `quality_score` | integer | AI-assessed quality (0-100) |
| `content_format` | text | `reel`, `carousel`, `thread` |
| `variant` | text | Specific format variant (e.g., `light`, `dark`, `format_b`) |
| `created_by` | text | `toby` or `user` |

### `scheduled_reels`

Created when a job is approved (if auto-schedule is ON). Links a generation job to a calendar slot.

| Column | Type | Purpose |
|--------|------|---------|
| `job_id` | uuid | References `generation_jobs.id` |
| `brand_id` | uuid | Which brand this is scheduled for |
| `scheduled_time` | timestamp | When to publish |
| `status` | text | `scheduled`, `published`, `failed` |
| `platform` | text | Target platform |

## API Endpoints

### Read Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pipeline` | List items filtered by lifecycle, brand, content type. Paginated (default 40/page). |
| GET | `/api/pipeline/stats` | Aggregate counts per lifecycle + content breakdown + approval rate + scheduling metadata |
| GET | `/api/pipeline/{id}/schedule-preview` | Next available calendar slot for an item |

### Mutation Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/pipeline/{id}/approve` | Approve item. Creates ScheduledReels if auto-schedule ON. |
| POST | `/api/pipeline/{id}/reject` | Reject item |
| PATCH | `/api/pipeline/{id}/edit` | Update caption or title |
| DELETE | `/api/pipeline/{id}` | Delete item + associated ScheduledReels |
| POST | `/api/pipeline/{id}/schedule` | Manual schedule for an accepted item |
| POST | `/api/pipeline/{id}/mark-downloaded` | Mark item as downloaded |

### Bulk Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/pipeline/bulk-approve` | Approve multiple items (rejects TikTok items with 422) |
| POST | `/api/pipeline/bulk-reject` | Reject multiple items |
| POST | `/api/pipeline/bulk-delete` | Delete multiple items by job IDs |
| POST | `/api/pipeline/bulk-delete-by-status` | Delete all items of a given lifecycle |
| POST | `/api/pipeline/bulk-schedule-accepted` | Schedule all unscheduled accepted items |
| POST | `/api/pipeline/regenerate` | Force Toby to generate N new items |

:::warning TikTok Bulk Approval
Bulk approval explicitly rejects TikTok posts (HTTP 422). TikTok requires per-video compliance settings (privacy level, comments toggle, duet/stitch permissions), so each TikTok post must be approved individually through the detail modal.
:::

### Status Filtering

Each tab sends `?status=<lifecycle>` to the backend. The API maps lifecycle to SQL filters:

| Lifecycle | SQL Filter |
|-----------|-----------|
| `queued` | `status = 'pending'` |
| `generating` | `status = 'generating'` |
| `failed` | `status IN ('failed', 'cancelled')` |
| `pending_review` | `status = 'completed' AND pipeline_status = 'pending'` |
| `rejected` | `pipeline_status = 'rejected'` |
| `accepted` | `pipeline_status IN ('approved', 'downloadable')` + exclude fully published |
| `published` | `pipeline_status = 'approved'` + only fully published |
| `all` | No status filter |

The `accepted` and `published` tabs require post-query Python filtering because the published/accepted distinction depends on brand output statuses stored in JSONB, which can't be efficiently filtered in SQL.

## Frontend Architecture

### React Query Cache Strategy

Each tab has its own cache entry keyed by the full filter object:

```
['pipeline', 'list', { status, brand, content_type, batch_id, page, limit }]
['pipeline', 'stats']
```

**Key settings:**
- **staleTime: 0** — data always considered stale; invalidation triggers immediate refetch
- **gcTime: 25 hours** — cache entries survive across sessions via IndexedDB persistence
- **retry: 1** — one retry on failure
- **refetchOnWindowFocus: false** — Supabase Realtime handles updates, not polling

**Placeholder data:** When paginating within the same tab, the previous page's data is shown as placeholder while the new page loads. On tab switches, placeholder data is cleared to prevent showing wrong-tab content.

**IDB persistence:** Pipeline queries are persisted to IndexedDB for instant cache-first rendering. Only `status === 'success'` queries are persisted — error and pending states are excluded to prevent stale error flashes on session restore.

### Optimistic Updates

Every mutation optimistically updates the React Query cache before the API responds:

1. **onMutate** — Remove items from cached lists, update stat counts immediately
2. **onSuccess** — Invalidate all pipeline + jobs + scheduling queries (background refetch)
3. **onError** — Roll back to previous state using saved context

This means the UI responds instantly to user actions. If the API fails, the change is reverted.

### Tab Transition States

The pipeline uses a derived `isTransitioning` state to prevent error/empty flashes during tab switches:

| State | UI |
|-------|----|
| Fetching with no data | Centered loading spinner |
| Error after all retries exhausted | Red "Failed to load content" message |
| Data loaded, items > 0 | Content grid with cards |
| Data loaded, items = 0 | Contextual empty state message |
| Pagination within same tab | Previous page shown while loading (placeholder data) |

:::info No Polling
The pipeline uses zero polling. All background updates come through Supabase Realtime subscriptions. The `refetchOnWindowFocus` is disabled because realtime handles staleness detection.
:::

## Realtime Progress Updates

Supabase Realtime watches the `generation_jobs` table and bridges events to the React Query cache using a two-tier strategy:

### Tier 1: Delta-Patching (Fast)

For UPDATE events where only progress fields changed (`progress_percent`, `brand_outputs`, `caption`, `title`), the cache is patched in-place using `queryClient.setQueriesData()`. No API refetch occurs. This allows progress bars and generation messages to update in realtime without server load.

### Tier 2: Invalidation (Full Refetch)

For events that change the lifecycle:
- **INSERT/DELETE** events always invalidate (items added/removed from pipeline)
- **status or pipeline_status changed** triggers invalidation (lifecycle recomputation needed)
- **brand_outputs contains new published status** triggers invalidation (accepted -> published transition)

```
Supabase Realtime Event
         |
    Is it a progress-only update?
    /                          \
  YES                          NO
   |                            |
Delta-patch cache         Invalidate queries
(no API call)             (background refetch)
   |                            |
Progress bar updates      Lists + stats refresh
instantly                  from API
```

:::warning No cancelRefetch
Pipeline invalidations never use `cancelRefetch`. Rapid realtime events (e.g., 17 job INSERTs during batch generation) would keep cancelling in-flight fetches, preventing the cache from ever populating. Without a populated cache, delta-patching can't find items, progress bars freeze, and all updates appear in one burst when events stop.
:::

## Auto-Schedule Flow

When a user approves content with auto-schedule enabled:

1. Backend sets `pipeline_status = 'approved'`
2. `_find_next_slot()` finds the next available calendar slot per brand
3. Creates `ScheduledReel` entries for each brand output
4. Returns the scheduled time to the frontend
5. Frontend shows toast: "Scheduled for [date] at [time]"

When auto-schedule is OFF:
1. Backend sets `pipeline_status = 'downloadable'`
2. No `ScheduledReel` created
3. Item appears in Accepted tab with download + manual schedule buttons

## Self-Healing

The `/api/pipeline/stats` endpoint includes a self-healing mechanism: if it detects unscheduled accepted items (approved but no `ScheduledReel`), it re-enqueues the background scheduler with a 60-second per-user cooldown. This handles edge cases where the initial scheduling failed silently.

## Component Tree

```
PipelinePage
+-- PipelineStats ............... 7 lifecycle count cards
+-- PipelineToolbar ............. Tabs + search + filters + bulk actions
+-- PipelineGrid ................ Responsive card grid
|   +-- PipelineCard ............ Item card (memoized)
|       +-- ContentPreview ...... Routes to Reel/Carousel/Thread preview
+-- Spinner ..................... Loading state during tab transitions
+-- EmptyState .................. Per-status contextual message
+-- PostReviewBanner ............ "All caught up!" after reviewing all
+-- ReviewModal ................. Fullscreen review flow
|   +-- Keyboard shortcuts ...... Arrow keys, E (edit), M (mute), Esc
+-- PipelineDetailModal ......... Detail view + TikTok settings
+-- BulkActionModal ............. Confirmation for bulk operations
```

## Key Design Decisions

1. **Lifecycle is computed, not stored.** The `lifecycle` field doesn't exist in the database. It's derived server-side from multiple fields. This prevents state drift between `status`, `pipeline_status`, and `brand_outputs`.

2. **Scheduling is lazy.** `ScheduledReel` entries are only created at approval time, not during content generation. This keeps the scheduling calendar clean and avoids phantom entries from content that may be rejected.

3. **Stats trigger self-healing.** Rather than a separate health-check job, the stats endpoint (called on every page load) detects and fixes scheduling gaps.

4. **TikTok requires individual approval.** Unlike other platforms, TikTok has mandatory per-video compliance settings. Bulk approval skips TikTok items and requires the user to approve them individually.

5. **Optimistic UI with server reconciliation.** All actions update the UI instantly. The server response reconciles any discrepancies. This creates a snappy experience even on slow connections.
