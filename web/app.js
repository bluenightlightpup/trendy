/* Trendy PWA — vanilla app logic */
(() => {
  "use strict";

  const WORLDS = ["TikTok", "Internet culture", "Abbreviations", "Gaming"];
  const STORAGE_KEY = "trendy.you.prefs.v1";
  const DEFAULT_PREFS = {
    worlds: Object.fromEntries(WORLDS.map((w) => [w, true])),
    digest: "weekly",
    newHere: true,
  };

  const state = {
    trends: [],
    slang: null,
    abbreve: { entries: [] },
    prefs: loadPrefs(),
    tab: "home",
    exploreWorld: "All",
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
      <div class="heat-row" aria-label="Heat score ${pct}">
        <div class="heat-track">
          <span class="heat-dot" style="left:${pct}%"></span>
        </div>
        <span class="heat-score">${pct}</span>
      </div>`;
  }

  function tagsHtml(tags) {
    return (tags || [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");
  }

  function trendCardHtml(trend) {
    return `
      <button type="button" class="trend-card" role="listitem" data-trend-id="${escapeHtml(trend.id)}">
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
      </button>`;
  }

  function filteredHomeTrends() {
    return state.trends
      .filter((t) => state.prefs.worlds[t.world] !== false)
      .slice()
      .sort((a, b) => b.heatScore - a.heatScore);
  }

  function filteredExploreTrends() {
    const list =
      state.exploreWorld === "All"
        ? state.trends
        : state.trends.filter((t) => t.world === state.exploreWorld);
    return list.slice().sort((a, b) => b.heatScore - a.heatScore);
  }

  function renderHome() {
    const feed = $("#home-feed");
    const empty = $("#home-empty");
    const items = filteredHomeTrends();
    if (!items.length) {
      feed.innerHTML = "";
      empty.hidden = false;
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
          }">${escapeHtml(w)}</button>`
      )
      .join("");

    const feed = $("#explore-feed");
    const empty = $("#explore-empty");
    const items = filteredExploreTrends();
    if (!items.length) {
      feed.innerHTML = "";
      empty.hidden = false;
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
      <p class="trend-summary">${escapeHtml(trend.summary)}</p>
      <div class="trend-meta">
        <span class="world-pill">${escapeHtml(trend.world)}</span>
        ${tagsHtml(trend.tags)}
      </div>
      ${heatMeterHtml(trend.heatScore)}
      <p class="origin"><strong>Origin story</strong>${escapeHtml(trend.originStory)}</p>
    `;
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
          } />
          <span class="toggle-ui" aria-hidden="true"></span>
        </label>`;
    }).join("");

    $("#digest-freq").value = state.prefs.digest;
    $("#new-here").checked = !!state.prefs.newHere;
    updateDecodeHint();
  }

  function updateDecodeHint() {
    const hint = $("#decode-mode-hint");
    hint.textContent = state.prefs.newHere
      ? "AI slang search · New here on"
      : "AI slang search · ask anything";
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
      explore: "Worlds of culture.",
      you: "Your filters & tone.",
      detail: "Origin story.",
    };
    $("#header-sub").textContent = subs[tab] || "Signal, not scroll.";

    if (tab === "home") renderHome();
    if (tab === "explore") renderExplore();
    if (tab === "you") renderYou();
    if (tab === "decode") seedChat();
    if (tab === "detail" && state.detailId) renderDetail(state.detailId);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDetail(id, from) {
    state.detailId = id;
    state.detailFrom = from || "home";
    setTab("detail");
  }

  function normalize(s) {
    return window.TrendyDecodeAI
      ? window.TrendyDecodeAI.normalize(s)
      : String(s || "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
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

  function bindEvents() {
    $$(".tab").forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    $("#detail-back").addEventListener("click", () => {
      setTab(state.detailFrom || "home");
    });

    $("#home-feed").addEventListener("click", (e) => {
      const card = e.target.closest("[data-trend-id]");
      if (card) openDetail(card.dataset.trendId, "home");
    });

    $("#explore-feed").addEventListener("click", (e) => {
      const card = e.target.closest("[data-trend-id]");
      if (card) openDetail(card.dataset.trendId, "explore");
    });

    $("#explore-chips").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-world]");
      if (!chip) return;
      state.exploreWorld = chip.dataset.world;
      renderExplore();
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
