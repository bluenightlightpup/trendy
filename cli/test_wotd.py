"""Word of the Day: golden vectors shared with web/tests/wotd.test.mjs and the Swift tests."""

from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from cli import mcp_server, trendy, wotd

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = json.loads((ROOT / "Tests" / "Fixtures" / "wotd-golden.json").read_text(encoding="utf-8"))
SLANG = json.loads((ROOT / "web" / "data" / "slang.json").read_text(encoding="utf-8"))
POOL = wotd.build_pool(SLANG)


class GoldenVectorsTest(unittest.TestCase):
    def test_pool_matches_fixture(self) -> None:
        self.assertEqual(len(POOL), GOLDEN["poolSize"])
        self.assertEqual([wotd.terms_of(e)[0] for e in POOL], GOLDEN["pool"])
        self.assertEqual(wotd.EPOCH.isoformat(), GOLDEN["epoch"])
        self.assertEqual(wotd.SEED_BASE, GOLDEN["seedBase"])

    def test_vectors(self) -> None:
        self.assertGreaterEqual(len(GOLDEN["vectors"]), 20)
        for v in GOLDEN["vectors"]:
            got = wotd.word_for_date(SLANG, v["date"], overrides={}, pool=POOL)
            self.assertEqual(got["term"], v["term"], v["date"])

    def test_seeds_and_permutations(self) -> None:
        for s in GOLDEN["seeds"]:
            self.assertEqual(wotd.cycle_seed(s["cycle"]), s["seed"], s)
        for p in GOLDEN["permutations"]:
            self.assertEqual(wotd.cycle_order(p["n"], p["cycle"]), p["order"], p)

    def test_overrides(self) -> None:
        for c in GOLDEN["overrideCases"]:
            got = wotd.word_for_date(SLANG, c["date"], overrides={"overrides": GOLDEN["overrides"]}, pool=POOL)
            self.assertEqual((got["term"], got["override"]), (c["term"], c["override"]), c["date"])
        shipped = json.loads((ROOT / "web" / "data" / "word-of-the-day.json").read_text(encoding="utf-8"))
        for day in wotd.overrides_of(shipped):
            self.assertTrue(wotd.word_for_date(SLANG, day, overrides=shipped, pool=POOL)["override"], day)


class AlgorithmTest(unittest.TestCase):
    def test_each_word_once_per_cycle_and_no_back_to_back(self) -> None:
        n = len(POOL)
        for cycle in (-1, 0, 1, 2, 3):
            self.assertEqual(sorted(wotd.cycle_order(n, cycle)), list(range(n)))
        day = wotd.add_days("2026-01-01", -3)
        prev, seen = None, set()
        for i in range(3 * n + 3):
            term = wotd.word_for_date(SLANG, day, pool=POOL)["term"]
            self.assertNotEqual(term, prev, day)
            if 3 <= i < 3 + n:
                seen.add(term)
            prev, day = term, wotd.add_days(day, 1)
        self.assertEqual(len(seen), n)

    def test_eligibility(self) -> None:
        base = {"terms": ["zzz"], "short": "s", "origin": "o"}
        self.assertTrue(wotd.is_eligible(base))
        for extra in (
            {"source": "abbreve"}, {"confidence": "low"}, {"radarSource": "reddit"}, {"wotd": False},
            {"mature": True}, {"origin": ""}, {"explain": "a hookup thing"}, {"explain": "What The F***"},
            {"terms": ["edging"]},
        ):
            self.assertFalse(wotd.is_eligible({**base, **extra}), extra)
        self.assertTrue(wotd.is_eligible({**base, "explain": "Sussex essays"}))
        terms = {wotd.normalize_term(t) for e in POOL for t in wotd.terms_of(e)}
        for bad in ("sneaky link", "gyatt", "deadass", "edging", "situationship", "wtf", "copium"):
            self.assertNotIn(bad, terms)
        for e in POOL:
            self.assertTrue(e.get("wotdExample") or e.get("example"), e["terms"][0])

    def test_dates(self) -> None:
        self.assertFalse(wotd.is_valid_date("2026-02-29"))
        self.assertTrue(wotd.is_valid_date("2028-02-29"))
        self.assertEqual(wotd.days_since_epoch("2025-12-31"), -1)
        with self.assertRaises(ValueError):
            wotd.word_for_date(SLANG, "2026-13-01", pool=POOL)


class CliAndMcpTest(unittest.TestCase):
    def _run(self, argv):
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(argv)
        return code, buf.getvalue()

    def test_cli_word_text_and_alias(self) -> None:
        v = GOLDEN["vectors"][0]
        code, out = self._run(["word", "--date", v["date"]])
        self.assertEqual(code, 0)
        self.assertIn(f"Word of the day · {v['date']}", out)
        self.assertIn(f"{v['term']}  [slang]", out)
        for label in ("meaning:", "example:", "origin:", "age:", "more:"):
            self.assertIn(label, out)
        code2, out2 = self._run(["wotd", "--date", v["date"]])
        self.assertEqual((code2, out2), (code, out))

    def test_cli_word_json(self) -> None:
        code, out = self._run(["word", "--date", "2026-10-08", "--json"])
        self.assertEqual(code, 0)
        payload = json.loads(out)
        expected = next(v["term"] for v in GOLDEN["vectors"] if v["date"] == "2026-10-08")
        self.assertEqual(payload["term"], expected)
        for key in ("meaning", "explain", "example", "origin", "age", "trend", "yesterday", "share"):
            self.assertIn(key, payload)
        self.assertTrue(payload["share"].startswith(f"Trendy word of the day: {expected} — "))
        self.assertTrue(payload["share"].endswith(" https://bluenightlightpup.github.io/trendy/app/"))

    def test_cli_word_bad_date(self) -> None:
        code, _ = self._run(["word", "--date", "2026-02-30"])
        self.assertEqual(code, 2)

    def test_mcp_tool(self) -> None:
        resp = mcp_server.dispatch(
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {"name": "word_of_the_day", "arguments": {"date": "2026-10-09"}},
            }
        )
        result = resp["result"]
        self.assertFalse(result["isError"])
        payload = json.loads(result["content"][0]["text"])
        expected = next(v["term"] for v in GOLDEN["vectors"] if v["date"] == "2026-10-09")
        self.assertEqual(payload["term"], expected)
        today = mcp_server.call_tool("word_of_the_day", {})
        self.assertFalse(today["isError"])
        self.assertIn("note", json.loads(today["content"][0]["text"]))


if __name__ == "__main__":
    unittest.main()
