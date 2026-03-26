---
sidebar_position: 9
title: Billing & Subscriptions
description: Manage your ViralToby subscription
slug: /guides/billing
---

# Billing & Subscriptions

ViralToby uses Stripe for all billing and subscription management. Subscriptions are managed on a **per-brand** basis -- each brand you create requires its own subscription.

## Subscription Model

ViralToby's billing is straightforward:

- **Per-brand subscription** -- Each brand you add to ViralToby has its own subscription.
- **Monthly billing** -- Subscriptions are billed monthly through Stripe.
- **Cancel anytime** -- No long-term contracts. Cancel your subscription and it remains active until the end of the current billing period.

---

## Getting Started

### New Accounts

When you first sign up, you can explore the ViralToby interface and set up your brands and Content DNA. To activate content generation and publishing, you will need to subscribe.

### Subscribing a Brand

1. Go to the **Billing** page in your ViralToby settings.
2. You will see all your brands listed with their subscription status.
3. Click **Subscribe** next to the brand you want to activate.
4. You will be redirected to a secure Stripe Checkout page.
5. Enter your payment details and complete the purchase.
6. You will be redirected back to ViralToby with your brand fully activated.

:::tip
Your subscription activates immediately after payment. Toby will begin generating content for the subscribed brand right away (if Toby is enabled).
:::

---

## Billing Page

The Billing page in ViralToby shows you:

- **Overall billing status** -- Your account-level status (active, past due, locked).
- **Per-brand subscriptions** -- The status, pricing, and renewal date for each brand's subscription.
- **Stripe Customer Portal link** -- Access your full billing history and manage payment methods through Stripe.
- **Grace period** -- If applicable, when your grace period expires.

---

## Managing Your Subscription

### Upgrading

If new plan tiers become available, you can upgrade from the Billing page. The upgrade takes effect immediately, with prorated charges applied.

### Downgrading

Downgrades take effect at the end of the current billing period. You retain full access until then.

### Cancelling

To cancel a subscription:

1. Go to the **Billing** page.
2. Click **Cancel Subscription** next to the brand you want to cancel.
3. Confirm the cancellation.

After cancelling:

- Your subscription remains active until the end of the current billing period.
- Toby continues generating and publishing content until the period ends.
- Already-scheduled content will still be published.
- At the end of the period, the brand enters a "cancelled" state.

### Reactivating

If you cancelled a subscription but changed your mind before the billing period ends, you can **reactivate** it. Click **Reactivate** on the Billing page to resume your subscription -- no need to re-enter payment details.

---

## Payment Methods

ViralToby accepts all payment methods supported by Stripe:

- Credit and debit cards (Visa, Mastercard, American Express, and more)
- Regional payment methods (depending on your location)

### Managing Payment Methods

To update your card or add a new payment method:

1. Go to the **Billing** page.
2. Click **Manage Billing** to open the Stripe Customer Portal.
3. From the portal, you can update your payment method, view invoices, and manage your billing details.

---

## What Happens When Payment Fails

If a payment fails (expired card, insufficient funds, etc.), ViralToby follows a clear progression:

### Step 1: Past Due (Immediate)

When a payment fails, your subscription status changes to **past_due**. During this period:

- Everything continues working normally.
- Toby keeps generating and publishing content.
- Stripe automatically retries the payment according to its retry schedule.

### Step 2: Grace Period (7 Days)

If payment has not been resolved after initial retries, ViralToby sets a **7-day grace period**:

- A grace deadline is set (7 days from when the grace period begins).
- Everything still works during the grace period.
- You will see a warning in the UI about the upcoming deadline.

### Step 3: Soft-Lock (After Grace Period Expires)

If the grace period expires without successful payment, your account is **soft-locked**:

| What Gets Locked | What Still Works |
|-----------------|-----------------|
| Toby is automatically disabled | You can still log in |
| New content generation stops | You can view existing content |
| Scheduled posts are paused | You can view analytics |
| Publishing stops | You can update your Content DNA |
| | You can update payment details |

:::danger
When your account is soft-locked, **Toby is disabled and all scheduled posts are paused**. No new content will be created or published until you resolve the payment issue.
:::

### Resolving a Soft-Lock

To restore your account after a soft-lock:

1. Go to the **Billing** page.
2. Click **Manage Billing** to open the Stripe Customer Portal.
3. Update your payment method.
4. Once Stripe processes a successful payment, your account is automatically unlocked:
   - Billing status returns to "active."
   - Toby can be re-enabled.
   - Paused scheduled posts can be resumed.

---

## Billing Exemptions

Certain account types are exempt from billing enforcement:

| Tag | Description |
|-----|-------------|
| `admin` | Platform administrators |
| `super_admin` | Super administrators |
| `special` | Accounts with special arrangements |

Exempt accounts are never soft-locked, regardless of payment status. This ensures platform administrators and users with special agreements always have full access.

---

## Invoice History

Your complete invoice history is available through the Stripe Customer Portal:

1. Go to the **Billing** page.
2. Click **Manage Billing** to open the Stripe Customer Portal.
3. View and download all past invoices as PDF.

Stripe retains your full invoice history for as long as your account exists.

---

## How Billing Affects Toby

Toby checks billing status on every tick. Here is how billing status affects Toby's behavior:

| Billing Status | Toby Behavior |
|---------------|---------------|
| **Active** | Normal operation. Toby generates, learns, and publishes. |
| **Past Due** | Normal operation. Toby continues while Stripe retries payment. |
| **Locked** | Toby is **completely skipped**. No generation, no scoring, no analysis. |

When an account is locked:

- Toby does not waste resources on content that cannot be published.
- Learning data and strategy scores are preserved -- nothing is lost.
- When the account is unlocked, Toby can resume from where it left off.

:::info
The billing enforcement job runs every 60 minutes. It checks for accounts that have been past-due beyond the grace period and applies the soft-lock. Accounts are unlocked automatically when Stripe reports a successful payment via webhook.
:::

---

## API Cost Tracking

ViralToby tracks the AI generation costs associated with your account:

### What Gets Tracked

| Cost Category | Typical Cost | Description |
|--------------|-------------|-------------|
| **DeepSeek text generation** | ~$0.14/1M input tokens, ~$0.28/1M output tokens | AI text generation for content, captions, and scoring |
| **Image generation** | ~$0.02-$0.05 per image | AI background images for Reels and Carousels |

### Viewing Your Costs

Cost data is recorded daily and viewable in your account settings. You can see:

- **Daily breakdown** -- How much was spent each day.
- **Cost categories** -- Split between text generation and image generation.
- **Per-brand attribution** -- Costs are tracked per brand when possible.

### Budget Controls

You can set a **daily budget cap** in your Toby settings. When the cap is reached:

- Toby pauses content generation for the rest of the day.
- Already-scheduled content is not affected.
- Generation resumes the next day when the budget resets.

Daily cost records are retained for 30 days, then aggregated into monthly summaries for long-term tracking.

:::tip
For most users, AI generation costs are a fraction of the subscription price. The cost tracking is provided for transparency and to give power users fine-grained control over their AI spending.
:::
