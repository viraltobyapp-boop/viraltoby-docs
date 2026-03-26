---
sidebar_position: 1
title: System Overview
description: High-level architecture of ViralToby
slug: /architecture/system-overview
---

# System Overview

ViralToby is an autonomous social media content engine. It generates, schedules, and publishes visual content across six platforms, guided by an AI agent (Toby) that continuously learns what performs best.

## Architecture Diagram

```
                         +-------------------+
                         |   React / Vite    |
                         |  (Frontend SPA)   |
                         +--------+----------+
                                  |
                          REST API (JSON)
                                  |
                         +--------v----------+
                         |  FastAPI Backend   |
                         |  (Python 3.11+)   |
                         +--+--+--+--+--+----+
                            |  |  |  |  |
              +-------------+  |  |  |  +------------+
              |                |  |  |               |
     +--------v-------+  +----v--v--v----+  +--------v--------+
     |  PostgreSQL     |  |  DeepSeek API |  |  Platform APIs  |
     |  (Supabase)     |  |  (content gen)|  |  Meta / Google  |
     +--------+--------+  +----+----+----+  |  TikTok / Bsky  |
              |                |    |        +-----------------+
     +--------v--------+      |    |
     | Supabase Storage |      |    +-----> DeAPI (AI images)
     | (media files)    |      |
     +-----------------+       +-----> Stripe API (billing)
```

**Data flow summary:**

1. Frontend sends generation requests to the backend API
2. Backend calls DeepSeek for text content, DeAPI for AI background images
3. Pillow renders thumbnails, FFmpeg produces video, Konva renders carousels
4. Media is uploaded to Supabase Storage, metadata persisted to PostgreSQL
5. APScheduler publishes due posts to connected platforms via their APIs
6. Supabase Realtime pushes DB changes to the frontend via WebSocket

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Query (TanStack Query), Supabase Realtime |
| **Backend** | FastAPI, SQLAlchemy 2.x, APScheduler, structlog |
| **AI / Content** | DeepSeek API (text generation), DeAPI (AI background images) |
| **Media** | Pillow (image rendering), FFmpeg (video compositing), Konva via Node.js (carousel slides) |
| **Database** | PostgreSQL 15 (Supabase-hosted), PgBouncer transaction-mode pooling |
| **Storage** | Supabase Storage (S3-compatible, public bucket for media) |
| **Auth** | Supabase Auth (JWT), row-level user isolation |
| **Billing** | Stripe (per-brand subscriptions, webhooks) |
| **Deployment** | Railway (Docker), push-to-main CI/CD |
| **Monitoring** | structlog JSON logging, in-DB log entries, API usage tracking |

## Directory Structure

```
app/                          # Backend (Python / FastAPI)
  api/                        # Route handlers, grouped by domain
    analytics/                #   Analytics endpoints (v1, v2, home chart)
    auth/                     #   Auth + OAuth routes (IG, FB, Threads, TikTok, Bsky)
    billing/                  #   Stripe checkout, portal, webhooks
    brands/                   #   Brand CRUD, niche config, Content DNA, caption templates
    content/                  #   Generation, Format B, music, prompts, jobs
    pipeline/                 #   Content approval workflow
    system/                   #   Settings, logs, admin, health, legal
    threads/                  #   Threads-specific generation + publishing
    toby/                     #   Toby agent API (status, config, activity)
    youtube/                  #   YouTube channel management
    routes.py                 #   Legacy /reels aggregator
    schemas.py                #   Shared Pydantic schemas
  core/                       # Domain knowledge (patterns, prompts, quality)
    prompt_templates/         #   System/reel/post/image prompt templates
    quality_scorer.py         #   5-dimension content quality scoring
    viral_patterns.py         #   Static viral content patterns
    platforms.py              #   Platform capability matrix
  models/                     # SQLAlchemy ORM models
    auth.py                   #   UserProfile
    brands.py                 #   Brand
    billing.py                #   BrandSubscription
    jobs.py                   #   GenerationJob
    scheduling.py             #   ScheduledReel
    toby.py                   #   TobyState, TobyExperiment, TobyStrategyScore, etc.
    toby_cognitive.py         #   Episodic/Semantic/Procedural memory, WorldModel
    content_dna.py            #   ContentDNAProfile
    ...                       #   (20+ model files total)
  services/                   # Business logic services
    analytics/                #   Analytics fetching, snapshots, trend scouting
    billing/                  #   Stripe enforcement, status calculation
    brands/                   #   Brand resolution, management
    content/                  #   Content generation, job processing, differentiator
    discovery/                #   Trend and competitor discovery
    email/                    #   Transactional email
    logging/                  #   Structured logging service
    media/                    #   Image gen, video gen, thumbnails, music, carousels
    monitoring/               #   API usage tracking, cost aggregation
    oauth/                    #   OAuth helpers
    publishing/               #   Scheduler, social publisher, platform publishers
    storage/                  #   Supabase storage upload/download
    toby/                     #   Orchestrator, cognitive agents, learning engine, memory
    youtube/                  #   YouTube API integration
  utils/                      # Utility functions
  db_connection.py            # Engine, session factory, migrations
  main.py                     # FastAPI app, middleware, startup, scheduler registration

src/                          # Frontend (React / TypeScript)
  app/                        # App shell: layout, routing, providers, React Query config
  features/                   # Feature modules (analytics, billing, brands, calendar, etc.)
  pages/                      # Page-level components (Home, Pipeline, Settings, Welcome)
  shared/                     # Shared hooks, components, utilities, types
  main.tsx                    # Entry point
```

## Key Services Overview

| Service Group | Directory | Responsibility |
|--------------|-----------|---------------|
| **Content** | `services/content/` | Text generation (DeepSeek), job processing pipeline, content differentiation, Format A/B processors |
| **Media** | `services/media/` | Image rendering (Pillow), video compositing (FFmpeg), carousel slides (Konva), thumbnails, music selection |
| **Publishing** | `services/publishing/` | Scheduler (60s interval), platform publishers (IG, FB, Threads, TikTok, Bluesky), token refresh |
| **Toby** | `services/toby/` | Orchestrator (5m tick), 12 cognitive agents, Thompson Sampling learning engine, memory subsystem |
| **Analytics** | `services/analytics/` | Live API fetch (Meta/Google), persistent snapshots, trend scouting |
| **Billing** | `services/billing/` | Stripe webhook handling, billing status enforcement, soft-lock logic |
| **Monitoring** | `services/monitoring/` | API call cost tracking, daily/monthly aggregation |
| **OAuth** | `services/oauth/` | OAuth state management |
| **Storage** | `services/storage/` | Supabase Storage upload/download, path conventions |
| **Brands** | `services/brands/` | Brand resolution, management, seeding |

## Reactivity Architecture

ViralToby uses zero-polling reactivity. All real-time UI updates flow through Supabase Realtime subscriptions.

```
PostgreSQL row change
        |
        v
Supabase Realtime (WebSocket)
        |
        v
use-realtime-sync.ts handler
        |
        +-- Progress updates --> delta-patch React Query cache (instant UI)
        |
        +-- Status transitions --> invalidate React Query cache
                                        |
                                        v
                                  API refetch (server recomputes lifecycle)
```

:::info Key Design Decision
The `lifecycle` field (e.g., `generating`, `pending_review`, `scheduled`, `published`) is **computed server-side** from `status`, `pipeline_status`, and `brand_outputs`. It is never stored in the database or sent via Realtime. The only way to get the correct lifecycle is to refetch from the API.
:::

**Query freshness rules:**

| Data Type | staleTime | Invalidation Source |
|-----------|-----------|-------------------|
| User-action data (brands, settings) | 0 | Mutations on success |
| Background data (analytics, activity) | 15-60s | Time-based staleness |
| Pipeline / generation jobs | 0 | Supabase Realtime subscription |

## Background Job System

APScheduler runs as a `BackgroundScheduler` inside the FastAPI process. On multi-worker deployments, a **file lock** at `/tmp/.viraltoby_scheduler.lock` ensures only one worker runs background jobs (the others skip scheduler registration).

### Recurring Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| **Publish checker** | 60 seconds | Finds due `ScheduledReel` rows and publishes them to connected platforms |
| **Toby tick** | 5 minutes | Orchestrator loop: buffer check, metrics scoring, strategy analysis, discovery, phase transitions |
| **Analytics refresh** | 1 hour | Fetches metrics from Meta/Google APIs, persists snapshots for Home chart |
| **Cost aggregation** | Daily | Rolls up `APIUsageLog` entries into `UserCostDaily` and `UserCostMonthly` |
| **Token refresh** | 6 hours | Proactively refreshes Instagram long-lived tokens before expiry |
| **Schedule recovery** | 15 minutes | Finds approved-but-unscheduled jobs and re-schedules them (self-healing) |

### Startup Recovery

On every server start, the backend automatically:

1. Resumes interrupted `generating` jobs from previous crashes
2. Resets stuck `publishing` posts older than 10 minutes back to `scheduled`
3. Recovers approved-but-unscheduled jobs
4. Re-renders missing carousel images for scheduled posts
