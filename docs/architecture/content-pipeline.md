---
sidebar_position: 5
title: Content Pipeline
description: 3-layer content generation architecture
slug: /architecture/content-pipeline
---

# Content Pipeline

ViralToby's content generation uses a 3-layer architecture that separates static knowledge from dynamic generation logic and per-request inputs.

## 3-Layer Architecture

```
+--------------------------------------------------+
| Layer 1: PATTERN BRAIN (static)                  |
| viral_patterns.py, viral_ideas.py                |
| Viral formulas, proven structures, pattern pools |
+--------------------------------------------------+
                    |
+--------------------------------------------------+
| Layer 2: GENERATOR LOGIC (prompt templates)      |
| system_prompts.py, reel_prompts.py,              |
| post_prompts.py, image_config.py                 |
| Prompt construction, format rules, constraints   |
+--------------------------------------------------+
                    |
+--------------------------------------------------+
| Layer 3: RUNTIME INPUT (minimal per-request)     |
| Content DNA profile, brand config, strategy      |
| vector from Toby (personality, topic, hook)      |
+--------------------------------------------------+
```

**Why this matters:** Layers 1 and 2 contain thousands of lines of domain knowledge that never change per request. Layer 3 is the thin input from the user or Toby. This separation means the AI model receives consistent, high-quality context regardless of the input quality.

## DeepSeek Integration

All text generation uses the DeepSeek API:

```python
# Endpoint
DEEPSEEK_API_URL = "https://api.deepseek.com/v1"

# Concurrency control
DEEPSEEK_SEMAPHORE = asyncio.Semaphore(10)  # Max 10 concurrent API calls globally
```

The backend calls DeepSeek synchronously (FastAPI runs sync handlers in a thread pool of 60 workers). The global semaphore prevents overloading the API during burst generation.

## Content Formats

### Format A: Reel/Post with AI Background

The classic ViralToby format -- AI-generated text overlaid on an AI-generated background image, rendered as a video with music.

```
DeepSeek (text) --> ContentGeneratorV2
                         |
                         v
                    Title + Content Lines
                         |
                    +---------+
                    |         |
                    v         v
              DeAPI (image)   Caption
                    |
                    v
              Pillow (overlay text on image)
                    |
                    v
              FFmpeg (image -> video + music)
                    |
                    v
              Supabase Storage (upload)
```

**Pipeline stages:**

1. **Text Generation** (`ContentGeneratorV2` in `app/services/content/generator.py`): Calls DeepSeek with the brand's Content DNA, strategy vector, and anti-repetition context. Returns a title and content lines.

2. **Quality Scoring** (`quality_scorer.py`): Scores across 5 dimensions before proceeding.

3. **Image Generation** (`ImageGenerator` in `app/services/media/image_generator.py`): Generates an AI background via DeAPI, overlays title and content text with brand colors, renders light and dark variants.

4. **Video Generation** (`VideoGenerator` in `app/services/media/video_generator.py`): Creates a 7-8 second MP4 from the rendered image with Ken Burns zoom effect and background music.

5. **Upload**: All artifacts uploaded to Supabase Storage.

### Format B: Story Slideshow

Story-based content with sourced images, rendered as a slideshow video with crossfade transitions.

```
StoryPolisher (DeepSeek) --> Polished story + segments
                                  |
                                  v
                            ImageSourcer (find images per segment)
                                  |
                                  v
                            SlideshowCompositor (FFmpeg)
                              - Crossfade transitions
                              - Ken Burns zoom (scale+crop)
                              - Text overlay per segment
                              - Background music
                                  |
                                  v
                            Supabase Storage (upload)
```

**Key files:**

- `app/services/content/processors/` -- Format-specific processors
- `app/services/media/slideshow_compositor.py` -- FFmpeg crossfade + zoom
- `app/services/media/image_sourcer.py` -- Image sourcing for story segments

:::caution FFmpeg Zoom Pattern
Always use **scale+crop** for Ken Burns zoom, never `zoompan`. The `zoompan` filter causes visible jitter artifacts. See `feedback_ffmpeg_zoom.md` in agent memory.
:::

## Quality Scoring

Every piece of generated content is scored across 5 dimensions before it enters the pipeline:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Structure** | 20% | Text organization, slide progression, readability |
| **Familiarity** | 20% | Audience relatability, common reference points |
| **Novelty** | 20% | Originality, unique angle, surprise factor |
| **Hook Strength** | 20% | Opening line impact, scroll-stopping potential |
| **Plausibility** | 20% | Factual accuracy, believability, source quality |

### Score Thresholds

| Score | Action |
|-------|--------|
| >= 80 | **Publish** -- content meets quality bar |
| 65 - 79 | **Regenerate** -- retry with different parameters (up to 3 attempts) |
| < 65 | **Reject** -- content is discarded |

```python
# Auto-regeneration loop
for attempt in range(3):
    content = generate(strategy)
    score = quality_scorer.score(content)
    if score >= 80:
        break  # Accept
    elif score < 65:
        break  # Reject, don't retry
    # score 65-79: retry with modified strategy
```

## Content Differentiation

The `ContentDifferentiator` (`app/services/content/differentiator.py`) ensures content variety:

- **Topic variation tracking**: Tracks recently used topics per brand to avoid repetition
- **Anti-repetition fingerprinting**: Hashes content lines to detect near-duplicates
- **Cross-brand differentiation**: When multiple brands share a DNA, ensures they don't produce identical content
- **Content history**: `content_history` table stores all generated content for reference

## Prompt Architecture

Prompt templates live in `app/core/prompt_templates/`:

| File | Purpose |
|------|---------|
| `system_prompts.py` | System-level instructions for DeepSeek (role, constraints, output format) |
| `reel_prompts.py` | Reel-specific prompts (short-form video content) |
| `post_prompts.py` | Carousel/post-specific prompts (multi-slide educational content) |
| `image_config.py` | AI image generation prompts and style configuration |

### Prompt Assembly

```python
prompt = (
    system_prompt                    # Layer 1: role + constraints
    + content_dna_context            # Layer 3: niche, tone, audience
    + viral_pattern_injection        # Layer 1: relevant viral patterns
    + anti_repetition_context        # Layer 3: "avoid these recent topics"
    + strategy_constraints           # Layer 3: "use personality=data, hook=question"
    + output_format_instructions     # Layer 2: JSON output schema
)
```

## Job Processing

`JobProcessor` (`app/services/content/job_processor.py`) is the central coordinator:

```python
class JobProcessor:
    def process_job(self, job_id: str):
        job = self.load_job(job_id)

        # Route by content format
        if job.content_format == "format_b":
            return self._process_format_b(job)
        else:
            return self._process_format_a(job)

    def _process_format_a(self, job):
        for brand in job.brands:
            # Each brand processed in parallel (ThreadPoolExecutor)
            self._process_brand(job, brand)

    def _process_brand(self, job, brand):
        # 1. Generate text content
        # 2. Generate AI background image
        # 3. Render thumbnail + reel image
        # 4. Generate video with music
        # 5. Generate caption
        # 6. Upload all artifacts to Supabase Storage
        # 7. Update job.brand_outputs[brand]
```

**Parallelism:** Brands within a job are processed in parallel using `ThreadPoolExecutor`. Each brand has a timeout of `BRAND_GENERATION_TIMEOUT = 600` seconds (10 minutes).

**Job statuses:**

| Status | Description |
|--------|-------------|
| `queued` | Waiting for processing slot |
| `pending` | Accepted, about to start |
| `generating` | Actively processing |
| `completed` | All brands finished |
| `failed` | Unrecoverable error |

## Content DNA Scoping

All content generation is scoped to the brand's Content DNA profile:

```python
# The DNA provides:
dna.niche_name          # "Health & Wellness"
dna.content_tone        # ["educational", "empathetic"]
dna.topic_categories    # ["nutrition", "sleep", "exercise"]
dna.hook_themes         # ["myth-busting", "data-driven"]
dna.reel_examples       # Example content for few-shot prompting
dna.image_style_description  # "Clean, minimal, bright colors"
```

When Toby generates content, the strategy vector (personality, topic, hook) is drawn from the DNA's configured options, and learning is tracked per `(content_dna_id, content_type)`.
