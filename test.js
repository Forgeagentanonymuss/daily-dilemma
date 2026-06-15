/** Tests for Daily Dilemma logic (node test.js) */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {
  dateKey, dayIndex, randomIndex, pseudoSplit, updateStreak, shareText,
  migrateState, computeStats, computePersonality, getQuickPlayRemaining,
  dayGap, defaultState, QUICK_FREE_LIMIT,
  encodeSharePayload, decodeSharePayload, customShareMessage,
} = require("./app.js");

const dilemmas = JSON.parse(
  fs.readFileSync(path.join(__dirname, "dilemmas.json"), "utf8"));

assert.ok(dilemmas.length >= 90, "need at least 90 dilemmas");

const cats = new Set(dilemmas.map((d) => d.category));
assert.ok(cats.has("family"), "need family dilemmas");
assert.ok(cats.has("adult"), "need adult dilemmas");
assert.ok(cats.has("absurd"), "need absurd dilemmas");

const d1 = new Date("2026-06-13T12:00:00");
const d2 = new Date("2026-06-13T18:00:00");
const d3 = new Date("2026-06-14T12:00:00");
assert.equal(dateKey(d1), dateKey(d2), "same calendar day");
assert.notEqual(dateKey(d1), dateKey(d3), "different days");

const i1 = dayIndex(d1, dilemmas.length);
const i2 = dayIndex(d2, dilemmas.length);
const i3 = dayIndex(d3, dilemmas.length);
assert.equal(i1, i2, "stable index same day");
assert.notEqual(i1, i3, "different day picks different index");

const pct = pseudoSplit(1, "2026-06-13");
assert.ok(pct >= 38 && pct <= 62, "split in plausible range");

let state = { lastPlayDate: "2026-06-12", streak: 3 };
assert.equal(updateStreak(state, "2026-06-13"), 4, "streak increments");
state = { lastPlayDate: "2026-06-13", streak: 3 };
assert.equal(updateStreak(state, "2026-06-13"), 3, "same day keeps streak");
state = { lastPlayDate: "2026-06-10", streak: 5 };
assert.equal(updateStreak(state, "2026-06-13"), 1, "gap resets streak");

state = { lastPlayDate: "2026-06-10", streak: 5 };
assert.equal(updateStreak(state, "2026-06-13", { shieldUsed: true }), 5, "shield preserves streak");

const txt = shareText({ a: "Pizza", b: "Salad" }, "a", 55);
assert.ok(txt.includes("Pizza"), "share mentions pick");

for (let i = 0; i < 50; i++) {
  const r = randomIndex(10, 3);
  assert.ok(r >= 0 && r < 10, "random index in range");
  assert.notEqual(r, 3, "random index avoids previous");
}

assert.equal(dayGap("2026-06-10", "2026-06-13"), 3, "day gap");

const legacy = {
  streak: 4,
  lastPlayDate: "2026-06-12",
  "2026-06-12": { choice: "a", dilemmaId: 1 },
};
const migrated = migrateState(legacy);
assert.equal(migrated.version, 2, "migrates to v2");
assert.equal(migrated.streak, 4, "keeps streak");
assert.ok(migrated.daily["2026-06-12"], "migrates daily play");
assert.ok(migrated.history.length >= 1, "migrates history");

const fresh = defaultState();
fresh.history = [
  { dilemmaId: 21, choice: "b", pctA: 40, mode: "quick", date: "2026-06-13", category: "absurd" },
  { dilemmaId: 22, choice: "b", pctA: 55, mode: "daily", date: "2026-06-12", category: "absurd" },
];
const stats = computeStats(fresh, dilemmas);
assert.equal(stats.total, 2, "stats count");
assert.equal(stats.byCat.absurd, 2, "stats category");

const personality = computePersonality({ total: 10, byCat: { absurd: 6, family: 2, adult: 2 }, pickA: 5, minorityPicks: 2 });
assert.equal(personality.title, "Chaos Coordinator", "personality absurd");

fresh.quickPlaysToday = { date: dateKey(), count: 3 };
assert.equal(getQuickPlayRemaining(fresh), QUICK_FREE_LIMIT - 3, "quick remaining");
fresh.isPremium = true;
assert.equal(getQuickPlayRemaining(fresh), Infinity, "premium unlimited");

const sample = { category: "absurd", a: "Duck-sized horse", b: "Horse-sized duck 🦆" };
const token = encodeSharePayload(sample);
const decoded = decodeSharePayload(token);
assert.ok(decoded, "share token decodes");
assert.equal(decoded.category, "absurd", "share keeps category");
assert.equal(decoded.a, sample.a, "share keeps option A");
assert.equal(decoded.b, sample.b, "share keeps unicode option B");
assert.equal(decodeSharePayload("not-valid!!!"), null, "invalid share rejected");
assert.equal(decodeSharePayload(encodeSharePayload({ category: "nope", a: "x", b: "y" })), null, "bad category rejected");

const msg = customShareMessage(sample);
assert.ok(msg.includes("Duck-sized horse"), "share message mentions dilemma");

console.log(`OK — ${dilemmas.length} dilemmas, index today=${i1} id=${dilemmas[i1].id}`);