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
    alpha: { terms: ["alpha", "alpha male", "alpha energy"], short: "In TikTok/internet slang: top-dog / “best” / dominant vibe — not mainly the Greek letter.", explain: "Online “alpha” usually means confident, high-status, in-charge energy (sometimes ironic). The Greek-letter / software meanings exist, but TikTok almost always means the slang status vibe.", origin: "Pop-psych hierarchy metaphors → TikTok shorthand." },
    sigma: { terms: ["sigma", "sigma male"], short: "Meme “lone wolf” cool-outsider archetype (cousin of alpha memes).", explain: "TikTok personality meme: independent, quiet-confident. Often half-joke.", origin: "Online personality memes; TikTok/Reels." },
    beta: { terms: ["beta"], short: "Meme opposite of “alpha” — portrayed as less dominant (often rude/joke), not “beta software.”", explain: "In slang fights/memes, “beta” dunks on someone as passive. Separate from app beta testing.", origin: "Same meme family as alpha." },

    skibidi: {
      terms: [
        "skibidi",
        "skibidi toilet",
        "skibidi toilets",
        "skibiti",
        "skibiti toilet",
        "skibiti toilets",
        "skibity",
        "skibity toilet",
        "skibidy",
        "skibidy toilet",
        "skibiddi",
        "skibidi toillet",
        "skibidi tiolet",
      ],
      short: "YouTube/TikTok horror-comedy series by DaFuq!?Boom! with heads in toilets; kids also chant “skibidi” as brainrot noise.",
      explain: "Skibidi Toilet is a surreal animated series by DaFuq!?Boom! (Alexey Gerasimov): singing human heads in toilets fight camera-headed people (Cameramen) and other hardware-headed factions. On playgrounds and the FYP, “skibidi” is often just a nonsense chant — participation, not a secret code. Asking what it means is normal; the joke is how little dictionary sense it has.",
      origin: "YouTube series by DaFuq!?Boom!, 2023–; exploded on TikTok and in Gen Alpha schoolyard/brainrot culture.",
      source: "core",
      confidence: "high",
    },
  };

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'") // curly/straight apostrophe unify
      .replace(/[\u201C\u201D\u201E\u201F"]/g, "") // drop quotes
      .replace(/'/g, "") // I'd / I’d / id → id
      .replace(/[^a-z0-9\s+]/gi, " ") // commas, emdashes, etc. → space
      .replace(/\s+/g, " ")
      .trim();
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

  const STOPWORDS = new Set([
    "a", "an", "the", "of", "to", "and", "or", "what", "does", "mean", "meaning",
    "is", "are", "do", "did", "how", "why", "who", "please", "define", "explain",
    "tell", "me", "about", "whats", "for", "in", "on", "with", "from",
  ]);

  const FUZZY_ALIASES = {
    skibiti: "skibidi",
    skibity: "skibidi",
    skibidy: "skibidi",
    skibiddi: "skibidi",
    skibidii: "skibidi",
    gyat: "gyatt",
    gyattt: "gyatt",
    looksmaxing: "looksmaxxing",
    "looks-maxxing": "looksmaxxing",
    mewin: "mewing",
    moggin: "mogging",
    fanumtax: "fanum tax",
    "skibidi-toilet": "skibidi toilet",
  };

  const PHRASE_ALIASES = {
    "skibiti toilet": "skibidi toilet",
    "skibiti toilets": "skibidi toilet",
    "skibidi toilets": "skibidi toilet",
    "skibidi toillet": "skibidi toilet",
    "skibidi tiolet": "skibidi toilet",
    "skibity toilet": "skibidi toilet",
    "skibidy toilet": "skibidi toilet",
    "skibidi tolet": "skibidi toilet",
    "skibiti toillet": "skibidi toilet",
    "skibidi toilet meme": "skibidi toilet",
    "skibiti toilet meme": "skibidi toilet",
    "looks maxxing": "looksmaxxing",
    "fanum taxx": "fanum tax",
    "only in ohio": "ohio",
    "sigma male": "sigma",
    "sigma grindset": "sigma",
    "nah id win": "nah id win",
    "nah i would win": "nah id win",
    "gojo nah id win": "nah id win",
    "gojo id win": "nah id win",
    "id win": "id win",
    "we re so back": "we are so back",
    "were so back": "we are so back",
    "we so back": "we are so back",
    "its so over": "its so over",
    "it is so over": "its so over",
    "living rent free": "living rent free",
    "lives rent free": "living rent free",
    "l ratio": "l + ratio",
    "l+ratio": "l + ratio",
    "ratio l": "l + ratio",
    "and i oop": "and i oop",
    "sksksk and i oop": "and i oop",
    "no thoughts head empty": "no thoughts head empty",
    "head empty no thoughts": "no thoughts head empty",
    "understood the assignement": "understood the assignment",
    "mother is mothering": "mother is mothering",
    "its giving": "its giving",
    "it is giving": "its giving",
    "this is fine dog": "this is fine",
    "this is fine meme": "this is fine",
    "they dont know": "they dont know",
    "let that boy cook": "let him cook",
    "who let him cook": "let him cook",
  };

  function tokenize(s) {
    return normalize(s)
      .split(/[^a-z0-9]+/i)
      .filter(Boolean);
  }

  function applyAlias(raw) {
    const n = normalize(raw);
    if (!n) return n;
    if (PHRASE_ALIASES[n]) return PHRASE_ALIASES[n];
    if (FUZZY_ALIASES[n]) return FUZZY_ALIASES[n];
    const mapped = n.split(/\s+/).map((tok) => FUZZY_ALIASES[tok] || tok);
    const joined = mapped.join(" ");
    return PHRASE_ALIASES[joined] || joined;
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function wordBoundaryIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    const re = new RegExp("(?:^|[^a-z0-9])" + escapeRe(needle) + "(?:$|[^a-z0-9])", "i");
    return re.test(haystack);
  }

  function queryTokens(q) {
    return tokenize(q).filter((t) => t && !STOPWORDS.has(t));
  }

  function rankBonus(entry, bucket) {
    if (bucket === "core") return 4000;
    const src = String((entry && entry.source) || "").toLowerCase();
    const conf = String((entry && entry.confidence) || "").toLowerCase();
    if (src === "core") return 4000;
    if (src === "curated" || conf === "high") return 3000;
    if (bucket === "slang" && !src) return 2500; // hand-written lexicon rows
    if (src === "abbreve" || bucket === "abbreve") return 0;
    return 500;
  }

  function scoreTermAgainstQuery(term, fullQuery, tokens) {
    const t = normalize(term);
    if (!t) return { score: 0, kind: null, termLen: 0 };
    const tLen = t.length;
    const tTokens = tokenize(t);
    const qMulti = tokens.length >= 2;
    const tMulti = tTokens.length >= 2;
    // Coverage bonus: longer lexicon phrases that explain a multi-word query win
    const coverBonus = tMulti ? tTokens.length * 20000 + tLen * 25 : tLen * 5;

    // Ultra-short abbrevs (na, w, l, ib…) only on exact query / exact token —
    // never as a prefix inside "nah", "win", etc.
    if (tLen <= 2) {
      if (t === fullQuery) {
        return { score: 100000 + coverBonus, kind: "exact", termLen: tLen };
      }
      if (!qMulti && tokens.length === 1 && tokens[0] === t) {
        return { score: 80000 + coverBonus, kind: "exact-token", termLen: tLen };
      }
      return { score: 0, kind: null, termLen: 0 };
    }

    if (t === fullQuery) {
      return { score: 100000 + coverBonus, kind: "exact", termLen: tLen };
    }

    // Contiguous phrase inside query (prefer longest)
    if (tMulti && tLen >= 5 && wordBoundaryIncludes(fullQuery, t)) {
      return { score: 95000 + coverBonus, kind: "phrase-in-query", termLen: tLen };
    }

    if (tTokens.length && tTokens.every((tok) => tokens.includes(tok))) {
      // Full token coverage — multi-word lexicon phrases beat stray single tokens
      const base = tMulti ? 90000 : qMulti ? 35000 : 75000;
      return { score: base + coverBonus, kind: "token-set", termLen: tLen };
    }

    if (tokens.includes(t)) {
      // Single-token hit inside a longer query is weak vs a real phrase match
      const base = qMulti && !tMulti ? 25000 : 80000;
      return { score: base + coverBonus, kind: "exact-token", termLen: tLen };
    }

    // Whole-word term inside the query (never for 1–2 letter abbrevs into longer words)
    if (tLen >= 3 && wordBoundaryIncludes(fullQuery, t)) {
      const base = tMulti ? 70000 : qMulti ? 30000 : 50000;
      return { score: base + coverBonus, kind: "word-in-query", termLen: tLen };
    }

    // Query is a distinctive whole word inside a longer term (skibidi ⊂ skibidi toilet)
    // Do NOT let short ambiguous tokens ("nah", "id", "win", "the") unlock long meme phrases.
    if (tLen >= 3 && fullQuery.length >= 3 && wordBoundaryIncludes(t, fullQuery)) {
      const longestTok = tTokens.reduce((a, b) => (a.length >= b.length ? a : b), "");
      const ambiguous = new Set([
        "nah", "id", "win", "the", "way", "and", "for", "you", "are", "so", "its", "it",
        "a", "an", "me", "my", "we", "he", "she", "they", "him", "her", "them", "let", "cook",
      ]);
      if (tMulti && (fullQuery.length < 5 || ambiguous.has(fullQuery))) {
        // skip — require a more specific query for multi-word lexicon rows
      } else if (fullQuery === tTokens[0] || fullQuery === longestTok || tokens[0] === tTokens[0]) {
        return { score: 40000 + coverBonus, kind: "query-in-term", termLen: tLen };
      }
    }

    // Light fuzzy: allow one missing short function token (a/the) already stripped;
    // also accept 1-char edit on a single distinctive token >= 5 chars when query is short.
    if (tMulti && tokens.length >= 2) {
      const matched = tTokens.filter((tok) => tokens.includes(tok));
      if (matched.length >= Math.max(2, tTokens.length - 1) && matched.join(" ").length >= 5) {
        return { score: 60000 + matched.length * 15000 + tLen, kind: "fuzzy-phrase", termLen: tLen };
      }
    }

    // Substring fallback: NEVER for terms shorter than 3 chars into longer words
    // and NEVER let a short single-token query hitch a ride inside a multi-word meme phrase.
    if (tLen >= 3 && fullQuery.length >= 3) {
      if (tMulti && tokens.length === 1 && fullQuery.length < 5) {
        return { score: 0, kind: null, termLen: 0 };
      }
      if (wordBoundaryIncludes(fullQuery, t) || wordBoundaryIncludes(t, fullQuery)) {
        return { score: 12000 + coverBonus, kind: "partial", termLen: tLen };
      }
      // last-resort: term appears contiguously inside query (not the reverse —
      // reverse caused "win" ⊂ "mewing" false positives)
      if (tLen >= 4 && fullQuery.includes(t)) {
        return { score: 1000 + tLen * 10, kind: "substring", termLen: tLen };
      }
    }
    return { score: 0, kind: null, termLen: 0 };
  }

  function scoreEntry(entry, fullQuery, tokens) {
    let best = { score: 0, kind: null, termLen: 0 };
    for (const term of entry.terms || []) {
      const got = scoreTermAgainstQuery(term, fullQuery, tokens);
      if (got.score > best.score || (got.score === best.score && got.termLen > best.termLen)) {
        best = got;
      }
    }
    return best;
  }

  function pickBestHit(candidates) {
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.termLen !== a.termLen) return b.termLen - a.termLen;
      const order = { core: 3, slang: 2, abbreve: 1 };
      return (order[b.bucket] || 0) - (order[a.bucket] || 0);
    });
    const top = candidates[0];
    return { entry: top.entry, match: top.kind || "partial", bucket: top.bucket || null };
  }

  function findSlangEntry(slang, abbreve, term) {
    const aliased = applyAlias(term);
    const q = normalize(aliased);
    if (!q) return null;
    const tokens = queryTokens(q);
    const candidates = [];

    const coreEntries = Object.values(CORE_ABBREVS);
    for (const entry of coreEntries) {
      const got = scoreEntry(entry, q, tokens);
      if (got.score > 0) {
        candidates.push({
          entry,
          score: got.score + rankBonus(entry, "core"),
          termLen: got.termLen,
          kind: got.kind,
          bucket: "core",
        });
      }
    }

    for (const [bucket, list] of [
      ["slang", slang && slang.entries],
      ["abbreve", abbreve && abbreve.entries],
    ]) {
      if (!list) continue;
      for (const entry of list) {
        const got = scoreEntry(entry, q, tokens);
        if (got.score <= 0) continue;
        candidates.push({
          entry,
          score: got.score + rankBonus(entry, bucket),
          termLen: got.termLen,
          kind: got.kind,
          bucket,
        });
      }
    }

    return pickBestHit(candidates);
  }

  function findTrend(trends, term) {
    if (!Array.isArray(trends)) return null;
    const q = normalize(applyAlias(term));
    if (!q) return null;
    const tokens = queryTokens(q);
    const exact = trends.find((t) => normalize(t.title) === q);
    if (exact) return exact;
    // Only exact tag match for the full query — never "slang" tag hitchhiking
    const tagHit = trends.find((t) => (t.tags || []).map(normalize).includes(q));
    if (tagHit && normalize(tagHit.title).length >= 2) return tagHit;

    let best = null;
    let bestScore = 0;
    for (const trend of trends) {
      const title = normalize(trend.title);
      if (!title) continue;
      // Single-letter trends (W / L) only when the whole query is that letter
      if (title.length <= 1 && title !== q) continue;
      // Short titles (2 chars) need exact token equality, not prefix of "win"
      if (title.length <= 2 && title !== q && !tokens.includes(title)) continue;

      let score = 0;
      if (title === q) score = 100000 + title.length;
      else if (tokens.includes(title) && title.length >= 2) {
        // token equality only (tokens are whole words) — "w" never equals "win"
        score = (tokens.length === 1 ? 80000 : 20000) + title.length;
      } else if (
        title.length >= 3 &&
        queryTokens(title).length >= 2 &&
        queryTokens(title).every((tok) => tokens.includes(tok) && tok.length >= 3)
      ) {
        score = 80000 + title.length;
      } else if (title.length >= 3 && wordBoundaryIncludes(q, title)) {
        score = 50000 + title.length;
      } else if (q.length >= 3 && title.length >= 3 && wordBoundaryIncludes(title, q)) {
        const tToks = queryTokens(title);
        const longestTok = tToks.reduce((a, b) => (a.length >= b.length ? a : b), "");
        if (q === tToks[0] || q === longestTok) score = 40000 + title.length;
      }
      // Do not boost on generic tags like "slang" / "sports" just because they appear in tokens
      const tags = (trend.tags || []).map(normalize).filter((tag) => tag.length >= 3 && tag !== "slang" && tag !== "sports");
      if (tags.some((tag) => tag === q || (tokens.length === 1 && tokens[0] === tag))) {
        score = Math.max(score, 70000 + q.length);
      }
      if (score > bestScore) {
        bestScore = score;
        best = trend;
      }
    }
    return best;
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

  function isStrongSlangHit(slangHit) {
    if (!slangHit || !slangHit.entry) return false;
    const bucket = slangHit.bucket;
    if (bucket === "core") return true;
    if (bucket === "slang") {
      const src = String(slangHit.entry.source || "").toLowerCase();
      // abbreve-sourced rows in slang.json are still weak vs curated/core
      if (src === "abbreve") return false;
      return true; // curated / core / hand-written slang lexicon
    }
    return false; // abbreve-only → weak (eligible for live)
  }

  function looksMultiWordMeme(term) {
    const toks = queryTokens(normalize(applyAlias(term)));
    return toks.length >= 2;
  }

  /** Conservative miss gate: never call live when curated/core slangHit exists. */
  function shouldCallLive(answer, slangHit, term, liveDecodeUrl) {
    if (!liveDecodeUrl || !String(liveDecodeUrl).trim()) return false;
    if (isStrongSlangHit(slangHit)) return false;
    const src = String((answer && answer.source) || "");
    if (src === "ai-fallback" || src === "heuristic" || src === "dictionary+ai" || src === "ai-search") {
      return true;
    }
    // Trend heat alone is fine to keep, but meaning may still be thin
    if (src === "trends") return true;
    // Abbreve-only lexicon (especially multi-word meme-like queries)
    if (slangHit && slangHit.bucket === "abbreve") {
      return true;
    }
    // No strong slang: if somehow source is lexicon from weak path
    if (!slangHit) return true;
    return false;
  }

  function liveEndpointUrl(base) {
    const b = String(base || "").trim().replace(/\/+$/, "");
    if (!b) return "";
    if (/\/v1\/decode$/i.test(b)) return b;
    return b + "/v1/decode";
  }

  async function fetchLiveDecode(baseUrl, term, newHere) {
    const url = liveEndpointUrl(baseUrl);
    if (!url) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: String(term || ""), newHere: !!newHere }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== "object") return null;
      const meaning = String(data.meaning || "").trim();
      if (!meaning) return null;
      return {
        meaning,
        explain: String(data.explain || "").trim(),
        origin: String(data.origin || "").trim(),
        confidence: String(data.confidence || "medium").trim(),
        provider: String(data.provider || "live").trim(),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function mergeLiveAnswer(answer, live, trend) {
    if (!live) return answer;
    const parts = [];
    parts.push({ title: "Slang meaning (live AI)", body: live.meaning });
    if (live.origin) parts.push({ title: "Where it comes from", body: live.origin });
    if (live.explain) parts.push({ title: "In plain words", body: live.explain });
    parts.push({
      title: "Confidence",
      body: `${live.confidence || "medium"} (live ${live.provider || "model"}).`,
    });
    // Keep trend heat if any
    if (trend) {
      parts.push({
        title: "On the heat radar",
        body: `"${trend.title}" is ${trend.lifecycle || "active"} at heat ${Math.round(
          (trend.heatScore || 0) * 100
        )}. ${trend.originStory || ""}`.trim(),
      });
    }
    return { term: answer.term, source: "live-ai", parts, live };
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
      parts.push({ title: "Slang meaning (TikTok / internet)", body: e.short });
      if (e.origin) parts.push({ title: "Where it comes from", body: e.origin });
      if (e.explain) parts.push({ title: "In plain words", body: e.explain });
      if (dict && dict.defs && dict.defs.length) {
        parts.push({
          title: "Other senses (not the TikTok one)",
          body: dict.defs
            .slice(0, 2)
            .map((d) => `(${d.part || "def"}) ${d.text}`)
            .join(" "),
        });
      }
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

  async function decodeQuery(raw, { slang, trends, abbreve, newHere, liveDecodeUrl }) {
    const term = extractTerm(raw) || String(raw || "").trim();
    const searchTerm = applyAlias(term);
    const slangHit = findSlangEntry(slang, abbreve, searchTerm);
    const trend = findTrend(trends, searchTerm);
    const heuristics = heuristicInternetSpeak(searchTerm);

    // Always try dictionary in background for dual-meaning words (alpha = Greek AND slang)
    const dict = (await fetchWiktionary(term)) || (await fetchFreeDictionary(term));

    let answer = buildAnswer({ term, slangHit, trend, dict, heuristics, newHere: !!newHere });

    // Live model-on-miss (optional LAN proxy). Never blank on failure.
    if (shouldCallLive(answer, slangHit, term, liveDecodeUrl)) {
      const live = await fetchLiveDecode(liveDecodeUrl, term, !!newHere);
      if (live) {
        answer = mergeLiveAnswer(answer, live, trend);
      }
    }

    return answer;
  }

  function formatAnswerHtml(answer, escapeHtml) {
    const chips = {
      lexicon: "Trendy lexicon",
      trends: "Heat radar",
      "dictionary+ai": "Dictionary + AI",
      heuristic: "AI pattern read",
      "ai-fallback": "AI decode",
      "ai-search": "AI search",
      "live-ai": "Live AI",
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
    applyAlias,
    isStrongSlangHit,
    shouldCallLive,
    liveEndpointUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
