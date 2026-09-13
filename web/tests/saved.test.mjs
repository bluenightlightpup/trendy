import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInThisContext } from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
runInThisContext(readFileSync(join(__dirname, "../saved.js"), "utf8"), {
  filename: "saved.js",
});

const {
  SAVED_KEY,
  normalizeIds,
  isSaved,
  toggleSavedId,
  loadSavedIds,
  persistSavedIds,
} = globalThis.TrendySaved;

test("normalizeIds drops blanks and duplicates", () => {
  assert.deepEqual(normalizeIds(["a", "", "a", " b ", null]), ["a", "b"]);
});

test("toggleSavedId adds then removes without mutating input", () => {
  const start = ["x"];
  const added = toggleSavedId(start, "y");
  assert.deepEqual(added.ids, ["x", "y"]);
  assert.equal(added.saved, true);
  assert.deepEqual(start, ["x"]);

  const removed = toggleSavedId(added.ids, "y");
  assert.deepEqual(removed.ids, ["x"]);
  assert.equal(removed.saved, false);
});

test("isSaved checks membership", () => {
  assert.equal(isSaved(["a", "b"], "b"), true);
  assert.equal(isSaved(["a", "b"], "c"), false);
  assert.equal(isSaved([], ""), false);
});

test("load/persist round-trip via memory storage", () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
  };
  assert.deepEqual(loadSavedIds(storage), []);
  persistSavedIds(["trend-1", "trend-2"], storage);
  assert.equal(mem.get(SAVED_KEY), JSON.stringify(["trend-1", "trend-2"]));
  assert.deepEqual(loadSavedIds(storage), ["trend-1", "trend-2"]);
});
