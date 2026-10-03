import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInThisContext } from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
runInThisContext(readFileSync(join(__dirname, "../decode-ai.js"), "utf8"), {
  filename: "decode-ai.js",
});

const AI = globalThis.TrendyDecodeAI;
assert.ok(AI, "TrendyDecodeAI should load");

test("extractTerm pulls phrase from question forms", () => {
  assert.equal(AI.extractTerm("what does jk mean?"), "jk");
  assert.equal(AI.extractTerm("define skill issue"), "skill issue");
  assert.equal(AI.extractTerm("rizz"), "rizz");
  assert.equal(AI.extractTerm("meaning of aura"), "aura");
});

test("jk and bro resolve via core lexicon", async () => {
  const empty = { entries: [] };
  const jk = await AI.decodeQuery("jk", {
    slang: empty,
    abbreve: empty,
    trends: [],
    newHere: false,
  });
  assert.equal(AI.normalize(jk.term), "jk");
  assert.equal(jk.source, "lexicon");
  assert.match(jk.parts.map((p) => p.body).join(" "), /kidding/i);

  const bro = await AI.decodeQuery("what does bro mean?", {
    slang: empty,
    abbreve: empty,
    trends: [],
    newHere: true,
  });
  assert.equal(AI.normalize(bro.term), "bro");
  assert.equal(bro.source, "lexicon");
  assert.match(bro.parts.map((p) => p.body).join(" "), /dude|friend|brother/i);
});

test("never-blank for nonsense term", async () => {
  const empty = { entries: [] };
  // Stub network lookups so CI stays offline-friendly
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline stub");
  };
  try {
    const ans = await AI.decodeQuery("xqzzyflorb-99", {
      slang: empty,
      abbreve: empty,
      trends: [],
      newHere: true,
    });
    assert.ok(ans.term);
    assert.ok(Array.isArray(ans.parts) && ans.parts.length > 0);
    const text = ans.parts.map((p) => `${p.title} ${p.body}`).join("\n");
    assert.ok(text.trim().length > 0, "answer body must not be blank");
    assert.match(ans.source, /ai|heuristic|dictionary/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const slang = JSON.parse(readFileSync(join(__dirname, "../data/slang.json"), "utf8"));
const abbreve = JSON.parse(readFileSync(join(__dirname, "../data/abbreve.json"), "utf8"));
const trends = JSON.parse(readFileSync(join(__dirname, "../data/trends.json"), "utf8"));

function bodies(ans) {
  return ans.parts.map((p) => p.body).join(" ");
}

test("skibidi / skibiti toilet are DaFuq series, not Inspired By", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline stub");
  };
  try {
    for (const q of ["skibidi", "skibiti toilet", "what does skibidi toilet mean?"]) {
      const ans = await AI.decodeQuery(q, { slang, abbreve, trends, newHere: false });
      const text = bodies(ans);
      assert.equal(ans.source, "lexicon");
      assert.match(text, /DaFuq|toilet|Cameramen|brainrot/i);
      assert.doesNotMatch(text, /Inspired By/i);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ib still means Inspired By when queried exactly", async () => {
  const ans = await AI.decodeQuery("ib", {
    slang,
    abbreve,
    trends: [],
    newHere: false,
  });
  assert.match(bodies(ans), /Inspired By/i);
});

test("fuzzy aliases map skibiti → skibidi", () => {
  assert.equal(AI.applyAlias("skibiti"), "skibidi");
  assert.equal(AI.applyAlias("skibiti toilet"), "skibidi toilet");
});

test("who says this appears for 67, nah I'd win, bro, and alpha", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline stub");
  };
  try {
    const cases = [
      ["67", /Gen Alpha/],
      ["nah I'd win", /Gen Z/],
      ["what does bro mean?", /Mixed/],
      ["alpha", /Gen Z/],
    ];
    for (const [q, re] of cases) {
      const ans = await AI.decodeQuery(q, { slang, abbreve, trends, newHere: false });
      const titles = ans.parts.map((part) => part.title);
      const who = ans.parts.find((part) => part.title === "Who says this");
      assert.ok(who, `${q} should include Who says this`);
      assert.match(who.body, re, q);
      const meaningIdx = titles.findIndex((title) => /meaning/i.test(title));
      const originIdx = titles.indexOf("Where it comes from");
      const whoIdx = titles.indexOf("Who says this");
      assert.ok(meaningIdx >= 0 && whoIdx > meaningIdx, `${q} age after meaning`);
      if (originIdx >= 0) assert.ok(whoIdx > originIdx, `${q} age after origin`);
      assert.ok(ans.parts.some((part) => /meaning/i.test(part.title)));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
