# PANORAMA — Cloudflare Static Assets Deployment Guide

This guide details how to deploy the PANORAMA application to Cloudflare without a build step, connect your GitHub repository, configure Supabase redirect URLs, and manage redeployments.

---

## Deployment Architecture

- **Runtime**: Static Assets (Zero build step, vanilla HTML5/CSS3/ES6+ JavaScript).
- **Vendor Dependencies**: `@supabase/supabase-js` is vendored directly in `js/vendor/supabase.js`.
- **Target Hosting**: Cloudflare Pages or Cloudflare Workers with Static Assets (`wrangler.jsonc`).
- **Repository**: [https://github.com/AdityaVerma223/Inception-Project](https://github.com/AdityaVerma223/Inception-Project)

---

## Method 1: Cloudflare Dashboard via GitHub Git Integration (Recommended)

This method enables automatic continuous deployment whenever you push commits to GitHub.

### Step 1: Connect Repository in Cloudflare
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation sidebar, go to **Workers & Pages**.
3. Click **Create application** -> select the **Pages** tab -> click **Connect to Git**.
4. Select your GitHub account and authorize access to:
   `AdityaVerma223/Inception-Project`
5. Click **Begin setup**.

### Step 2: Configure Build & Output Settings
- **Project name**: `panorama-study` (or `inception-project`).
- **Production branch**: `main`.
- **Framework preset**: `None`.
- **Build command**: *(Leave completely blank / empty)*.
- **Build output directory**: `/` (or root `.`).
- **Environment variables**: None needed at build time (`js/config.js` configures public client URL/key).
- Click **Save and Deploy**.

Cloudflare will deploy your static assets in under 30 seconds and provide you with a production URL (e.g., `https://panorama-study.pages.dev`).

---

## Method 2: Command Line Deployment via Wrangler CLI

If you prefer deploying directly from your terminal:

```bash
# 1. Sign in to your Cloudflare account
npx wrangler login

# 2. Deploy static assets using wrangler.jsonc
npx wrangler deploy
```

---

## Step 3: Link Production URL to Supabase Auth Redirects

After your Cloudflare deployment finishes, you must add your production URL to Supabase so authentication confirmation and password reset links work properly:

1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** -> **URL Configuration**.
3. Update **Site URL**:
   ```
   https://inception.av647247.workers.dev
   ```
4. In **Redirect URLs**, add:
   ```
   https://inception.av647247.workers.dev/#/app/dashboard
   https://inception.av647247.workers.dev/#/confirm-email
   https://inception.av647247.workers.dev/**
   ```
5. Click **Save**.

---

## How to Redeploy

Every `git push origin main` will automatically trigger a fresh deployment in Cloudflare Pages:
```bash
git add .
git commit -m "Deploy latest updates"
git push origin main
```

---

## Production Verification Checklist

1. [ ] **Sign up & Log in**: Navigate to `https://inception.av647247.workers.dev/#/signup`, create an account, log out, and log back in.
2. [ ] **Cross-Device Test**: Add a subject and task on your computer; log in with the same account on a mobile browser and verify the data appears instantly.
3. [ ] **RLS Isolation Test**: Open an Incognito window, register User B, and confirm zero tasks or subjects belonging to User A are visible.
4. [ ] **Guest Mode**: Open in a private browser, click "Explore as Guest", add sample data, and verify persistence.
5. [ ] **Guest-to-Cloud Migration**: Create an account from guest mode and accept the one-time import prompt.
6. [ ] **Offline Fallback**: Disconnect your internet connection (or toggle DevTools "Offline") and verify the app displays the top `#offline-banner` while keeping the cached plan readable.
