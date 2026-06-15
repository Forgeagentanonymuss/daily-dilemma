# Squarespace setup — free page + members-only page

The game decides "premium or not" from **which page it's on**. Squarespace's paywall
controls who can reach the members page, so there's nothing for a user to fake.

Before pasting anything:

1. **Host the game files.** Put this whole `daily-dilemma/` folder on a free static
   host (GitHub Pages or Cloudflare Pages). You'll get one base URL — call it
   `GAME_HOST`, e.g. `https://yourname.github.io/daily-dilemma/`.
2. **In Squarespace, make a paywalled members page** (a Member Site page) and attach a
   **subscription pricing plan** (e.g. $2.99/month). Squarespace then handles billing,
   renewals, and revoking access when someone cancels or their payment fails.
3. **Make a public sign-up page** with the pricing plan block. Its URL is your
   `JOIN_URL`, e.g. `https://yoursite.com/join`.
4. Paste the snippets below into a **Code block** (or Embed block) on each page.

Replace `GAME_HOST` and `JOIN_URL` with your real URLs in every snippet.

---

## Approach A — iframe (recommended: simplest + fully isolated)

The game runs inside an iframe, so its styling can never clash with your Squarespace
theme. The members page is paywalled, so normal visitors never reach the premium copy.

**Free public page** — paste into a Code block:

```html
<iframe
  src="https://GAME_HOST/?join=https%3A%2F%2Fyoursite.com%2Fjoin"
  title="Daily Dilemma"
  style="width:100%;min-height:720px;border:none;border-radius:12px;"
  loading="lazy"></iframe>
```

(The `?join=` value is your JOIN_URL, URL-encoded — `://` becomes `%3A%2F%2F`.
Encode yours at any "URL encode" tool, or just keep the simple form above and swap the
domain.)

**Members-only (paywalled) page** — paste into a Code block:

```html
<iframe
  src="https://GAME_HOST/?premium=1"
  title="Daily Dilemma (Premium)"
  style="width:100%;min-height:720px;border:none;border-radius:12px;"
  loading="lazy"></iframe>
```

Trade-off to know: the `?premium=1` address is technically shareable, so a
tech-savvy member could pass that exact URL to a friend. For a low-priced casual game
this is usually fine. If you want to close that gap, use Approach B for the members page.

---

## Approach B — inline code (tighter: no shareable premium URL)

Here the "premium on" switch lives inside the paywalled page's own code, not in a URL,
so there's nothing to copy and share. Downside: the game's CSS now shares the page with
your Squarespace theme and may need minor visual tidying.

**Members-only (paywalled) page** — paste into a Code block:

```html
<link rel="stylesheet" href="https://GAME_HOST/style.css">
<script>
  window.DAILY_DILEMMA_CONFIG = {
    forcePremium: true,
    dilemmasUrl: "https://GAME_HOST/dilemmas.json"
  };
</script>
<main id="app" class="shell" aria-live="polite" role="main">
  <p class="loading">Loading Daily Dilemma…</p>
</main>
<script src="https://GAME_HOST/app.js"></script>
```

**Free public page (inline version, optional)** — paste into a Code block:

```html
<link rel="stylesheet" href="https://GAME_HOST/style.css">
<script>
  window.DAILY_DILEMMA_CONFIG = {
    forcePremium: false,
    subscribeUrl: "https://yoursite.com/join",
    priceHint: "$2.99/mo"
  };
</script>
<main id="app" class="shell" aria-live="polite" role="main">
  <p class="loading">Loading Daily Dilemma…</p>
</main>
<script src="https://GAME_HOST/app.js"></script>
```

---

## Config reference

`window.DAILY_DILEMMA_CONFIG` (inline approach):

| Key            | What it does                                            |
|----------------|---------------------------------------------------------|
| `forcePremium` | `true` on the members page, `false`/omitted on the free page |
| `subscribeUrl` | where the free page's "Go Premium" button sends people  |
| `priceHint`    | the price line shown in the upsell (e.g. `"$2.99/mo"`)  |
| `dilemmasUrl`  | full URL to `dilemmas.json` (inline approach only)      |

URL parameters (iframe approach):

| Param        | What it does                                              |
|--------------|----------------------------------------------------------|
| `?premium=1` | forces premium — use ONLY on the paywalled members iframe |
| `?join=URL`  | sets the "Go Premium" target on the free iframe           |

## Test checklist

- Free page: limits apply (5 quick plays/day), and "Go Premium" opens your sign-up page.
- Members page, signed in as a paying member: unlimited play, creator, and shields.
- Don't link to `?premium=1` from anywhere public, and don't append `?dev` on the live site.
