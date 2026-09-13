/* Trendy — saved/followed trend IDs (localStorage helpers) */
(function (global) {
  "use strict";

  const SAVED_KEY = "trendy.saved.v1";

  /** @returns {string[]} */
  function normalizeIds(ids) {
    if (!Array.isArray(ids)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const id = String(raw || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  /** Pure: whether id is in the list. */
  function isSaved(ids, id) {
    const needle = String(id || "").trim();
    if (!needle) return false;
    return normalizeIds(ids).includes(needle);
  }

  /**
   * Pure toggle. Returns a new array (does not mutate).
   * @returns {{ ids: string[], saved: boolean }}
   */
  function toggleSavedId(ids, id) {
    const needle = String(id || "").trim();
    const list = normalizeIds(ids);
    if (!needle) return { ids: list, saved: false };
    const idx = list.indexOf(needle);
    if (idx >= 0) {
      const next = list.slice(0, idx).concat(list.slice(idx + 1));
      return { ids: next, saved: false };
    }
    return { ids: list.concat([needle]), saved: true };
  }

  /** @param {Storage | { getItem: Function }} [storage] */
  function loadSavedIds(storage) {
    const store = storage || (typeof global.localStorage !== "undefined" ? global.localStorage : null);
    if (!store) return [];
    try {
      const raw = store.getItem(SAVED_KEY);
      if (!raw) return [];
      return normalizeIds(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  /** @param {string[]} ids @param {Storage | { setItem: Function }} [storage] */
  function persistSavedIds(ids, storage) {
    const store = storage || (typeof global.localStorage !== "undefined" ? global.localStorage : null);
    if (!store) return normalizeIds(ids);
    const next = normalizeIds(ids);
    store.setItem(SAVED_KEY, JSON.stringify(next));
    return next;
  }

  global.TrendySaved = {
    SAVED_KEY,
    normalizeIds,
    isSaved,
    toggleSavedId,
    loadSavedIds,
    persistSavedIds,
  };
})(typeof window !== "undefined" ? window : globalThis);
