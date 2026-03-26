---
sidebar_position: 6
title: Pipeline & Approval
description: Review, approve, and manage your content pipeline
slug: /guides/pipeline-approval
---

# Pipeline & Approval

The Pipeline is where you review, approve, and manage all content before it goes live. Every piece of content -- whether created by Toby or manually -- passes through the Pipeline, giving you full control over what gets published.

## Why a Pipeline?

ViralToby is designed with a **human-in-the-loop** approval process. This serves two purposes:

1. **Quality control** -- You always have the final say on what represents your brand.
2. **Platform compliance** -- Meta's Terms of Service require human oversight for AI-generated content. The Pipeline ensures compliance by design.

:::info
Toby generates content and recommends it for publishing, but only you can approve it. This keeps you in control while letting Toby handle the creative heavy lifting.
:::

---

## Content Lifecycle

Every piece of content moves through a clear lifecycle:

```
Generating → Pending Review → Approved → Scheduled → Published
```

### Lifecycle Stages

| Stage | What Happens | Your Action |
|-------|-------------|-------------|
| **Generating** | Content is being created -- AI text, images, video rendering in progress. | Wait. You will see a progress indicator. |
| **Pending Review** | Content is complete and waiting for your review in the Pipeline. | Review and approve or reject. |
| **Approved** | You approved the content. It will be auto-scheduled to your next available time slot. | No action needed. |
| **Scheduled** | Content has an assigned publish date and time. It will go live automatically. | Optionally reschedule or cancel. |
| **Published** | Content was successfully published to your connected platforms. | View performance in Analytics. |

### Additional Statuses

| Status | Meaning |
|--------|---------|
| **Rejected** | You rejected the content. It is discarded and Toby learns from the rejection. |
| **Failed** | Publishing failed (e.g., token expired, API error). You can retry or discard. |
| **Paused** | Content was paused (usually due to billing issues). Resumes when billing is resolved. |

---

## Reviewing Content

When content reaches "Pending Review" status, you can review it in the Pipeline page.

### What You See

For each content piece in the Pipeline, you can:

- **Preview the video** -- Watch the full rendered Reel or view all Carousel slides.
- **Read the caption** -- See the platform-specific caption that will be posted.
- **Check the title** -- Review the headline and content points.
- **See the quality score** -- View the QSF score (0-100) that the content received.
- **View metadata** -- Content format, which brands it will publish to, creation time.

### Approving Content

Click **Approve** to move content forward. Approved content is automatically scheduled based on your posting schedule:

- If you have empty time slots coming up, the content is assigned to the next available slot.
- Your posting schedule (configured in Toby settings) determines how many Reels, Carousels, and Threads per day.
- Time slots are distributed throughout the day based on your audience's optimal engagement times.

### Rejecting Content

Click **Reject** to discard content. Rejected content is:

- Removed from the Pipeline permanently.
- Recorded as a rejection signal. Toby factors rejections into its learning -- if you consistently reject a particular style or topic, Toby reduces its probability in future content plans.

:::tip
When rejecting content, the rejection itself teaches Toby. Over time, you will see fewer pieces that match the patterns you tend to reject. Your review decisions directly shape Toby's creative direction.
:::

---

## Auto-Scheduling

When you approve content, ViralToby automatically assigns it a publish time. Auto-scheduling considers:

1. **Your daily posting limits** -- How many Reels, Carousels, and Threads per day (configured in Toby settings).
2. **Time slot distribution** -- Posts are spread throughout the day, not clustered.
3. **Slot availability** -- If a slot is already taken, the next available slot is used.
4. **Platform timezone** -- Scheduling respects your configured timezone.

You can manually override the scheduled time by editing the content's publish time in the Calendar view.

---

## Pipeline Filtering and Sorting

The Pipeline page provides filtering and sorting options to help you manage your content:

### Filters

- **Status** -- Filter by lifecycle stage (Pending, Approved, Scheduled, Published, Rejected)
- **Brand** -- Show content for a specific brand
- **Content type** -- Filter by Reels, Carousels, or Threads
- **Creator** -- Filter by who created the content (Toby vs. manual)

### Sorting

- **Newest first** -- Most recently created content at the top (default)
- **Oldest first** -- Oldest content at the top
- **Quality score** -- Highest-scoring content first

---

## Bulk Actions

For efficiency, the Pipeline supports bulk operations:

- **Approve all** -- Approve all pending content in one click.
- **Select multiple** -- Select specific pieces and approve or reject them together.

:::warning
Use "Approve all" carefully. While Toby's quality scoring filters out low-quality content, reviewing at least a few pieces ensures the voice and topics match your expectations, especially when you first set up your Content DNA.
:::

---

## Calendar View

The Calendar view shows your scheduled content on a visual calendar:

- See which posts are scheduled for which days and times.
- Identify gaps in your publishing schedule.
- Drag and drop content to reschedule (where supported).
- Spot potential issues like too many posts on one day.

The Calendar is especially useful for planning around events, holidays, or themed content weeks.

---

## How Pipeline Status and Job Status Work Together

Behind the scenes, each content piece has two status fields:

| Field | Purpose | Values |
|-------|---------|--------|
| **status** | The generation job's technical status | `pending`, `generating`, `completed`, `failed` |
| **pipeline_status** | The human review status | `pending`, `approved`, `rejected`, `downloadable` |

These combine to determine the content's **lifecycle** -- the user-facing stage shown in the Pipeline UI. The lifecycle is computed server-side from both fields plus additional data like brand output statuses and publish records.

For example:
- `status=completed` + `pipeline_status=pending` = **Pending Review**
- `status=completed` + `pipeline_status=approved` + scheduled time assigned = **Scheduled**
- `status=completed` + `pipeline_status=approved` + published to all brands = **Published**

:::info
You do not need to understand the internal status fields -- the Pipeline UI shows the clear lifecycle stage. This detail is provided for advanced users who want to understand the underlying data model.
:::

---

## Meta Terms of Service Compliance

ViralToby's Pipeline is designed to comply with Meta's requirements for AI-generated content:

- **Human review is mandatory** -- AI-generated content is never auto-published. A human must approve every piece.
- **Content is clearly generated** -- The system tracks that content was created by Toby (via the `created_by` field).
- **User has final authority** -- You can reject any content, edit captions, and control scheduling.

This human-in-the-loop approach keeps your accounts safe and compliant with platform Terms of Service.
