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

// Keep the suite offline by default; individual tests install their own stubs.
globalThis.fetch = async () => {
  throw new Error("offline stub");
};

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

/** Fake Wiktionary: existence check + REST definitions keyed by word. */
function wiktionaryStub(defsByWord) {
  return async (url) => {
    const u = String(url);
    const json = (body) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes("/w/api.php")) {
      const word = decodeURIComponent(u.match(/titles=([^&]+)/)[1]);
      return json({ query: { pages: [defsByWord[word] ? { title: word } : { title: word, missing: true }] } });
    }
    const m = u.match(/page\/definition\/([^?]+)/);
    if (m) {
      const word = decodeURIComponent(m[1]);
      if (!defsByWord[word]) return { ok: false, status: 404, json: async () => ({}) };
      return json({ en: [{ language: "English", partOfSpeech: "Noun", definitions: defsByWord[word].map((d) => ({ definition: d })) }] });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

async function withFetch(stub, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const ctx = (extra = {}) => ({ slang, abbreve, trends, newHere: false, ...extra });

test("stripHtml removes style blocks, leaked CSS, invisible chars and spacing artifacts", () => {
  const raw =
    '<style data-mw-deduplicate="x">.mw-parser-output .defdate{font-size:smaller}</style>' +
    '<span>A person <b>\u2019s</b> charm <i>.</i> .</span> from it +\u200e is\u200b&nbsp;fun &amp; more';
  const out = AI.stripHtml(raw);
  assert.doesNotMatch(out, /mw-parser-output|font-size|\{|\}/);
  assert.doesNotMatch(out, /[\u200b-\u200f\ufeff]/);
  assert.match(out, /person\u2019s charm\./);
  assert.doesNotMatch(out, /\. \./);
  assert.match(out, /it \+ is fun & more/);
  // Bare leaked rule with no <style> wrapper
  assert.equal(AI.stripHtml(".mw-parser-output .defdate{font-size:smaller} Charm or appeal."), "Charm or appeal.");
});

test("rizz Other senses come through clean (no Wiktionary CSS leak)", async () => {
  const stub = wiktionaryStub({
    rizz: ['<style>.mw-parser-output .defdate{font-size:smaller}</style>Romantic appeal or charm <span>.</span>'],
  });
  const ans = await withFetch(stub, () => AI.decodeQuery("rizz", ctx()));
  const other = ans.parts.find((p) => p.title === "Other senses");
  assert.ok(other, "rizz should show dictionary other senses");
  assert.doesNotMatch(other.body, /mw-parser|font-size|\{/);
  assert.match(other.body, /charm\.$/);
  assert.equal(ans.usedDictionary, true);
  assert.match(AI.sourceLabel({ ...ans, slangBucket: ans.slangBucket }), /Trendy lexicon \+ dictionary/);
});

test("na leads with the nah slang sense and lists Not Applicable as an abbreviation", async () => {
  const ans = await AI.decodeQuery("na", ctx());
  assert.equal(ans.source, "lexicon");
  assert.equal(ans.parts[0].title, "Slang meaning");
  assert.match(ans.parts[0].body, /\bno\b/i);
  const also = ans.parts.find((p) => p.title === "Also short for");
  assert.ok(also, "na should mention the abbreviation sense");
  assert.match(also.body, /Not Applicable/);
  assert.match(ans.parts.find((p) => p.title === "Who says this").body, /Mixed/);
  assert.equal(ans.suggestEligible, false);
});

test("W and L get curated slang cards with origin and age (no suggest form)", async () => {
  for (const [q, re] of [["W", /win/i], ["L", /loss/i]]) {
    const ans = await AI.decodeQuery(q, ctx());
    assert.equal(ans.source, "lexicon", q);
    assert.equal(ans.parts[0].title, "Slang meaning", q);
    assert.match(ans.parts[0].body, re, q);
    assert.ok(ans.parts.some((p) => p.title === "Where it comes from"), `${q} origin`);
    assert.ok(ans.parts.some((p) => p.title === "Who says this"), `${q} age`);
    assert.equal(ans.suggestEligible, false, q);
  }
});

test("multi-word phrases never borrow first-word dictionary senses (nah id win)", async () => {
  let dictCalls = 0;
  const base = wiktionaryStub({ nah: ["(Interjection) here!"] });
  const stub = async (url) => {
    dictCalls += 1;
    return base(url);
  };
  const ans = await withFetch(stub, () => AI.decodeQuery("nah id win", ctx({ newHere: true })));
  assert.equal(dictCalls, 0, "no dictionary lookup for phrases");
  assert.ok(!ans.parts.some((p) => /Other senses|dictionary/i.test(p.title)));
  assert.doesNotMatch(bodies(ans), /here!/);
  assert.equal(AI.dictionaryWord("nah id win"), "");
  assert.equal(AI.dictionaryWord("Rizz"), "rizz");
});

test("67 dictionary sense is not duplicated under Other senses and Also in the dictionary", async () => {
  const stub = wiktionaryStub({ 67: ["The cardinal number sixty-seven."] });
  const ans = await withFetch(stub, () => AI.decodeQuery("67", ctx({ newHere: true })));
  const hits = ans.parts.filter((p) => /sixty-seven/.test(p.body));
  assert.equal(hits.length, 1, JSON.stringify(ans.parts.map((p) => p.title)));
});

test("abbreviation rows do not hijack ordinary words in phrases", async () => {
  for (const q of ["i was so tired", "ok so", "y tho bro"]) {
    const hit = AI.findSlangEntry(slang, abbreve, q, { entries: [] });
    const text = hit ? hit.entry.short : "";
    assert.doesNotMatch(text, /Wait a Second|Significant Other|^Why$/, q);
  }
  const tired = await AI.decodeQuery("i was so tired", ctx());
  assert.doesNotMatch(bodies(tired), /Wait a Second|Significant Other/);
  // Exact queries still decode the abbreviation
  const so = AI.findSlangEntry(slang, abbreve, "s/o", { entries: [] });
  assert.match(so.entry.short, /Shout Out/);
});

test("s/o decodes as Shout Out (no URL-encoded s%2fo row)", async () => {
  const ans = await AI.decodeQuery("s/o", ctx());
  assert.match(ans.parts[0].body, /Shout Out/);
  assert.equal(ans.parts[0].title, "Texting abbreviation");
  assert.ok(!abbreve.entries.some((e) => (e.terms || []).some((t) => /%2f/i.test(t))));
});

test("meaning labels are accurate: jk is a texting abbreviation, bro is slang", async () => {
  const jk = await AI.decodeQuery("jk", ctx());
  assert.equal(jk.parts[0].title, "Texting abbreviation");
  assert.ok(jk.parts.find((p) => p.title === "Where it comes from").body.length > 40, "jk origin enriched");
  const bro = await AI.decodeQuery("bro", ctx());
  assert.equal(bro.parts[0].title, "Slang meaning");
  assert.ok(!bodies(jk).includes("TikTok / internet"));
  assert.equal(AI.sourceLabel({ source: "lexicon" }), "Trendy lexicon");
  assert.equal(AI.sourceLabel({ source: "ai-fallback" }), "Best guess");
});

test("unknown words fail quietly without hitting the 404 definition endpoint", async () => {
  const seen = [];
  const base = wiktionaryStub({});
  const ans = await withFetch(
    async (url) => {
      seen.push(String(url));
      return base(url);
    },
    () => AI.decodeQuery("xqzzyflorb", ctx())
  );
  assert.ok(seen.every((u) => u.includes("/w/api.php")), seen.join("\n"));
  assert.ok(ans.parts.length > 0);
});

test("silly insult pack decodes (piddlefart, fartknocker, nincompoop, fuddy-duddy) without hijacking words", async () => {
  const cases = [
    ["piddlefart", "piddlefart", /dawdle|goof off/i],
    ["piddle-fart", "piddlefart", /dawdle|goof off/i],
    ["stop piddlefarting around", "piddlefart", /dawdle|goof off/i],
    ["fartknocker", "fartknocker", /annoying/i],
    ["what does nincompoop mean?", "nincompoop", /foolish|silly/i],
    ["fuddy-duddy", "fuddy-duddy", /old-fashioned/i],
    ["fuddy duddy", "fuddy-duddy", /old-fashioned/i],
    ["smooth brain", "smooth brain", /clueless/i],
  ];
  for (const [q, first, meaning] of cases) {
    const hit = AI.findSlangEntry(slang, abbreve, q, null);
    assert.ok(hit, q);
    assert.equal(hit.entry.terms[0], first, q);
    assert.equal(hit.entry.wotd, false, `${q} stays out of Word of the day`);
    const ans = await AI.decodeQuery(q, { slang, abbreve, trends, newHere: false });
    assert.equal(ans.source, "lexicon", q);
    assert.match(bodies(ans), meaning, q);
  }
  // Ordinary words must not decode as one of these insults.
  for (const q of ["twitch", "twitter", "brain", "flummoxed", "knocker", "munch", "fiddle", "hammer", "around"]) {
    const hit = AI.findSlangEntry(slang, abbreve, q, null);
    const first = hit ? hit.entry.terms[0] : null;
    assert.ok(
      !["twit", "lamebrain", "birdbrain", "lummox", "fartknocker", "buttmunch", "fiddlefart", "ninnyhammer", "piddlefart"].includes(first),
      `${q} → ${first}`,
    );
  }
});
