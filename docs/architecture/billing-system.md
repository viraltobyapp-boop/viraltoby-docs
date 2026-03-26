---
sidebar_position: 9
title: Billing System
description: Stripe subscription and billing architecture
slug: /architecture/billing-system
---

# Billing System

ViralToby uses Stripe for per-brand subscription billing. The billing system enforces soft-locks on users who fall behind on payments, preventing content generation and publishing while still allowing read access.

## Architecture Overview

```
Stripe Dashboard
    |
    v
Stripe Checkout / Customer Portal
    |
    v
Stripe Webhooks --> POST /api/billing/webhook
    |
    v
BrandSubscription table (per-brand subscription state)
    |
    v
UserProfile.billing_status (derived aggregate status)
    |
    v
Billing enforcement gates (backend + frontend)
```

## Core Models

### BrandSubscription

`app/models/billing.py`

One subscription per (user, brand) pair, linked to a Stripe Subscription:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `user_id` | VARCHAR FK | References `user_profiles.user_id` |
| `brand_id` | VARCHAR FK | References `brands.id` |
| `stripe_subscription_id` | VARCHAR UNIQUE | Stripe Subscription ID |
| `stripe_price_id` | VARCHAR | Stripe Price ID |
| `status` | VARCHAR | `incomplete`, `active`, `past_due`, `cancelled`, `unpaid` |
| `current_period_start` | TIMESTAMPTZ | Billing period start |
| `current_period_end` | TIMESTAMPTZ | Billing period end |
| `cancel_at_period_end` | BOOLEAN | Whether subscription cancels at period end |
| `cancelled_at` | TIMESTAMPTZ | When cancellation was requested |

### UserProfile Billing Fields

| Column | Type | Description |
|--------|------|-------------|
| `billing_status` | VARCHAR(20) | Derived: `none`, `active`, `past_due`, `cancelled`, `locked` |
| `billing_grace_deadline` | TIMESTAMPTZ | Deadline before soft-lock activation |
| `billing_locked_at` | TIMESTAMPTZ | When the user was locked |
| `stripe_customer_id` | VARCHAR UNIQUE | Stripe Customer ID |
| `tag` | VARCHAR(20) | Role tag -- `special`, `admin`, `super_admin` bypass billing |

## Billing Lifecycle

```
User creates brand
    |
    v
POST /api/billing/checkout  -->  Stripe Checkout Session
    |
    v
User completes payment
    |
    v
Stripe webhook: subscription.created (status: active)
    |
    v
BrandSubscription created, billing_status = "active"
    |
    |  ... time passes ...
    |
    v
Payment fails
    |
    v
Stripe webhook: invoice.payment_failed
    |
    v
BrandSubscription.status = "past_due"
UserProfile.billing_status = "past_due"
billing_grace_deadline = now + grace_period
    |
    |  ... grace period expires ...
    |
    v
billing_status = "locked"
billing_locked_at = now()
    |
    v
User can view content but cannot:
  - Generate new content
  - Schedule posts
  - Publish posts
  - Use Toby
    |
    v
User updates payment method (Stripe Portal)
    |
    v
Stripe webhook: invoice.payment_succeeded
    |
    v
billing_status = "active" (unlocked)
billing_grace_deadline = NULL
billing_locked_at = NULL
```

## Billing Status Derivation

`app/services/billing/utils.py` -- `recalculate_user_billing_status()`

The user's `billing_status` is derived from the **worst** status across all their `BrandSubscription` records:

```python
def recalculate_user_billing_status(user_id, db):
    if is_exempt(user):
        user.billing_status = "none"
        return

    subs = db.query(BrandSubscription).filter_by(user_id=user_id).all()
    statuses = {s.status for s in subs}

    if "past_due" in statuses:
        user.billing_status = "past_due"
    elif "active" in statuses:
        user.billing_status = "active"
    elif statuses <= {"cancelled", "unpaid", "incomplete"}:
        user.billing_status = "cancelled"
```

This function is called after every Stripe webhook that modifies a subscription.

## Stripe Webhook Handling

**Endpoint:** `POST /api/billing/webhook`

The webhook handler verifies Stripe's signature, then processes events:

| Stripe Event | Action |
|-------------|--------|
| `customer.subscription.created` | Create `BrandSubscription`, recalculate status |
| `customer.subscription.updated` | Update subscription fields, recalculate status |
| `customer.subscription.deleted` | Mark subscription as cancelled, recalculate status |
| `invoice.payment_succeeded` | Unlock user if locked, clear grace deadline |
| `invoice.payment_failed` | Set grace period, start countdown to lock |

:::info Idempotency
Webhook handlers use the `processed_webhooks` table to track processed event IDs, preventing duplicate processing. Each event ID is recorded with its processing timestamp.
:::

## Soft-Lock Enforcement

### Backend Gates

`app/services/billing/utils.py` -- `validate_can_generate()`

```python
def validate_can_generate(user_id: str, db: Session):
    """MUST be called before any content generation or scheduling."""
    user = db.query(UserProfile).filter_by(user_id=user_id).first()

    if is_exempt(user):
        return  # admin, super_admin, special tags bypass

    if user.billing_status == "locked":
        raise HTTPException(
            status_code=402,
            detail="Account locked due to unpaid subscription",
            guidance="Update your payment method in the billing portal"
        )
```

This check is enforced at:
- Content generation endpoints
- Scheduling endpoints
- Manual publish endpoints
- Toby orchestrator (skips locked users entirely)

### Toby Billing Guard

In the orchestrator tick loop, locked users are skipped before any processing:

```python
# app/services/toby/orchestrator.py
for state in enabled_states:
    profile = db.query(UserProfile).filter_by(user_id=state.user_id).first()
    if profile and profile.billing_status == "locked":
        continue  # Skip locked users entirely
```

### Frontend Gates

The frontend uses a `useBillingGate` hook to conditionally disable UI elements:

```typescript
// src/shared/hooks/useBillingGate.ts
function useBillingGate() {
  const { data: billingStatus } = useBillingStatus();

  return {
    isLocked: billingStatus === "locked",
    canGenerate: billingStatus !== "locked",
    canSchedule: billingStatus !== "locked",
  };
}
```

Locked users see their existing content and analytics but cannot trigger any write operations.

## Billing Exemptions

Users with certain `tag` values bypass all billing checks:

```python
# app/models/auth.py
EXEMPT_TAGS = frozenset({"special", "admin", "super_admin"})
```

Exempt users:
- Never enter grace period or locked state
- `billing_status` is always `"none"`
- Can generate, schedule, and publish without restriction

## API Cost Tracking

Separate from Stripe billing, ViralToby tracks internal API costs:

| Table | Purpose |
|-------|---------|
| `api_usage_log` | Per-call cost tracking (service, model, tokens in/out, cost in cents) |
| `user_cost_daily` | Daily cost aggregation per user |
| `user_cost_monthly` | Monthly cost aggregation per user |

The cost tracker (`app/services/monitoring/cost_tracker.py`) records every DeepSeek and DeAPI call with token counts and computed costs. This data powers the admin API usage dashboard and Toby's budget management.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/status` | Current billing status for all user's brands |
| POST | `/api/billing/checkout` | Create Stripe Checkout session for a brand |
| POST | `/api/billing/portal` | Create Stripe Customer Portal session |
| POST | `/api/billing/webhook` | Stripe webhook receiver (signature-verified) |

### Checkout Flow

```python
# POST /api/billing/checkout
# Body: { "brand_id": "healthycollege", "price_id": "price_xxx" }
#
# Returns: { "checkout_url": "https://checkout.stripe.com/..." }
# Frontend redirects user to this URL
```

### Customer Portal

```python
# POST /api/billing/portal
# Returns: { "portal_url": "https://billing.stripe.com/..." }
# User can manage payment methods, view invoices, cancel subscriptions
```
