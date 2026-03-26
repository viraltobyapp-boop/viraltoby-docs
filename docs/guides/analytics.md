---
sidebar_position: 8
title: Analytics
description: Understanding your content performance metrics
slug: /guides/analytics
---

# Analytics

ViralToby provides comprehensive analytics to help you understand how your content performs across platforms. The analytics system has two layers: a **live dashboard** for detailed exploration, and **persistent snapshots** for historical tracking on your Home page.

## Analytics Dashboard

Access the full analytics dashboard from the **Analytics** tab in the navigation. The dashboard fetches data directly from platform APIs (Instagram, Facebook, YouTube) and presents it across four tabs.

### Overview Tab

The Overview tab gives you a high-level view of your account performance:

- **Reach** -- Daily time-series chart showing how many unique accounts saw your content over the past 28 days.
- **Follower Gains** -- Track how your follower count is growing over time.
- **Likes** -- Total likes across your content over the selected period.

Data is fetched from the Meta Graph API (for Instagram and Facebook) and YouTube Data API. The overview covers up to 28 days of historical data, which is the maximum window that Instagram's API provides.

### Posts Tab

The Posts tab shows a paginated list of your published content with per-post performance metrics:

| Metric | Description |
|--------|-------------|
| **Views** | Total number of times your post was viewed |
| **Reach** | Number of unique accounts that saw your post |
| **Saves** | How many users saved your post |
| **Shares** | How many users shared your post |

Posts are displayed with thumbnails and sorted by recency. The visible page (up to 50 posts) is enriched with detailed per-post insights in the background.

:::info
ViralToby only fetches detailed insights for the posts currently visible on your screen (up to 50 at a time). This keeps API usage efficient and avoids rate limiting.
:::

### Answers Tab

The Answers tab analyzes your posting patterns and tells you:

- **Best Day** -- Which day of the week your posts get the most engagement (based on average likes per post).
- **Best Hour** -- Which hour of the day performs best.
- **Best Content Type** -- Which format (Reels, Carousels, Threads) performs best for your audience.
- **Optimal Frequency** -- How often you should post for maximum engagement.

These insights are computed from your actual post data -- they reflect your real audience behavior, not generic recommendations.

### Audience Tab

The Audience tab shows follower demographics:

- **Age & gender breakdown** -- Distribution of your followers by age group and gender.
- **Top countries** -- Where your followers are located.
- **Top cities** -- The cities with the highest concentration of followers.

Audience data comes from the `follower_demographics` metric on the Instagram/Facebook API.

:::warning
Audience demographics require a minimum follower count (set by each platform) to be available. If your account is new, this tab may show limited or no data.
:::

---

## Home Page Chart

The Home page displays a summary chart of your performance over time. Unlike the analytics dashboard (which fetches live from APIs), the Home chart uses **persistent snapshots** stored in the database.

### How Snapshots Work

Every time analytics are refreshed (manually, hourly, or on platform connect), ViralToby captures a snapshot of your current metrics and stores it in the `analytics_snapshots` table:

| Field | Description |
|-------|-------------|
| **Followers** | Your current total follower count at the time of capture |
| **Views** | Daily views for the snapshot date |
| **Likes** | Daily likes for the snapshot date |

### Why Snapshots Matter

- **Survive restarts** -- Unlike the in-memory analytics cache, snapshots are stored in the database and persist across server restarts.
- **Grow over time** -- Instagram's API only provides 28 days of historical data, but snapshots accumulate indefinitely. After a few months, your Home chart shows trends that go well beyond the 28-day API limit.
- **Instant load** -- The Home chart reads from the database, not from external APIs. It loads instantly with zero external API calls.

### First-Time Data

When you first connect a platform, ViralToby immediately fetches analytics and stores snapshots. This includes a backfill of up to 28 days of historical views from Instagram's API, so new users see meaningful data within seconds of connecting.

---

## Toby Score

Toby Score is how Toby rates the performance of its own published content. This is separate from the analytics dashboard -- it is part of Toby's learning loop.

### How Scoring Works

1. After content is published and at least 48 hours have passed, Toby fetches engagement metrics from the platform API.
2. Metrics (views, saves, shares, likes) are weighted to produce a performance score. Saves and shares are weighted more heavily than likes because they indicate deeper engagement.
3. The score is stored with the content and used to update strategy scores via Thompson Sampling.

### Scoring Weights

By default, Toby uses these engagement weights:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Saves | 3x | Strongest intent signal -- users want to return to this content |
| Shares | 3x | Distribution signal -- users think this is worth sharing |
| Likes | 0.2x | Weakest signal -- low-effort engagement |

:::tip
You can customize these scoring weights in your Toby settings. If your niche values comments or shares differently, adjust the weights to match.
:::

### What Toby Scores

Toby only scores content it created (marked with `created_by: toby`). Manually created content is not included in Toby's learning data -- this prevents your manual posts from confusing Toby's strategy optimization.

Metrics are fetched **once** per post at scoring time and stored permanently. Toby does not re-fetch metrics for already-scored content, keeping API usage minimal.

---

## Refresh Mechanism

### Automatic Refresh

ViralToby refreshes analytics automatically on an hourly schedule. This hourly job:

1. Fetches fresh data from all connected platform APIs.
2. Updates the in-memory analytics cache for the dashboard.
3. Captures new snapshots for the Home chart.

### Manual Refresh

You can manually refresh analytics at any time by clicking the **Refresh** button on the analytics dashboard. There is a 10-minute cooldown between manual refreshes to prevent excessive API usage.

### On-Connect Refresh

When you first connect a new platform via OAuth, analytics are fetched immediately. You do not need to wait for the next hourly cycle.

---

## Rate Limiting and API Usage

ViralToby is designed to stay well within platform API rate limits:

- **Hourly analytics refresh** -- Once per hour for all users, not per-minute polling.
- **Per-post insights** -- Only fetched for the visible page (max 50 posts at a time), using 10 concurrent threads for speed.
- **Manual refresh cooldown** -- 10-minute minimum between manual refreshes.
- **One-time scoring** -- Toby fetches post metrics once for scoring and never re-fetches them.

These measures ensure your analytics data stays fresh without risking API throttling or account restrictions.

---

## How Analytics Connects to Toby's Learning

Analytics data flows into Toby's learning system in several ways:

### Direct Performance Scoring

Published content metrics feed directly into strategy score updates. When Toby scores a post, it updates the Thompson Sampling distributions for every strategy dimension used in that content (personality, topic, hook, title format).

### Trend Detection

The analytics data helps Toby detect when a strategy's effectiveness is declining (drift detection). If saves and shares drop over time for a previously successful strategy, Toby increases its explore ratio to find new winning approaches.

### Anomaly Detection

Toby's Analyst agent identifies breakout content -- posts that significantly outperform the baseline. These anomalies receive extra attention: the Reflector writes detailed memories about what made them successful, and the Strategist factors them into future planning.

### Audience Insights

Demographic data from the Audience tab (when available) can inform content strategy. If most of your followers are in a specific age group or location, Toby can adapt its content accordingly.

:::info
Analytics data updates in real-time in the ViralToby dashboard thanks to Supabase Realtime subscriptions. When new snapshots are captured or metrics are updated, the UI reflects the changes without requiring a page refresh.
:::
