---
sidebar_position: 7
title: Using Toby
description: How Toby, the autonomous AI agent, works
slug: /guides/using-toby
---

# Using Toby

Toby is ViralToby's autonomous AI agent. Unlike a simple scheduler or template system, Toby is a learning system that creates content, analyzes performance, discovers trends, and continuously improves its strategy based on what works for your audience.

## What Toby Is

Toby is an **autonomous content creation agent** that:

- Generates original content (Reels, Carousels, Threads) based on your Content DNA
- Learns which strategies perform best using Thompson Sampling
- Maintains your content buffer so you always have posts ready
- Scores published content and feeds results back into its strategy
- Discovers trending topics and adapts your content plan
- Operates continuously in the background without manual intervention

Toby is not a set-it-and-forget-it tool. It actively evolves its approach over time, getting better at creating content that resonates with your specific audience.

---

## Enabling and Disabling Toby

### Enabling Toby

Toby can be enabled or disabled per brand from your brand settings. When you enable Toby:

1. Toby starts in **Bootstrap phase** (aggressive content generation to fill your buffer).
2. It immediately begins checking your content buffer and generating new content.
3. Generated content appears in your [Pipeline](/guides/pipeline-approval) for review.

### Disabling Toby

When you disable Toby:

- Content generation stops.
- Already-scheduled content remains scheduled and will still publish.
- Your strategy scores and learning data are preserved -- if you re-enable Toby, it picks up where it left off.

---

## The Tick Loop

Toby runs on a **5-minute tick loop**. Every 5 minutes, the orchestrator wakes up and processes all users with Toby enabled.

### What Happens Each Tick

On each tick, Toby evaluates the following actions in priority order and executes the most needed one:

| Priority | Action | What It Does |
|----------|--------|-------------|
| 0 | **Quality Guard** | Self-monitoring sweep: detects and cancels duplicate titles, caption duplicates, slot collisions, and fallback content in your scheduled queue. |
| 1 | **Buffer Check** | Checks if all content slots for the upcoming days are filled. If not, generates new content to fill the gaps. |
| 2 | **Metrics Check** | Looks for published posts older than 48 hours that have not been scored yet. Fetches engagement metrics and scores them. (Runs every 6 hours.) |
| 3 | **Analysis Check** | Updates strategy scores based on new metrics. Detects performance drift and adjusts explore ratio if needed. (Runs every 6 hours.) |
| 4 | **Discovery Check** | Triggers a trend scout scan to identify emerging topics and opportunities in your niche. |
| 5 | **Phase Check** | Evaluates whether Toby should transition to the next learning phase. |

:::info
Each step runs independently. If a buffer check fails, it does not prevent the metrics check from running on the next tick. This prevents cascade failures where one error blocks all Toby activity.
:::

---

## Three Learning Phases

Toby progresses through three phases as it accumulates performance data:

### Phase 1: Bootstrap

**Goal**: Fill your content buffer as quickly as possible.

- **Generation rate**: Up to 6 pieces per brand per hour (aggressive).
- **Cooldown between generations**: 2 minutes per brand.
- **Strategy selection**: Explores all options broadly with minimal preference.
- **When it transitions**: After the buffer is full and initial metrics start arriving.

Bootstrap mode is designed for new accounts. Toby generates content rapidly to ensure you have a full pipeline of content ready for review.

### Phase 2: Learning

**Goal**: Gather enough data to identify winning strategies.

- **Generation rate**: Up to 2 pieces per brand per hour (steady).
- **Cooldown between generations**: 15 minutes per brand.
- **Strategy selection**: Starts favoring strategies with positive early signals while still exploring broadly.
- **When it transitions**: After sufficient performance data has accumulated across multiple strategy dimensions.

### Phase 3: Optimizing

**Goal**: Maximize engagement by exploiting proven strategies while continuing to explore.

- **Generation rate**: Same as Learning (2 per brand per hour).
- **Strategy selection**: Full Thompson Sampling -- strategies are selected probabilistically based on their performance distributions. Proven winners get higher probability, but exploration never stops.
- **Ongoing**: This is the steady-state phase. Toby continues optimizing indefinitely.

---

## Content Buffer

Toby maintains a **7-day content buffer** for each brand. This means:

- You always have 7 days of content ready to go.
- If you approve content slower than Toby generates it, the buffer grows.
- If the buffer starts running low (content is being published faster than generated), Toby increases generation priority.
- You receive email reminders if your buffer drops below safe levels.

The buffer ensures you never run out of content, even if you do not log in for a week.

---

## Thompson Sampling Explained

Thompson Sampling is the algorithm at the heart of Toby's learning. Here is how it works in simple terms:

### The Problem

Toby has many strategy options for each content dimension (personality, topic, hook style, title format). It needs to figure out which combinations work best for your audience -- but it also cannot stop trying new things, because what works today might not work tomorrow.

### How It Works

1. **Each strategy option has a performance distribution.** Think of it as a range from "probably bad" to "probably great," with varying confidence.

2. **To choose a strategy, Toby samples from each option's distribution.** It randomly picks a value from each distribution, then uses whichever option produced the highest sample.

3. **After seeing results, Toby updates the distributions.** Good performance narrows the distribution toward higher values. Poor performance narrows it toward lower values.

4. **The randomness is the key.** A strategy that Toby thinks is great (narrow distribution around a high value) will be selected most of the time. But a strategy with less data (wide distribution) has a chance of producing a high sample -- that is the exploration.

### Why It Works

- **Exploitation**: Proven strategies are selected more often because their distributions are centered on higher values.
- **Exploration**: Unproven or new strategies can still win the sample, ensuring Toby tries them periodically.
- **Automatic balance**: The algorithm naturally shifts from exploration to exploitation as more data arrives. No manual tuning needed.

:::tip
You do not need to understand the math behind Thompson Sampling. The takeaway is: Toby tries different approaches, learns which ones get better engagement, and gradually shifts toward winners -- while keeping a healthy exploration rate to discover new opportunities.
:::

---

## Cognitive Agents

Toby is not a single monolithic AI. It is composed of specialized **cognitive agents**, each responsible for a different aspect of the content creation and learning process:

| Agent | Role |
|-------|------|
| **Creator** | Generates content using memory-augmented prompts. Retrieves relevant memories and strategy context to produce content aligned with what works. |
| **Critic** | Multi-critic ensemble that evaluates content quality. Combines rule-based checks, semantic analysis, and audience simulation to score content before it enters the pipeline. |
| **Analyst** | Enhanced scoring engine with anomaly detection. Identifies breakout content, detects unusual performance patterns, and performs causal attribution. |
| **Strategist** | Chain-of-thought strategy reasoning. Uses deep reasoning to select the best strategy combinations, taking into account performance data, trends, and context. |
| **Reflector** | Triple memory writer. After content is scored, the Reflector writes observations to Toby's episodic, semantic, and procedural memory systems. |
| **Scout** | Environmental context gatherer. Collects signals from memory, world model, and trend data to provide context for the Strategist and Creator. |
| **Intelligence** | Continuous signal processing. Gathers and processes intelligence from various sources to keep Toby aware of the broader landscape. |

Additional supporting agents:

| Agent | Role |
|-------|------|
| **Quality Guard** | Self-monitoring agent that sweeps the scheduled queue for duplicates, collisions, and low-quality content. |
| **Meta Learner** | Higher-order learning agent that adjusts Toby's learning parameters (like explore ratio) based on meta-level observations. |
| **Pattern Analyzer** | Identifies recurring patterns in content performance across multiple dimensions. |
| **Experiment Designer** | Designs A/B experiments to systematically test strategy hypotheses. |

---

## Toby's Memory System

Toby has a structured memory system inspired by how human memory works:

### Episodic Memory

Records of specific events and outcomes. "Post X was published on Monday and got 2x the average saves." These are concrete, timestamped memories that the Creator and Analyst reference.

### Semantic Memory

General knowledge extracted from patterns. "Myth-busting hooks perform 40% better than listicle hooks for this DNA." These are abstracted insights that inform strategy selection.

### Procedural Memory

Learned rules and heuristics. "When creating content about nutrition, always include a specific study citation." These are operational rules that guide content creation.

### Memory Gardening

Toby's memory is not unlimited. A background process called the **Memory Gardener** periodically prunes outdated or low-value memories, consolidates redundant entries, and maintains the health of the memory system.

---

## Explore Ratio

The explore ratio controls how much Toby experiments versus sticking with proven strategies:

- **Default: 35%** of content explores new strategies
- **65%** exploits proven strategies

This ratio is not static. Toby's Meta Learner can adjust it based on conditions:

- If performance is declining, the explore ratio may increase to discover new winning strategies.
- If performance is stable and strong, the ratio may decrease to double down on what works.
- Drift detection runs periodically and adjusts the ratio if the audience's preferences seem to be changing.

---

## Activity Log

You can view Toby's activity log from your dashboard. The log shows:

- When Toby generated content and for which brand
- Buffer check results (how many slots were filled)
- Metrics scoring events (which posts were scored, how they performed)
- Strategy analysis updates
- Quality Guard actions (duplicates cancelled, slots repositioned)
- Phase transitions
- Any errors Toby encountered

The activity log is your window into what Toby is doing and why.

---

## Budget Management

Toby tracks AI generation costs per user:

- **DeepSeek API costs** -- Text generation tokens (input and output)
- **Image generation costs** -- Per-image pricing for AI backgrounds
- Daily cost records are maintained and visible in your settings

You can set a **daily budget** (in cents) to cap Toby's spending. When the budget is reached, Toby pauses generation until the next day.

---

## Rate Limits

To prevent over-generation and ensure stable operation, Toby enforces rate limits:

| Limit | Normal Mode | Bootstrap Mode |
|-------|-------------|----------------|
| Max per brand per hour | 2 | 6 |
| Max per user per hour | 6 | 20 |
| Cooldown between same-brand generations | 15 minutes | 2 minutes |

These limits prevent Toby from generating excessive content during a single tick, keeping costs predictable and quality high.

---

## Tips for Getting the Most Out of Toby

### 1. Write a detailed Content DNA

The more specific and thorough your [Content DNA](/guides/content-dna), the better Toby's output from day one. Include examples, specific tone words, and clear topic boundaries.

### 2. Review content in the Pipeline

Do not let content pile up in "Pending Review." Timely approvals and rejections give Toby faster feedback, which accelerates learning.

### 3. Be patient with the learning curve

Toby needs real performance data to optimize. The first week or two will be exploration-heavy. By week three or four, you should see noticeably improved content selection.

### 4. Check the activity log

If Toby seems to be generating content you do not like, check the activity log to understand its reasoning. Then adjust your Content DNA accordingly.

### 5. Do not change your DNA too frequently

Give Toby time to learn within a stable DNA. Constant DNA changes reset the learning process. Make incremental refinements rather than wholesale rewrites.

### 6. Keep your platforms connected

If a platform token expires or a connection drops, Toby cannot publish to that platform. Check your connection status periodically in brand settings.
