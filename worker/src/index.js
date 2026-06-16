/**
 * Daily Dilemma — real vote tallies
 * Cloudflare Worker + Durable Objects (SQLite-backed, free-tier friendly).
 *
 * Endpoints (all JSON, CORS-enabled):
 *   GET  /health                      -> { ok: true }
 *   GET  /split?id=123                -> { id, a, b, total, pctA, pctB }
 *   GET  /splits?ids=1,2,3            -> { "1": {...}, "2": {...}, ... }
 *   POST /vote   { id, choice:"a"|"b" } -> { id, a, b, total, pctA, pctB }
 *   GET  /unlock?token=SECRET         -> { premium: true|false, configured }
 *
 * One TallyObject Durable Object per dilemma id => atomic, race-free counters.
 * One RateLimiter Durable Object per IP        => simple token-bucket abuse guard.
 *
 * Env vars (set in wrangler.toml [vars] or the dashboard):
 *   ALLOWED_ORIGINS  Comma-separated list of allowed browser origins.
 *                    Leave unset to allow any origin ("*").
 *   SEED_VOTES       "false" to disable the cold-start baseline (default: on).
 *   RATE_LIMIT       "false" to disable per-IP rate limiting (default: on).
 */

import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const raw = (env.ALLOWED_ORIGINS || "").trim();
  let allowOrigin = "*";
  if (raw) {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    allowOrigin = list.includes(origin) ? origin : "null";
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(data, request, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request, env) },
  });
}

/* Deterministic, modest baseline so a brand-new dilemma never reveals as 0 votes.
   Real votes accumulate on top and overtake the seed within a few dozen votes. */
function seedFor(id) {
  let h = 2166136261 >>> 0;
  const s = "dd-seed-" + id;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const pctA = 40 + (h % 21); // 40..60
  const total = 10 + ((h >>> 5) % 15); // 10..24
  const a = Math.round((total * pctA) / 100);
  return { a, b: total - a };
}

function splitPayload(id, a, b) {
  const total = a + b;
  const pctA = total ? Math.round((a / total) * 100) : 50;
  return { id, a, b, total, pctA, pctB: 100 - pctA };
}

function validId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < 1e7 ? n : null;
}

/* Constant-time string compare to avoid leaking token length/contents via timing. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export class TallyObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.a = 0;
    this.b = 0;
    this.seeded = false;
    ctx.blockConcurrencyWhile(async () => {
      const m = await ctx.storage.get(["a", "b", "seeded"]);
      this.a = m.get("a") || 0;
      this.b = m.get("b") || 0;
      this.seeded = m.get("seeded") || false;
    });
  }

  async ensureSeed(id) {
    if (this.seeded) return;
    if (String(this.env.SEED_VOTES) === "false") {
      this.seeded = true;
      await this.ctx.storage.put("seeded", true);
      return;
    }
    const { a, b } = seedFor(id);
    this.a += a;
    this.b += b;
    this.seeded = true;
    await this.ctx.storage.put({ a: this.a, b: this.b, seeded: true });
  }

  async vote(id, choice) {
    await this.ensureSeed(id);
    if (choice === "a") this.a += 1;
    else this.b += 1;
    await this.ctx.storage.put({ a: this.a, b: this.b });
    return splitPayload(id, this.a, this.b);
  }

  async read(id) {
    await this.ensureSeed(id);
    return splitPayload(id, this.a, this.b);
  }
}

export class RateLimiter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  /* Token bucket: refills 1 token/sec up to a burst of 40. */
  async take() {
    const BURST = 40;
    const REFILL_PER_SEC = 1;
    const now = Date.now();
    const m = await this.ctx.storage.get(["tokens", "ts"]);
    let tokens = m.get("tokens");
    let ts = m.get("ts");
    if (tokens === undefined) {
      tokens = BURST;
      ts = now;
    }
    const elapsed = Math.max(0, (now - ts) / 1000);
    tokens = Math.min(BURST, tokens + elapsed * REFILL_PER_SEC);
    ts = now;
    if (tokens < 1) {
      await this.ctx.storage.put({ tokens, ts });
      return false;
    }
    tokens -= 1;
    await this.ctx.storage.put({ tokens, ts });
    return true;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (url.pathname === "/health") {
        return json({ ok: true, service: "daily-dilemma-votes" }, request, env);
      }

      if (url.pathname === "/split" && request.method === "GET") {
        const id = validId(url.searchParams.get("id"));
        if (id === null) return json({ error: "bad_id" }, request, env, 400);
        const stub = env.TALLIES.get(env.TALLIES.idFromName(String(id)));
        return json(await stub.read(id), request, env);
      }

      if (url.pathname === "/splits" && request.method === "GET") {
        const ids = (url.searchParams.get("ids") || "")
          .split(",")
          .map(validId)
          .filter((v) => v !== null)
          .slice(0, 50);
        const out = {};
        await Promise.all(
          ids.map(async (id) => {
            const stub = env.TALLIES.get(env.TALLIES.idFromName(String(id)));
            out[id] = await stub.read(id);
          })
        );
        return json(out, request, env);
      }

      if (url.pathname === "/vote" && request.method === "POST") {
        let body = null;
        try {
          body = await request.json();
        } catch {
          return json({ error: "bad_json" }, request, env, 400);
        }
        const id = validId(body && body.id);
        const choice = body && (body.choice === "a" || body.choice === "b") ? body.choice : null;
        if (id === null || !choice) return json({ error: "bad_vote" }, request, env, 400);

        if (String(env.RATE_LIMIT) !== "false") {
          const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
          const rl = env.RATE.get(env.RATE.idFromName(ip));
          const ok = await rl.take();
          if (!ok) return json({ error: "rate_limited" }, request, env, 429);
        }

        const stub = env.TALLIES.get(env.TALLIES.idFromName(String(id)));
        return json(await stub.vote(id, choice), request, env);
      }

      if (url.pathname === "/unlock" && request.method === "GET") {
        const secret = env.UNLOCK_TOKEN || "";
        // No token configured server-side => gating is disabled, allow (degrades to
        // the page-access gate). This prevents accidentally locking out members.
        if (!secret) return json({ premium: true, configured: false }, request, env);

        if (String(env.RATE_LIMIT) !== "false") {
          const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
          const rl = env.RATE.get(env.RATE.idFromName("unlock:" + ip));
          const ok = await rl.take();
          if (!ok) return json({ error: "rate_limited" }, request, env, 429);
        }

        const token = url.searchParams.get("token") || "";
        return json({ premium: safeEqual(token, secret), configured: true }, request, env);
      }

      return json({ error: "not_found" }, request, env, 404);
    } catch (e) {
      return json({ error: "server", detail: String((e && e.message) || e) }, request, env, 500);
    }
  },
};
