---
sidebar_position: 3
title: Database Schema
description: All database tables and their relationships
slug: /architecture/database-schema
---

# Database Schema

ViralToby uses PostgreSQL hosted on Supabase. All tables use **UUID primary keys** (stored as `VARCHAR(36)`) and **timestamps with timezone**. The ORM is SQLAlchemy 2.x with declarative models in `app/models/`.

## Migration Approach

:::caution No Alembic
ViralToby does NOT use Alembic. Migrations are raw SQL statements with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` executed in `run_migrations()` inside `app/db_connection.py`. This function runs on every server start via `init_db()`.
:::

```python
# app/db_connection.py
def init_db():
    Base.metadata.create_all(bind=engine)  # Creates new tables
    run_migrations()                        # Adds new columns, indexes, seeds

def run_migrations():
    with engine.connect() as conn:
        # Example migration:
        conn.execute(text(
            "ALTER TABLE toby_state ADD COLUMN IF NOT EXISTS threads_posts_per_day INTEGER DEFAULT 6"
        ))
        conn.commit()
```

**Adding a new column:**

1. Add the column to the SQLAlchemy model in `app/models/`
2. Add the `ALTER TABLE` SQL to `run_migrations()` in `db_connection.py`
3. Test locally (`npm run dev:local` -- migration auto-applies to branch DB)
4. Push to main -- migration auto-applies to production on Railway deploy

## Entity Relationship Diagram

```
UserProfile (1) ----< (N) Brand
    |                      |
    |                      +----< (N) ContentDNAProfile
    |                      |
    |                      +----< (N) GenerationJob
    |                      |
    |                      +----< (N) ScheduledReel
    |                      |
    |                      +----< (N) BrandSubscription
    |                      |
    |                      +----< (N) NicheConfig
    |
    +----< (1) TobyState
    |
    +----< (N) TobyActivityLog
    |
    +----< (N) AnalyticsSnapshot
```

## Core Tables

### `user_profiles`

User accounts. One row per Supabase Auth user.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | VARCHAR(100) PK | Supabase Auth UID |
| `user_name` | VARCHAR(255) | Display name |
| `email` | VARCHAR(255) UNIQUE | User email |
| `tag` | VARCHAR(20) | Role: `user`, `admin`, `super_admin`, `special` |
| `stripe_customer_id` | VARCHAR(255) UNIQUE | Stripe customer ID |
| `billing_status` | VARCHAR(20) | `none`, `active`, `past_due`, `cancelled`, `locked` |
| `billing_grace_deadline` | TIMESTAMPTZ | Deadline before soft-lock |
| `billing_locked_at` | TIMESTAMPTZ | When user was locked |
| `timezone` | VARCHAR(50) | User timezone (default: `UTC`) |
| `active` | BOOLEAN | Account active flag |
| `created_at` | TIMESTAMPTZ | Account creation |
| `updated_at` | TIMESTAMPTZ | Last update |

### `brands`

Brand configuration. Each user can have multiple brands.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(50) PK | Lowercase identifier (e.g., `healthycollege`) |
| `user_id` | VARCHAR(100) FK | Owner user |
| `display_name` | VARCHAR(100) | Human-readable name |
| `short_name` | VARCHAR(10) | Abbreviation for logos |
| `colors` | JSON | Full color config (primary, accent, text, light/dark mode) |
| `instagram_handle` | VARCHAR(100) | e.g., `@thehealthycollege` |
| `instagram_access_token` | TEXT | IG long-lived token |
| `instagram_business_account_id` | VARCHAR(100) | IG Business Account ID |
| `facebook_page_id` | VARCHAR(100) | FB Page ID |
| `facebook_access_token` | TEXT | FB Page token |
| `meta_access_token` | TEXT | Meta unified token |
| `threads_access_token` | TEXT | Threads token |
| `threads_user_id` | VARCHAR(64) | Threads user ID |
| `tiktok_access_token` | TEXT | TikTok access token |
| `tiktok_refresh_token` | TEXT | TikTok refresh token |
| `tiktok_user_id` | VARCHAR(64) | TikTok user ID |
| `bsky_handle` | VARCHAR(128) | Bluesky handle |
| `bsky_did` | VARCHAR(128) | Bluesky DID |
| `bsky_app_password` | TEXT | Bluesky App Password |
| `profile_image_url` | TEXT | Profile picture from first connected platform |
| `logo_path` | VARCHAR(255) | Brand logo path |
| `schedule_offset` | INTEGER | Hour offset for scheduling (0-23) |
| `posts_per_day` | INTEGER | Target posts per day |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `generation_jobs`

Tracks content generation requests and their outputs.

| Column | Type | Description |
|--------|------|-------------|
| `job_id` | VARCHAR(20) PK | Readable ID (e.g., `GEN-001234`) |
| `user_id` | VARCHAR(100) | Owner user |
| `status` | VARCHAR(20) | `queued`, `pending`, `generating`, `completed`, `failed` |
| `title` | VARCHAR(500) | Content title |
| `content_lines` | JSON | List of content text lines |
| `variant` | VARCHAR(10) | `light`, `dark`, `post`, `threads` |
| `brands` | JSON | List of brand IDs to generate for |
| `platforms` | JSON | Target platforms list |
| `content_format` | VARCHAR(30) | `format_a` or `format_b` |
| `format_b_data` | JSONB | Format B metadata (polished story, source URL, etc.) |
| `thumbnail_type` | VARCHAR(20) | `thumbnail_a` or `thumbnail_b` |
| `content_count` | INTEGER | Number of content items per brand (default 1) |
| `brand_outputs` | JSON | Per-brand generation results |
| `ai_background_path` | VARCHAR(500) | Shared AI background image path |
| `current_step` | VARCHAR(100) | Progress message |
| `progress_percent` | INTEGER | 0-100 |
| `pipeline_status` | VARCHAR(20) | `pending`, `approved`, `rejected`, `downloadable` |
| `created_by` | VARCHAR(20) | `user` or `toby` |
| `created_at` | TIMESTAMPTZ | Indexed for chronological queries |
| `started_at` | TIMESTAMPTZ | When generation began |
| `completed_at` | TIMESTAMPTZ | When generation finished |

### `scheduled_reels`

Posts scheduled for future publishing.

| Column | Type | Description |
|--------|------|-------------|
| `schedule_id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) | Owner user |
| `reel_id` | VARCHAR(36) | Content identifier |
| `caption` | TEXT | Post caption |
| `scheduled_time` | TIMESTAMPTZ | When to publish |
| `status` | VARCHAR(20) | `scheduled`, `publishing`, `published`, `failed` |
| `published_at` | TIMESTAMPTZ | Actual publish time |
| `publish_error` | TEXT | Error message if failed |
| `extra_data` | JSON | Platform list, video/image paths, variant, carousel data |
| `created_by` | VARCHAR(20) | `user` (manual) or `toby` (autonomous) |
| `created_at` | TIMESTAMPTZ | When scheduled |

**Indexes:** `(status, scheduled_time)` for the 60-second publish checker, `(user_id, status, scheduled_time)` for dedup queries.

## Content & DNA Tables

### `content_dna_profiles`

Editorial blueprints that define content identity. One DNA can serve multiple brands.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) | Owner |
| `name` | VARCHAR(100) | Profile name |
| `niche_name` | VARCHAR(100) | Niche identifier |
| `niche_description` | TEXT | Detailed niche description |
| `content_brief` | TEXT | Content strategy brief |
| `target_audience` | VARCHAR(255) | Audience description |
| `content_tone` | JSONB | Tone descriptors list |
| `topic_categories` | JSONB | Topic category list |
| `topic_keywords` | JSONB | Keywords list |
| `topic_avoid` | JSONB | Topics to avoid |
| `hook_themes` | JSONB | Hook style themes |
| `reel_examples` | JSONB | Example reels for AI reference |
| `post_examples` | JSONB | Example posts for AI reference |
| `image_style_description` | TEXT | Visual style description |
| `cta_options` | JSONB | Call-to-action options |

### `content_dna_templates`

Pre-built DNA templates that users can clone.

### `content_history`

Record of all generated content for anti-repetition tracking.

### `format_b_designs`

User preferences for Format B visual layout (image composition, text placement).

### `niche_config`

Per-brand niche configuration (legacy, being replaced by Content DNA).

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `brand_id` | VARCHAR(50) FK | Associated brand |
| `user_id` | VARCHAR(100) | Owner |
| `competitor_accounts` | JSONB | Competitor IG accounts for discovery |
| `discovery_hashtags` | JSONB | Hashtags for trend discovery |
| `citation_style` | VARCHAR | Citation format preference |
| `image_composition_style` | TEXT | Image style description |

## Toby Agent Tables

### `toby_state`

Per-user Toby configuration and scheduling state. One row per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) UNIQUE | Owner |
| `enabled` | BOOLEAN | Toby on/off |
| `phase` | VARCHAR(20) | `bootstrap`, `learning`, `optimizing` |
| `buffer_days` | INTEGER | Days of content buffer to maintain (default 7) |
| `explore_ratio` | FLOAT | Exploration ratio for Thompson Sampling (default 0.35) |
| `reel_slots_per_day` | INTEGER | Reels to generate per day (default 6) |
| `post_slots_per_day` | INTEGER | Posts per day (default 2) |
| `threads_posts_per_day` | INTEGER | Threads posts per day (default 6) |
| `reels_enabled` | BOOLEAN | Generate reels |
| `posts_enabled` | BOOLEAN | Generate carousel posts |
| `threads_enabled` | BOOLEAN | Generate Threads posts |
| `auto_schedule` | BOOLEAN | Auto-schedule after generation |
| `daily_budget_cents` | INTEGER | Daily API spend limit |
| `spent_today_cents` | INTEGER | Today's spend |
| `score_weights` | JSON | Custom scoring weights (save/share/like multipliers) |
| `last_buffer_check_at` | TIMESTAMPTZ | Last buffer fill check |
| `last_metrics_check_at` | TIMESTAMPTZ | Last metrics scoring |
| `last_analysis_at` | TIMESTAMPTZ | Last strategy analysis |
| `last_discovery_at` | TIMESTAMPTZ | Last trend discovery |

### `toby_strategy_scores`

Thompson Sampling performance tracking per strategy dimension.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) | Owner |
| `content_dna_id` | VARCHAR(36) | DNA scope (learning unit) |
| `content_type` | VARCHAR(20) | `reel` or `post` |
| `dimension` | VARCHAR(50) | `personality`, `topic`, `hook`, `format`, `title_format` |
| `option_value` | VARCHAR(200) | The specific option (e.g., `edu_calm`) |
| `alpha` | FLOAT | Beta distribution alpha (successes + 1) |
| `beta` | FLOAT | Beta distribution beta (failures + 1) |
| `sample_count` | INTEGER | Total observations |
| `avg_score` | FLOAT | Running average score |

### `toby_experiments`

A/B experiments designed by the Experiment Designer agent.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) | Owner |
| `dimension` | VARCHAR(50) | Strategy dimension being tested |
| `control_value` | VARCHAR(200) | Control arm |
| `treatment_value` | VARCHAR(200) | Treatment arm |
| `status` | VARCHAR(20) | `active`, `completed`, `expired` |
| `hypothesis` | TEXT | What the experiment is testing |
| `p_value` | FLOAT | Statistical significance |
| `effect_size` | FLOAT | Measured effect |
| `early_stopped` | BOOLEAN | Whether experiment was stopped early |

### `toby_activity_log`

Audit log of all Toby actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) | Owner |
| `action` | VARCHAR(50) | Action type (e.g., `generated`, `scored`, `discovered`) |
| `details` | TEXT | Human-readable description |
| `metadata` | JSON | Structured data |
| `level` | VARCHAR(10) | `info`, `warning`, `error` |
| `created_at` | TIMESTAMPTZ | When the action occurred |

### `toby_content_tags`

Links generated content to Toby's strategy choices for learning feedback.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(100) | Owner |
| `schedule_id` | VARCHAR(36) | Linked scheduled reel |
| `content_dna_id` | VARCHAR(36) | DNA profile used |
| `strategy` | JSON | Full strategy vector (personality, topic, hook, etc.) |
| `toby_score` | FLOAT | Performance score after metrics collection |
| `cognitive_metadata` | JSONB | Raw metrics from platform APIs |
| `is_explore` | BOOLEAN | Whether this was an exploration arm |
| `metrics_unreliable` | BOOLEAN | Flag for unreliable metrics |
| `reasoning_trace_id` | VARCHAR(36) | Link to reasoning trace |
| `critic_scores` | JSONB | Scores from the Critic agent |

### Cognitive Memory Tables

| Table | Purpose |
|-------|---------|
| `toby_episodic_memory` | Records of each content creation event ("what happened"). Includes embeddings (pgvector). |
| `toby_semantic_memory` | Generalized insights extracted from episodes ("what it means"). Confidence-weighted. |
| `toby_procedural_memory` | Learned procedures and rules ("how to do things"). |
| `toby_world_model` | Current understanding of the content landscape (audience, competition). |
| `toby_strategy_combos` | Multi-dimensional strategy combination tracking. |
| `toby_raw_signals` | Raw performance signals before aggregation. |
| `toby_meta_reports` | Meta-learner analysis reports (per-brand, periodic). |
| `toby_reasoning_traces` | Step-by-step reasoning logs for content decisions. |

### Other Toby Tables

| Table | Purpose |
|-------|---------|
| `toby_global_strategy_scores` | Cross-user aggregated strategy performance (Phase 3A). |
| `toby_context_lifts` | Contextual Thompson Sampling lifts (Phase 2). |
| `dna_evolution_log` | Tracks Content DNA parameter changes over time. |

## Configuration Tables

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `app_settings` | Global application settings (key-value) | `key` PK, `value`, `category`, `value_type`, `sensitive` |
| `oauth_states` | CSRF tokens for OAuth flows | `state_token` PK, `platform`, `brand_id`, `user_id`, `used_at` |
| `trending_content` | Discovered trending content for reference | `id`, `platform`, `url`, `engagement_score` |
| `youtube_channels` | Connected YouTube channels | `id`, `brand_id`, `channel_id`, `channel_title` |
| `trending_music` | Trending music tracks for video backgrounds | `id`, `title`, `source_url`, `duration` |
| `music_library` | System music library | `id`, `title`, `file_path`, `duration`, `genre` |
| `story_pool` | Pool of story seeds for Format B content | `id`, `topic`, `story_seed`, `used` |

## Monitoring Tables

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `log_entries` | Persistent structured log entries | `id`, `level`, `message`, `details`, `user_id`, `created_at` |
| `api_usage_log` | Per-API-call cost tracking | `id`, `user_id`, `service`, `model`, `tokens_in`, `tokens_out`, `cost_cents` |
| `user_cost_daily` | Daily cost aggregation per user | `id`, `user_id`, `date`, `total_cost_cents` |
| `user_cost_monthly` | Monthly cost aggregation per user | `id`, `user_id`, `month`, `total_cost_cents` |
| `analytics_daily_cache` | Legacy daily analytics cache | `id`, `user_id`, `date`, `followers`, `views`, `likes` |
| `analytics_snapshots` | Persistent analytics snapshots for Home chart | `id`, `user_id`, `brand_id`, `platform`, `date`, `followers`, `views`, `likes` |

## Key Relationships

```
UserProfile.user_id  <--  Brand.user_id
Brand.id             <--  ContentDNAProfile (via brand assignment)
Brand.id             <--  GenerationJob.brands (JSON array)
Brand.id             <--  ScheduledReel (via extra_data.brand)
Brand.id             <--  BrandSubscription.brand_id
Brand.id             <--  NicheConfig.brand_id
UserProfile.user_id  <--  TobyState.user_id (1:1)
UserProfile.user_id  <--  TobyContentTag.user_id
UserProfile.user_id  <--  AnalyticsSnapshot.user_id
```

:::info JSON References
Some relationships are stored as JSON rather than foreign keys (e.g., `GenerationJob.brands` is a JSON array of brand IDs). This is intentional for flexibility -- a single generation job can target multiple brands simultaneously.
:::
