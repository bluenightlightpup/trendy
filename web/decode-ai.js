/* Trendy Decode — AI-like slang/trend search engine (browser) */
(function (global) {
  "use strict";

  const QUESTION_PATTERNS = [
    /^what\s+does\s+(.+?)\s+mean\??$/i,
    /^what(?:'s| is)\s+(?:the\s+)?(?:meaning\s+of\s+)?(.+?)\??$/i,
    /^define\s+(.+?)\??$/i,
    /^explain\s+(.+?)\??$/i,
    /^meaning\s+of\s+(.+?)\??$/i,
    /^whats\s+(.+?)\s+mean\??$/i,
    /^who\s+(?:or\s+what\s+)?is\s+(.+?)\??$/i,
    /^decode\s+(.+?)\??$/i,
    /^tell\s+me\s+about\s+(.+?)\??$/i,
  ];

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[“”"']/g, "")
      .replace(/\s+/g, " ");
  }

  function extractTerm(raw) {
    const q = String(raw || "").trim();
    if (!q) return "";
    for (const re of QUESTION_PATTERNS) {
      const m = q.match(re);
      if (m && m[1]) return m[1].trim().replace(/^[\s:.\-]+|[\s:.\-]+$/g, "");
    }
    // strip trailing ? and leading "hey" filler
    return q
      .replace(/\?+$/g, "")
      .replace(/^(hey|hi|please|can you|could you)\s+/i, "")
      .trim();
  }

  function findSlangEntry(slang, term) {
    const q = normalize(term);
    if (!q || !slang) return null;
    const entries = slang.entries || [];

    for (const entry of entries) {
      for (const t of entry.terms || []) {
        if (normalize(t) === q) return { entry, match: "exact" };
      }
    }

    let best = null;
    let bestLen = 0;
    for (const entry of entries) {
      for (const t of entry.terms || []) {
        const nt = normalize(t);
        if (nt.length < 2) continue;
        if (q.includes(nt) || (q.length >= 2 && nt.includes(q))) {
          if (nt.length > bestLen) {
            best = entry;
            bestLen = nt.length;
          }
        }
      }
    }
    return best ? { entry: best, match: "partial" } : null;
  }

  function findTrend(trends, term) {
    const q = normalize(term);
    if (!q || !Array.isArray(trends)) return null;
    const exact = trends.find((t) => normalize(t.title) === q);
    if (exact) return exact;
    return (
      trends.find((t) => {
        const title = normalize(t.title);
        const tags = (t.tags || []).map(normalize);
        return title.includes(q) || q.includes(title) || tags.some((tag) => tag === q);
      }) || null
    );
  }

  async function fetchDictionary(term) {
    const word = encodeURIComponent(term.split(/\s+/)[0]);
    if (!word || word.length > 40) return null;
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const entry = Array.isArray(data) ? data[0] : null;
      if (!entry) return null;
      const meanings = entry.meanings || [];
      const defs = [];
      for (const m of meanings.slice(0, 2)) {
        for (const d of (m.definitions || []).slice(0, 2)) {
          if (d.definition) defs.push({ part: m.partOfSpeech, text: d.definition, example: d.example });
        }
      }
      return {
        word: entry.word,
        phonetic: entry.phonetic || (entry.phonetics || []).find((p) => p.text)?.text,
        defs,
      };
    } catch {
      return null;
    }
  }

  function heuristicInternetSpeak(term) {
    const q = normalize(term);
    const tips = [];

    if (/^\d{1,4}$/.test(q) || /^\d+\s*\d+$/.test(q) || /^six\s*seven$/.test(q)) {
      tips.push({
        kind: "number-meme",
        short: "Likely a number meme / brainrot chant",
        explain:
          "Short numbers often go viral as TikTok sounds or hallway jokes (like “67”). They usually don’t have one dictionary meaning — the point is the shared bit. If you saw a gesture or sound with it, that’s the real context.",
      });
    }
    if (/(core|pilled|maxxing|corecore)$/i.test(q) || q.endsWith("core")) {
      tips.push({
        kind: "affix",
        short: "Internet “-core / -pilled / -maxxing” pattern",
        explain:
          "English internet slang loves suffixes: “-core” (aesthetic vibe), “-pilled” (convinced of a worldview), “-maxxing” (optimizing hard for something). The base word sets the niche.",
      });
    }
    if (/^[A-Z]{2,6}$/.test(term.trim())) {
      tips.push({
        kind: "abbrev",
        short: "Probably an abbreviation",
        explain:
          "ALL-CAPS short strings are often chat abbreviations. Context (gaming, dating, school) matters a lot — the same letters can mean different things in different worlds.",
      });
    }
    if (/\b(rizz|skibidi|gyatt|sigma|ohio|fanum|mewing|aura)\b/i.test(q)) {
      tips.push({
        kind: "gen-alpha",
        short: "Gen Alpha / TikTok-era slang vibes",
        explain:
          "This sits in the current brainrot / TikTok slang lane — meanings shift fast and are often playful rather than literal.",
      });
    }
    return tips;
  }

  function buildAnswer({ term, slangHit, trend, dict, heuristics, newHere }) {
    const parts = [];
    let source = "ai-search";

    if (slangHit) {
      source = "lexicon";
      const e = slangHit.entry;
      parts.push({ title: "Meaning", body: e.short });
      if (e.explain) parts.push({ title: "In plain words", body: e.explain });
      if (e.origin && (newHere || true)) parts.push({ title: "Where it comes from", body: e.origin });
    }

    if (trend) {
      if (!slangHit) {
        source = "trends";
        parts.push({ title: "Meaning", body: trend.summary });
      }
      parts.push({
        title: "On the heat radar",
        body: `“${trend.title}” is marked ${trend.lifecycle || "active"} at heat ${Math.round(
          (trend.heatScore || 0) * 100
        )}. ${trend.originStory || ""}`.trim(),
      });
    }

    if (dict && dict.defs && dict.defs.length) {
      if (!slangHit && !trend) {
        source = "dictionary";
        parts.push({
          title: "Dictionary sense",
          body: dict.defs
            .map((d) => `(${d.part || "def"}) ${d.text}${d.example ? ` — e.g. “${d.example}”` : ""}`)
            .join(" "),
        });
        parts.push({
          title: "Internet angle",
          body: "If you saw this in a meme or chat, it might be used ironically or as slang — tell me where you saw it and I can tune this.",
        });
      } else if (newHere) {
        parts.push({
          title: "Also in English",
          body: dict.defs[0].text,
        });
      }
    }

    if (!slangHit && !trend && (!dict || !dict.defs?.length)) {
      const h = heuristics[0];
      if (h) {
        source = "heuristic";
        parts.push({ title: "Best read", body: h.short });
        parts.push({ title: "Why I think that", body: h.explain });
      } else {
        source = "uncertain";
        parts.push({
          title: "Honest take",
          body: `I don’t have a locked definition for “${term}” yet in Trendy’s slang radar.`,
        });
        parts.push({
          title: "How to pin it down",
          body: newHere
            ? "Try one word or the core phrase. Add where you saw it (TikTok, text, game). Slang is a moving target — asking is the skill."
            : "Try the core phrase, or add the app/platform you saw it on.",
        });
      }
    } else if (heuristics.length && (slangHit || trend)) {
      // light color only if useful
    }

    if (newHere && (slangHit || trend || dict)) {
      parts.push({
        title: "New here tip",
        body: "You don’t have to use the word — understanding it is enough. If someone laughs mid-sentence, they’re often riffing on a shared meme, not testing you.",
      });
    }

    return { term, source, parts };
  }

  async function decodeQuery(raw, { slang, trends, newHere }) {
    const term = extractTerm(raw) || String(raw || "").trim();
    const slangHit = findSlangEntry(slang, term);
    const trend = findTrend(trends, term);
    const heuristics = heuristicInternetSpeak(term);

    // Only hit free dictionary when we lack a strong slang/trend hit
    let dict = null;
    if (!slangHit && !trend) {
      dict = await fetchDictionary(term);
    }

    return buildAnswer({ term, slangHit, trend, dict, heuristics, newHere: !!newHere });
  }

  function formatAnswerHtml(answer, escapeHtml) {
    const chips = {
      lexicon: "Trendy lexicon",
      trends: "Heat radar",
      dictionary: "Dictionary + AI read",
      heuristic: "AI pattern read",
      uncertain: "Still learning",
      "ai-search": "AI search",
    };
    const meta = chips[answer.source] || "Trendy";
    let html = `<span class="bubble-meta">${escapeHtml(meta)} · ${escapeHtml(answer.term)}</span>`;
    for (const p of answer.parts) {
      html += `<div class="decode-block"><strong>${escapeHtml(p.title)}</strong><br>${escapeHtml(
        p.body
      )}</div>`;
    }
    return html;
  }

  global.TrendyDecodeAI = {
    extractTerm,
    decodeQuery,
    formatAnswerHtml,
    normalize,
  };
})(typeof window !== "undefined" ? window : globalThis);
