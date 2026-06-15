# Daily Dilemma

Pick a side. Argue about it later.

A cozy, embeddable would-you-rather habit game: **one daily dilemma**, **Quick Play**, category sessions, streaks, stats, achievements, and a gentle premium upsell. Vanilla HTML/CSS/JS — no build step, Squarespace-iframe friendly.

## Features

| Free | Premium (demo-unlockable) |
|------|---------------------------|
| 1 daily dilemma + streak | Unlimited Quick Play |
| 5 Quick Plays / day | Custom dilemmas in random pool |
| Category sessions (3 categories) | Unlimited custom creator |
| History, stats, achievements | 3 streak shields |
| Share picks | Creator achievement |

### Modes

- **Home** — streak hero, today's teaser, quick actions
- **Daily** — one puzzle per calendar day (deterministic from date)
- **Quick Play** — random dilemmas, 5/day free
- **Categories** — 4-dilemma sessions for family / adult / absurd
- **History** — replay and re-share past picks
- **Stats** — totals, category breakdown, A/B lean, personality label
- **Achievements** — 15 badges with confetti unlocks
- **Creator** — save custom dilemmas (premium mixes into Quick Play)

## Run locally

```bash
cd daily-dilemma
python -m http.server 8780
```

Or double-click `start.bat` (Windows).

Open http://localhost:8780

### Dev / test tools (localhost only)

- **New daily** — random daily dilemma + clear today's vote
- **Reset all** — wipe localStorage
- **Toggle premium** — flip demo premium flag
- URL: `?reset` or `?reset=all`

## Tests

```bash
node test.js
```

## Squarespace embed

Squarespace hosts your **marketing site**; host this folder elsewhere (GitHub Pages, Cloudflare Pages, VPS static nginx) and embed via iframe.

```html
<iframe src="https://YOUR-HOST/daily-dilemma/" title="Daily Dilemma"
  style="width:100%;min-height:680px;border:none;border-radius:12px;"
  loading="lazy"></iframe>
```

### Hosting options

1. **GitHub Pages** (free, isolated from your server) — recommended for MVP
2. **Cloudflare Pages** — same idea, free CDN
3. **Your VPS** — nginx static vhost serving *only* this read-only folder (do not expose internal services)

## Monetization (per-page premium switch)

There is **no client-side "unlock"** — that would be trivially fakeable. Instead, premium is decided by **which page the game is embedded on**. You run the game on two Squarespace pages:

- **Free public page** — game runs in free mode. The "Go Premium" button sends visitors to your subscribe page.
- **Members-only page** (gated by a Squarespace paywall / pricing plan) — game runs in premium mode. Squarespace handles billing, renewals, and cutting off access when a subscription lapses.

Squarespace's paywall is the source of truth for who paid; the game just reads a flag set by the page.

### Config (set on the host page BEFORE app.js loads)

```html
<script>
  window.DAILY_DILEMMA_CONFIG = {
    forcePremium: true,                        // members page: true · free page: false/omit
    subscribeUrl: "https://YOURSITE.com/join", // free-page "Go Premium" target
    priceHint: "$2.99/mo"                       // shown in the upsell
  };
</script>
```

- `forcePremium: true` → premium on, upsell hidden.
- omitted/`false` → free tier, limits apply, upsell links to `subscribeUrl`.
- `?premium=1` in the URL also forces premium (handy for testing only — don't link to it publicly).

Any stored `isPremium` value is overwritten on load, so an edited localStorage flag can't grant premium.

### Upgrade path later (cross-device accounts)

If you outgrow page-based gating, move to **Stripe + a small backend** (Cloudflare Worker / Supabase): add login, have the backend track Stripe subscription status via webhooks, and replace `isPremiumPage()` with a call to that backend.

Suggested pricing (edit via `priceHint`): **$2.99/mo** or **$19.99/yr**.

## State & migration

- Storage key: `dailyDilemma_v2` (migrates gently from `dailyDilemma_v1`)
- All progress is local — no account required for MVP
- See top of `app.js` for full state shape

## Backend (later)

Replace `pseudoSplit()` with real vote tallies (Supabase, Cloudflare Worker, or VPS + SQLite). Keep the same JSON dilemma pool.

## File map

| File | Role |
|------|------|
| `index.html` | Shell |
| `app.js` | Logic + UI |
| `style.css` | Design system |
| `dilemmas.json` | Official dilemma pool (~100) |
| `test.js` | Node unit tests |
| `start.bat` / `start.ps1` | Local server helpers |