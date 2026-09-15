/* Trendy — community suggest (local queue + optional LAN proxy) */
(function (global) {
  "use strict";

  const QUEUE_KEY = "trendy.suggest.queue.v1";
  const CLIENT_KEY = "trendy.suggest.clientId.v1";
  const LOCAL_COMMUNITY_KEY = "trendy.suggest.localCommunity.v1";
  const RATE_KEY = "trendy.suggest.rate.v1";

  const CONSENSUS_THRESHOLD = 3;
  const JACCARD_THRESHOLD = 0.45;
  const MIN_MEANING_LEN = 12;
  const RATE_WINDOW_MS = 20_000; // light per-device cool-down between submits
  const RATE_MAX_PER_HOUR = 12;

  function now() {
    return Date.now();
  }

  function clientId() {
    try {
      let id = localStorage.getItem(CLIENT_KEY);
      if (id && id.length >= 8) return id;
      id =
        "c_" +
        Math.random().toString(36).slice(2, 10) +
        "_" +
        now().toString(36);
      localStorage.setItem(CLIENT_KEY, id);
      return id;
    } catch {
      return "anonymous";
    }
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

  function normalizeTerm(s) {
    const AI = global.TrendyDecodeAI;
    if (AI && typeof AI.normalize === "function") return AI.normalize(s);
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s+]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(s) {
    const n = normalizeTerm(stripHtml(s));
    if (!n) return [];
    return n.split(/\s+/).filter(Boolean);
  }

  function jaccard(a, b) {
    const A = new Set(a);
    const B = new Set(b);
    if (!A.size && !B.size) return 1;
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const x of A) if (B.has(x)) inter += 1;
    return inter / (A.size + B.size - inter);
  }

  function meaningsSimilar(a, b) {
    const na = normalizeTerm(stripHtml(a));
    const nb = normalizeTerm(stripHtml(b));
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) {
      return true;
    }
    return jaccard(tokenize(a), tokenize(b)) >= JACCARD_THRESHOLD;
  }

  function loadQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveQueue(list) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-200)));
    } catch {
      /* quota — ignore */
    }
  }

  function loadLocalCommunity() {
    try {
      const raw = localStorage.getItem(LOCAL_COMMUNITY_KEY);
      if (!raw) return { entries: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] };
      return parsed;
    } catch {
      return { entries: [] };
    }
  }

  function saveLocalCommunity(data) {
    try {
      localStorage.setItem(LOCAL_COMMUNITY_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  function checkRateLimit() {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      const state = raw ? JSON.parse(raw) : { lastAt: 0, hourStart: now(), hourCount: 0 };
      const t = now();
      if (t - (state.lastAt || 0) < RATE_WINDOW_MS) {
        return { ok: false, message: "Easy — wait a few seconds before another suggestion." };
      }
      if (t - (state.hourStart || 0) > 3600_000) {
        state.hourStart = t;
        state.hourCount = 0;
      }
      if ((state.hourCount || 0) >= RATE_MAX_PER_HOUR) {
        return { ok: false, message: "That’s enough for now — try again later." };
      }
      return { ok: true, state };
    } catch {
      return { ok: true, state: { lastAt: 0, hourStart: now(), hourCount: 0 } };
    }
  }

  function bumpRate(state) {
    try {
      const next = {
        lastAt: now(),
        hourStart: state.hourStart || now(),
        hourCount: (state.hourCount || 0) + 1,
      };
      localStorage.setItem(RATE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function validate(term, meaning, origin) {
    const t = stripHtml(term).trim();
    const m = stripHtml(meaning).trim();
    const o = stripHtml(origin || "").trim();
    if (!t) return { ok: false, message: "Add a term." };
    if (!m) return { ok: false, message: "Add a meaning." };
    if (m.length < MIN_MEANING_LEN) {
      return { ok: false, message: `Meaning needs at least ${MIN_MEANING_LEN} characters.` };
    }
    return { ok: true, term: t, meaning: m, origin: o, termNorm: normalizeTerm(t) };
  }

  function promoteLocalIfReady(termNorm) {
    const queue = loadQueue().filter((r) => r.termNorm === termNorm);
    if (queue.length < CONSENSUS_THRESHOLD) {
      return { promoted: false, count: queue.length };
    }
    // Greedy cluster vs first meaning (same spirit as server)
    const seed = queue[0];
    const cluster = queue.filter((r) => meaningsSimilar(seed.meaning, r.meaning));
    if (cluster.length < CONSENSUS_THRESHOLD) {
      return { promoted: false, count: queue.length };
    }
    let best = "";
    for (const r of cluster) {
      if (String(r.meaning || "").length > best.length) best = r.meaning;
    }
    const display = cluster[cluster.length - 1].term || termNorm;
    const entry = {
      terms: display.toLowerCase() === termNorm ? [display] : [display, termNorm],
      short: best,
      explain: best,
      origin:
        "On-device demo consensus (same phone). Multi-user promotion needs the LAN proxy.",
      worlds: ["Internet culture"],
      source: "community",
      confidence: "medium",
      demo: true,
      updated_at: new Date().toISOString(),
      consensusCount: cluster.length,
    };
    const data = loadLocalCommunity();
    const norms = new Set((entry.terms || []).map(normalizeTerm).filter(Boolean));
    let replaced = false;
    data.entries = (data.entries || []).map((e) => {
      const en = (e.terms || []).map(normalizeTerm);
      if (en.some((n) => norms.has(n))) {
        replaced = true;
        return entry;
      }
      return e;
    });
    if (!replaced) data.entries.push(entry);
    saveLocalCommunity(data);
    return { promoted: true, count: cluster.length, entry, demo: true };
  }

  function mergeCommunity(serverCommunity) {
    const local = loadLocalCommunity();
    const serverEntries = (serverCommunity && serverCommunity.entries) || [];
    const localEntries = local.entries || [];
    // Server wins on same termNorm; then local demo entries
    const byNorm = new Map();
    for (const e of localEntries) {
      const n = normalizeTerm((e.terms && e.terms[0]) || "");
      if (n) byNorm.set(n, e);
    }
    for (const e of serverEntries) {
      const n = normalizeTerm((e.terms && e.terms[0]) || "");
      if (n) byNorm.set(n, e);
    }
    return { entries: [...byNorm.values()] };
  }

  function suggestEndpointUrl(base) {
    const b = String(base || "").trim().replace(/\/+$/, "");
    if (!b) return "";
    if (/\/v1\/suggest$/i.test(b)) return b;
    return b + "/v1/suggest";
  }

  async function postSuggest(baseUrl, record) {
    const url = suggestEndpointUrl(baseUrl);
    if (!url) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: record.term,
          meaning: record.meaning,
          origin: record.origin || undefined,
          clientId: record.clientId,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let err = null;
        try {
          err = await res.json();
        } catch {
          /* ignore */
        }
        return { ok: false, error: err || { error: "http_" + res.status } };
      }
      return await res.json();
    } catch {
      return null; // network — local-only still saved
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Always saves locally. If liveDecodeUrl set, also POSTs to proxy.
   * Local demo promotion after 3 similar same-device suggests.
   */
  async function submitSuggestion({ term, meaning, origin, liveDecodeUrl }) {
    const v = validate(term, meaning, origin);
    if (!v.ok) return { ok: false, message: v.message };

    const rate = checkRateLimit();
    if (!rate.ok) return { ok: false, message: rate.message };

    const record = {
      term: v.term,
      termNorm: v.termNorm,
      meaning: v.meaning,
      origin: v.origin,
      clientId: clientId(),
      ts: new Date().toISOString(),
    };

    const queue = loadQueue();
    queue.push(record);
    saveQueue(queue);
    bumpRate(rate.state);

    let remote = null;
    if (liveDecodeUrl && String(liveDecodeUrl).trim()) {
      remote = await postSuggest(liveDecodeUrl, record);
    }

    const localPromo = promoteLocalIfReady(v.termNorm);
    const promoted = !!(remote && remote.promoted) || localPromo.promoted;
    const demoOnly = !remote && localPromo.promoted;

    let message =
      "Thanks — if enough people agree, it’ll join the lexicon.";
    if (remote && remote.promoted) {
      message = "Thanks — enough people agreed. It’s joining the community lexicon.";
    } else if (demoOnly) {
      message =
        "Thanks — on-device demo consensus (3 similar suggests on this phone). Real multi-user needs the LAN proxy.";
    } else if (remote && remote.ok) {
      message = remote.message || message;
    }

    return {
      ok: true,
      message,
      promoted,
      demo: demoOnly,
      remote,
      localCommunity: loadLocalCommunity(),
    };
  }

  global.TrendySuggest = {
    CONSENSUS_THRESHOLD,
    JACCARD_THRESHOLD,
    MIN_MEANING_LEN,
    clientId,
    stripHtml,
    meaningsSimilar,
    loadQueue,
    loadLocalCommunity,
    mergeCommunity,
    submitSuggestion,
    suggestEndpointUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
