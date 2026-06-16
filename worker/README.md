# Daily Dilemma — real vote tallies (Cloudflare Worker)

This Worker stores **real, worldwide vote counts** for each dilemma and returns the
live A/B split. The game calls it when someone votes, then updates the result screen
with the true numbers. If the Worker is ever unreachable, the game silently falls
back to its built-in local split — votes never block gameplay.

It uses **Durable Objects** (one tiny counter per dilemma), which gives accurate,
race-free tallies and runs on Cloudflare's **free** Workers plan
(~100,000 requests/day included — plenty for launch).

---

## What you'll need

- A free Cloudflare account.
- Node.js installed (for the `wrangler` command-line tool).
- About 10 minutes.

## Deploy in 4 steps

```bash
# 1. From this worker/ folder, install the Cloudflare CLI
npm install

# 2. Log in (opens your browser once)
npx wrangler login

# 3. Deploy
npx wrangler deploy
```

After step 3, wrangler prints your Worker URL, e.g.

```
https://daily-dilemma-votes.YOUR-SUBDOMAIN.workers.dev
```

```bash
# 4. Quick check (should return {"ok":true,...})
curl https://daily-dilemma-votes.YOUR-SUBDOMAIN.workers.dev/health
```

> If `wrangler deploy` mentions enabling Durable Objects, just accept — SQLite-backed
> Durable Objects are included on the free plan.

## Connect the game

Open `index.html` in the game folder and paste your Worker URL:

```js
window.DD_VOTE_API = "https://daily-dilemma-votes.YOUR-SUBDOMAIN.workers.dev";
```

Re-upload `index.html` to your host (GitHub Pages, etc.). That's it — the result
screens now show real splits. Because you host the **same** game files on both your
free page and your premium page, both start collecting and sharing the same live data.

## Lock it to your sites (recommended once live)

By default the endpoint accepts requests from any origin. To restrict it to your
domains, open `wrangler.toml` and set `ALLOWED_ORIGINS`, then redeploy:

```toml
[vars]
ALLOWED_ORIGINS = "https://forgeagentanonymuss.github.io,https://the-daily-dilemma.com,https://www.the-daily-dilemma.com"
```

```bash
npx wrangler deploy
```

(Use the exact origins your game is served from — the GitHub Pages origin plus your
Squarespace domains.)

## Settings (in `wrangler.toml` → `[vars]`)

| Var | Default | Meaning |
|-----|---------|---------|
| `ALLOWED_ORIGINS` | `""` (any) | Comma-separated allowed browser origins. |
| `SEED_VOTES` | `"true"` | Gives each brand-new dilemma a small, believable baseline (~10–24 votes) so day-one reveals aren't "0%". Real votes quickly overtake it. Set `"false"` for pure real data from the very first vote. |
| `RATE_LIMIT` | `"true"` | Per-IP token bucket (burst 40, refills 1/sec) to deter spam. |

## API reference

| Method & path | Returns |
|---------------|---------|
| `GET /health` | `{ ok: true }` |
| `GET /split?id=123` | `{ id, a, b, total, pctA, pctB }` |
| `GET /splits?ids=1,2,3` | `{ "1": {…}, "2": {…} }` (up to 50 ids) |
| `POST /vote` `{ "id": 123, "choice": "a" }` | updated split for that dilemma |
| `GET /unlock?token=SECRET` | `{ premium: true|false, configured }` (premium gate, optional) |

## Optional: harden the premium unlock

The premium unlock works on its own (your members-only Squarespace page grants it —
see `../worker`-sibling `squarespace-premium-code-block.html`). If you also want the
unlock validated server-side, set a secret token:

```bash
npx wrangler secret put UNLOCK_TOKEN
# paste any long random string when prompted, e.g. a UUID
```

Then paste the **same** string into `UNLOCK_TOKEN` in the premium code block. The game
will check it against the Worker before unlocking. If no `UNLOCK_TOKEN` is set on the
Worker, this check is simply skipped (the page-access gate still applies), so you can
add it later without breaking anything.

## How votes are counted

- One `TallyObject` Durable Object exists per dilemma id. Increments are atomic
  (single-threaded actor), so no votes are lost under concurrency.
- The game records each official-dilemma vote once per play — daily, Quick Play, and
  category sessions all count. Custom and shared dilemmas (non-numeric ids) are not
  sent to the tally.
- Counts are lifetime per dilemma, so the same question shows a consistent split
  wherever it appears.

## Cost

Free tier covers a launching app comfortably. If you grow past the free limits,
the Workers Paid plan is $5/month with generous included usage. There are no fixed
monthly costs to start.

## Local development (optional)

```bash
npx wrangler dev
# then in another terminal:
curl "http://localhost:8787/split?id=1"
curl -X POST http://localhost:8787/vote -H "content-type: application/json" -d '{"id":1,"choice":"a"}'
```
