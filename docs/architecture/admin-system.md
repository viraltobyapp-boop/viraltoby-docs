---
sidebar_position: 13
title: Admin System
description: Super admin tools — impersonation, test accounts, roles, and support tickets
slug: /architecture/admin-system
---

# Admin System

Super admins have access to powerful debugging and management tools: user impersonation, temporary test accounts, role management, and a support ticket system.

## Role Hierarchy

ViralToby has four user roles, each inheriting the permissions of roles below it:

| Role | Sidebar Access | Permissions |
|------|---------------|-------------|
| **Super Admin** | Full sidebar + Admin + Support | Everything: impersonate, create test accounts, manage roles, reply to tickets |
| **Admin** | Full sidebar + Support | View system logs, reply to support tickets |
| **Moderator** | Support page only (no sidebar) | View and reply to support tickets |
| **User** | Full sidebar (no admin items) | Standard app access |

Roles are stored in Supabase `app_metadata.role` and extracted by `app/api/auth/middleware.py`. The frontend mirrors role detection in `src/features/auth/api/auth-api.ts`.

:::info
Moderators get a **full-screen layout** with no sidebar navigation — they only see the Support page. Admins and super admins see Support as a regular sidebar item alongside their normal navigation.
:::

## User Impersonation

Super admins can "switch" to view the app as any other user for debugging.

### How It Works

```
Super Admin clicks "Switch Account" in user dropdown
       │
       ▼
POST /api/admin/impersonate/{user_id}
       │
       ├── Fetches target user email from Supabase Auth
       ├── Generates magic link token via supabase.auth.admin.generate_link()
       └── Returns { email, token_hash, type: "magiclink" }
       │
       ▼
Frontend:
       ├── Saves admin session (access_token + refresh_token) to sessionStorage
       ├── Calls supabase.auth.verifyOtp({ email, token_hash, type: "magiclink" })
       └── Auth state changes → app renders as target user
       │
       ▼
Amber banner: "Viewing as {name} — Switch Back"
```

### Key Files

| File | Purpose |
|------|---------|
| `app/api/system/admin_routes.py` | `POST /api/admin/impersonate/{user_id}` endpoint |
| `src/features/auth/ImpersonationContext.tsx` | React context managing session swap |
| `src/features/auth/ImpersonationBanner.tsx` | Amber top banner during impersonation |
| `src/features/admin/components/ImpersonateModal.tsx` | User search + select modal |

### Safety Features

- Session stored in `sessionStorage` (not `localStorage`) — dies when tab closes
- Cannot impersonate yourself
- "Switch Back" restores original admin session via `supabase.auth.setSession()`
- If session restore fails, user is signed out completely

## Quick Test Accounts

Super admins can create temporary test accounts with configurable roles and TTL (time-to-live). These accounts are automatically deleted when they expire.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/test-accounts` | Create test account with `{ name, role, ttl }` |
| `GET` | `/api/admin/test-accounts` | List all test accounts (active + expired) |
| `DELETE` | `/api/admin/test-accounts/{id}` | Delete immediately |

### TTL Options

| Value | Duration |
|-------|----------|
| `1h` | 1 hour |
| `6h` | 6 hours |
| `12h` | 12 hours |
| `24h` | 24 hours (default) |
| `3d` | 3 days |
| `7d` | 7 days |

### Seeded Data (role=user)

When a test account has role `user`, 5 brands are automatically seeded with hardcoded placebo data — **zero AI calls, $0 cost**:

| Brand | Theme | Primary Color |
|-------|-------|--------------|
| FitPulse | Fitness | `#E85D3A` |
| TechByte | Tech Reviews | `#3B82F6` |
| Wanderlust | Travel | `#10B981` |
| FlavorLab | Food & Cooking | `#F59E0B` |
| StyleVault | Fashion | `#A855F7` |

Each brand gets: display name, short name, color palette, Content DNA (shared NicheConfig), TobyState (enabled, bootstrap phase), and TobyBrandConfig (3 reel + 2 post slots/day).

### Auto-Cleanup

An **hourly scheduler job** (`cleanup_expired_test_accounts` in `app/main.py`) queries `user_profiles` for accounts where `test_account_expires_at <= now()`. For each expired account:

1. Deletes from Supabase Auth (`supabase.auth.admin.delete_user()`)
2. Cascade-deletes all app data via `_delete_user_app_data()` — covers 25+ tables

The `test_account_expires_at` column on `user_profiles` is the sole indicator of a test account.

:::caution
Test account emails use the domain `@test.viraltoby.local` — a non-routable domain that ensures they never conflict with real user signups or receive actual email.
:::

## Support Ticket System

An Intercom-style floating support widget that lets users submit help requests and receive email replies from admins.

### User Flow

1. User clicks floating button (bottom-right, 40px dark teal circle)
2. Panel expands with welcome view → "Submit a request"
3. User fills: Category (Bug/Billing/Feature/Other) + Subject + Message
4. Backend creates `support_tickets` row + sends confirmation email via Resend
5. Admin gets notification email with ticket details
6. Admin replies from `/support` page → user gets reply email + widget auto-opens via Realtime

### Rate Limiting

- **5 tickets per day per user** (rolling 24h window)
- Hidden from user — rate-limited requests get a generic "please wait" message
- Input validation: subject max 150 chars, message max 2000 chars, HTML stripped server-side

### Realtime Notifications

Supabase Realtime subscriptions on `support_tickets`:

- **User side:** Widget auto-opens when admin replies (status changes to `replied`), toast notification + red dot on floating button
- **Admin side:** Ticket list auto-refreshes when new tickets arrive, toast notification

### Key Files

| File | Purpose |
|------|---------|
| `app/models/support_ticket.py` | SupportTicket model |
| `app/services/support/ticket_service.py` | CRUD with rate limiting + sanitization |
| `app/api/support/routes.py` | User + admin API endpoints |
| `src/features/support/components/SupportWidget.tsx` | Floating button + panel |
| `src/features/support/hooks/use-support-realtime.ts` | Realtime subscription hook |
| `src/pages/Support.tsx` | Admin support management page |

### Database Schema

```sql
CREATE TABLE support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'other',
    subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) DEFAULT NULL,
    admin_reply TEXT,
    replied_at TIMESTAMPTZ,
    replied_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
