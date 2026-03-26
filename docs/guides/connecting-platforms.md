---
sidebar_position: 3
title: Connecting Platforms
description: Connect your social media accounts to ViralToby
slug: /guides/connecting-platforms
---

# Connecting Platforms

ViralToby publishes content to six social media platforms. Each platform is connected at the **brand level** -- meaning you connect accounts per brand, not per user. This lets you run multiple brands with different social accounts from a single ViralToby account.

## Supported Platforms Overview

| Platform | Auth Method | Content Types | Token Refresh |
|----------|-------------|---------------|---------------|
| Instagram | OAuth (Meta Business Login) | Reels, Carousels | Long-lived token (60 days), auto-refreshed every 6 hours |
| Facebook | OAuth (Facebook Login) | Reels, Carousels | Long-lived Page token, auto-refreshed |
| YouTube | OAuth (Google) | Shorts | Refresh token (indefinite), auto-refreshed |
| Threads | OAuth (Threads API) | Text posts | Long-lived token (60 days), auto-refreshed |
| TikTok | OAuth (TikTok Login Kit) | Videos | Refresh token, auto-refreshed |
| Bluesky | App Password | Text posts | Session token, auto-refreshed |

## Instagram

Instagram is typically the primary platform for most ViralToby users. It supports Reels (short-form video) and Carousels (multi-image posts).

### Requirements

- Your Instagram account must be a **Business** or **Creator** account. Personal accounts cannot be connected.
- You must have a Facebook Page linked to your Instagram account (Meta requires this for the Business Login flow).

### How to Connect

1. Go to your brand's **Settings** page.
2. Click **Connect Instagram**.
3. You will be redirected to Instagram's authorization screen.
4. Log in to your Instagram account and grant the requested permissions.
5. You will be redirected back to ViralToby with your account connected.

### Permissions Requested

ViralToby requests the following scopes during the Instagram Business Login flow:

| Permission | Purpose |
|------------|---------|
| `instagram_business_basic` | Read your profile information and media |
| `instagram_business_content_publish` | Publish Reels and Carousels on your behalf |
| `instagram_business_manage_insights` | Read post and account analytics (reach, impressions, engagement) |

:::info
These permissions are the minimum required for ViralToby to function. We do not request access to your DMs, comments management, or any other data beyond what is listed above.
:::

### Token Management

Instagram issues a short-lived token (~1 hour) during the OAuth flow. ViralToby immediately exchanges this for a **long-lived token** that lasts 60 days. This token is automatically refreshed every 6 hours so it never expires while your account remains connected.

---

## Facebook

Facebook publishing allows ViralToby to post Reels and Carousels to your Facebook Page.

### Requirements

- You need a **Facebook Page** (not a personal profile).
- You must be an admin of the Page you want to connect.

### How to Connect

1. Go to your brand's **Settings** page.
2. Click **Connect Facebook**.
3. You will be redirected to Facebook's authorization screen.
4. Grant permissions and select the Facebook Page you want to publish to.
5. You will be redirected back to ViralToby.

### Permissions Requested

| Permission | Purpose |
|------------|---------|
| `business_management` | Access your business assets |
| `pages_show_list` | List your Facebook Pages for selection |
| `pages_read_engagement` | Read Page engagement metrics |
| `pages_manage_posts` | Publish posts and Reels to your Page |
| `pages_read_user_content` | Read content on your Page |

:::tip
Instagram and Facebook use separate OAuth flows in ViralToby. Even though both go through Meta, they are connected independently and use different token sets.
:::

---

## YouTube

YouTube integration publishes content as YouTube Shorts -- vertical short-form videos that appear in YouTube's Shorts feed.

### Requirements

- You need a Google account with a **YouTube channel**.
- The channel must be in good standing (no strikes or restrictions that prevent uploads).

### How to Connect

1. Go to your brand's **Settings** page.
2. Click **Connect YouTube**.
3. You will be redirected to Google's OAuth consent screen.
4. Select the Google account that owns your YouTube channel.
5. Grant the requested permissions.
6. You will be redirected back to ViralToby.

### Token Management

Google OAuth provides a refresh token that does not expire under normal circumstances. ViralToby uses this refresh token to obtain short-lived access tokens on-demand whenever content needs to be published.

:::warning
If you change your Google account password or revoke ViralToby's access from your Google Security settings, you will need to reconnect YouTube.
:::

---

## Threads

Threads is Meta's text-based social platform. ViralToby publishes text-only posts to Threads -- the platform does not currently support video or image publishing through its API.

### Requirements

- You need a Threads account (linked to your Instagram account).

### How to Connect

1. Go to your brand's **Settings** page.
2. Click **Connect Threads**.
3. You will be redirected to the Threads authorization screen.
4. Grant the requested permissions.
5. You will be redirected back to ViralToby.

### Permissions Requested

| Permission | Purpose |
|------------|---------|
| `threads_basic` | Read your Threads profile |
| `threads_content_publish` | Publish text posts |
| `threads_manage_insights` | Read post analytics |
| `threads_manage_replies` | Manage replies on your posts |
| `threads_read_replies` | Read replies to your posts |

:::info
Although Threads is owned by Meta, it uses a completely separate OAuth flow from Instagram and Facebook. You must connect Threads independently.
:::

---

## TikTok

TikTok integration publishes videos directly to your TikTok account.

### Requirements

- You need a TikTok account.
- Your account must be eligible for API-based publishing.

### How to Connect

1. Go to your brand's **Settings** page.
2. Click **Connect TikTok**.
3. You will be redirected to TikTok's authorization screen.
4. Log in and grant permissions.
5. You will be redirected back to ViralToby.

### Permissions Requested

| Permission | Purpose |
|------------|---------|
| `user.info.basic` | Read your basic profile information |
| `user.info.profile` | Read your profile details |
| `user.info.stats` | Read your account statistics |
| `video.list` | List your published videos |
| `video.publish` | Publish videos to your account |
| `video.upload` | Upload video files |

### Publishing Defaults

When you connect TikTok, you can configure default settings for published content:

- **Privacy level** -- who can see your videos (public, friends, private)
- **Comments** -- whether comments are enabled
- **Duets and stitches** -- whether other users can duet or stitch your content

---

## Bluesky

Bluesky is a decentralized social platform built on the AT Protocol. Unlike the other platforms, Bluesky uses **App Passwords** instead of OAuth for authentication.

### Requirements

- You need a Bluesky account (e.g., `yourhandle.bsky.social`).

### How to Connect

1. Go to your Bluesky account settings at [bsky.app/settings/app-passwords](https://bsky.app/settings/app-passwords).
2. Create a new **App Password**. Give it a recognizable name like "ViralToby".
3. Copy the generated app password.
4. In ViralToby, go to your brand's **Settings** page.
5. Click **Connect Bluesky**.
6. Enter your Bluesky handle (e.g., `yourhandle.bsky.social`) and the app password you just created.
7. Click **Connect**.

:::tip
App Passwords are separate from your main Bluesky password. You can revoke an App Password at any time from your Bluesky settings without affecting your account login. This is safer than sharing your main password.
:::

### Token Management

ViralToby creates an AT Protocol session using your App Password. This session token is automatically refreshed as needed. If the session expires and cannot be refreshed, you may need to re-enter your App Password.

---

## Token Auto-Refresh

ViralToby automatically manages token lifecycle for all platforms:

- **Instagram**: Long-lived tokens refreshed every 6 hours (well before the 60-day expiry).
- **Facebook**: Page tokens are long-lived and auto-refreshed alongside Instagram.
- **YouTube**: Uses Google's refresh token mechanism -- effectively indefinite.
- **Threads**: Long-lived tokens refreshed on the same schedule as Instagram.
- **TikTok**: Refresh tokens used to obtain new access tokens as needed.
- **Bluesky**: AT Protocol sessions refreshed automatically.

You do not need to manually re-connect your accounts unless you revoke access from the platform's side.

---

## Troubleshooting

### "Connection failed" or "Invalid token" errors

- **Instagram/Facebook/Threads**: Make sure you are logged into the correct Meta account in your browser before starting the OAuth flow.
- **YouTube**: Verify your Google account has an active YouTube channel.
- **TikTok**: Ensure you are using a TikTok account (not a TikTok Business Center account).
- **Bluesky**: Double-check your handle and app password. The handle must include the full domain (e.g., `yourname.bsky.social`).

### Account disconnects unexpectedly

This usually happens when:
1. You changed your password on the platform.
2. You revoked ViralToby's access from the platform's app settings.
3. The platform's API experienced an outage during token refresh.

**Solution**: Go to your brand settings and reconnect the platform.

### "Insufficient permissions" error

If you see this error during publishing, it usually means a required permission was not granted during the OAuth flow. Disconnect the platform and reconnect it, making sure to accept all requested permissions.

:::danger
Never share your access tokens or App Passwords with anyone. ViralToby stores all credentials securely on the server side -- they are never exposed to the browser or included in API responses.
:::

### Analytics not loading after connection

When you first connect a platform, ViralToby automatically fetches your analytics data. This includes up to 28 days of historical data from Instagram. If analytics appear empty, wait a few minutes and refresh -- the initial fetch runs in the background after the OAuth callback completes.
