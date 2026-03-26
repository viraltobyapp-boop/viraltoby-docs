---
sidebar_position: 2
title: Setting Up Brands
description: Create and configure brands in ViralToby
slug: /guides/setting-up-brands
---

# Setting Up Brands

A **Brand** is the foundational unit in ViralToby. Each brand represents a distinct social media presence with its own identity, connections, content strategy, and analytics.

## Creating a Brand

1. Navigate to **Brands** in the sidebar
2. Click **Create Brand**
3. Fill in the brand details:
   - **Name** — Your brand's display name
   - **Niche** — The content niche (e.g., tech, fitness, food)
   - **Description** — A brief description of what this brand is about

## Brand Configuration

Each brand has several configuration layers:

### Social Connections

Connect your social media accounts under the brand's **Connections** tab. Each platform requires its own OAuth flow or authentication method. See [Connecting Platforms](/guides/connecting-platforms) for details.

### Content DNA

Your brand's editorial blueprint. This defines the personality, topics, hooks, and title formats that Toby will use when generating content. See [Content DNA](/guides/content-dna) for a deep dive.

### Design Preferences

Configure how your content looks:

- **Format A Design** — Colors, fonts, and layout for text-overlay reels
  - Light and dark variants
  - Brand colors (primary, secondary, accent)
  - Logo overlay

- **Format B Design** — Settings for slideshow reels
  - Header text styling
  - Image layout preferences
  - Transition effects

- **Thumbnail Design** — How thumbnails appear in the Pipeline and Calendar
  - Thumbnail type A or B
  - Independent from content format (all 4 combinations work)

### Niche Configuration

Fine-tune content generation parameters:

- **Content types** — Which formats to generate (reels, carousels, threads)
- **Topics** — Specific topics within your niche
- **Tone** — The overall tone of voice
- **Target audience** — Who you're creating content for

## Multi-Brand Management

ViralToby supports managing multiple brands from a single account:

- Each brand has **isolated analytics** — metrics don't cross-contaminate
- **Content DNA is per-brand** — Toby learns separately for each brand
- **Scheduling is per-brand** — Each brand has its own publishing cadence
- **Connections are per-brand** — Different social accounts per brand

:::tip
For agencies managing many brands, you can quickly switch between brands using the brand selector in the top navigation.
:::

## Brand Lifecycle

| State | Description |
|-------|-------------|
| **Active** | Brand is fully operational, generating and publishing content |
| **Paused** | Content generation is paused, scheduled content still publishes |
| **Disconnected** | Social accounts disconnected, no publishing possible |

## Next Steps

- [Connect your social platforms](/guides/connecting-platforms)
- [Set up your Content DNA](/guides/content-dna)
- [Enable Toby for autonomous generation](/guides/using-toby)
