/* Trendy Decode — never-blank AI-like slang/trend search */
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

  const CORE_ABBREVS = {
    jk: { terms: ["jk", "j/k", "j.k.", "just kidding"], short: "Just kidding.", explain: "Used after a joke or to soften a serious-sounding line.", origin: "SMS/IM classic." },
    idk: { terms: ["idk"], short: "I don’t know.", explain: "You don’t have the answer right now.", origin: "Texting shorthand." },
    brb: { terms: ["brb"], short: "Be right back.", explain: "Stepping away briefly.", origin: "Chat classic." },
    ttyl: { terms: ["ttyl"], short: "Talk to you later.", explain: "Friendly pause/sign-off.", origin: "Texting shorthand." },
    lol: { terms: ["lol"], short: "Laughing out loud (often a soft chuckle).", explain: "Frequently acknowledgment, not literal loud laughing.", origin: "Early internet." },
    omg: { terms: ["omg"], short: "Oh my god.", explain: "Surprise or emphasis.", origin: "Texting shorthand." },
    smh: { terms: ["smh"], short: "Shaking my head.", explain: "Disappointment or disbelief.", origin: "Internet slang." },
    tbh: { terms: ["tbh"], short: "To be honest.", explain: "Flags a frank opinion.", origin: "Texting shorthand." },
    ngl: { terms: ["ngl"], short: "Not gonna lie.", explain: "Honesty marker before a take.", origin: "Internet slang." },
    fr: { terms: ["fr", "fr fr"], short: "For real.", explain: "Agreement or emphasis.", origin: "AAVE → mainstream." },
    nvm: { terms: ["nvm"], short: "Never mind.", explain: "Cancel what you just said.", origin: "Texting shorthand." },
    wyd: { terms: ["wyd"], short: "What (are) you doing?", explain: "Casual check-in.", origin: "Texting shorthand." },
    hmu: { terms: ["hmu"], short: "Hit me up.", explain: "Message me later.", origin: "Texting shorthand." },
    gtg: { terms: ["gtg", "g2g"], short: "Got to go.", explain: "Leaving the chat.", origin: "IM classic." },
    afk: { terms: ["afk"], short: "Away from keyboard.", explain: "Not at the device.", origin: "Gaming/chat." },
    sus: { terms: ["sus"], short: "Suspicious.", explain: "Something feels shady.", origin: "Among Us boom." },
    fyi: { terms: ["fyi"], short: "For your information.", explain: "Heads-up.", origin: "Common abbreviation." },
    btw: { terms: ["btw"], short: "By the way.", explain: "Side note.", origin: "Texting shorthand." },
    asap: { terms: ["asap"], short: "As soon as possible.", explain: "Urgency.", origin: "Common abbreviation." },
    idc: { terms: ["idc"], short: "I don’t care.", explain: "Dismissive or boundary — tone varies.", origin: "Texting shorthand." },
    rn: { terms: ["rn"], short: "Right now.", explain: "Currently.", origin: "Texting shorthand." },
    ofc: { terms: ["ofc"], short: "Of course.", explain: "Agreement / obviously.", origin: "Texting shorthand." },
    ikr: { terms: ["ikr"], short: "I know, right?", explain: "Strong agreement.", origin: "Texting shorthand." },
    lmk: { terms: ["lmk"], short: "Let me know.", explain: "Ask for an update.", origin: "Texting shorthand." },
    np: { terms: ["np"], short: "No problem.", explain: "It’s fine / you’re welcome.", origin: "Texting shorthand." },
    ty: { terms: ["ty", "thx", "tysm"], short: "Thank you / thanks.", explain: "Gratitude shorthand.", origin: "Texting shorthand." },
    yw: { terms: ["yw"], short: "You’re welcome.", explain: "Reply to thanks.", origin: "Texting shorthand." },
    omw: { terms: ["omw"], short: "On my way.", explain: "En route.", origin: "Texting shorthand." },
    irl: { terms: ["irl"], short: "In real life.", explain: "Offline / not online.", origin: "Internet slang." },
    tldr: { terms: ["tldr", "tl;dr"], short: "Too long; didn’t read — summary follows.", explain: "Prefaces a short version.", origin: "Forum culture." },
    imo: { terms: ["imo", "imho"], short: "In my (humble) opinion.", explain: "Personal take marker.", origin: "Forum/texting." },
    ong: { terms: ["ong"], short: "On God — I swear / for real.", explain: "Emphasis of seriousness.", origin: "Internet slang." },
    fs: { terms: ["fs"], short: "For sure.", explain: "Agreement.", origin: "Texting shorthand." },
    dw: { terms: ["dw"], short: "Don’t worry.", explain: "Reassurance.", origin: "Texting shorthand." },
    pls: { terms: ["pls", "plz"], short: "Please.", explain: "Softener.", origin: "Texting shorthand." },
    bro: { terms: ["bro", "bros", "brother"], short: "Casual address for a guy/friend — like “dude.”", explain: "Usually means buddy/friend, not always a literal brother. Tone can be warm, ironic, or annoyed. Related: bruh, dude, man.", origin: "Short for brother; everyday casual English + internet." },
    bruh: { terms: ["bruh"], short: "Like “bro,” often for surprise, disbelief, or secondhand embarrassment.", explain: "As much a reaction (“bruh…”) as an address.", origin: "Phonetic casual bro; meme reaction." },
    dude: { terms: ["dude"], short: "Casual address for a person; also a “wow” reaction.", explain: "Daily informal English for a person; greeting, emphasis, or disbelief.", origin: "Older American slang still in heavy use." },
    fam: { terms: ["fam"], short: "Close friends / chosen family.", explain: "Your people — not only blood relatives.", origin: "AAVE/youth slang → broad use." },
  };

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[“”"']/g, "")
      .replace(/\s+/g, " ");
  }

  function stripHtml(s) {
    return String(s || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractTerm(raw) {
    const q = String(raw || "").trim();
    if (!q) return "";
    for (const re of QUESTION_PATTERNS) {
      const m = q.match(re);
      if (m && m[1]) return m[1].trim().replace(/^[\s:.\-]+|[\s:.\-]+$/g, "");
    }
    return q
      .replace(/\?+$/g, "")
      .replace(/^(hey|hi|please|can you|could you)\s+/i, "")
      .trim();
  }

  function findInEntryList(entries, q) {
    if (!entries) return null;
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
        if (q.includes(nt) || nt.includes(q)) {
          if (nt.length > bestLen) {
            best = entry;
            bestLen = nt.length;
          }
        }
      }
    }
    return best ? { entry: best, match: "partial" } : null;
  }

  function findSlangEntry(slang, abbreve, term) {
    const q = normalize(term);
    if (!q) return null;

    if (CORE_ABBREVS[q]) return { entry: CORE_ABBREVS[q], match: "exact" };
    for (const entry of Object.values(CORE_ABBREVS)) {
      for (const t of entry.terms || []) {
        if (normalize(t) === q) return { entry, match: "exact" };
      }
    }

    const fromSlang = findInEntryList(slang && slang.entries, q);
    if (fromSlang) return fromSlang;
    return findInEntryList(abbreve && abbreve.entries, q);
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

  async function fetchJson(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms || 4500);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchWiktionary(term) {
    const word = encodeURIComponent(String(term).split(/\s+/)[0]);
    if (!word) return null;
    const data = await fetchJson(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${word}`,
      5000
    );
    if (!data || !data.en) return null;
    const defs = [];
    for (const block of data.en) {
      if ((block.language || "").toLowerCase() !== "english" && block.language) {
        // prefer English blocks; still allow if only ones present
      }
      const pos = block.partOfSpeech || "sense";
      for (const d of block.definitions || []) {
        const text = stripHtml(d.definition || "");
        if (text && text.length > 8) defs.push({ part: pos, text });
        if (defs.length >= 4) break;
      }
      if (defs.length >= 4) break;
    }
    // Prefer English language sections
    const englishFirst = [];
    for (const block of data.en) {
      if ((block.language || "") === "English") {
        for (const d of block.definitions || []) {
          const text = stripHtml(d.definition || "");
          if (text && text.length > 8) englishFirst.push({ part: block.partOfSpeech || "sense", text });
        }
      }
    }
    const use = englishFirst.length ? englishFirst.slice(0, 4) : defs.slice(0, 4);
    if (!use.length) return null;
    return { word: term, defs: use, provider: "wiktionary" };
  }

  async function fetchFreeDictionary(term) {
    const word = encodeURIComponent(String(term).split(/\s+/)[0]);
    if (!word) return null;
    const data = await fetchJson(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      4000
    );
    if (!data || !Array.isArray(data) || !data[0]) return null;
    const entry = data[0];
    const defs = [];
    for (const m of entry.meanings || []) {
      for (const d of m.definitions || []) {
        if (d.definition) defs.push({ part: m.partOfSpeech, text: d.definition, example: d.example });
        if (defs.length >= 4) break;
      }
      if (defs.length >= 4) break;
    }
    if (!defs.length) return null;
    return { word: entry.word, defs, provider: "dictionaryapi" };
  }

  function heuristicInternetSpeak(term) {
    const q = normalize(term);
    const tips = [];
    if (/^\d{1,4}$/.test(q) || /^six\s*seven$/.test(q)) {
      tips.push({
        short: "Likely a number meme / brainrot chant",
        explain:
          "Short numbers often go viral as TikTok sounds or hallway jokes. They may not have one dictionary meaning — shared bit + gesture/sound is the context.",
      });
    }
    if (/core$|pilled$|maxxing$/i.test(q)) {
      tips.push({
        short: "Internet suffix pattern (-core / -pilled / -maxxing)",
        explain: "The ending signals aesthetic, worldview, or optimization culture; the stem is the niche.",
      });
    }
    if (/^[a-z]{2,5}$/.test(q)) {
      tips.push({
        short: "Could be chat abbreviation or casual slang",
        explain: "Short lowercase tokens are often texting shorthand or casual address. Context (who said it, which app) changes the read.",
      });
    }
    return tips;
  }

  function synthesizeAlways(term, dict, heuristics, newHere) {
    const parts = [];
    const t = term;
    if (dict && dict.defs && dict.defs.length) {
      parts.push({
        title: "Meaning",
        body: dict.defs
          .slice(0, 2)
          .map((d) => `(${d.part || "def"}) ${d.text}`)
          .join(" "),
      });
      parts.push({
        title: "How people use it casually",
        body: `In chats and social apps, “${t}” can lean informal, ironic, or meme-y even when it also has a straight dictionary sense. If you saw it in a text or TikTok, the casual reading is usually the one that matters.`,
      });
    } else if (heuristics[0]) {
      parts.push({ title: "Best read", body: heuristics[0].short });
      parts.push({ title: "Why", body: heuristics[0].explain });
    } else {
      parts.push({
        title: "Working meaning",
        body: `I don’t have a curated slang card for “${t}” yet, so here’s the honest AI read: treat it as a word/phrase whose meaning depends on the room it showed up in (friends, TikTok, game chat, school).`,
      });
      parts.push({
        title: "Practical decode",
        body: `Ask what came right before it, or paste the whole sentence next time. Meanwhile: if it looks like an abbreviation, try expanding each letter; if it looks like a nickname/address word (bro/dude energy), it’s probably casual address or reaction—not a secret code.`,
      });
    }
    if (newHere) {
      parts.push({
        title: "New here tip",
        body: "You’re not behind for asking. Language moves weekly — decoding is the skill.",
      });
    }
    parts.push({
      title: "Confidence",
      body: dict ? "Medium–high (dictionary-backed)." : "Lower (synthesized until Radar/lexicon catches it).",
    });
    return parts;
  }

  function buildAnswer({ term, slangHit, trend, dict, heuristics, newHere }) {
    const parts = [];
    let source = "ai-search";

    if (slangHit) {
      source = "lexicon";
      const e = slangHit.entry;
      parts.push({ title: "Meaning", body: e.short });
      if (e.explain) parts.push({ title: "In plain words", body: e.explain });
      if (e.origin) parts.push({ title: "Where it comes from", body: e.origin });
    }

    if (trend) {
      if (!slangHit) {
        source = "trends";
        parts.push({ title: "Meaning", body: trend.summary });
      }
      parts.push({
        title: "On the heat radar",
        body: `“${trend.title}” is ${trend.lifecycle || "active"} at heat ${Math.round(
          (trend.heatScore || 0) * 100
        )}. ${trend.originStory || ""}`.trim(),
      });
    }

    if (!slangHit && !trend) {
      const synth = synthesizeAlways(term, dict, heuristics, newHere);
      source = dict ? "dictionary+ai" : heuristics[0] ? "heuristic" : "ai-fallback";
      parts.push(...synth);
    } else if (dict && newHere) {
      parts.push({ title: "Also in the dictionary", body: dict.defs[0].text });
    }

    return { term, source, parts };
  }

  async function decodeQuery(raw, { slang, trends, abbreve, newHere }) {
    const term = extractTerm(raw) || String(raw || "").trim();
    const slangHit = findSlangEntry(slang, abbreve, term);
    const trend = findTrend(trends, term);
    const heuristics = heuristicInternetSpeak(term);

    let dict = null;
    if (!slangHit) {
      // Prefer Wiktionary (more reliable); fall back to dictionaryapi
      dict = (await fetchWiktionary(term)) || (await fetchFreeDictionary(term));
    }

    return buildAnswer({ term, slangHit, trend, dict, heuristics, newHere: !!newHere });
  }

  function formatAnswerHtml(answer, escapeHtml) {
    const chips = {
      lexicon: "Trendy lexicon",
      trends: "Heat radar",
      "dictionary+ai": "Dictionary + AI",
      heuristic: "AI pattern read",
      "ai-fallback": "AI decode",
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
