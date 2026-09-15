"""Smoke tests for Trendy CLI spike (stdlib unittest)."""

from __future__ import annotations

import io
import unittest
from contextlib import redirect_stdout

from cli import trendy


class CliSmokeTest(unittest.TestCase):
    def test_decode_67(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(["decode", "67"])
        self.assertEqual(code, 0)
        out = buf.getvalue()
        self.assertIn("short:", out)
        self.assertIn("explain:", out)

    def test_decode_miss(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(["decode", "zzznolexiconhit999"])
        self.assertEqual(code, 0)
        self.assertIn("no lexicon hit", buf.getvalue())

    def test_trends_min_heat(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(["trends", "--min-heat", "0.7", "--limit", "5"])
        self.assertEqual(code, 0)
        lines = [ln for ln in buf.getvalue().splitlines() if ln.strip()]
        self.assertTrue(lines)
        self.assertLessEqual(len(lines), 5)

    def test_radar_status(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(["radar", "status"])
        self.assertEqual(code, 0)
        out = buf.getvalue()
        self.assertTrue("last run:" in out or "no last-run" in out)

    def test_serve_parser(self) -> None:
        parser = trendy.build_parser()
        args = parser.parse_args(["serve", "--port", "8799"])
        self.assertEqual(args.command, "serve")
        self.assertEqual(args.port, 8799)
        self.assertEqual(args.host, "0.0.0.0")

    def test_decode_live_flag_parser(self) -> None:
        parser = trendy.build_parser()
        args = parser.parse_args(["decode", "bro", "--live"])
        self.assertTrue(args.live)

    def test_live_resolve_provider_none(self) -> None:
        from cli import live_decode
        # Should not crash; may or may not have keys in CI — just import + health shape
        self.assertTrue(callable(live_decode.run_serve))
        self.assertIn("judgment-free", live_decode.SYSTEM_PROMPT.lower())

    def test_community_lexicon_import(self) -> None:
        from cli import community_lexicon as cl
        self.assertEqual(cl.CONSENSUS_THRESHOLD, 3)
        self.assertTrue(cl.meanings_similar("cool vibe word for chill", "cool vibe word for chill vibes"))


if __name__ == "__main__":
    unittest.main()
