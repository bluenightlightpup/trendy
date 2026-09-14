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
  };

  const Saved = () => globalThis.TrendySaved;

  const state = {
    trends: [],
    slang: null,
    abbreve: { entries: [] },
    prefs: loadPrefs(),
    savedIds: [],
    tab: "home",
    exploreWorld: "All",
    exploreQuery: "",
    homeFilter: "all",
    detailId: null,
    detailFrom: "home",
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

  function tagsHtml(tags) {
    return (tags || [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");
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

  function trendCardHtml(trend) {
    return `
      <article class="trend-card" role="listitem" data-trend-id="${escapeHtml(trend.id)}">
        <div class="trend-card-body" data-open-trend="${escapeHtml(trend.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(trend.title)} origin story">
          <div class="trend-card-top">
            <h3 class="trend-title">${escapeHtml(trend.title)}</h3>
            <span class="lifecycle lifecycle-${escapeHtml(trend.lifecycle)}">${escapeHtml(trend.lifecycle)}</span>
          </div>
          <p class="trend-summary">${escapeHtml(trend.summary)}</p>
          <div class="trend-meta">
            <span class="world-pill">${escapeHtml(trend.world)}</span>
            ${tagsHtml(trend.tags)}
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
    return list.slice().sort((a, b) => b.heatScore - a.heatScore);
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
    return list.slice().sort((a, b) => b.heatScore - a.heatScore);
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

  function renderHome() {
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
        <h2>${escapeHtml(trend.title)}</h2>
        <span class="lifecycle lifecycle-${escapeHtml(trend.lifecycle)}">${escapeHtml(trend.lifecycle)}</span>
      </div>
      <div class="detail-actions">
        ${saveBtnHtml(trend, { prominent: true })}
      </div>
      <p class="trend-summary">${escapeHtml(trend.summary)}</p>
      <div class="trend-meta">
        <span class="world-pill">${escapeHtml(trend.world)}</span>
        ${tagsHtml(trend.tags)}
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
        <span class="saved-row-title">${escapeHtml(t.title)}</span>
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

    $("#digest-freq").value = state.prefs.digest;
    $("#new-here").checked = !!state.prefs.newHere;
    updateDecodeHint();
    renderYouSaved();
  }

  function updateDecodeHint() {
    const hint = $("#decode-mode-hint");
    hint.textContent = state.prefs.newHere
      ? "AI slang search · New here on"
      : "AI slang search · ask anything";
  }

  function refreshVisibleFeeds() {
    if (state.tab === "home") renderHome();
    else if (state.tab === "explore") renderExplore();
    else if (state.tab === "you") renderYouSaved();
    else if (state.tab === "detail" && state.detailId) renderDetail(state.detailId);
  }

  function setTab(tab) {
    if (tab !== "detail") state.detailId = null;
    state.tab = tab;

    $$(".view").forEach((v) => {
      v.hidden = v.dataset.view !== tab;
    });

    $$(".tab").forEach((btn) => {
      const highlight =
        tab === "detail" ? btn.dataset.tab === state.detailFrom : btn.dataset.tab === tab;
      btn.setAttribute("aria-current", highlight ? "page" : "false");
    });

    const subs = {
      home: "Signal, not scroll.",
      decode: "AI search — any word.",
      explore: "Catch up without the scroll",
      you: "Your filters & tone.",
      detail: "Origin story.",
    };
    $("#header-sub").textContent = subs[tab] || "Signal, not scroll.";

    if (tab === "home") renderHome();
    if (tab === "explore") renderExplore();
    if (tab === "you") renderYou();
    if (tab === "decode") seedChat();
    if (tab === "detail" && state.detailId) renderDetail(state.detailId);

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
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function seedChat() {
    const log = $("#chat-log");
    if (log.childElementCount) return;
    const welcome = state.prefs.newHere
      ? "I'm your slang & trends AI search. Ask what any word means — e.g. “what does 67 mean?” or just type a term. Judgment-free."
      : "AI search for slang and trends. Ask what any word means.";
    appendBubble("bot", `<span class="bubble-meta">Trendy</span>${escapeHtml(welcome)}`, true);
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
      const answer = await window.TrendyDecodeAI.decodeQuery(query, {
        slang: state.slang,
        trends: state.trends,
        abbreve: state.abbreve,
        newHere: state.prefs.newHere,
      });
      const html = window.TrendyDecodeAI.formatAnswerHtml(answer, escapeHtml);
      typing.classList.remove("bubble-typing");
      typing.innerHTML = html;
    } catch (err) {
      console.error(err);
      typing.classList.remove("bubble-typing");
      typing.innerHTML =
        `<span class="bubble-meta">Trendy</span>Something glitched while searching. Try again with just the word.`;
    }

    const log = $("#chat-log");
    log.scrollTop = log.scrollHeight;
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
    const [trendsRes, slangRes, abbreveRes] = await Promise.all([
      fetch("data/trends.json"),
      fetch("data/slang.json"),
      fetch("data/abbreve.json"),
    ]);
    if (!trendsRes.ok || !slangRes.ok) {
      throw new Error("Failed to load data files");
    }
    state.trends = await trendsRes.json();
    state.slang = await slangRes.json();
    state.abbreve = abbreveRes.ok ? await abbreveRes.json() : { entries: [] };
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  async function init() {
    loadSaved();
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
