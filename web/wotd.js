/* Trendy — Word of the Day (shared by the PWA and the website; no network, no DOM).
 *
 * Same word everywhere on a given local calendar date, offline, no server. The algorithm is
 * implemented identically in cli/wotd.py (CLI + MCP) and App/Core/WordOfTheDay.swift (iOS);
 * Tests/Fixtures/wotd-golden.json holds golden vectors all three test suites must match.
 * Spec: docs/word-of-the-day.md
 *
 *   pool   = slang.json entries with a meaning + origin, not Abbreve rows, not Radar candidates,
 *            not opted out (`wotd: false`, `mature: true`) and clean for a 13+ audience
 *   order  = pool stable-sorted by key (first term, lowercased, code-point order)
 *   days   = local date − 2026-01-01;  cycle = floor(days / N);  slot = days mod N
 *   perm   = Fisher–Yates over [0..N) with mulberry32(seed(cycle)); if perm[0] equals the previous
 *            cycle's last word, swap perm[0] and perm[1] (no back-to-back repeat across cycles)
 *   word   = order[perm[slot]]  — every word once per cycle; overrides (date → term) win.
 */
(function (global) {
  "use strict";

  const EPOCH = "2026-01-01";
  const SEED_BASE = 20260101;
  const GOLDEN = 0x9e3779b1;
  const APP_URL = "https://bluenightlightpup.github.io/trendy/app/";
  const SAVED_WORDS_KEY = "trendy.savedWords.v1";

  /** Whole-word topics kept off a 13+ general-audience daily word (sexual, drugs/alcohol, slurs, profanity). */
  const UNSAFE_WORDS = [
    "sex", "sexual", "sexually", "sexy", "hookup", "hookups", "hook-up", "nsfw", "porn", "nude", "nudes",
    "naked", "horny", "orgasm", "kink", "kinky", "fetish", "onlyfans", "drug", "drugs", "weed", "cannabis",
    "marijuana", "stoned", "drunk", "alcohol", "booze", "beer", "vape", "vaping", "cocaine", "opium",
    "slur", "slurs", "fuck", "fucking", "shit", "bitch", "cunt", "dick", "piss", "asshole", "goddamn",
    "wtf", "stfu", "lmfao",
  ];
  /** Rows App/Core/ContentSafety.swift rewrites for sexual meanings. */
  const BLOCKED_TERMS = ["dtf", "nnn", "edging", "fwb"];
  const UNSAFE_RE = new RegExp("(^|[^a-z0-9])(" + UNSAFE_WORDS.map((w) => w.replace(/-/g, "\\-")).join("|") + ")($|[^a-z0-9])");
  /** Text already masked by ContentSafety ("f***") counts as unsafe, so iOS (sanitized data) agrees. */
  const MASKED_RE = /[a-z]\*\*/;

  const AGE_BANDS = ["Gen Alpha", "Gen Z", "Millennial", "Gen X+", "Mixed"];
  const AGE_GLOSS = {
    "Gen Alpha": "mostly kids/tweens right now",
    "Gen Z": "mostly teens and early twenties",
    Millennial: "mostly late twenties through early forties",
    "Gen X+": "mostly forties and older",
    Mixed: "used across generations",
  };

  function str(v) {
    return typeof v === "string" ? v : "";
  }

  /** Lowercase, straighten curly apostrophes, collapse spaces. Used for sort keys and override matching. */
  function normalizeTerm(s) {
    return str(s).toLowerCase().replace(/[\u2018\u2019\u02bc]/g, "'").replace(/\s+/g, " ").trim();
  }

  function termsOf(entry) {
    const t = entry && entry.terms;
    if (typeof t === "string") return t.trim() ? [t] : [];
    return Array.isArray(t) ? t.filter((x) => typeof x === "string" && x.trim()) : [];
  }

  /** Lowercased text checked against the safety lists. */
  function safetyText(entry) {
    return [...termsOf(entry), str(entry.short), str(entry.explain), str(entry.origin), str(entry.wotdExample), str(entry.example)]
      .join(" \n ")
      .toLowerCase();
  }

  function isSafe(entry) {
    if (termsOf(entry).some((t) => BLOCKED_TERMS.includes(normalizeTerm(t)))) return false;
    const text = safetyText(entry);
    return !UNSAFE_RE.test(text) && !MASKED_RE.test(text);
  }

  /** Pool eligibility: curated meaning + origin, not abbreve/radar, not opted out, safe. */
  function isEligible(entry) {
    if (!entry || typeof entry !== "object") return false;
    if (!termsOf(entry).length) return false;
    if (!str(entry.short).trim() || !str(entry.origin).trim()) return false;
    if (str(entry.source).toLowerCase() === "abbreve") return false;
    if (str(entry.confidence).toLowerCase() === "low" || entry.radarSource) return false;
    if (entry.wotd === false || entry.mature === true) return false;
    return isSafe(entry);
  }

  function entriesOf(slang) {
    if (Array.isArray(slang)) return slang;
    return slang && Array.isArray(slang.entries) ? slang.entries : [];
  }

  function sortKey(entry) {
    return normalizeTerm(termsOf(entry)[0]);
  }

  /** Code-point comparison (same as Python str and Swift unicodeScalars ordering). */
  function compareCodePoints(a, b) {
    const A = Array.from(a);
    const B = Array.from(b);
    const n = Math.min(A.length, B.length);
    for (let i = 0; i < n; i++) {
      const d = A[i].codePointAt(0) - B[i].codePointAt(0);
      if (d) return d < 0 ? -1 : 1;
    }
    return A.length === B.length ? 0 : A.length < B.length ? -1 : 1;
  }

  /** Eligible entries, stable-sorted by key (ties keep file order). */
  function buildPool(slang) {
    return entriesOf(slang)
      .map((entry, index) => ({ entry, index, key: sortKey(entry) }))
      .filter((x) => isEligible(x.entry))
      .sort((a, b) => compareCodePoints(a.key, b.key) || a.index - b.index)
      .map((x) => x.entry);
  }

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = Date.UTC(y, mo - 1, d);
    const back = new Date(t);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
    return t;
  }

  function isValidDate(s) {
    return parseDate(s) !== null;
  }

  function daysSinceEpoch(dateStr) {
    const t = parseDate(dateStr);
    if (t === null) throw new RangeError("date must be YYYY-MM-DD: " + dateStr);
    return Math.round((t - parseDate(EPOCH)) / 86400000);
  }

  function pad(n, w) {
    return String(n).padStart(w, "0");
  }

  /** The viewer's local calendar date as YYYY-MM-DD. */
  function localDateString(d) {
    const x = d instanceof Date ? d : new Date();
    return `${pad(x.getFullYear(), 4)}-${pad(x.getMonth() + 1, 2)}-${pad(x.getDate(), 2)}`;
  }

  function addDays(dateStr, n) {
    const t = parseDate(dateStr);
    if (t === null) throw new RangeError("date must be YYYY-MM-DD: " + dateStr);
    const x = new Date(t + n * 86400000);
    return `${pad(x.getUTCFullYear(), 4)}-${pad(x.getUTCMonth() + 1, 2)}-${pad(x.getUTCDate(), 2)}`;
  }

  /** mulberry32 → uint32 stream. */
  function rng(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
      t = (t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0)) >>> 0;
      return (t ^ (t >>> 14)) >>> 0;
    };
  }

  function cycleSeed(cycle) {
    return (SEED_BASE ^ Math.imul(cycle | 0, GOLDEN)) >>> 0;
  }

  function shuffled(n, cycle) {
    const perm = Array.from({ length: n }, (_, i) => i);
    const next = rng(cycleSeed(cycle));
    for (let i = n - 1; i > 0; i--) {
      const j = next() % (i + 1);
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    return perm;
  }

  /** Permutation of pool indexes for one cycle (no back-to-back repeat at the cycle boundary). */
  function cycleOrder(n, cycle) {
    const perm = shuffled(n, cycle);
    if (n > 2) {
      const prevLast = shuffled(n, cycle - 1)[n - 1];
      if (perm[0] === prevLast) {
        perm[0] = perm[1];
        perm[1] = prevLast;
      }
    }
    return perm;
  }

  /** { cycle, slot, index } for a pool of size n on dateStr. */
  function pickIndex(n, dateStr) {
    if (!(n > 0)) return null;
    const days = daysSinceEpoch(dateStr);
    const cycle = Math.floor(days / n);
    const slot = days - cycle * n;
    return { cycle, slot, index: cycleOrder(n, cycle)[slot] };
  }

  /** Override map from word-of-the-day.json ({ overrides: { "YYYY-MM-DD": "term" } }). */
  function overridesOf(doc) {
    const raw = doc && typeof doc === "object" ? (doc.overrides && typeof doc.overrides === "object" ? doc.overrides : doc) : {};
    const out = {};
    for (const k of Object.keys(raw)) {
      if (isValidDate(k) && typeof raw[k] === "string" && raw[k].trim()) out[k] = raw[k];
    }
    return out;
  }

  /** Display headline: the first term; a lone letter is uppercased ("w" → "W"). */
  function displayTerm(term) {
    const t = str(term).trim();
    return /^[a-z]$/.test(t) ? t.toUpperCase() : t;
  }

  /**
   * Word for dateStr. options: { overrides } (map or word-of-the-day.json doc), { pool } (prebuilt).
   * Returns { date, term, entry, override, cycle, slot, index, poolSize } or null for an empty pool.
   */
  function wordForDate(slang, dateStr, options) {
    const opts = options || {};
    const pool = opts.pool || buildPool(slang);
    if (!pool.length) return null;
    const date = dateStr || localDateString();
    const wanted = overridesOf(opts.overrides)[date];
    if (wanted) {
      const needle = normalizeTerm(wanted);
      for (const entry of pool) {
        const hit = termsOf(entry).find((t) => normalizeTerm(t) === needle);
        if (hit) {
          return { date, term: displayTerm(hit), entry, override: true, cycle: null, slot: null, index: pool.indexOf(entry), poolSize: pool.length };
        }
      }
    }
    const p = pickIndex(pool.length, date);
    const entry = pool[p.index];
    return { date, term: displayTerm(termsOf(entry)[0]), entry, override: false, cycle: p.cycle, slot: p.slot, index: p.index, poolSize: pool.length };
  }

  function formatAge(age) {
    const raw = str(age).trim().toLowerCase();
    const band = AGE_BANDS.find((b) => b.toLowerCase() === raw);
    return band ? `${band} \u2014 ${AGE_GLOSS[band]}` : "";
  }

  function looseKey(s) {
    return str(s).toLowerCase().replace(/[\u2018\u2019']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  /** Hottest trend whose title (or the part before " (") matches one of the entry's terms. */
  function matchTrend(entry, trends) {
    const keys = new Set(termsOf(entry).map(looseKey).filter(Boolean));
    let best = null;
    for (const t of Array.isArray(trends) ? trends : []) {
      if (!t || typeof t !== "object") continue;
      const title = str(t.title);
      const hit = keys.has(looseKey(title)) || keys.has(looseKey(title.split("(")[0]));
      if (hit && (!best || (Number(t.heatScore) || 0) > (Number(best.heatScore) || 0))) best = t;
    }
    return best;
  }

  /** Everything a card shows. */
  function details(word, trends) {
    if (!word || !word.entry) return null;
    const e = word.entry;
    const trend = matchTrend(e, trends);
    const example = str(e.wotdExample).trim() || str(e.example).trim();
    return {
      date: word.date,
      term: word.term,
      meaning: str(e.short).trim(),
      explain: str(e.explain).trim(),
      example: example || null,
      origin: str(e.origin).trim(),
      age: formatAge(e.age) || null,
      ageBand: (formatAge(e.age).split(" \u2014 ")[0]) || null,
      worlds: Array.isArray(e.worlds) ? e.worlds.filter((w) => typeof w === "string") : [],
      override: !!word.override,
      trend: trend
        ? {
            id: str(trend.id),
            title: str(trend.title),
            lifecycle: str(trend.lifecycle) || null,
            heat: Math.round(Math.min(1, Math.max(0, Number(trend.heatScore) || 0)) * 100),
          }
        : null,
    };
  }

  /** "Trendy word of the day: rizz — Charisma / flirting game… https://…/app/" */
  /** Wraps an example in curly quotes unless it already opens with a quote (some do). */
  function quoteExample(text) {
    const s = String(text || "").trim();
    if (!s) return "";
    return /^["\u201C\u2018']/.test(s) ? s : "\u201C" + s + "\u201D";
  }

  function shareText(d, url) {
    const meaning = str(d && d.meaning).replace(/\s+/g, " ").trim();
    const short = meaning.length > 140 ? meaning.slice(0, 139).trimEnd() + "\u2026" : meaning;
    return `Trendy word of the day: ${d.term} \u2014 ${short} ${url || APP_URL}`;
  }

  // ---- saved words (localStorage helpers, pure-ish like saved.js) ----
  function normalizeSavedWords(list) {
    const out = [];
    const seen = new Set();
    for (const raw of Array.isArray(list) ? list : []) {
      const t = str(raw).trim();
      const k = normalizeTerm(t);
      if (!t || seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }

  function toggleSavedWord(list, term) {
    const words = normalizeSavedWords(list);
    const k = normalizeTerm(term);
    if (!k) return { words, saved: false };
    const i = words.findIndex((w) => normalizeTerm(w) === k);
    if (i >= 0) return { words: words.slice(0, i).concat(words.slice(i + 1)), saved: false };
    return { words: words.concat([str(term).trim()]), saved: true };
  }

  function loadSavedWords(storage) {
    const store = storage || (typeof global.localStorage !== "undefined" ? global.localStorage : null);
    if (!store) return [];
    try {
      return normalizeSavedWords(JSON.parse(store.getItem(SAVED_WORDS_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function persistSavedWords(list, storage) {
    const store = storage || (typeof global.localStorage !== "undefined" ? global.localStorage : null);
    const next = normalizeSavedWords(list);
    if (store) {
      try {
        store.setItem(SAVED_WORDS_KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked: keep in memory */
      }
    }
    return next;
  }

  global.TrendyWOTD = {
    EPOCH,
    SEED_BASE,
    APP_URL,
    SAVED_WORDS_KEY,
    UNSAFE_WORDS,
    BLOCKED_TERMS,
    normalizeTerm,
    isSafe,
    isEligible,
    buildPool,
    isValidDate,
    daysSinceEpoch,
    localDateString,
    addDays,
    cycleSeed,
    cycleOrder,
    pickIndex,
    overridesOf,
    displayTerm,
    wordForDate,
    formatAge,
    matchTrend,
    details,
    quoteExample,
    shareText,
    normalizeSavedWords,
    toggleSavedWord,
    loadSavedWords,
    persistSavedWords,
  };
})(typeof window !== "undefined" ? window : globalThis);
