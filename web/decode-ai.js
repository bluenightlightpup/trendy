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
    jk: { terms: ["jk", "j/k", "j.k.", "just kidding"], short: "Just kidding.", explain: "Used after a joke or to soften a serious-sounding line.", origin: "Texting/IM shorthand from the 1990s chat-room era (AIM, MSN, SMS); also written j/k. Still the standard “I’m joking” tag.", age: "Mixed" },
    idk: { terms: ["idk"], short: "I don’t know.", explain: "You don’t have the answer right now.", origin: "Texting shorthand that spread with SMS and instant messaging in the late 1990s–2000s; now everyday across ages.", age: "Mixed" },
    brb: { terms: ["brb"], short: "Be right back.", explain: "Stepping away briefly.", origin: "Early chat-room and instant-messenger shorthand (IRC, AIM) for stepping away from the keyboard.", age: "Mixed" },
    ttyl: { terms: ["ttyl"], short: "Talk to you later.", explain: "Friendly pause/sign-off.", origin: "Instant-messenger era sign-off (AIM/MSN, 2000s) that carried over to texting.", age: "Mixed" },
    lol: { terms: ["lol"], short: "Laughing out loud (often a soft chuckle).", explain: "Frequently acknowledgment, not literal loud laughing.", origin: "One of the oldest internet acronyms (1980s–90s Usenet/BBS chat). Over time it softened into a tone marker rather than real laughter.", age: "Mixed" },
    omg: { terms: ["omg"], short: "Oh my god.", explain: "Surprise or emphasis.", origin: "Spoken-English exclamation long before texting; the acronym boomed with SMS and chat. Added to the Oxford English Dictionary in 2011.", age: "Mixed" },
    smh: { terms: ["smh"], short: "Shaking my head.", explain: "Disappointment or disbelief.", origin: "Forum and early social-media shorthand (2000s); popular on Twitter for reacting to news or bad takes.", age: "Mixed" },
    tbh: { terms: ["tbh"], short: "To be honest.", explain: "Flags a frank opinion.", origin: "Texting/forum shorthand; got a second life around 2013 with the Instagram “tbh” compliment-post trend.", age: "Mixed" },
    ngl: { terms: ["ngl"], short: "Not gonna lie.", explain: "Honesty marker before a take.", origin: "Gen Z texting and social-media shorthand; common in captions and replies since the late 2010s.", age: "Gen Z" },
    fr: { terms: ["fr", "fr fr"], short: "For real.", explain: "Agreement or emphasis.", origin: "From AAVE “for real”; spread through social media and became a standard Gen Z agreement tag (“fr fr” = very for real).", age: "Gen Z" },
    nvm: { terms: ["nvm"], short: "Never mind.", explain: "Cancel what you just said.", origin: "Instant-messenger and texting shorthand for “never mind”.", age: "Mixed" },
    wyd: { terms: ["wyd"], short: "What (are) you doing?", explain: "Casual check-in.", origin: "Texting shorthand (“what you doing?”); common late-night check-in on SMS and Snapchat.", age: "Mixed" },
    hmu: { terms: ["hmu"], short: "Hit me up.", explain: "Message me later.", origin: "Texting/social shorthand from the 2000s (MySpace and SMS era): “contact me”.", age: "Mixed" },
    gtg: { terms: ["gtg", "g2g"], short: "Got to go.", explain: "Leaving the chat.", origin: "Instant-messenger and gaming-chat sign-off (“got to go”); g2g is the same thing.", age: "Mixed" },
    afk: { terms: ["afk"], short: "Away from keyboard.", explain: "Not at the device.", origin: "Gaming and chat-room shorthand (MUDs, IRC, MMOs) for being away from the keyboard.", age: "Mixed" },
    sus: { terms: ["sus"], short: "Suspicious.", explain: "Something feels shady.", origin: "Short for suspicious/suspect (older slang); exploded in 2020 with the game Among Us.", age: "Gen Z" },
    fyi: { terms: ["fyi"], short: "For your information.", explain: "Heads-up.", origin: "Office/business abbreviation from memos, long before the internet; carried into email and texting.", age: "Mixed" },
    btw: { terms: ["btw"], short: "By the way.", explain: "Side note.", origin: "Early internet and email shorthand (1990s) that became universal in texting.", age: "Mixed" },
    asap: { terms: ["asap"], short: "As soon as possible.", explain: "Urgency.", origin: "Military/business abbreviation that predates the internet by decades; still used in speech (“A-sap”).", age: "Mixed" },
    idc: { terms: ["idc"], short: "I don’t care.", explain: "Dismissive or boundary — tone varies.", origin: "Texting shorthand (“I don’t care”); tone ranges from relaxed to blunt depending on context.", age: "Mixed" },
    rn: { terms: ["rn"], short: "Right now.", explain: "Currently.", origin: "Texting shorthand (“right now”); popular in captions and replies since the 2010s.", age: "Mixed" },
    ofc: { terms: ["ofc"], short: "Of course.", explain: "Agreement / obviously.", origin: "Texting and gaming-chat shorthand (“of course”).", age: "Mixed" },
    ikr: { terms: ["ikr"], short: "I know, right?", explain: "Strong agreement.", origin: "Instant-messenger and texting shorthand (“I know, right?”) from the 2000s.", age: "Mixed" },
    lmk: { terms: ["lmk"], short: "Let me know.", explain: "Ask for an update.", origin: "Texting/email shorthand (“let me know”), common in both casual and work chats.", age: "Mixed" },
    np: { terms: ["np"], short: "No problem.", explain: "It’s fine / you’re welcome.", origin: "Gaming and chat shorthand (“no problem”); the classic reply to “ty”.", age: "Mixed" },
    ty: { terms: ["ty", "thx", "tysm"], short: "Thank you / thanks.", explain: "Gratitude shorthand.", origin: "Chat and gaming shorthand for “thank you”; thx and tysm (“thank you so much”) are variants.", age: "Mixed" },
    yw: { terms: ["yw"], short: "You’re welcome.", explain: "Reply to thanks.", origin: "Chat shorthand reply to “ty” (“you’re welcome”).", age: "Mixed" },
    omw: { terms: ["omw"], short: "On my way.", explain: "En route.", origin: "Texting shorthand (“on my way”); common enough that phones autocomplete it.", age: "Mixed" },
    irl: { terms: ["irl"], short: "In real life.", explain: "Offline / not online.", origin: "Early internet shorthand (Usenet/chat) contrasting online life with “in real life”.", age: "Mixed" },
    tldr: { terms: ["tldr", "tl;dr"], short: "Too long; didn’t read — summary follows.", explain: "Prefaces a short version.", origin: "Forum culture (Something Awful, then Reddit, 2000s): “too long; didn’t read” — now also used to introduce your own summary.", age: "Mixed" },
    imo: { terms: ["imo", "imho"], short: "In my (humble) opinion.", explain: "Personal take marker.", origin: "Forum and email shorthand from the 1990s; imho adds “humble” (often ironically).", age: "Mixed" },
    ong: { terms: ["ong"], short: "On God — I swear / for real.", explain: "Emphasis of seriousness.", origin: "AAVE-rooted “on God” (I swear); spread through Twitter, TikTok and rap lyrics in the late 2010s.", age: "Gen Z" },
    fs: { terms: ["fs"], short: "For sure.", explain: "Agreement.", origin: "Texting shorthand (“for sure”), popular with Gen Z.", age: "Gen Z" },
    dw: { terms: ["dw"], short: "Don’t worry.", explain: "Reassurance.", origin: "Texting shorthand (“don’t worry”), common in UK/Commonwealth and gaming chats.", age: "Mixed" },
    pls: { terms: ["pls", "plz"], short: "Please.", explain: "Softener.", origin: "Texting shorthand for “please”; plz is the older chat-room spelling.", age: "Mixed" },
    bro: { terms: ["bro", "bros", "brother"], short: "Casual address for a guy/friend — like “dude.”", explain: "Usually means buddy/friend, not always a literal brother. Tone can be warm, ironic, or annoyed. Related: bruh, dude, man.", origin: "Short for brother; everyday casual English + internet.", age: "Mixed" },
    bruh: { terms: ["bruh"], short: "Like “bro,” often for surprise, disbelief, or secondhand embarrassment.", explain: "As much a reaction (“bruh…”) as an address.", origin: "Phonetic casual bro; meme reaction.", age: "Gen Z" },
    dude: { terms: ["dude"], short: "Casual address for a person; also a “wow” reaction.", explain: "Daily informal English for a person; greeting, emphasis, or disbelief.", origin: "Older American slang still in heavy use.", age: "Mixed" },
    fam: { terms: ["fam"], short: "Close friends / chosen family.", explain: "Your people — not only blood relatives.", origin: "AAVE/youth slang → broad use.", age: "Gen Z" },
    alpha: { terms: ["alpha", "alpha male", "alpha energy"], short: "In TikTok/internet slang: top-dog / “best” / dominant vibe — not mainly the Greek letter.", explain: "Online “alpha” usually means confident, high-status, in-charge energy (sometimes ironic). The Greek-letter / software meanings exist, but TikTok almost always means the slang status vibe.", origin: "Pop-psych hierarchy metaphors → TikTok shorthand.", age: "Gen Z" },
    sigma: { terms: ["sigma", "sigma male"], short: "Meme “lone wolf” cool-outsider archetype (cousin of alpha memes).", explain: "TikTok personality meme: independent, quiet-confident. Often half-joke.", origin: "Online personality memes; TikTok/Reels.", age: "Gen Z" },
    beta: { terms: ["beta"], short: "Meme opposite of “alpha” — portrayed as less dominant (often rude/joke), not “beta software.”", explain: "In slang fights/memes, “beta” dunks on someone as passive. Separate from app beta testing.", origin: "Same meme family as alpha.", age: "Gen Z" },

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
      age: "Gen Alpha",
      source: "core",
      confidence: "high",
    },
  };

  /** Core entries that are slang words, not texting abbreviations. */
  const CORE_SLANG_KEYS = new Set(["bro", "bruh", "dude", "fam", "alpha", "sigma", "beta", "skibidi", "sus"]);
  for (const [key, entry] of Object.entries(CORE_ABBREVS)) {
    if (!entry.kind) entry.kind = CORE_SLANG_KEYS.has(key) ? "slang" : "abbreviation";
  }

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

  const NAMED_ENTITIES = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };
  // Bidi marks, zero-width chars, soft hyphen, BOM (Wiktionary sprinkles LRM into etymologies)
  const INVISIBLE_RE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

  function decodeEntities(s) {
    return String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
      if (code[0] === "#") {
        const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
      }
      const named = NAMED_ENTITIES[code.toLowerCase()];
      return named != null ? named : m;
    });
  }

  /** Dictionary HTML → clean sentence: no <style>/<script>, no leaked CSS, no invisible chars. */
  function stripHtml(s) {
    let out = String(s || "")
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ");
    out = decodeEntities(out)
      .replace(INVISIBLE_RE, "")
      .replace(/\u00A0/g, " ")
      // leaked stylesheet rules, e.g. ".mw-parser-output .defdate{font-size:smaller}"
      .replace(/(?:^|\s)[.#@][\w\-.#:>\s,]*\{[^{}]*\}/g, " ")
      .replace(/\s+/g, " ")
      // tidy spacing artifacts left by removed tags: "person 's", "charm .", "( word )"
      .replace(/\s+(['’]s\b)/g, "$1")
      .replace(/\s+([,.;:!?)\]])/g, "$1")
      .replace(/([(\[])\s+/g, "$1")
      .replace(/([.!?])(?:\s*\.)+/g, "$1")
      .replace(/\s+\+\s+/g, " + ")
      .trim();
    return out;
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

  function isAbbrevEntry(entry, bucket) {
    if (bucket === "abbreve") return true;
    const src = String((entry && entry.source) || "").toLowerCase();
    return src === "abbreve" || (entry && entry.kind === "abbreviation");
  }

  /** Abbreve rows (exact full-query match only — never inside phrases). */
  function findExactAbbrev(abbreve, term) {
    const q = normalize(term);
    if (!q || !abbreve || !Array.isArray(abbreve.entries)) return null;
    return abbreve.entries.find((e) => (e.terms || []).some((t) => normalize(t) === q)) || null;
  }

  function rankBonus(entry, bucket) {
    if (bucket === "core") return 4000;
    const src = String((entry && entry.source) || "").toLowerCase();
    const conf = String((entry && entry.confidence) || "").toLowerCase();
    if (src === "core") return 4000;
    if (src === "curated" || conf === "high") return 3000;
    if (bucket === "slang" && !src) return 2500; // hand-written lexicon rows
    // Community consensus: above abbreve, below curated/hand-written
    if (src === "community" || bucket === "community") return 2000;
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
      const order = { core: 4, slang: 3, community: 2, abbreve: 1 };
      return (order[b.bucket] || 0) - (order[a.bucket] || 0);
    });
    const top = candidates[0];
    return { entry: top.entry, match: top.kind || "partial", bucket: top.bucket || null };
  }

  function findSlangEntry(slang, abbreve, term, community) {
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
      ["community", community && community.entries],
      ["abbreve", abbreve && abbreve.entries],
    ]) {
      if (!list) continue;
      for (const entry of list) {
        const got = scoreEntry(entry, q, tokens);
        if (got.score <= 0) continue;
        // Community abbreviation rows (so, was, y, uk, kiss, ok…) only answer an exact
        // query; they must never hijack ordinary words inside a phrase ("i was so tired").
        const abbrevRow = bucket === "abbreve" || String(entry.source || "").toLowerCase() === "abbreve";
        if (abbrevRow && got.kind !== "exact") continue;
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

  /** Single dictionary word for a query, or "" for phrases (no first-word lookups). */
  function dictionaryWord(term) {
    const toks = tokenize(term);
    if (toks.length !== 1) return "";
    const w = toks[0];
    return w.length <= 40 ? w : "";
  }

  /**
   * Quiet existence check: the MediaWiki action API answers 200 even for missing
   * pages, so unknown words never produce a red 404 in the console.
   */
  async function wiktionaryHasPage(word) {
    const data = await fetchJson(
      `https://en.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(word)}`,
      4000
    );
    const pages = data && data.query && data.query.pages;
    if (!Array.isArray(pages) || !pages.length) return false;
    return !pages[0].missing && !pages[0].invalid;
  }

  async function fetchDictionary(term) {
    const word = dictionaryWord(term);
    if (!word) return null;
    if (!(await wiktionaryHasPage(word))) return null;
    return (await fetchWiktionary(word)) || (await fetchFreeDictionary(word));
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
    if (bucket === "community") return true; // consensus lexicon
    if (bucket === "slang") {
      const src = String(slangHit.entry.source || "").toLowerCase();
      // abbreve-sourced rows in slang.json are still weak vs curated/core
      if (src === "abbreve") return false;
      if (src === "community") return true;
      return true; // curated / core / hand-written slang lexicon
    }
    return false; // abbreve-only → weak (eligible for live)
  }

  /** Weak Decode answers invite a judgment-free community suggest. */
  function shouldShowSuggest(answer, slangHit) {
    if (isStrongSlangHit(slangHit)) return false;
    const src = String((answer && answer.source) || "");
    const weak = {
      heuristic: 1,
      "ai-fallback": 1,
      "dictionary+ai": 1,
      "ai-search": 1,
      trends: 1,
      "live-ai": 1,
    };
    if (weak[src]) return true;
    if (slangHit && slangHit.bucket === "abbreve") return true;
    if (src === "lexicon" && slangHit && slangHit.bucket === "abbreve") return true;
    return !slangHit;
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

  function proxyHeaders(token) {
    const headers = { "Content-Type": "application/json" };
    const t = String(token || "").trim();
    if (t) headers.Authorization = "Bearer " + t;
    return headers;
  }

  async function fetchLiveDecode(baseUrl, term, newHere, token) {
    const url = liveEndpointUrl(baseUrl);
    if (!url) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: proxyHeaders(token),
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
        body: `I don’t have a curated slang card for “${t}” yet, so here’s an honest best guess: treat it as a word/phrase whose meaning depends on the room it showed up in (friends, TikTok, game chat, school).`,
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


  const AGE_BANDS = ["Gen Alpha", "Gen Z", "Millennial", "Gen X+", "Mixed"];

  /** One-line gloss so Decode can say who mainly uses a band. Rough, not a census. */
  const AGE_GLOSS = {
    "Gen Alpha": "mostly kids/tweens right now",
    "Gen Z": "mostly teens and early twenties",
    Millennial: "mostly late twenties through early forties",
    "Gen X+": "mostly forties and older",
    Mixed: "used across generations",
  };

  function canonicalAge(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const hit = AGE_BANDS.find((b) => b.toLowerCase() === raw.toLowerCase());
    return hit || "";
  }

  function whoSaysPart(age) {
    const band = canonicalAge(age);
    if (!band) return null;
    const gloss = AGE_GLOSS[band];
    return {
      title: "Who says this",
      body: gloss ? band + " — " + gloss : band,
    };
  }

  /** Accurate heading for the lead meaning. */
  function meaningTitle(slangHit) {
    if (!slangHit) return "Meaning";
    if (slangHit.bucket === "community") return "Community meaning";
    if (isAbbrevEntry(slangHit.entry, slangHit.bucket)) return "Texting abbreviation";
    return "Slang meaning";
  }

  function dictSummary(dict, skipText) {
    const seen = new Set(skipText ? [normalize(skipText)] : []);
    const defs = [];
    for (const d of (dict && dict.defs) || []) {
      const key = normalize(d.text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      defs.push(d);
    }
    return defs;
  }

  function buildAnswer({ term, slangHit, trend, dict, heuristics, newHere, alsoAbbrev }) {
    const parts = [];
    let source = "ai-search";
    let dictShown = false;

    if (slangHit) {
      source = slangHit.bucket === "community" ? "community" : "lexicon";
      const e = slangHit.entry;
      parts.push({ title: meaningTitle(slangHit), body: e.short });
      if (e.origin) parts.push({ title: "Where it comes from", body: e.origin });
      const who = whoSaysPart(e.age);
      if (who) parts.push(who);
      if (e.explain) parts.push({ title: "In plain words", body: e.explain });
      if (alsoAbbrev && alsoAbbrev !== e && alsoAbbrev.short && normalize(alsoAbbrev.short) !== normalize(e.short)) {
        parts.push({
          title: "Also short for",
          body: `${String(term).trim().toUpperCase()} = ${alsoAbbrev.short} (texting abbreviation).`,
        });
      }
      const defs = dictSummary(dict, e.short);
      if (defs.length) {
        dictShown = true;
        parts.push({
          title: "Other senses",
          body: defs
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
        const whoTrend = whoSaysPart(trend.age);
        if (whoTrend) parts.push(whoTrend);
      } else if (!whoSaysPart(slangHit.entry && slangHit.entry.age)) {
        const whoTrend = whoSaysPart(trend.age);
        if (whoTrend) parts.push(whoTrend);
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
    } else if (dict && newHere && !dictShown) {
      const defs = dictSummary(dict, trend && trend.summary);
      if (defs.length) {
        dictShown = true;
        parts.push({ title: "Also in the dictionary", body: defs[0].text });
      }
    }

    return { term, source, parts, usedDictionary: dictShown || source === "dictionary+ai" };
  }

  async function decodeQuery(raw, { slang, trends, abbreve, community, newHere, liveDecodeUrl, liveDecodeToken }) {
    const term = extractTerm(raw) || String(raw || "").trim();
    const searchTerm = applyAlias(term);
    const slangHit = findSlangEntry(slang, abbreve, searchTerm, community);
    const trend = findTrend(trends, searchTerm);
    const heuristics = heuristicInternetSpeak(searchTerm);

    // Dictionary only for single words (alpha = Greek AND slang); phrases never
    // borrow the first word's dictionary senses ("nah id win" ≠ "nah").
    const dict = await fetchDictionary(searchTerm);
    const alsoAbbrev =
      slangHit && slangHit.bucket !== "abbreve" ? findExactAbbrev(abbreve, searchTerm) : null;

    let answer = buildAnswer({ term, slangHit, trend, dict, heuristics, newHere: !!newHere, alsoAbbrev });

    // Live model-on-miss (optional LAN proxy). Never blank on failure.
    if (shouldCallLive(answer, slangHit, term, liveDecodeUrl)) {
      const live = await fetchLiveDecode(liveDecodeUrl, term, !!newHere, liveDecodeToken);
      if (live) {
        answer = mergeLiveAnswer(answer, live, trend);
      }
    }

    answer.suggestEligible = shouldShowSuggest(answer, slangHit);
    answer.slangBucket = slangHit ? slangHit.bucket : null;
    return answer;
  }

  /** Honest source label for the answer bubble header. */
  function sourceLabel(answer) {
    const chips = {
      lexicon: "Trendy lexicon",
      community: "Community lexicon",
      trends: "Trend radar",
      "dictionary+ai": "Dictionary",
      heuristic: "Pattern guess",
      "ai-fallback": "Best guess",
      "ai-search": "Trendy",
      "live-ai": "Live AI",
    };
    let label = chips[answer.source] || "Trendy";
    if (answer.source === "lexicon" && answer.slangBucket === "abbreve") label = "Abbreviation list";
    if (answer.usedDictionary && answer.source !== "dictionary+ai") label += " + dictionary";
    return label;
  }

  function formatAnswerHtml(answer, escapeHtml) {
    const meta = sourceLabel(answer);
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
    shouldShowSuggest,
    shouldCallLive,
    liveEndpointUrl,
    fetchLiveDecode,
    findSlangEntry,
    stripHtml,
    dictionaryWord,
    sourceLabel,
    meaningTitle,
  };
})(typeof window !== "undefined" ? window : globalThis);
