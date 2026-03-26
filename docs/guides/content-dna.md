---
sidebar_position: 4
title: Content DNA
description: Understanding and configuring your brand's editorial blueprint
slug: /guides/content-dna
---

# Content DNA

Content DNA is your brand's **editorial blueprint** -- it defines the voice, topics, hooks, visual style, and personality that shape every piece of content Toby creates. Think of it as the creative DNA that makes your brand recognizable and consistent across all posts.

## What is Content DNA?

Content DNA is the core identity configuration that tells Toby:

- **Who you are** -- your brand personality and tone of voice
- **What you talk about** -- topics, categories, and keywords
- **How you hook people** -- the emotional and structural patterns that grab attention
- **What to avoid** -- topics, tones, or phrases that are off-brand
- **How content looks** -- image styles, color palettes, and visual direction

Every piece of content Toby generates flows through your Content DNA. It is the single source of truth for your brand's creative direction.

## Content DNA is the Learning Unit

:::info Key Concept
Toby learns per Content DNA, not per brand. Strategy scores, performance data, and Thompson Sampling distributions are all keyed by Content DNA.
:::

This distinction matters because:

- **Multiple brands can share one Content DNA.** If you run three Instagram pages with the same editorial voice (for example, three pages in the fitness niche), they can all point to the same Content DNA. Toby treats them as one learning unit, pooling performance data across all three to learn faster.
- **One brand uses exactly one Content DNA.** Each brand points to a single DNA profile that governs all content generated for it.
- **Changing a brand's DNA resets its learning.** If you switch a brand to a different Content DNA, Toby starts learning from scratch for that brand since the editorial identity has changed.

## Creating a Content DNA Profile

### Step 1: Name and Description

Give your DNA profile a recognizable name and a brief description. If you run multiple brands, the name helps you identify which DNA belongs to which editorial direction.

- **Name**: e.g., "Fitness Motivation", "Tech News Daily", "Mindful Living"
- **Description**: A short summary for your own reference.

### Step 2: Niche Identity

Define the core niche your content lives in:

- **Niche Name**: The category (e.g., "Health & Wellness", "Personal Finance", "Tech Reviews")
- **Niche Description**: A detailed explanation of what your content covers and what makes your angle unique.
- **Content Brief**: A high-level creative brief -- what is the overarching goal of your content?

### Step 3: Target Audience

- **Target Audience**: Who your content is for (e.g., "Men 25-40 interested in strength training")
- **Audience Description**: More detail on their interests, pain points, and what resonates with them.

### Step 4: Tone of Voice

Configure the personality of your content:

- **Content Tone**: Select or type the tonal qualities you want (e.g., bold, educational, witty, provocative, empathetic).
- **Tone to Avoid**: Specify tones that are off-brand (e.g., sarcastic, aggressive, overly casual).

### Step 5: Topics

- **Topic Categories**: Broad categories your content falls under (e.g., "Nutrition", "Workout Routines", "Recovery")
- **Topic Keywords**: Specific keywords and phrases that frequently appear in your content.
- **Topics to Avoid**: Subjects you want Toby to steer clear of.

### Step 6: Hooks and Philosophy

- **Hook Themes**: The emotional or structural patterns your hooks should follow (e.g., "Surprising facts", "Myth-busting", "Before/after transformations").
- **Content Philosophy**: Your guiding principle for content creation (e.g., "Evidence-based information presented in a visually striking way that stops the scroll").

### Step 7: Visual Direction

- **Image Style Description**: How AI-generated background images should look (e.g., "Dark, moody gym photography with dramatic lighting").
- **Image Palette Keywords**: Color descriptors for the visual style (e.g., "deep blue", "neon accents", "earth tones").

### Step 8: Additional Configuration

- **CTA Options**: Call-to-action phrases Toby can use (e.g., "Follow for more", "Save this for later", "Share with a friend who needs this").
- **Hashtags**: Default hashtags to include in captions.
- **Competitor Accounts**: Accounts in your niche that Toby can study for trend discovery.
- **Discovery Hashtags**: Hashtags for Toby's trend scouting.

---

## DNA Examples

When you create or update a Content DNA profile, ViralToby automatically generates **DNA examples** -- sample content pieces that show exactly how your DNA will sound in practice.

These examples are generated across your active content formats (Reels, Carousels, Threads) so you can see:

- How the tone translates into actual content
- Whether the hook style feels right
- How topics are framed for each content type

:::tip
Review your DNA examples after making changes to the DNA profile. If the examples do not sound right, adjust your tone, topics, or content brief and regenerate. This is the fastest way to fine-tune your voice before Toby starts creating real content.
:::

---

## Content DNA Templates

ViralToby provides **pre-built DNA templates** for common niches. Templates give you a head start by filling in:

- Niche identity and description
- Tone of voice settings
- Topic categories and keywords
- Hook themes and content philosophy
- CTA options and hashtags

You can use a template as-is or customize it to fit your specific brand. Templates are available for niches like fitness, personal finance, tech, lifestyle, food, fashion, and more.

---

## Four Content Lanes

Content DNA governs four content types (lanes), each with its own characteristics:

| Lane | Internal Key | Description |
|------|-------------|-------------|
| **Reel (Format A)** | `reel` | Text overlay on AI-generated or sourced background image. The classic viral reel format. |
| **Reel (Format B)** | `format_b_reel` | Slideshow-style reel with a header image and multiple content slides with crossfade transitions and Ken Burns zoom. |
| **Carousel** | `post` | Multi-slide image posts. Each slide is individually rendered with cover + content slides. |
| **Thread** | `threads_post` | Text-only posts optimized for Threads and Bluesky. No images or video. |

Toby learns strategy effectiveness separately for each lane. A hook style that works well for Reels might not work for Threads, and Toby's Thompson Sampling accounts for this.

---

## How DNA Scoping Works

When Toby evaluates content performance and selects strategies, everything is scoped by Content DNA:

1. **Strategy scores** are stored per `(content_dna_id, content_type, dimension, option)`. This means Toby's knowledge of which hooks work, which personalities resonate, and which topics perform best is specific to each DNA profile.

2. **Cross-brand learning**: If two brands share the same DNA, they contribute to the same strategy scores. A successful hook on Brand A teaches Toby something that benefits Brand B.

3. **No cross-DNA contamination**: DNA profiles are fully isolated. Toby does not apply what it learned in your "Tech News" DNA to your "Fitness Motivation" DNA.

4. **Cold start fallback**: When a brand first connects to a new DNA with no performance data, Toby uses **global priors** -- aggregated data from all users using similar strategies -- to make reasonable initial choices.

---

## Tips for Writing Effective DNA Profiles

### Be specific, not generic

Instead of "Write engaging health content," try: "Create evidence-backed health tips that challenge conventional wisdom. Lead with surprising facts. Always cite real studies or expert opinions."

### Define what NOT to do

The **Tone to Avoid** and **Topics to Avoid** fields are just as important as the positive directions. They prevent Toby from drifting into territory that feels off-brand.

### Include examples

The **Reel Examples** and **Post Examples** fields accept sample content. These give Toby concrete reference points for your style. The more examples you provide, the more accurately Toby captures your voice.

### Review and iterate

Your Content DNA is not static. As Toby publishes content and you see what resonates with your audience, come back and refine:

- Sharpen your hook themes based on what performs well
- Add new topic categories as your niche evolves
- Adjust tone if your audience responds to a particular style

:::warning
Making frequent large changes to your Content DNA can slow down Toby's learning, because strategy scores need time to accumulate. Make incremental adjustments rather than complete overhauls.
:::

---

## How Toby Evolves Strategy Within Each DNA

Toby does not just follow your DNA instructions blindly. Over time, it learns which specific combinations of personality, topic, hook style, and title format perform best for your audience.

Here is the process:

1. **Initial exploration**: Toby tries all strategy options defined by your DNA with equal probability.
2. **Performance scoring**: After content is published and receives engagement (views, saves, shares), Toby scores each piece.
3. **Thompson Sampling update**: Winning strategies get higher probability in future selections. Losing strategies get lower probability but are never fully abandoned.
4. **Continuous exploration**: Even after finding what works, Toby keeps 35% of content in "exploration mode" -- trying new combinations to discover emerging patterns.

This means your Content DNA sets the creative boundaries, while Toby optimizes within those boundaries based on real performance data.
