---
sidebar_position: 7
title: Platform Publishing
description: Multi-platform publishing system
slug: /architecture/platform-publishing
---

# Platform Publishing

ViralToby publishes content to 6 platforms: Instagram, Facebook, Threads, TikTok, YouTube, and Bluesky. Publishing is driven by a PostgreSQL-backed scheduler that checks for due posts every 60 seconds.

## Publishing Flow

```
APScheduler (every 60s)
    |
    v
DatabaseSchedulerService.get_pending_publications()
    |
    v
For each due ScheduledReel:
    |
    +-- Determine content type (video / image / text)
    |
    +-- Filter platforms by content type compatibility
    |
    +-- Generate per-platform captions
    |
    +-- For each target platform:
    |       |
    |       v
    |   Platform Publisher (IG / FB / Threads / TikTok / Bsky)
    |       |
    |       +-- Success: record result
    |       +-- Failure: record error, may retry
    |
    +-- Mark as published (or partially failed)
```

## Scheduler Architecture

The scheduler is **PostgreSQL-backed**, not in-memory. This means:

- Scheduled posts survive server restarts
- Multiple workers can read pending posts (only one actually publishes, via file lock)
- The `scheduled_reels` table is the source of truth

```python
# app/services/publishing/scheduler.py
class DatabaseSchedulerService:
    def get_pending_publications(self):
        """Find all scheduled_reels where:
        - status == 'scheduled'
        - scheduled_time <= now()
        """
        ...

    def mark_as_published(self, schedule_id, publish_results):
        """Update status to 'published', record results in extra_data."""
        ...

    def reset_stuck_publishing(self, max_age_minutes=10):
        """Reset posts stuck in 'publishing' status for > 10 minutes."""
        ...
```

### Worker Election

APScheduler runs inside the FastAPI process. On multi-worker deployments, a file lock ensures only one worker runs the scheduler:

```python
# app/main.py (startup)
_scheduler_lock_path = Path("/tmp/.viraltoby_scheduler.lock")
_scheduler_lock_file = open(_scheduler_lock_path, "w")
fcntl.flock(_scheduler_lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
# If lock acquired: this worker runs the scheduler
# If lock fails: this worker skips scheduler registration
```

## Platform Publishers

Each platform has a dedicated publisher in `app/services/publishing/publishers/`:

| Publisher | File | Protocol | Content Types |
|-----------|------|----------|--------------|
| Instagram | `_instagram.py` | Meta Graph API | Video (Reels), Image (Posts), Carousel |
| Facebook | `_facebook.py` | Meta Graph API | Video, Image, Carousel |
| Threads | `_threads.py` | Threads API | Text, Text Chain |
| TikTok | `_tiktok.py` | TikTok Content Posting API | Video |
| Bluesky | `_bluesky.py` | AT Protocol | Text, Image |
| YouTube | (via youtube service) | YouTube Data API v3 | Video (Shorts) |

All publishers inherit from a base class in `_base.py` that provides common error handling and retry logic.

### Platform Capabilities Matrix

| Platform | Video | Image | Carousel | Text-Only | Chain/Thread |
|----------|-------|-------|----------|-----------|-------------|
| Instagram | Reels | Feed Post | Yes | No | No |
| Facebook | Reels/Video | Feed Post | Yes | No | No |
| Threads | No | No | No | Yes | Yes (chain) |
| TikTok | Yes | No | No | No | No |
| YouTube | Shorts | No | No | No | No |
| Bluesky | No | Yes | No | Yes | No |

### SocialPublisher Orchestrator

`app/services/publishing/social_publisher.py`

The `SocialPublisher` class orchestrates publishing to multiple platforms for a single post:

```python
class SocialPublisher:
    def __init__(self, brand_config):
        self.brand = brand_config
        # Initialize platform-specific publishers

    def publish_reel(self, video_path, caption, platforms):
        """Publish a video reel to selected platforms."""
        results = {}
        for platform in platforms:
            try:
                results[platform] = self._publish_to(platform, video_path, caption)
            except Exception as e:
                results[platform] = {"error": str(e)}
        return results

    def publish_threads_post(self, caption, media_type="TEXT"):
        """Publish a text post to Threads."""
        ...

    def publish_threads_chain(self, parts):
        """Publish a multi-part thread chain."""
        ...
```

### Text-Only Platform Guard

Platforms that only support text content (Threads, Bluesky for text-only) are automatically stripped from media-bearing publishes:

```python
# In the publish checker:
if content_type not in ('text', 'threads_post'):
    from app.core.platforms import TEXT_ONLY_PLATFORMS
    platforms = [p for p in platforms if p not in TEXT_ONLY_PLATFORMS]
```

## Error Handling

### Credential Errors

When a platform rejects credentials (expired token, revoked access):

1. The error is recorded in `ScheduledReel.publish_error`
2. A notification is logged in `toby_activity_log` (if Toby-generated)
3. The post is marked as `failed` for that platform
4. Token refresh is attempted on the next cycle

### Partial Failures

A single `ScheduledReel` may publish to multiple platforms. If some succeed and others fail:

1. Successful platforms are recorded in `extra_data.succeeded_platforms`
2. Failed platforms are recorded in `extra_data.retry_platforms`
3. On the next scheduler tick, only the failed platforms are retried
4. After 3 failed attempts, the post is marked as permanently failed for those platforms

### Stuck Post Recovery

Posts stuck in `publishing` status (e.g., due to a server crash mid-publish) are automatically reset:

```python
def reset_stuck_publishing(self, max_age_minutes=10):
    """Reset posts stuck in 'publishing' for > 10 minutes back to 'scheduled'."""
    cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
    stuck = db.query(ScheduledReel).filter(
        ScheduledReel.status == "publishing",
        ScheduledReel.published_at == None,
        ScheduledReel.created_at < cutoff,
    ).all()
    for post in stuck:
        post.status = "scheduled"
    # These will be retried on the next scheduler tick
```

This runs on startup and periodically via the recovery thread.

## Token Management

### Instagram / Facebook

- Long-lived tokens (60 days)
- Proactive refresh every 6 hours via APScheduler (`ig_token_service.py`, `fb_token_service.py`)
- Token expiry tracked in `Brand.instagram_token_expires_at`
- If refresh fails, the error is logged and the next refresh attempt is in 6 hours

### Threads

- Separate Meta OAuth credentials (different app)
- Token refresh on-demand before publishing (`threads_token_service.py`)
- Expiry tracked in `Brand.threads_token_expires_at`

### TikTok

- OAuth 2.0 with access + refresh tokens
- Access token expires in 24 hours, refresh token in 365 days
- Refresh on-demand before publishing (`tiktok_token_service.py`)
- Expiry tracked in `Brand.tiktok_access_token_expires_at` and `Brand.tiktok_refresh_token_expires_at`

### Bluesky

- App Password authentication (not OAuth)
- JWT access tokens with short expiry
- Automatic re-authentication using stored app password (`bsky_token_service.py`)
- Access JWT tracked in `Brand.bsky_access_jwt` and `Brand.bsky_access_jwt_expires_at`

## AI Content Labeling

For Meta platforms (Instagram, Facebook, Threads), ViralToby applies AI content labels as required by Meta's policies:

```python
# When publishing to Instagram/Facebook:
container_params["is_paid_partnership"] = False
# Meta's AI-generated content label is applied via the API
```

This ensures compliance with Meta's transparency requirements for AI-generated content.

## Retry Logic

Transient failures (network timeouts, rate limits, server errors) are retried:

```
Attempt 1: Immediate
Attempt 2: Next scheduler tick (60s later)
Attempt 3: Next scheduler tick after that
After 3 failures: Mark as permanently failed
```

Rate limit responses (HTTP 429) from platform APIs are respected -- the publisher backs off and retries on the next tick.
