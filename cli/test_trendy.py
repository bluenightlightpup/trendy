"""Smoke tests for the Trendy CLI (stdlib unittest)."""

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

    def test_decode_age_lines(self) -> None:
        for term, band in (
            ("67", "Gen Alpha"),
            ("nah I'd win", "Gen Z"),
            ("bro", "Mixed"),
            ("alpha", "Gen Z"),
        ):
            buf = io.StringIO()
            with redirect_stdout(buf):
                code = trendy.main(["decode", term])
            self.assertEqual(code, 0, term)
            out = buf.getvalue()
            self.assertIn("short:", out, term)
            self.assertIn("age:", out, term)
            self.assertIn(band, out, term)

    def test_decode_miss(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(["decode", "zzznolexiconhit999"])
        self.assertEqual(code, 1)
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
        self.assertEqual(args.host, "127.0.0.1")

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


    def _decode_json(self, term: str) -> tuple[int, dict]:
        import json

        buf = io.StringIO()
        with redirect_stdout(buf):
            code = trendy.main(["decode", term, "--json"])
        return code, json.loads(buf.getvalue())

    def test_decode_json_shape(self) -> None:
        code, payload = self._decode_json("67")
        self.assertEqual(code, 0)
        self.assertTrue(payload["found"])
        self.assertIn("Gen Alpha", payload["age"])
        code, payload = self._decode_json("florbix")
        self.assertEqual(code, 1)
        self.assertFalse(payload["found"])

    def test_abbreviations_do_not_hijack_phrases(self) -> None:
        for phrase in ("i was so tired", "ok so", "y tho i was tired", "kiss me in the uk"):
            entry, _ = trendy.lookup_lexicon(phrase)
            if entry is not None:
                self.assertFalse(
                    trendy.is_abbreviation(entry),
                    f"{phrase!r} decoded as abbreviation {entry.get('terms')}",
                )
        # ...but the acronym still decodes when it IS the whole query
        entry, source = trendy.lookup_lexicon("so")
        self.assertIsNotNone(entry)
        self.assertTrue(trendy.is_abbreviation(entry, source))

    def test_s_slash_o(self) -> None:
        code, payload = self._decode_json("s/o")
        self.assertEqual(code, 0)
        self.assertRegex(payload["meaning"], "(?i)shout")

    def test_na_leads_with_nah_and_lists_not_applicable(self) -> None:
        code, payload = self._decode_json("na")
        self.assertEqual(code, 0)
        self.assertEqual(payload["kind"], "slang")
        self.assertRegex(payload["meaning"], "(?i)\\bno\\b|nah")
        senses = " ".join(s["meaning"] for s in payload["other_senses"])
        self.assertRegex(senses, "(?i)not applicable")

    def test_w_and_l_are_curated(self) -> None:
        for term, word in (("W", "win"), ("L", "loss")):
            code, payload = self._decode_json(term)
            self.assertEqual(code, 0, term)
            self.assertEqual(payload["lexicon"], "slang", term)
            self.assertIn(word, payload["meaning"].lower(), term)
            self.assertTrue(payload["origin"], term)
            self.assertTrue(payload["age"], term)

    def test_silly_insult_pack(self) -> None:
        for term, first in (
            ("piddlefart", "piddlefart"),
            ("piddle-fart", "piddlefart"),
            ("fartknocker", "fartknocker"),
            ("nincompoop", "nincompoop"),
            ("fuddy-duddy", "fuddy-duddy"),
            ("fuddy duddy", "fuddy-duddy"),
            ("you absolute numpty", "numpty"),
        ):
            entry, source = trendy.lookup_lexicon(term)
            self.assertIsNotNone(entry, term)
            self.assertEqual(source, "slang", term)
            self.assertEqual(entry["terms"][0], first, term)
            self.assertIs(entry.get("wotd"), False, term)
            self.assertTrue(entry["origin"], term)

    def test_trends_limit_must_be_positive(self) -> None:
        import contextlib

        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            trendy.main(["trends", "--limit", "0"])

    def test_radar_status_paths_are_text(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            trendy.main(["radar", "status"])
        self.assertNotIn("{'", buf.getvalue())

    def test_script_mode_serve_and_live_import(self) -> None:
        """`python cli/trendy.py decode --live` must not crash with ModuleNotFoundError."""
        import os
        import subprocess
        import sys
        import tempfile
        from pathlib import Path

        script = Path(trendy.__file__).resolve()
        env = {k: v for k, v in os.environ.items() if "API_KEY" not in k}
        with tempfile.TemporaryDirectory() as cwd:
            proc = subprocess.run(
                [sys.executable, str(script), "decode", "florbix", "--live"],
                capture_output=True, text=True, cwd=cwd, env=env, timeout=30, check=False,
            )
        self.assertNotIn("ModuleNotFoundError", proc.stderr)
        self.assertIn("no API key", proc.stderr)
        self.assertEqual(proc.returncode, 2)

    def test_windows_codepage_output_is_utf8(self) -> None:
        import os
        import subprocess
        import sys
        from pathlib import Path

        script = Path(trendy.__file__).resolve()
        env = dict(os.environ, PYTHONIOENCODING="cp1252", PYTHONUTF8="0")
        proc = subprocess.run(
            [sys.executable, str(script), "trends", "--limit", "200"],
            capture_output=True, env=env, timeout=30, check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        proc.stdout.decode("utf-8")  # raises if not valid UTF-8


if __name__ == "__main__":
    unittest.main()
