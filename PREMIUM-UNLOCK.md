# Real Premium unlock (Squarespace paywall)

This replaces the old demo toggle with a real unlock tied to your Squarespace
paywall. No third-party login or backend account is required.

## How it works

- Your **free** page embeds the game with `squarespace-code-block.html` (as now).
- Your **members-only** "full version" page embeds it with
  `squarespace-premium-code-block.html`.
- Because only paying members can open that page, it tells the game to switch into
  Premium mode. It grants a **30-day lease** that renews every time the member opens
  the page.
- If a member's subscription ends, they can no longer open the premium page, the lease
  stops renewing, and the game reverts to free within 30 days. No manual revocation.

The demo "Toggle premium" button only ever appears on `localhost` (or with `?dev` in
the URL), so it is never visible to your real visitors.

## Setup (2 minutes)

1. In Squarespace, open your **members-only / paywalled** page.
2. Add a **Code block**.
3. Paste the entire contents of `squarespace-premium-code-block.html`.
4. Make sure the iframe `src` and the `GAME` origin point at the same hosted game URL
   you use on the free page (your GitHub Pages URL).
5. Save, then test in a private/incognito window as a paying member — the game should
   show the gold **Premium** badge and unlimited Quick Play.

> Squarespace disables custom scripts while you're logged into the editor ("safe
> mode"), so always test in a private window where you're a normal logged-in member.

## If your premium page is on a different domain

By default the game trusts `the-daily-dilemma.com` and `www.the-daily-dilemma.com`.
If your premium page lives somewhere else, add this line to `index.html` (before
`app.js` loads) with your exact origin(s):

```js
window.DD_PREMIUM_ORIGINS = ["https://members.example.com"];
```

## Optional: server-validated token (extra hardening)

Page-access gating is enough for almost everyone. If you want the unlock validated
server-side as well (so it can't be triggered by hand from the free page's console):

1. Deploy the vote Worker (see `worker/README.md`) and set a secret:
   `npx wrangler secret put UNLOCK_TOKEN`
2. Paste the same secret into `UNLOCK_TOKEN` in `squarespace-premium-code-block.html`.
3. Set `window.DD_VOTE_API` in `index.html` to your Worker URL (you'll already have
   done this if you enabled real vote tallies).

The game then checks the token with the Worker before unlocking. If the Worker is
ever unreachable, it falls back to the page-access gate so members are never locked
out.

## Honest note on client-side premium

All of the game's data and features live in the browser, so a determined technical
user could unlock premium locally (this is true of any front-end-only paywall). The
Squarespace paywall reliably gates **page access**, and this flow gives every genuine
member a correct, automatic experience — which is what matters for a product like
this. True per-user enforcement would require a login/account backend, which is out of
scope for a Squarespace + static-site setup.
