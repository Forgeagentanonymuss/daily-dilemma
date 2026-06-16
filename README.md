# Daily Dilemma

Pick a side. Argue about it later.

A premium, embeddable would-you-rather habit game: **one daily dilemma**, Quick Play,
category sessions, streaks, stats, achievements, and a gentle premium upsell.
Vanilla HTML/CSS/JS — no build step, Squarespace-iframe friendly.

## What changed in this version (premium refresh)

- **New design system** — deeper, higher-contrast sage + gold palette with real
  elevation and hierarchy (replaces the previous washed-out cream look).
- **Self-hosted typefaces** — Fraunces (display) + Inter (UI) in `/fonts`. No external
  font CDN call, so it loads fast and privately inside the iframe.
- **Reworked core screens** — bolder vote experience (coral A / sage B), a cleaner
  results reveal, a proud streak hero, and a more persuasive Go Premium modal.
- **125 rewritten dilemmas** with genuine tension and wit (`dilemmas.json`).
- **"Adult" category relabelled to "Grown-Up"** everywhere it shows, to avoid the
  18+ connotation. (The internal id stays `adult`, so existing data still works.)

## File map

| File | Role |
|------|------|
| `index.html` | Shell (preloads fonts, references `style.css?v=20` / `app.js?v=20`) |
| `app.js` | Logic + UI |
| `style.css` | Premium design system |
| `dilemmas.json` | Dilemma pool (125) |
| `fonts/` | Self-hosted Fraunces + Inter (woff2) |
| `test.js` | Node unit tests |
| `squarespace-code-block.html` | The iframe + resize bridge to paste into Squarespace |

## Run locally

```bash
cd daily-dilemma
python -m http.server 8780
# open http://localhost:8780
```

## Tests

```bash
node test.js
```

## Deploy

Host this folder on GitHub Pages / Cloudflare Pages (as you do now) and keep the
Squarespace **Code block** pointing the iframe at it. Because the asset URLs are
versioned (`?v=20`), browsers will pick up the new look on next load. If you ever
want to force-refresh, bump `v=20` to a higher number in `index.html`.

> Note: the `fonts/` folder must deploy alongside the other files, or the display
> typeface will fall back to a system serif.

## Premium unlock (real, via your Squarespace paywall)

The demo toggle is gone for real users (it only shows on localhost). Premium is now
granted by your **members-only page**: paste `squarespace-premium-code-block.html`
into a Code block on your paywalled "full version" page, and it unlocks the game for
members with an auto-renewing 30-day lease. Full steps — including an optional
server-validated token — are in **`PREMIUM-UNLOCK.md`**.

| Page | Paste this |
|------|------------|
| Free / public page | `squarespace-code-block.html` |
| Members-only premium page | `squarespace-premium-code-block.html` |
