---
sidebar_position: 1
title: Overview
description: What is ViralToby and how does it work
slug: /guides/overview
---

# Welcome to ViralToby

ViralToby is an **autonomous content creation and publishing platform** that uses AI to generate, schedule, and publish social media content across multiple platforms — all on autopilot.

## What ViralToby Does

At its core, ViralToby handles the entire content lifecycle:

1. **Generate** — AI creates original content (reels, carousels, threads) tailored to your brand voice
2. **Review** — You approve or reject content in the Pipeline before it goes live
3. **Schedule** — Approved content is automatically scheduled for optimal posting times
4. **Publish** — Content is published to your connected platforms (Instagram, Facebook, YouTube, Threads, TikTok, Bluesky)
5. **Learn** — Toby (the AI agent) analyzes performance and adapts its strategy over time

## Key Concepts

### Brands

A **Brand** is the central unit in ViralToby. Each brand has its own:

- Social media connections (Instagram, Facebook, etc.)
- Content DNA (editorial blueprint)
- Design preferences (colors, fonts, layouts)
- Publishing schedule
- Performance analytics

You can manage multiple brands from a single account — perfect for agencies or multi-brand creators.

### Content DNA

**Content DNA** is your brand's editorial blueprint. It defines:

- **Personality** — How your brand speaks (authoritative, casual, witty, etc.)
- **Topics** — What your brand talks about
- **Hooks** — How your content grabs attention
- **Title formats** — The structural pattern of your titles

Toby uses your Content DNA to generate content that sounds authentically like your brand. Over time, it learns which combinations perform best and adjusts accordingly.

### Toby — The AI Agent

**Toby** is ViralToby's autonomous AI agent. Unlike simple schedulers, Toby:

- **Generates content** using an ensemble of 11 cognitive agents
- **Learns from performance** using Thompson Sampling (a multi-armed bandit algorithm)
- **Adapts strategy** based on what works for YOUR audience
- **Manages content buffer** ensuring you always have content ready for the next 7 days
- **Discovers trends** through TrendScout, finding new content angles

Toby runs in phases:
- **Bootstrap** (first ~100 pieces) — aggressive generation to build data
- **Learning** (100-500 pieces) — steady learning from results
- **Optimizing** (500+ pieces) — full optimization using learned preferences

### Content Formats

ViralToby supports multiple content formats:

| Format | Description | Platforms |
|--------|-------------|-----------|
| **Format A Reels** | Text-overlay reels with AI backgrounds and music | Instagram, Facebook, YouTube, TikTok |
| **Format B Reels** | Slideshow reels with header text and multiple images | Instagram, Facebook, YouTube, TikTok |
| **Carousels** | Multi-slide image posts | Instagram, Facebook |
| **Threads** | Text-only posts | Threads, Bluesky |

### Pipeline & Approval

The **Pipeline** is your content approval queue. Every piece of generated content goes through:

1. **Generating** — AI is creating the content
2. **Pending Review** — Content is ready for your approval
3. **Approved/Scheduled** — You approved it, it's queued for publishing
4. **Published** — Live on your platforms

You maintain full control — nothing gets published without your approval.

## Getting Started

1. **[Set up your brands](/guides/setting-up-brands)** — Create your first brand and configure its identity
2. **[Connect platforms](/guides/connecting-platforms)** — Link your social media accounts
3. **[Define your Content DNA](/guides/content-dna)** — Tell Toby how to create content for your brand
4. **[Enable Toby](/guides/using-toby)** — Turn on autonomous content generation
5. **[Review your Pipeline](/guides/pipeline-approval)** — Approve content and watch it go live

## Supported Platforms

| Platform | Auth Method | Content Types |
|----------|-------------|---------------|
| **Instagram** | Meta Business OAuth | Reels, Carousels |
| **Facebook** | Meta Business OAuth | Reels, Carousels |
| **YouTube** | Google OAuth | Shorts (Reels) |
| **Threads** | Meta Threads OAuth | Text Posts |
| **TikTok** | TikTok OAuth | Videos |
| **Bluesky** | App Password | Text Posts |

