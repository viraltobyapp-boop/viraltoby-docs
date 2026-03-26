---
sidebar_position: 6
title: Media Rendering
description: Image, video, and carousel rendering pipeline
slug: /architecture/media-rendering
---

# Media Rendering

ViralToby uses three rendering engines to produce visual content: **Pillow** for images, **FFmpeg** for video, and **Node.js Konva** for carousel slides. All rendering happens server-side on the backend.

## Rendering Engines Overview

| Engine | Technology | Use Case | Output |
|--------|-----------|----------|--------|
| **ImageGenerator** | Pillow (Python) | Thumbnails, reel frames, text overlays | PNG images |
| **VideoGenerator** | FFmpeg (CLI) | Reels, slideshows, Ken Burns zoom | MP4 video |
| **CarouselRenderer** | Konva (Node.js) | Multi-slide carousel posts | PNG images per slide |

All rendered artifacts are uploaded to **Supabase Storage** and referenced by URL in the database.

## Image Generation

`app/services/media/image_generator.py`

### AI Background Images

Background images are generated via the DeAPI service:

```python
# app/services/media/ai_background.py
# Calls DeAPI with a style prompt derived from the brand's Content DNA
response = deapi_client.generate(
    prompt=image_prompt,           # From image_config.py + DNA visual config
    model="ZImageTurbo_INT8",      # Default model (fallback: "freepik")
    width=1080,
    height=1920,                   # 9:16 vertical format
)
```

### Text Overlay

The `ImageGenerator` handles text rendering on images:

- **Automatic text wrapping**: Calculates line breaks based on font metrics and canvas width
- **Brand colors**: Reads from `Brand.colors` JSON (primary, accent, text, light/dark mode variants)
- **Light/dark variants**: Generates both variants for Format A content; user or Toby selects the variant
- **CTA strip**: Appends a call-to-action bar at the bottom with the brand handle

### Image Safety

`ImageSafetyChecker` (`app/services/media/image_safety_checker.py`) validates AI-generated backgrounds before use:

- Checks for NSFW content indicators
- Validates image dimensions and aspect ratio
- Falls back to a solid color background if the AI image fails safety checks

## Video Generation

`app/services/media/video_generator.py`

### Format A Videos

Standard reels: a single rendered image animated with Ken Burns zoom effect and background music.

```
Input:  1080x1920 PNG (rendered image with text overlay)
Output: 1080x1920 MP4 (7-8 seconds, H.264, AAC audio)
```

**FFmpeg pipeline:**

```bash
ffmpeg -loop 1 -i input.png \
  -i music.mp3 \
  -filter_complex "
    [0:v] scale=1242x2208, crop=1080:1920:(iw-1080)/2:(ih-1920)/2 [zoomed];
    [zoomed] fade=t=out:st=6:d=1 [v];
    [1:a] afade=t=in:d=0.5, afade=t=out:st=6:d=1.5 [a]
  " \
  -map "[v]" -map "[a]" \
  -t 7.5 -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

:::warning Ken Burns Zoom
Always use **scale + crop** for zoom effects. The `zoompan` FFmpeg filter causes visible jitter on static images. The scale+crop approach scales the image 15-25% larger than the canvas, then crops to the target size, creating a smooth zoom effect.
:::

**Duration:** Randomly selected between 7-8 seconds to avoid platform algorithmic penalties for uniform-length content.

### Format B Slideshows

`app/services/media/slideshow_compositor.py`

Multi-image slideshows with crossfade transitions and Ken Burns zoom per slide:

```
Input:  N source images + text segments
Output: MP4 with crossfade transitions between slides
```

**Composition steps:**

1. **Canvas setup**: Exact dimensions calculated for vertical video (1080x1920)
2. **Per-slide rendering**: Each source image is placed on the canvas with text overlay
3. **Ken Burns zoom**: Each slide gets a scale+crop zoom (15-25% over the slide duration)
4. **Crossfade transitions**: FFmpeg `xfade` filter between consecutive slides
5. **Text overlay**: Segment text rendered on each slide using Pillow before video compositing
6. **Music**: Background music with fade-in/fade-out

**Layout math:** The SlideshowCompositor calculates precise Y positions for the vertical image stack, ensuring consistent spacing and text placement across varying source image aspect ratios.

## Carousel Rendering

`app/services/media/carousel_renderer.py` + `app/services/media/carousel_slide_renderer.py`

Carousel posts (multi-image posts for Instagram/Facebook) are rendered using Node.js with the Konva canvas library.

### Architecture

The Python backend delegates carousel rendering to an external Node.js process:

```python
# app/services/media/carousel_renderer.py
def render_carousel_images(brand, title, background_image, slide_texts, reel_id, user_id):
    # Calls Node.js Konva renderer via subprocess
    result = subprocess.run(
        ["node", "render_carousel.js", ...],
        capture_output=True
    )
    # Returns: { "coverUrl": "...", "slideUrls": ["...", "..."] }
```

### Output

- **Cover slide**: Title + brand logo on AI background
- **Content slides**: One slide per content point, with text on branded background
- **Upload**: All slides uploaded to Supabase Storage
- **Carousel paths**: Stored in `ScheduledReel.extra_data.carousel_paths` as an ordered list of URLs

### Format B / C / D Carousels

Additional carousel renderers exist for variant formats:

| Renderer | File | Description |
|----------|------|-------------|
| Format B Carousel | `carrousel_format_b_renderer.py` | Story-based carousel with sourced images |
| Format C Slides | `slide_format_c_renderer.py` | Alternative slide layout |
| Format D Slides | `slide_format_d_renderer.py` | Another slide layout variant |

## Thumbnail Service

`app/services/media/thumbnail_service.py`

The `ThumbnailService` decouples thumbnail rendering from content format, enabling any combination of content format and thumbnail design:

```
               Content Format A    Content Format B
                    |                    |
Thumbnail A   [A x A] works       [B x A] works
Thumbnail B   [A x B] works       [B x B] works
```

**Data flow:**

1. `GenerationJob.thumbnail_type` stores the selected thumbnail design (`thumbnail_a` or `thumbnail_b`)
2. `JobProcessor` passes `thumbnail_type` to the rendering pipeline
3. `ThumbnailService.render()` applies the correct thumbnail design regardless of content format

:::tip No Hacks
There is no `thumbnail_override` field or conditional branching by format. The `thumbnail_type` column on `generation_jobs` flows cleanly through the pipeline. New content formats call `ThumbnailService.render()` and get all thumbnail designs for free. New thumbnail designs only need changes in `ThumbnailService`.
:::

## Caption Generation

`app/services/media/caption_generator.py` + `app/services/media/caption_builder.py`

Captions are generated per platform with platform-specific formatting:

| Platform | Caption Style |
|----------|--------------|
| Instagram | Full caption with hashtags, emojis, line breaks |
| Facebook | Shorter, more conversational, fewer hashtags |
| Threads | Micro-format, single thought, no hashtags |
| TikTok | Short, trending hashtags, casual tone |
| YouTube | Description-style, links, timestamps |
| Bluesky | Short, clean, no hashtags |

The `CaptionBuilder` applies brand-specific caption templates from the `NicheConfig` if configured, otherwise uses default templates.

## Music Selection

`app/services/media/music_picker.py`

Background music for videos is selected using a weighted priority system:

```
1. Trending music (highest priority)
   - Fetched periodically by TrendingMusicFetcher
   - Weighted random from trending_music table
   |
   v (if none available)
2. User-uploaded music
   - From music_library table, filtered by user_id
   - Random selection
   |
   v (if none available)
3. Local fallback music
   - Static MP3 files in assets/music/
   - Random selection (always available)
```

The `MusicPicker` handles:
- Duration matching (trims music to video length)
- Format validation (MP3, AAC)
- Weighted random selection from the trending pool
- Fallback chain to guarantee every video has music
