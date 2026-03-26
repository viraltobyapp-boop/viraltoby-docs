---
sidebar_position: 4
title: Toby Agent System
description: Deep dive into the autonomous AI agent architecture
slug: /architecture/toby-agent-system
---

# Toby Agent System

Toby is ViralToby's autonomous content agent. It generates, scores, and learns from content across all connected brands and platforms without human intervention. The system is built as a multi-agent cognitive architecture with Bayesian learning.

## Architecture Overview

```
                    APScheduler (every 5 min)
                           |
                    +------v------+
                    | Orchestrator |  <-- app/services/toby/orchestrator.py
                    +------+------+
                           |
              +------------+------------+
              |            |            |
     +--------v--+  +------v-----+  +--v---------+
     | Cognitive  |  | Learning   |  | Memory     |
     | Agents     |  | Engine     |  | System     |
     | (12 total) |  | (Thompson  |  | (4 types)  |
     |            |  |  Sampling) |  |            |
     +------------+  +------------+  +------------+
```

**Key principles:**

- Toby generates content autonomously; scheduling is a pure automation function
- Learning is scoped to Content DNA profiles, not brands (a DNA can serve multiple brands)
- All strategy selection uses Thompson Sampling (Beta distributions), not epsilon-greedy
- Each tick is idempotent -- failures in one step do not roll back earlier steps

## Orchestrator Tick Loop

The orchestrator (`app/services/toby/orchestrator.py`) runs every 5 minutes via APScheduler. For each user with Toby enabled, it executes checks in priority order:

```
toby_tick()
  |
  for each enabled user:
    |
    +-- Billing guard: skip if user.billing_status == "locked"
    |
    +-- 1. BUFFER CHECK (every 5 min)
    |   Are all slots for the next buffer_days filled?
    |   If not: generate content for the brand with the lowest buffer
    |
    +-- 2. METRICS CHECK (every 6 hours)
    |   Any published posts older than 48h without a Toby score?
    |   If yes: fetch platform metrics, compute score, update strategy
    |
    +-- 3. ANALYSIS CHECK (every 6 hours)
    |   Update strategy scores from newly scored content
    |   Run the Analyst and Reflector agents
    |
    +-- 4. DISCOVERY CHECK (periodic)
    |   Time for a TrendScout scan?
    |   If yes: scan competitors, hashtags, trending topics
    |
    +-- 5. PHASE CHECK
        Should Toby transition to the next phase?
        bootstrap -> learning -> optimizing
```

## Phases

Toby operates in three phases, each with different rate limits and exploration strategies:

| Phase | Content Count | Rate Limits | Cooldown | Strategy |
|-------|--------------|-------------|----------|----------|
| **Bootstrap** | 0 - ~100 pieces | 6/hour/brand, 20/hour/user | 2 min between same-brand | Aggressive generation, high exploration |
| **Learning** | ~100 - 500 | 2/hour/brand, 6/hour/user | 15 min between same-brand | Balanced exploit/explore |
| **Optimizing** | 500+ | 2/hour/brand, 6/hour/user | 15 min between same-brand | Full Thompson Sampling, low explore ratio |

Phase transitions are automatic based on total content count across all brands for the user.

### Rate Limiting

```python
# Normal (Learning / Optimizing)
MAX_GENERATIONS_PER_BRAND_PER_HOUR = 2
MAX_GENERATIONS_PER_USER_PER_HOUR = 6
GENERATION_COOLDOWN_MINUTES = 15

# Bootstrap (aggressive fill)
BOOTSTRAP_MAX_PER_BRAND_PER_HOUR = 6
BOOTSTRAP_MAX_PER_USER_PER_HOUR = 20
BOOTSTRAP_COOLDOWN_MINUTES = 2
BOOTSTRAP_MAX_PLANS_PER_TICK = 4
```

## Cognitive Agents

Toby has 12 specialized agents in `app/services/toby/agents/`:

| Agent | File | Role |
|-------|------|------|
| **Creator** | `creator.py` | Generates content plans (title, content lines, strategy vector) |
| **Critic** | `critic.py` | Scores content quality before publishing (5 dimensions) |
| **Analyst** | `analyst.py` | Analyzes performance metrics, identifies winning patterns |
| **Strategist** | `strategist.py` | Selects strategy vectors using Thompson Sampling |
| **Reflector** | `reflector.py` | Periodic self-reflection on what's working and what's not |
| **Scout** | `scout.py` | Discovers trending topics, competitor content, hashtags |
| **Intelligence** | `intelligence.py` | Gathers external intelligence (trends, news, seasonal) |
| **Meta Learner** | `meta_learner.py` | Adjusts learning parameters (explore ratio, scoring weights) |
| **Experiment Designer** | `experiment_designer.py` | Designs A/B experiments to test hypotheses |
| **Pattern Analyzer** | `pattern_analyzer.py` | Identifies multi-dimensional strategy patterns |
| **Quality Guard** | `quality_guard.py` | Enforces quality thresholds, prevents content degradation |
| **Publisher** | `publisher.py` | Handles post-generation scheduling and platform routing |

### Agent Interaction Flow

```
Strategist (selects strategy)
    |
    v
Creator (generates content plan using strategy)
    |
    v
Critic (scores quality: accept/regen/reject)
    |
    +-- Score >= 80: ACCEPT --> Publisher (schedules)
    |
    +-- Score 65-79: REGENERATE (up to 3 attempts)
    |
    +-- Score < 65: REJECT
```

## Thompson Sampling

The learning engine (`app/services/toby/learning_engine.py`) uses Thompson Sampling with Beta distributions for strategy selection.

### Strategy Dimensions

| Dimension | Options (Reels) | Options (Posts) |
|-----------|----------------|----------------|
| `personality` | `edu_calm`, `provoc`, `story`, `data`, `urgent` | `deep_edu`, `myth_bust`, `listicle`, `compare`, `protocol` |
| `topic` | Drawn from Content DNA `topic_categories` | Same |
| `hook` | `question`, `myth_buster`, `shocking_stat`, `personal_story`, `bold_claim` | Same |
| `format` | Content-format-specific | Content-format-specific |
| `title_format` | 40 structural templates with fill-in slots | Same |

### How It Works

Each (content_dna_id, content_type, dimension, option_value) has a Beta(alpha, beta) distribution:

```python
# For each option in a dimension:
sampled_score = random.betavariate(alpha, beta)
# Select the option with the highest sampled score

# After observing performance:
if score >= threshold:
    alpha += 1  # Success
else:
    beta += 1   # Failure
```

### DNA-Scoped Learning

Strategy scores are keyed by `(user_id, content_dna_id, content_type, dimension, option_value)`. This means:

- The Content DNA profile is the learning unit, not the brand
- If two brands share a DNA, they share learned strategy scores
- Switching a brand's DNA resets its learning context

### Advanced Features

**Contextual Thompson Sampling (Phase 2):**

Hierarchical lifts based on context (day of week, time of day, season). Lifts are additive adjustments to the Beta distribution, capped at `CONTEXT_LIFT_MAX = 0.15` to prevent domination.

```python
CONTEXT_LIFT_MIN_SAMPLES = 5       # Lift only activates after 5 observations
CONTEXT_LIFT_FULL_CONFIDENCE = 25  # Confidence ramps 0->1 over 5->25 samples
CONTEXT_LIFT_MAX = 0.15            # Cap additive lift
```

**Cross-User Global Learning (Phase 3A):**

Aggregated strategy performance across all users via `toby_global_strategy_scores`. New users benefit from the global prior, which decays as they accumulate their own data:

```python
GLOBAL_TRANSFER_DECAY_SAMPLES = 50   # User's transfer_weight decays to 0.1 at 50 samples
GLOBAL_TRANSFER_MIN = 0.1            # Never fully ignored
GLOBAL_MIN_USER_SAMPLES = 3          # User needs 3+ samples to contribute to global
EXTINCTION_SCORE_THRESHOLD = 30      # Options below this are "extinct"
EXTINCTION_SAMPLE_THRESHOLD = 20     # ... after 20+ total observations
```

**Strategist's Bayesian Override:**

The Strategist agent can override Thompson Sampling selections when it detects specific conditions (e.g., a clearly dominant option being ignored due to exploration, or an experiment requirement).

## Memory Subsystem

Toby has four types of persistent memory, all stored in PostgreSQL (models in `app/models/toby_cognitive.py`):

| Memory Type | Table | Purpose | Example |
|-------------|-------|---------|---------|
| **Episodic** | `toby_episodic_memory` | Records of what happened | "Generated reel about sleep for brand X, scored 85" |
| **Semantic** | `toby_semantic_memory` | Generalized insights | "'shocking_stat' hooks perform 40% better on weekends" |
| **Procedural** | `toby_procedural_memory` | Learned rules/procedures | "Always pair 'data' personality with 'question' hook" |
| **World Model** | `toby_world_model` | Current state understanding | "Brand X audience is most active at 7pm EST" |

Episodic and Semantic memories support **pgvector embeddings** (1536 dimensions) for similarity-based retrieval, though this is used selectively to manage compute costs.

### Memory Lifecycle

```
Content generated
    |
    v
Episodic Memory created (what happened)
    |
    v [after scoring]
Strategy scores updated (Thompson Sampling)
    |
    v [periodically, via Reflector]
Semantic Memory extracted (patterns, insights)
    |
    v [via Meta Learner]
Procedural Memory updated (learned rules)
World Model refreshed (current state)
```

## Pipeline Integration

Toby integrates with the content approval pipeline:

```
Toby generates content
    |
    v
GenerationJob created (status: generating)
    |
    v
Content passes Critic quality check
    |
    v
pipeline_status = "pending_review"  (if pipeline enabled)
    |                                    |
    v                                    v
User approves                     User rejects
    |                                    |
    v                                    v
pipeline_status = "approved"       pipeline_status = "rejected"
    |                              (Toby learns from rejection)
    v
ScheduledReel created
    |
    v
Published at scheduled_time
    |
    v [after 48h]
Metrics collected, Toby score computed
    |
    v
Strategy scores updated
```

## Budget Management

Toby tracks API costs per user:

- `TobyState.daily_budget_cents` -- configurable daily limit (NULL = unlimited)
- `TobyState.spent_today_cents` -- rolling daily spend
- `TobyState.budget_reset_at` -- when the daily counter resets
- The budget manager checks spend before each generation and skips if over limit
- API costs are tracked in `api_usage_log` and aggregated daily/monthly

## Experiments

The Experiment Designer agent creates A/B experiments stored in `toby_experiments`:

- Experiments compare a `control_value` vs `treatment_value` on a single dimension
- Timeout after `EXPERIMENT_TIMEOUT_DAYS = 21` days
- Single-option guard prevents experiments when only one option exists
- Results include `p_value`, `effect_size`, and `early_stopped` flag
- Completed experiments feed back into strategy score adjustments

:::tip Debugging Toby
Query the Supabase MCP to inspect Toby state:
```sql
SELECT user_id, enabled, phase, last_buffer_check_at, spent_today_cents
FROM toby_state WHERE enabled = true;

SELECT dimension, option_value, alpha, beta, sample_count, avg_score
FROM toby_strategy_scores WHERE user_id = '...' AND content_type = 'reel'
ORDER BY avg_score DESC;
```
:::
