---
sidebar_position: 8
title: OAuth Flows
description: Social platform authentication implementation
slug: /architecture/oauth-flows
---

# OAuth Flows

ViralToby connects to 6 social platforms. Five use OAuth 2.0 (with platform-specific variations) and one uses App Password authentication. All OAuth state is CSRF-protected via the `oauth_states` table.

## Platform Auth Summary

| Platform | Protocol | Route File | Token Storage |
|----------|----------|-----------|---------------|
| Instagram | Meta Business Login (OAuth 2.0) | `ig_oauth_routes.py` | `Brand.instagram_access_token`, `instagram_business_account_id` |
| Facebook | Meta Login (OAuth 2.0) | `fb_oauth_routes.py` | `Brand.facebook_access_token`, `facebook_page_id` |
| Threads | Meta OAuth 2.0 (separate app) | `threads_oauth_routes.py` | `Brand.threads_access_token`, `threads_user_id`, `threads_username` |
| TikTok | TikTok OAuth 2.0 | `tiktok_oauth_routes.py` | `Brand.tiktok_access_token`, `tiktok_refresh_token`, `tiktok_user_id` |
| YouTube | Google OAuth 2.0 | `youtube/routes.py` | `YouTubeChannel` model |
| Bluesky | App Password (AT Protocol) | `bsky_auth_routes.py` | `Brand.bsky_handle`, `bsky_did`, `bsky_app_password` |

## CSRF Protection

All OAuth flows use the `oauth_states` table for state parameter validation:

```python
# Before redirect:
state_token = secrets.token_urlsafe(32)
db.add(OAuthState(
    state_token=state_token,
    platform="instagram",
    brand_id=brand_id,
    user_id=user_id,
    created_at=datetime.utcnow()
))

# On callback:
oauth_state = db.query(OAuthState).filter_by(state_token=state).first()
if not oauth_state or oauth_state.used_at is not None:
    raise HTTPException(403, "Invalid or expired OAuth state")
oauth_state.used_at = datetime.utcnow()  # Mark as consumed
```

States are single-use and include `brand_id` so the callback knows which brand to attach credentials to.

## Instagram Business Login

**Route prefix:** `/auth/instagram-oauth`

### Flow

```
1. GET /auth/instagram-oauth?brand_id=xxx
   |
   v
2. Redirect to Meta:
   https://www.facebook.com/v22.0/dialog/oauth
   ?client_id=...
   &redirect_uri=.../auth/instagram-oauth/callback
   &scope=instagram_basic,instagram_content_publish,instagram_manage_insights,...
   &state=<csrf_token>
   |
   v
3. User grants permissions on Meta
   |
   v
4. GET /auth/instagram-oauth/callback?code=...&state=...
   |
   v
5. Exchange code for short-lived token
   POST https://graph.facebook.com/v22.0/oauth/access_token
   |
   v
6. Exchange short-lived token for long-lived token (60 days)
   GET https://graph.facebook.com/v22.0/oauth/access_token
     ?grant_type=fb_exchange_token&fb_exchange_token=...
   |
   v
7. Fetch Instagram Business Account ID
   GET https://graph.facebook.com/v22.0/me/accounts  (get Page)
   GET https://graph.facebook.com/v22.0/{page_id}?fields=instagram_business_account
   |
   v
8. Store tokens + IG Business Account ID on the Brand
   |
   v
9. Trigger post-connect analytics refresh (immediate snapshot)
   |
   v
10. Redirect user back to app
```

### Required Scopes

```
instagram_basic
instagram_content_publish
instagram_manage_insights
instagram_manage_comments
pages_show_list
pages_read_engagement
business_management
```

### Token Refresh

Instagram long-lived tokens expire in 60 days. A background job refreshes them proactively every 6 hours:

```python
# app/services/publishing/ig_token_service.py
def refresh_instagram_token(brand):
    response = requests.get(
        "https://graph.instagram.com/refresh_access_token",
        params={
            "grant_type": "ig_refresh_token",
            "access_token": brand.instagram_access_token,
        }
    )
    brand.instagram_access_token = response.json()["access_token"]
    brand.instagram_token_last_refreshed_at = datetime.utcnow()
```

## Facebook Login

**Route prefix:** `/auth/facebook-oauth`

### Flow

Similar to Instagram but focuses on Facebook Page access:

1. Redirect to Meta OAuth with Facebook-specific scopes
2. Exchange code for token
3. Fetch user's Pages via `GET /me/accounts`
4. User selects a Page (if multiple)
5. Store Page token + Page ID on the Brand

### Page Selection

If the user manages multiple Facebook Pages, the OAuth callback returns a list. The frontend presents a selection UI, and the user's choice is sent back to finalize the connection.

### Relationship to Instagram

Facebook and Instagram are co-published via Meta's Graph API. When both are connected:
- The same Meta token can sometimes serve both
- `Brand.meta_access_token` stores a unified token when available
- Publishing to both platforms happens in parallel via `SocialPublisher`

## Threads OAuth

**Route prefix:** `/auth/threads-oauth`

### Key Difference

Threads uses **separate Meta OAuth credentials** (different `client_id` and `client_secret`) from Instagram/Facebook. This is a Meta requirement -- Threads API access requires a separate app registration.

### Flow

```
1. GET /auth/threads-oauth?brand_id=xxx
   |
   v
2. Redirect to:
   https://threads.net/oauth/authorize
   ?client_id=<THREADS_CLIENT_ID>
   &redirect_uri=.../auth/threads-oauth/callback
   &scope=threads_basic,threads_content_publish,...
   &state=<csrf_token>
   |
   v
3. Callback: exchange code for token
   POST https://graph.threads.net/oauth/access_token
   |
   v
4. Exchange for long-lived token
   |
   v
5. Fetch user profile
   GET https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url
   |
   v
6. Store: threads_access_token, threads_user_id, threads_username
```

### Required Scopes

```
threads_basic
threads_content_publish
threads_manage_insights
threads_manage_replies
```

## TikTok OAuth

**Route prefix:** `/auth/tiktok-oauth`

### Flow

```
1. GET /auth/tiktok-oauth?brand_id=xxx
   |
   v
2. Redirect to:
   https://www.tiktok.com/v2/auth/authorize/
   ?client_key=<TIKTOK_CLIENT_KEY>
   &redirect_uri=.../auth/tiktok-oauth/callback
   &scope=user.info.basic,video.publish,...
   &state=<csrf_token>
   |
   v
3. Callback: exchange code for access + refresh tokens
   POST https://open.tiktokapis.com/v2/oauth/token/
   |
   v
4. Fetch user info
   GET https://open.tiktokapis.com/v2/user/info/
   |
   v
5. Store: tiktok_access_token, tiktok_refresh_token,
          tiktok_user_id, tiktok_username, tiktok_open_id,
          tiktok_access_token_expires_at, tiktok_refresh_token_expires_at
```

### Token Lifecycle

| Token | Lifetime | Refresh Strategy |
|-------|----------|-----------------|
| Access token | 24 hours | Refreshed on-demand before publishing |
| Refresh token | 365 days | Cannot be refreshed -- user must re-authenticate |

### User Defaults

After connecting, users can configure default post settings stored in `Brand.tiktok_defaults`:

```json
{
  "privacy_level": "PUBLIC_TO_EVERYONE",
  "disable_duet": false,
  "disable_stitch": false,
  "disable_comment": false
}
```

## YouTube (Google OAuth)

YouTube uses Google's OAuth 2.0 flow with the YouTube Data API v3. Channel connections are stored in the `YouTubeChannel` model rather than on the `Brand` directly.

### Required Scopes

```
https://www.googleapis.com/auth/youtube
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/youtube.readonly
```

## Bluesky (App Password)

**Route prefix:** `/auth/bluesky`

Bluesky uses the **AT Protocol** and authenticates via App Passwords, not OAuth.

### Flow

```
1. POST /auth/bluesky/connect/{brand_id}
   Body: { "handle": "user.bsky.social", "app_password": "xxxx-xxxx-xxxx-xxxx" }
   |
   v
2. Resolve handle to DID
   GET https://bsky.social/xrpc/com.atproto.identity.resolveHandle
   |
   v
3. Create session (authenticate)
   POST https://bsky.social/xrpc/com.atproto.server.createSession
   Body: { "identifier": <DID>, "password": <app_password> }
   |
   v
4. Store: bsky_handle, bsky_did, bsky_app_password,
          bsky_access_jwt, bsky_refresh_jwt
```

### Token Refresh

AT Protocol JWTs are short-lived. The `bsky_token_service.py` re-authenticates using the stored app password when the access JWT expires:

```python
# app/services/publishing/bsky_token_service.py
def ensure_valid_session(brand):
    if brand.bsky_access_jwt_expires_at < datetime.utcnow():
        # Re-create session using app password
        session = create_session(brand.bsky_did, brand.bsky_app_password)
        brand.bsky_access_jwt = session["accessJwt"]
        brand.bsky_refresh_jwt = session["refreshJwt"]
```

## Token Security

:::caution Security Considerations
- All tokens are stored in the PostgreSQL database as `TEXT` columns
- Tokens are never exposed in API responses (stripped by `to_dict()` methods unless `include_tokens=True`)
- OAuth state tokens are single-use (marked with `used_at` timestamp)
- App Passwords (Bluesky) are stored in plaintext -- encrypt at rest if compliance requires it
- No tokens are logged in structured logs (sensitive fields are excluded)
:::

## Post-Connect Analytics Refresh

After any successful OAuth connection, the backend triggers an immediate analytics refresh:

```python
# In each OAuth callback handler:
from app.services.analytics.snapshot_service import trigger_post_connect_refresh
trigger_post_connect_refresh(user_id, brand_id, platform)
```

This ensures new users see analytics data immediately rather than waiting for the hourly scheduler. The refresh:
1. Fetches metrics from the newly connected platform API
2. Stores snapshots in `analytics_snapshots`
3. Backfills up to 28 days of historical data (where the API supports it)
