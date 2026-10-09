/* Trendy PWA — vanilla app logic */
(() => {
  "use strict";

  const WORLDS = [
    "TikTok",
    "Internet culture",
    "Abbreviations",
    "Gaming",
    "Dating",
    "School / campus",
    "Sports",
    "Music / fandom",
    "Work / tech",
    "Money",
  ];
  const STORAGE_KEY = "trendy.you.prefs.v1";
  const DEFAULT_PREFS = {
    worlds: Object.fromEntries(WORLDS.map((w) => [w, true])),
    digest: "weekly",
    newHere: true,
    liveDecodeUrl: "",
    liveDecodeToken: "",
    dailyWord: true,
  };

  const Saved = () => globalThis.TrendySaved;
  const WOTD = () => globalThis.TrendyWOTD;

  const state = {
    trends: [],
    slang: null,
    abbreve: { entries: [] },
    community: { entries: [] },
    prefs: loadPrefs(),
    savedIds: [],
    tab: "home",
    exploreWorld: "All",
    exploreQuery: "",
    homeFilter: "all",
    detailId: null,
    detailFrom: "home",
    wotdOverrides: {},
    wotdPool: null,
    savedWords: [],
    wordDate: null,
    wordFrom: "home",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_PREFS);
      const parsed = JSON.parse(raw);
      return {
        worlds: { ...DEFAULT_PREFS.worlds, ...(parsed.worlds || {}) },
        digest: parsed.digest || DEFAULT_PREFS.digest,
        newHere: typeof parsed.newHere === "boolean" ? parsed.newHere : DEFAULT_PREFS.newHere,
        liveDecodeUrl:
          typeof parsed.liveDecodeUrl === "string" ? parsed.liveDecodeUrl.trim() : "",
        liveDecodeToken:
          typeof parsed.liveDecodeToken === "string" ? parsed.liveDecodeToken.trim() : "",
        dailyWord: typeof parsed.dailyWord === "boolean" ? parsed.dailyWord : DEFAULT_PREFS.dailyWord,
      };
    } catch {
      return structuredClone(DEFAULT_PREFS);
    }
  }

  function savePrefs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.prefs));
  }

  function loadSaved() {
    state.savedIds = Saved() ? Saved().loadSavedIds() : [];
  }

  function persistSaved() {
    if (!Saved()) return;
    state.savedIds = Saved().persistSavedIds(state.savedIds);
  }

  function isTrendSaved(id) {
    return Saved() ? Saved().isSaved(state.savedIds, id) : false;
  }

  function toggleSave(id) {
    if (!Saved() || !id) return false;
    const result = Saved().toggleSavedId(state.savedIds, id);
    state.savedIds = result.ids;
    persistSaved();
    return result.saved;
  }

  function heatPct(score) {
    const s = Math.min(1, Math.max(0, Number(score) || 0));
    return Math.round(s * 100);
  }

  /** Lifecycle multipliers for Home freshness (rising/peaking beat museum heat). */
  const HOME_LIFECYCLE_WEIGHT = {
    rising: 1.2,
    peaking: 1.0,
    cooling: 0.55,
    fading: 0.32,
    dormant: 0.18,
  };

  function daysSinceIso(iso) {
    if (!iso || typeof iso !== "string") return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return Math.max(0, (Date.now() - t) / 86400000);
  }

  /**
   * Recency decay from peakedAt / lastSeenAt (optional ISO dates).
   * Rising/peaking stay fresh; older peaks on cooling+ get demoted.
   */
  function homeRecencyFactor(trend) {
    const life = String(trend.lifecycle || "").toLowerCase();
    const peakedDays = daysSinceIso(trend.peakedAt);
    const seenDays = daysSinceIso(trend.lastSeenAt);
    let factor = 1;
    if (seenDays != null && seenDays > 21) {
      // Soft half-life ~180d after a 3-week grace
      factor *= Math.pow(0.5, (seenDays - 21) / 180);
    }
    if (peakedDays != null && !["rising", "peaking"].includes(life)) {
      // Museum / cooled peaks: half-life ~100d
      factor *= Math.pow(0.5, peakedDays / 100);
    } else if (peakedDays != null && peakedDays > 150) {
      // Even "peaking" labels get a mild haircut after ~5 months
      factor *= Math.pow(0.5, (peakedDays - 150) / 120);
    }
    return Math.max(0.12, Math.min(1, factor));
  }

  /** Home relevance: current conversational signal, not historic virality. */
  function homeRelevanceScore(trend) {
    const heat = Math.min(1, Math.max(0, Number(trend.heatScore) || 0));
    const life = HOME_LIFECYCLE_WEIGHT[String(trend.lifecycle || "").toLowerCase()] ?? 0.7;
    return heat * life * homeRecencyFactor(trend);
  }

  function sortByHomeRelevance(list) {
    return list.slice().sort((a, b) => {
      const d = homeRelevanceScore(b) - homeRelevanceScore(a);
      if (d !== 0) return d;
      return (Number(b.heatScore) || 0) - (Number(a.heatScore) || 0);
    });
  }

  function sortByHeat(list) {
    return list.slice().sort((a, b) => (Number(b.heatScore) || 0) - (Number(a.heatScore) || 0));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function heatMeterHtml(score) {
    const pct = heatPct(score);
    return `
      <div class="heat-row" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Heat score ${pct} out of 100">
        <div class="heat-track" aria-hidden="true">
          <span class="heat-dot" style="left:${pct}%"></span>
        </div>
        <span class="heat-score" aria-hidden="true">${pct}</span>
      </div>`;
  }

  /** Pipeline / generic tags that mean nothing to readers. */
  const HIDDEN_TAGS = new Set([
    "seed", "radar", "rss", "youtube", "wikipedia", "reddit", "mock", "mock-seed",
    "stub", "live", "slang", "abbrev", "meme", "trend",
  ]);

  function tagKey(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  /**
   * Reader-facing chips: hide internal tags, dedupe case/spacing-insensitively
   * (TikTok/tiktok, gen-alpha/Gen Alpha) and drop aliases of the title (67 / six seven / 6 7).
   */
  function displayTags(trend) {
    const seen = new Set([tagKey(trend.world), tagKey(trend.age)]);
    const titleKey = tagKey(trend.title);
    const out = [];
    for (const raw of trend.tags || []) {
      const label = String(raw || "").trim();
      const key = tagKey(label);
      if (!key || seen.has(key) || HIDDEN_TAGS.has(label.toLowerCase())) continue;
      if ((key.length >= 2 && titleKey.includes(key)) || (titleKey.length >= 3 && key.includes(titleKey))) continue;
      seen.add(key);
      out.push(label);
      if (out.length >= 4) break;
    }
    return out;
  }

  function tagsHtml(trend) {
    return displayTags(trend)
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");
  }

  /** Capitalise the first letter of all-lowercase titles ("alpha" → "Alpha"); acronyms/mixed case untouched. */
  function displayTitle(title) {
    const t = String(title || "");
    if (t !== t.toLowerCase()) return t;
    return t.replace(/[a-z]/, (ch) => ch.toUpperCase());
  }

  const LIFECYCLES = {
    rising: "Rising",
    peaking: "Peaking",
    stable: "Steady",
    cooling: "Cooling",
    fading: "Fading",
    dormant: "Dormant",
  };

  /** Status pill always shows the lifecycle stage — never the title or tags. */
  function lifecycleHtml(trend) {
    const key = String(trend.lifecycle || "").toLowerCase();
    const label = LIFECYCLES[key] || "Active";
    const cls = LIFECYCLES[key] ? key : "active";
    return `<span class="lifecycle lifecycle-${cls}" title="Lifecycle: ${label}">${label}</span>`;
  }

  function saveBtnHtml(trend, { prominent = false } = {}) {
    const saved = isTrendSaved(trend.id);
    const cls = prominent
      ? `save-btn save-btn-prominent${saved ? " is-saved" : ""}`
      : `save-btn${saved ? " is-saved" : ""}`;
    const glyph = saved ? "♥" : "♡";
    const label = saved
      ? `Unsave ${trend.title}`
      : `Save ${trend.title}`;
    const text = prominent ? (saved ? "Saved" : "Save") : "";
    return `
      <button type="button" class="${cls}" data-save-id="${escapeHtml(trend.id)}" aria-pressed="${saved}" aria-label="${escapeHtml(label)}">
        <span class="save-glyph" aria-hidden="true">${glyph}</span>${
          text ? `<span class="save-text">${text}</span>` : ""
        }
      </button>`;
  }

  const AGE_BANDS = ["Gen Alpha", "Gen Z", "Millennial", "Gen X+", "Mixed"];

  function ageChipHtml(age) {
    const raw = String(age || "").trim();
    const band = AGE_BANDS.find((b) => b.toLowerCase() === raw.toLowerCase());
    if (!band) return "";
    return `<span class="age-chip">${escapeHtml(band)}</span>`;
  }

  function trendCardHtml(trend) {
    return `
      <article class="trend-card" role="listitem" data-trend-id="${escapeHtml(trend.id)}">
        <div class="trend-card-body" data-open-trend="${escapeHtml(trend.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(trend.title)} origin story">
          <div class="trend-card-top">
            <h3 class="trend-title">${escapeHtml(displayTitle(trend.title))}</h3>
            ${lifecycleHtml(trend)}
          </div>
          <p class="trend-summary">${escapeHtml(trend.summary)}</p>
          <div class="trend-meta">
            <span class="world-pill">${escapeHtml(trend.world)}</span>
            ${ageChipHtml(trend.age)}
            ${tagsHtml(trend)}
          </div>
          ${heatMeterHtml(trend.heatScore)}
        </div>
        <div class="trend-card-actions">
          ${saveBtnHtml(trend)}
        </div>
      </article>`;
  }

  function filteredHomeTrends() {
    let list = state.trends.filter((t) => state.prefs.worlds[t.world] !== false);
    if (state.homeFilter === "saved") {
      const set = new Set(state.savedIds);
      list = list.filter((t) => set.has(t.id));
    }
    return sortByHomeRelevance(list);
  }

  function filteredExploreTrends() {
    let list =
      state.exploreWorld === "All"
        ? state.trends
        : state.trends.filter((t) => t.world === state.exploreWorld);
    const q = (state.exploreQuery || "").trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const hay = [t.title, t.summary, ...(t.tags || []), t.world]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return sortByHeat(list);
  }

  function savedTrendsList() {
    const set = new Set(state.savedIds);
    const order = new Map(state.savedIds.map((id, i) => [id, i]));
    return state.trends
      .filter((t) => set.has(t.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  function homeEmptyCopy() {
    if (state.homeFilter === "saved") {
      return {
        title: "No saved trends here",
        body: state.prefs.newHere
          ? "When something clicks, tap the heart on a card. Nothing wrong with an empty list — you’re just browsing."
          : "Save a trend from Home or Explore, then it shows up here.",
      };
    }
    return {
      title: "No trends in your worlds",
      body: "Flip on some interests under <strong>You</strong>, or clear filters.",
    };
  }

  function renderHomeChips() {
    $$("#home-chips .chip").forEach((chip) => {
      const on = chip.dataset.homeFilter === state.homeFilter;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // ---- Word of the Day (algorithm in wotd.js, shared with the website, CLI and iOS) ----

  function wotdWord(date) {
    const W = WOTD();
    if (!W || !state.slang) return null;
    if (!state.wotdPool) state.wotdPool = W.buildPool(state.slang);
    try {
      return W.wordForDate(state.slang, date, { pool: state.wotdPool, overrides: state.wotdOverrides });
    } catch {
      return null;
    }
  }

  function wotdDetails(date) {
    const w = wotdWord(date);
    return w ? WOTD().details(w, state.trends) : null;
  }

  function isWordSaved(term) {
    const k = WOTD() ? WOTD().normalizeTerm(term) : String(term).toLowerCase();
    return state.savedWords.some((w) => (WOTD() ? WOTD().normalizeTerm(w) : w.toLowerCase()) === k);
  }

  function wordSaveBtnHtml(term) {
    const saved = isWordSaved(term);
    return `
      <button type="button" class="save-btn save-btn-prominent wotd-save${saved ? " is-saved" : ""}" data-save-word="${escapeHtml(term)}" aria-pressed="${saved}" aria-label="${escapeHtml(saved ? `Unsave ${term}` : `Save ${term}`)}">
        <span class="save-glyph" aria-hidden="true">${saved ? "♥" : "♡"}</span><span class="save-text">${saved ? "Saved" : "Save"}</span>
      </button>`;
  }

  function wordShareBtnHtml(date) {
    return `
      <button type="button" class="save-btn save-btn-prominent wotd-share" data-share-word="${escapeHtml(date)}" aria-label="Share this word">
        <span class="save-glyph" aria-hidden="true">↗</span><span class="save-text">Share</span>
      </button>`;
  }

  function wordDayLabel(date) {
    const W = WOTD();
    const today = W.localDateString();
    if (date === today) return "Word of the day";
    if (date === W.addDays(today, -1)) return "Yesterday’s word";
    return `Word of the day · ${date}`;
  }

  function renderWotdCard() {
    const slot = $("#wotd-slot");
    if (!slot) return;
    const W = WOTD();
    if (!state.prefs.dailyWord || !W || !state.slang) {
      slot.innerHTML = "";
      slot.hidden = true;
      return;
    }
    const today = W.localDateString();
    const d = wotdDetails(today);
    if (!d) {
      slot.innerHTML = "";
      slot.hidden = true;
      return;
    }
    const yDate = W.addDays(today, -1);
    const y = wotdWord(yDate);
    slot.hidden = false;
    slot.dataset.date = today;
    slot.innerHTML = `
      <article class="wotd-card" aria-labelledby="wotd-term">
        <div class="wotd-body" role="button" tabindex="0" data-open-word="${escapeHtml(today)}" aria-label="Open word of the day: ${escapeHtml(d.term)}">
          <p class="wotd-eyebrow"><span aria-hidden="true">✦</span> Word of the day</p>
          <h3 class="wotd-term" id="wotd-term">${escapeHtml(d.term)}</h3>
          <p class="wotd-meaning">${escapeHtml(d.meaning)}</p>
          ${d.example ? `<p class="wotd-example">${escapeHtml(TrendyWOTD.quoteExample(d.example))}</p>` : ""}
          <div class="wotd-meta">
            ${ageChipHtml(d.ageBand)}
            ${d.trend ? lifecycleHtml({ lifecycle: d.trend.lifecycle }) : ""}
            <span class="wotd-more" aria-hidden="true">Tap for the full story →</span>
          </div>
        </div>
        <div class="wotd-actions">
          ${
            y
              ? `<button type="button" class="wotd-yesterday" data-open-word="${escapeHtml(yDate)}" aria-label="Yesterday’s word: ${escapeHtml(y.term)}">Yesterday: <strong>${escapeHtml(y.term)}</strong></button>`
              : "<span></span>"
          }
          <span class="wotd-buttons">${wordSaveBtnHtml(d.term)}${wordShareBtnHtml(today)}</span>
        </div>
        <p class="wotd-toast" role="status" aria-live="polite" hidden></p>
      </article>`;
  }

  function renderWordDetail(date) {
    const article = $("#word-article");
    const d = wotdDetails(date);
    if (!d) {
      article.innerHTML = `<p class="empty-body">Couldn’t pick a word — the word list didn’t load.</p>`;
      return;
    }
    const section = (title, body) =>
      body ? `<div class="wotd-section"><h3>${title}</h3><p>${escapeHtml(body)}</p></div>` : "";
    article.innerHTML = `
      <p class="wotd-eyebrow"><span aria-hidden="true">✦</span> ${escapeHtml(wordDayLabel(date))}</p>
      <h2 class="wotd-term">${escapeHtml(d.term)}</h2>
      <p class="trend-summary wotd-detail-meaning">${escapeHtml(d.meaning)}</p>
      <div class="detail-actions wotd-buttons">${wordSaveBtnHtml(d.term)}${wordShareBtnHtml(date)}</div>
      ${section("In plain words", d.explain)}
      ${d.example ? section("Example", TrendyWOTD.quoteExample(d.example)) : ""}
      ${section("Where it comes from", d.origin)}
      ${section("Who says this", d.age)}
      ${
        d.trend
          ? `<div class="wotd-section wotd-trend">
              <h3>Also a trend</h3>
              <div class="trend-card-top">
                <button type="button" class="wotd-link" data-open-trend="${escapeHtml(d.trend.id)}">${escapeHtml(displayTitle(d.trend.title))} →</button>
                ${lifecycleHtml({ lifecycle: d.trend.lifecycle })}
              </div>
              ${heatMeterHtml(d.trend.heat / 100)}
            </div>`
          : ""
      }
      <div class="button-row wotd-decode-row">
        <button type="button" class="btn btn-primary" data-decode-word="${escapeHtml(d.term)}">Decode more</button>
      </div>
      <p class="wotd-toast" role="status" aria-live="polite" hidden></p>
    `;
  }

  function openWord(date, from) {
    state.wordDate = date;
    state.wordFrom = from || state.tab || "home";
    if (state.wordFrom === "word") state.wordFrom = "home";
    setTab("word");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function showToast(root, message) {
    const toast = root && root.querySelector(".wotd-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  }

  async function shareWord(date, root) {
    const d = wotdDetails(date);
    if (!d) return;
    const text = WOTD().shareText(d);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trendy word of the day", text });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await copyText(text);
      showToast(root, "Copied — paste it anywhere.");
    } catch {
      showToast(root, text);
    }
  }

  function toggleWordSave(term) {
    const W = WOTD();
    if (!W) return;
    const r = W.toggleSavedWord(state.savedWords, term);
    state.savedWords = W.persistSavedWords(r.words);
  }

  function handleWordClick(e) {
    const save = e.target.closest("[data-save-word]");
    if (save) {
      e.preventDefault();
      toggleWordSave(save.dataset.saveWord);
      if (state.tab === "word") renderWordDetail(state.wordDate);
      else renderWotdCard();
      return true;
    }
    const share = e.target.closest("[data-share-word]");
    if (share) {
      e.preventDefault();
      shareWord(share.dataset.shareWord, share.closest(".wotd-card, .wotd-detail"));
      return true;
    }
    const decode = e.target.closest("[data-decode-word]");
    if (decode) {
      e.preventDefault();
      setTab("decode");
      handleDecode(decode.dataset.decodeWord);
      return true;
    }
    const trend = e.target.closest("[data-open-trend]");
    if (trend && state.tab === "word") {
      openDetail(trend.dataset.openTrend, "home");
      return true;
    }
    const open = e.target.closest("[data-open-word]");
    if (open) {
      openWord(open.dataset.openWord, state.tab);
      return true;
    }
    return false;
  }

  function renderSavedWords() {
    const list = $("#you-saved-words");
    const empty = $("#you-saved-words-empty");
    if (!list || !empty) return;
    empty.hidden = state.savedWords.length > 0;
    list.innerHTML = state.savedWords
      .map((w) => `<li><button type="button" class="chip" data-decode-saved="${escapeHtml(w)}" aria-label="Decode ${escapeHtml(w)}">${escapeHtml(w)}</button></li>`)
      .join("");
  }

  function renderHome() {
    renderWotdCard();
    renderHomeChips();
    const feed = $("#home-feed");
    const empty = $("#home-empty");
    const items = filteredHomeTrends();
    if (!items.length) {
      feed.innerHTML = "";
      empty.hidden = false;
      const copy = homeEmptyCopy();
      empty.innerHTML =
        `<p class="empty-title">${copy.title}</p>` +
        `<p class="empty-body">${copy.body}</p>`;
      return;
    }
    empty.hidden = true;
    feed.innerHTML = items.map(trendCardHtml).join("");
  }

  function renderExplore() {
    const chips = $("#explore-chips");
    const options = ["All", ...WORLDS];
    chips.innerHTML = options
      .map(
        (w) =>
          `<button type="button" class="chip" data-world="${escapeHtml(w)}" aria-pressed="${
            state.exploreWorld === w
          }" aria-label="Filter Explore by ${escapeHtml(w)}">${escapeHtml(w)}</button>`
      )
      .join("");

    const search = $("#explore-search");
    if (search && search.value !== state.exploreQuery) {
      search.value = state.exploreQuery;
    }

    const feed = $("#explore-feed");
    const empty = $("#explore-empty");
    const items = filteredExploreTrends();
    if (!items.length) {
      feed.innerHTML = "";
      empty.hidden = false;
      const q = (state.exploreQuery || "").trim();
      empty.innerHTML =
        `<p class="empty-title">${q ? "No matches" : "Nothing in this world"}</p>` +
        `<p class="empty-body">${
          q
            ? "Try another word, clear search, or pick a different niche chip."
            : "Try another niche — Dating, campus, sports, music, Money, and more. Radar keeps adding fresh slang."
        }</p>`;
      return;
    }
    empty.hidden = true;
    feed.innerHTML = items.map(trendCardHtml).join("");
  }

  function renderDetail(id) {
    const trend = state.trends.find((t) => t.id === id);
    const article = $("#detail-article");
    if (!trend) {
      article.innerHTML = `<p class="empty-body">Trend not found.</p>`;
      return;
    }
    article.innerHTML = `
      <div class="trend-card-top">
        <h2>${escapeHtml(displayTitle(trend.title))}</h2>
        ${lifecycleHtml(trend)}
      </div>
      <div class="detail-actions">
        ${saveBtnHtml(trend, { prominent: true })}
      </div>
      <p class="trend-summary">${escapeHtml(trend.summary)}</p>
      <div class="trend-meta">
        <span class="world-pill">${escapeHtml(trend.world)}</span>
        ${ageChipHtml(trend.age)}
        ${tagsHtml(trend)}
      </div>
      ${heatMeterHtml(trend.heatScore)}
      <p class="origin"><strong>Origin story</strong>${escapeHtml(trend.originStory)}</p>
    `;
  }

  function renderYouSaved() {
    const list = $("#you-saved-list");
    const empty = $("#you-saved-empty");
    const items = savedTrendsList();
    if (!items.length) {
      list.innerHTML = "";
      empty.hidden = false;
      const body = state.prefs.newHere
        ? "Tap the heart on any trend when you want to keep it. No rush — culture will still be there."
        : "Save trends from Home or Explore to collect them here.";
      empty.innerHTML =
        `<p class="empty-title">Nothing saved yet</p>` +
        `<p class="empty-body">${body}</p>`;
      return;
    }
    empty.hidden = true;
    list.innerHTML = items
      .map(
        (t) => `
      <button type="button" class="saved-row" role="listitem" data-open-saved="${escapeHtml(t.id)}" aria-label="Open saved trend ${escapeHtml(t.title)}">
        <span class="saved-row-title">${escapeHtml(displayTitle(t.title))}</span>
        <span class="world-pill">${escapeHtml(t.world)}</span>
      </button>`
      )
      .join("");
  }

  function renderYou() {
    const list = $("#you-worlds");
    list.innerHTML = WORLDS.map((w) => {
      const on = state.prefs.worlds[w] !== false;
      return `
        <label class="toggle-row">
          <span class="toggle-text">
            <span class="toggle-title">${escapeHtml(w)}</span>
          </span>
          <input type="checkbox" class="toggle-input world-toggle" data-world="${escapeHtml(w)}" ${
            on ? "checked" : ""
          } aria-label="Include ${escapeHtml(w)} world" />
          <span class="toggle-ui" aria-hidden="true"></span>
        </label>`;
    }).join("");

    const daily = $("#daily-word");
    if (daily) daily.checked = state.prefs.dailyWord !== false;
    renderSavedWords();
    $("#digest-freq").value = state.prefs.digest;
    $("#new-here").checked = !!state.prefs.newHere;
    const liveInput = $("#live-decode-url");
    if (liveInput) liveInput.value = state.prefs.liveDecodeUrl || "";
    const tokenInput = $("#live-decode-token");
    if (tokenInput) tokenInput.value = state.prefs.liveDecodeToken || "";
    updateLiveStatus();
    updateDecodeHint();
    renderYouSaved();
  }

  function updateDecodeHint() {
    const hint = $("#decode-mode-hint");
    const live = !!(state.prefs.liveDecodeUrl && state.prefs.liveDecodeUrl.trim());
    let text = "Slang lexicon + dictionary";
    if (live) text += " · live AI on miss";
    if (state.prefs.newHere) text += " · New here on";
    hint.textContent = text;
  }

  function updateLiveStatus(message) {
    const status = $("#live-decode-status");
    if (!status) return;
    if (message) {
      status.textContent = message;
      return;
    }
    const url = state.prefs.liveDecodeUrl;
    status.textContent = url
      ? `Using ${url}${state.prefs.liveDecodeToken ? " with a token" : ""} — only when the lexicon has no answer.`
      : "Not connected — Decode uses the built-in lexicon and dictionary.";
  }

  function refreshVisibleFeeds() {
    if (state.tab === "home") renderHome();
    else if (state.tab === "explore") renderExplore();
    else if (state.tab === "you") renderYouSaved();
    else if (state.tab === "detail" && state.detailId) renderDetail(state.detailId);
    else if (state.tab === "word" && state.wordDate) renderWordDetail(state.wordDate);
  }

  function setTab(tab) {
    if (tab !== "detail") state.detailId = null;
    if (tab !== "word") state.wordDate = null;
    state.tab = tab;

    $$(".view").forEach((v) => {
      v.hidden = v.dataset.view !== tab;
    });

    $$(".tab").forEach((btn) => {
      const highlight =
        tab === "detail"
          ? btn.dataset.tab === state.detailFrom
          : tab === "word"
            ? btn.dataset.tab === state.wordFrom
            : btn.dataset.tab === tab;
      btn.setAttribute("aria-current", highlight ? "page" : "false");
    });

    const subs = {
      home: "Signal, not scroll.",
      decode: "Slang, decoded.",
      explore: "Every world, one place.",
      you: "Your filters & tone.",
      detail: "Origin story.",
      word: "Word of the day.",
    };
    $("#header-sub").textContent = subs[tab] || "Signal, not scroll.";

    if (tab === "home") renderHome();
    if (tab === "explore") renderExplore();
    if (tab === "you") renderYou();
    if (tab === "decode") seedChat();
    if (tab === "detail" && state.detailId) renderDetail(state.detailId);
    if (tab === "word" && state.wordDate) renderWordDetail(state.wordDate);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function openDetail(id, from) {
    state.detailId = id;
    state.detailFrom = from || "home";
    setTab("detail");
  }

  function handleSaveClick(e) {
    const btn = e.target.closest("[data-save-id]");
    if (!btn) return false;
    e.preventDefault();
    e.stopPropagation();
    toggleSave(btn.dataset.saveId);
    refreshVisibleFeeds();
    return true;
  }

  function appendBubble(role, htmlOrText, isHtml = false) {
    const log = $("#chat-log");
    const div = document.createElement("div");
    div.className = `bubble bubble-${role}`;
    if (isHtml) div.innerHTML = htmlOrText;
    else div.innerHTML = `<span class="bubble-meta">You</span>${escapeHtml(htmlOrText)}`;
    log.appendChild(div);
    scrollChatToEnd();
    return div;
  }

  /** The chat grows with the page (no inner scroller), so keep the newest bubble in view. */
  function scrollChatToEnd() {
    if (state.tab !== "decode") return;
    const compose = $("#decode-form");
    if (!compose || typeof compose.scrollIntoView !== "function") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    compose.scrollIntoView({ block: "end", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function seedChat() {
    const log = $("#chat-log");
    if (log.childElementCount) return;
    const welcome = state.prefs.newHere
      ? "Ask what any word means — e.g. “what does 67 mean?” or just type a term. I check Trendy’s slang lexicon first, then a dictionary. Judgment-free."
      : "Ask what any slang word, abbreviation or trend means.";
    appendBubble("bot", `<span class="bubble-meta">Trendy</span>${escapeHtml(welcome)}`, true);
  }

  function refreshCommunityLexicon() {
    const Suggest = globalThis.TrendySuggest;
    const server = state.communityServer || { entries: [] };
    if (Suggest && typeof Suggest.mergeCommunity === "function") {
      state.community = Suggest.mergeCommunity(server);
    } else {
      state.community = server;
    }
  }

  let suggestIdSeq = 0;
  function suggestCardHtml(term) {
    const t = escapeHtml(term || "");
    const sid = "suggest-term-" + (++suggestIdSeq);
    return `
      <div class="suggest-card" data-suggest-root>
        <button type="button" class="suggest-toggle" data-suggest-toggle aria-expanded="false">
          Suggest a better definition
        </button>
        <form class="suggest-form" data-suggest-form hidden>
          <label class="field-label" for="${sid}">Term</label>
          <input type="text" id="${sid}" class="suggest-term text-input" name="term" value="${t}" maxlength="80" required />
          <label class="field-label" for="${sid}-meaning">Meaning</label>
          <textarea id="${sid}-meaning" class="suggest-meaning" name="meaning" rows="3" maxlength="800" required placeholder="Plain meaning — no shame, just help the next person."></textarea>
          <label class="field-label" for="${sid}-origin">Origin <span class="optional">(optional)</span></label>
          <input type="text" id="${sid}-origin" class="suggest-origin text-input" name="origin" maxlength="240" placeholder="Where you heard it" />
          <div class="button-row">
            <button type="submit" class="btn btn-primary suggest-submit">Submit</button>
            <button type="button" class="btn btn-secondary" data-suggest-cancel>Cancel</button>
          </div>
          <p class="suggest-note" data-suggest-note role="status" hidden></p>
        </form>
      </div>`;
  }

  function bindSuggestCard(root, defaultTerm) {
    if (!root) return;
    const toggle = root.querySelector("[data-suggest-toggle]");
    const form = root.querySelector("[data-suggest-form]");
    const note = root.querySelector("[data-suggest-note]");
    const setOpen = (open) => {
      if (!form || !toggle) return;
      form.hidden = !open;
      toggle.hidden = open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        const meaning = form.querySelector(".suggest-meaning");
        if (meaning) meaning.focus();
      } else {
        toggle.focus();
      }
    };
    if (toggle && form) {
      toggle.addEventListener("click", () => setOpen(form.hidden));
      const cancel = form.querySelector("[data-suggest-cancel]");
      if (cancel) cancel.addEventListener("click", () => setOpen(false));
      form.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
      });
    }
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const Suggest = globalThis.TrendySuggest;
      if (!Suggest) return;
      const termInput = form.querySelector(".suggest-term");
      const meaningInput = form.querySelector(".suggest-meaning");
      const originInput = form.querySelector(".suggest-origin");
      const term = (termInput && termInput.value) || defaultTerm || "";
      const meaning = (meaningInput && meaningInput.value) || "";
      const origin = (originInput && originInput.value) || "";
      const btn = form.querySelector(".suggest-submit");
      if (btn) btn.disabled = true;
      try {
        const result = await Suggest.submitSuggestion({
          term,
          meaning,
          origin,
          liveDecodeUrl: state.prefs.liveDecodeUrl || "",
          liveDecodeToken: state.prefs.liveDecodeToken || "",
        });
        if (note) {
          note.hidden = false;
          note.textContent = result.message || (result.ok ? "Thanks!" : "Could not save.");
          note.classList.toggle("suggest-note-error", !result.ok);
        }
        if (result.ok) {
          refreshCommunityLexicon();
          if (meaningInput) meaningInput.value = "";
          if (originInput) originInput.value = "";
        }
      } catch (err) {
        console.error(err);
        if (note) {
          note.hidden = false;
          note.textContent = "Something glitched — try again.";
          note.classList.add("suggest-note-error");
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function handleDecode(query) {
    appendBubble("user", query, false);
    const typing = appendBubble(
      "bot",
      `<span class="bubble-meta">Trendy</span><span class="bubble-typing"><span class="dots">Thinking</span></span>`,
      true
    );
    typing.classList.add("bubble-typing");

    try {
      refreshCommunityLexicon();
      const answer = await window.TrendyDecodeAI.decodeQuery(query, {
        slang: state.slang,
        trends: state.trends,
        abbreve: state.abbreve,
        community: state.community,
        newHere: state.prefs.newHere,
        liveDecodeUrl: state.prefs.liveDecodeUrl || "",
        liveDecodeToken: state.prefs.liveDecodeToken || "",
      });
      const html = window.TrendyDecodeAI.formatAnswerHtml(answer, escapeHtml);
      typing.classList.remove("bubble-typing");
      typing.innerHTML = html;
      if (answer.suggestEligible) {
        const wrap = document.createElement("div");
        wrap.innerHTML = suggestCardHtml(answer.term || query);
        const card = wrap.firstElementChild;
        typing.appendChild(card);
        bindSuggestCard(card, answer.term || query);
      }
    } catch (err) {
      console.error(err);
      typing.classList.remove("bubble-typing");
      typing.innerHTML =
        `<span class="bubble-meta">Trendy</span>Something glitched while searching. Try again with just the word.`;
    }

    scrollChatToEnd();
  }

  function bindFeedOpen(root, fromTab) {
    root.addEventListener("click", (e) => {
      if (handleSaveClick(e)) return;
      const open = e.target.closest("[data-open-trend]");
      if (open) openDetail(open.dataset.openTrend, fromTab);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const open = e.target.closest("[data-open-trend]");
      if (!open) return;
      e.preventDefault();
      openDetail(open.dataset.openTrend, fromTab);
    });
  }

  function bindEvents() {
    $$(".tab").forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    $("#detail-back").addEventListener("click", () => {
      setTab(state.detailFrom || "home");
    });

    $("#detail-article").addEventListener("click", (e) => {
      handleSaveClick(e);
    });

    $("#word-back").addEventListener("click", () => {
      setTab(state.wordFrom || "home");
    });
    $("#word-article").addEventListener("click", handleWordClick);
    const wotdSlot = $("#wotd-slot");
    wotdSlot.addEventListener("click", handleWordClick);
    wotdSlot.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const open = e.target.closest(".wotd-body[data-open-word]");
      if (!open) return;
      e.preventDefault();
      openWord(open.dataset.openWord, "home");
    });
    document.addEventListener("visibilitychange", () => {
      // New local day while the app sat in the background: refresh the card.
      if (document.hidden || state.tab !== "home" || !WOTD()) return;
      if (wotdSlot.dataset.date !== WOTD().localDateString()) renderWotdCard();
    });

    const dailyWord = $("#daily-word");
    if (dailyWord) {
      dailyWord.addEventListener("change", (e) => {
        state.prefs.dailyWord = e.target.checked;
        savePrefs();
      });
    }
    $("#you-saved-words").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-decode-saved]");
      if (!chip) return;
      setTab("decode");
      handleDecode(chip.dataset.decodeSaved);
    });

    bindFeedOpen($("#home-feed"), "home");
    bindFeedOpen($("#explore-feed"), "explore");

    $("#home-chips").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-home-filter]");
      if (!chip) return;
      state.homeFilter = chip.dataset.homeFilter;
      renderHome();
    });

    $("#explore-chips").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-world]");
      if (!chip) return;
      state.exploreWorld = chip.dataset.world;
      renderExplore();
    });

    const exploreSearch = $("#explore-search");
    if (exploreSearch) {
      exploreSearch.addEventListener("input", (e) => {
        state.exploreQuery = e.target.value;
        renderExplore();
      });
    }

    $("#you-saved-list").addEventListener("click", (e) => {
      const row = e.target.closest("[data-open-saved]");
      if (row) openDetail(row.dataset.openSaved, "you");
    });

    $("#you-worlds").addEventListener("change", (e) => {
      const input = e.target.closest(".world-toggle");
      if (!input) return;
      state.prefs.worlds[input.dataset.world] = input.checked;
      savePrefs();
    });

    $("#digest-freq").addEventListener("change", (e) => {
      state.prefs.digest = e.target.value;
      savePrefs();
    });

    $("#new-here").addEventListener("change", (e) => {
      state.prefs.newHere = e.target.checked;
      savePrefs();
      updateDecodeHint();
      renderYouSaved();
    });

    const liveSave = $("#live-decode-save");
    const liveClear = $("#live-decode-clear");
    const liveInput = $("#live-decode-url");
    const tokenInput = $("#live-decode-token");
    const liveForm = $("#live-decode-form");
    if (liveForm) liveForm.addEventListener("submit", (e) => e.preventDefault());
    if (liveSave && liveInput) {
      liveSave.addEventListener("click", () => {
        const url = String(liveInput.value || "").trim();
        if (url && !/^https?:\/\/[^\s/]+/i.test(url)) {
          updateLiveStatus("That doesn’t look like a URL — try http://192.168.1.20:8787");
          return;
        }
        state.prefs.liveDecodeUrl = url;
        state.prefs.liveDecodeToken = tokenInput ? String(tokenInput.value || "").trim() : "";
        savePrefs();
        updateDecodeHint();
        updateLiveStatus(url ? "Saved — Decode asks this proxy only when the lexicon has no answer." : undefined);
      });
    }
    if (liveClear && liveInput) {
      liveClear.addEventListener("click", () => {
        liveInput.value = "";
        if (tokenInput) tokenInput.value = "";
        state.prefs.liveDecodeUrl = "";
        state.prefs.liveDecodeToken = "";
        savePrefs();
        updateDecodeHint();
        updateLiveStatus("Cleared — Decode uses the built-in lexicon and dictionary.");
      });
    }

    $("#decode-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("#decode-input");
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      await handleDecode(q);
      input.focus();
    });

    const suggest = $("#decode-suggest");
    if (suggest) {
      suggest.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-q]");
        if (!btn) return;
        setTab("decode");
        await handleDecode(btn.dataset.q);
      });
    }
  }

  async function loadData() {
    const bust = "v=18";
    const [trendsRes, slangRes, abbreveRes, communityRes, wotdRes] = await Promise.all([
      fetch("data/trends.json?" + bust),
      fetch("data/slang.json?" + bust),
      fetch("data/abbreve.json?" + bust),
      fetch("data/community-slang.json?" + bust),
      fetch("data/word-of-the-day.json?" + bust).catch(() => null),
    ]);
    if (!trendsRes.ok || !slangRes.ok) {
      throw new Error("Failed to load data files");
    }
    state.trends = await trendsRes.json();
    state.slang = await slangRes.json();
    state.abbreve = abbreveRes.ok ? await abbreveRes.json() : { entries: [] };
    state.communityServer = communityRes.ok
      ? await communityRes.json()
      : { entries: [] };
    try {
      state.wotdOverrides = wotdRes && wotdRes.ok ? await wotdRes.json() : {};
    } catch {
      state.wotdOverrides = {};
    }
    state.wotdPool = null;
    refreshCommunityLexicon();
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  async function init() {
    loadSaved();
    state.savedWords = WOTD() ? WOTD().loadSavedWords() : [];
    bindEvents();
    try {
      await loadData();
    } catch (err) {
      $("#home-feed").innerHTML = "";
      const empty = $("#home-empty");
      empty.hidden = false;
      empty.innerHTML =
        `<p class="empty-title">Couldn't load trends</p>` +
        `<p class="empty-body">Serve this folder over HTTP (e.g. <code>npx serve</code>) so data/*.json can load.</p>`;
      console.error(err);
    }
    seedChat();
    setTab("home");
    registerSW();
    const deepLink = new URLSearchParams(location.search).get("decode");
    if (deepLink && deepLink.trim()) {
      setTab("decode");
      handleDecode(deepLink.trim().slice(0, 160));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
