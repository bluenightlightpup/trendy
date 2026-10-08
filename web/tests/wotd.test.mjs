import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInThisContext } from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
runInThisContext(readFileSync(join(__dirname, "../wotd.js"), "utf8"), { filename: "wotd.js" });
const W = globalThis.TrendyWOTD;
const J = (p) => JSON.parse(readFileSync(join(__dirname, p), "utf8"));
const golden = J("../../Tests/Fixtures/wotd-golden.json");
const slang = J("../data/slang.json");
const trends = J("../data/trends.json");
const pool = W.buildPool(slang);

test("pool matches the shared golden fixture", () => {
  assert.equal(pool.length, golden.poolSize);
  assert.deepEqual(pool.map((e) => e.terms[0]), golden.pool);
  assert.equal(W.EPOCH, golden.epoch);
  assert.equal(W.SEED_BASE, golden.seedBase);
});

test("golden vectors: date -> term (same in Python and Swift)", () => {
  assert.ok(golden.vectors.length >= 20);
  for (const v of golden.vectors) {
    assert.equal(W.wordForDate(slang, v.date, { pool, overrides: {} }).term, v.term, v.date);
  }
});

test("golden seeds and permutations", () => {
  for (const s of golden.seeds) assert.equal(W.cycleSeed(s.cycle), s.seed, `cycle ${s.cycle}`);
  for (const p of golden.permutations) assert.deepEqual(W.cycleOrder(p.n, p.cycle), p.order, `n=${p.n} c=${p.cycle}`);
});

test("overrides win only for terms in the pool", () => {
  for (const c of golden.overrideCases) {
    const w = W.wordForDate(slang, c.date, { pool, overrides: { overrides: golden.overrides } });
    assert.equal(w.term, c.term, c.date);
    assert.equal(w.override, c.override, c.date);
  }
  const shipped = J("../data/word-of-the-day.json");
  for (const [date, term] of Object.entries(W.overridesOf(shipped))) {
    assert.ok(W.wordForDate(slang, date, { pool, overrides: shipped }).override, `override ${date} -> ${term} not in pool`);
  }
});

test("every word appears once per cycle, no back-to-back repeats", () => {
  const n = pool.length;
  for (const cycle of [-1, 0, 1, 2, 3]) {
    const order = W.cycleOrder(n, cycle);
    assert.equal(new Set(order).size, n);
  }
  let prev = null;
  let d = W.addDays(W.EPOCH, -3);
  const seen = new Set();
  for (let i = 0; i < n * 3 + 3; i++) {
    const t = W.wordForDate(slang, d, { pool }).term;
    assert.notEqual(t, prev, d);
    if (i >= 3 && i < 3 + n) seen.add(t);
    prev = t;
    d = W.addDays(d, 1);
  }
  assert.equal(seen.size, n);
});

test("pool excludes abbreve, radar, opted-out and unsafe rows", () => {
  const base = { terms: ["zzz"], short: "s", origin: "o" };
  assert.equal(W.isEligible(base), true);
  assert.equal(W.isEligible({ ...base, source: "abbreve" }), false);
  assert.equal(W.isEligible({ ...base, confidence: "low" }), false);
  assert.equal(W.isEligible({ ...base, radarSource: "reddit" }), false);
  assert.equal(W.isEligible({ ...base, wotd: false }), false);
  assert.equal(W.isEligible({ ...base, mature: true }), false);
  assert.equal(W.isEligible({ ...base, origin: "" }), false);
  assert.equal(W.isEligible({ ...base, explain: "a hookup app thing" }), false);
  assert.equal(W.isEligible({ ...base, explain: "What The F***" }), false);
  assert.equal(W.isEligible({ ...base, terms: ["edging"] }), false);
  assert.equal(W.isEligible({ ...base, explain: "Sussex essays" }), true, "whole words only");
  const terms = pool.flatMap((e) => e.terms.map(W.normalizeTerm));
  for (const bad of ["sneaky link", "gyatt", "deadass", "edging", "situationship", "wtf", "copium"]) {
    assert.ok(!terms.includes(bad), bad);
  }
  for (const e of pool) assert.ok(e.wotdExample || e.example, `example for ${e.terms[0]}`);
});

test("dates: validation, local date, add days", () => {
  assert.equal(W.isValidDate("2026-02-29"), false);
  assert.equal(W.isValidDate("2028-02-29"), true);
  assert.equal(W.isValidDate("2026-1-1"), false);
  assert.throws(() => W.wordForDate(slang, "2026-13-01", { pool }));
  assert.equal(W.daysSinceEpoch("2026-01-01"), 0);
  assert.equal(W.daysSinceEpoch("2025-12-31"), -1);
  assert.equal(W.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(W.localDateString(new Date(2026, 9, 8, 23, 59)), "2026-10-08");
});

test("details, share text and saved words", () => {
  const w = W.wordForDate(slang, "2026-10-08", { pool, overrides: { overrides: { "2026-10-08": "rizz" } } });
  const d = W.details(w, trends);
  assert.equal(d.term, "rizz");
  assert.match(d.meaning, /Charisma/);
  assert.ok(d.example && d.origin && d.age.startsWith("Gen Z"));
  assert.equal(
    W.shareText(d),
    `Trendy word of the day: rizz \u2014 ${d.meaning} https://bluenightlightpup.github.io/trendy/app/`
  );
  const w67 = W.wordForDate(slang, "2026-10-08", { pool, overrides: { "2026-10-08": "six seven" } });
  assert.equal(w67.term, "six seven");
  assert.ok(W.details(w67, trends).trend, "67 is also a trend");
  assert.equal(W.displayTerm("w"), "W");
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  let r = W.toggleSavedWord([], "rizz");
  assert.deepEqual(r, { words: ["rizz"], saved: true });
  W.persistSavedWords(r.words, storage);
  assert.deepEqual(W.loadSavedWords(storage), ["rizz"]);
  r = W.toggleSavedWord(W.loadSavedWords(storage), "RIZZ");
  assert.deepEqual(r, { words: [], saved: false });
});

test("quoteExample avoids double quotes", () => {
  assert.equal(W.quoteExample("This slaps."), "\u201CThis slaps.\u201D");
  assert.equal(W.quoteExample("\u201CPizza?\u201D \u201CBet.\u201D"), "\u201CPizza?\u201D \u201CBet.\u201D");
  assert.equal(W.quoteExample(""), "");
});
