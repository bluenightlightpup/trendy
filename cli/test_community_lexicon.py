"""Tests for community suggest → consensus."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from cli import community_lexicon as cl


class CommunityLexiconTest(unittest.TestCase):
    def test_normalize_term(self) -> None:
        self.assertEqual(cl.normalize_term("  Nah I'd Win! "), "nah id win")

    def test_meanings_similar_jaccard(self) -> None:
        a = "A playful way to say someone is being dramatic online"
        b = "Playful way of saying someone is being dramatic online"
        self.assertTrue(cl.meanings_similar(a, b))

    def test_meanings_similar_containment(self) -> None:
        a = "short vibe word for cool"
        b = "short vibe word for cool used on tiktok"
        self.assertTrue(cl.meanings_similar(a, b))

    def test_meanings_dissimilar(self) -> None:
        self.assertFalse(
            cl.meanings_similar(
                "a greeting between friends",
                "a type of sandwich with tuna",
            )
        )

    def test_validate_rejects_short(self) -> None:
        rec, err = cl.validate_suggest({"term": "xyz", "meaning": "too short"})
        self.assertIsNone(rec)
        self.assertEqual(err, "meaning_too_short")

    def test_validate_strips_html(self) -> None:
        rec, err = cl.validate_suggest(
            {
                "term": "<b>glorp</b>",
                "meaning": "A silly nonsense word friends use in group chat",
            }
        )
        self.assertIsNone(err)
        assert rec is not None
        self.assertEqual(rec["term"], "glorp")
        self.assertNotIn("<", rec["meaning"])

    def test_consensus_promotes_at_threshold(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            jsonl = tmp_path / "suggestions.jsonl"
            community = tmp_path / "community-slang.json"
            # Monkeypatch paths via explicit args
            meaning = "A silly nonsense word friends use in group chat"
            for i in range(3):
                rec, err = cl.validate_suggest(
                    {
                        "term": "glorp",
                        "meaning": meaning if i < 2 else meaning + " casually",
                        "clientId": f"c{i}",
                    }
                )
                self.assertIsNone(err)
                assert rec is not None
                cl.append_suggestion(rec, path=jsonl)

            suggestions = cl.load_suggestions(jsonl)
            entry = cl.consensus_for_term("glorp", suggestions, threshold=3)
            self.assertIsNotNone(entry)
            assert entry is not None
            self.assertEqual(entry["source"], "community")
            self.assertIn("Community consensus", entry["origin"])
            cl.upsert_community_entry(entry, path=community)
            data = cl.load_community(community)
            self.assertEqual(len(data["entries"]), 1)
            self.assertEqual(data["entries"][0]["source"], "community")

    def test_handle_suggest_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            # Point module paths at temp (patch constants)
            old_jsonl, old_comm = cl.SUGGESTIONS_JSONL, cl.COMMUNITY_SLANG_PATH
            cl.SUGGESTIONS_JSONL = tmp_path / "suggestions.jsonl"
            cl.COMMUNITY_SLANG_PATH = tmp_path / "community-slang.json"
            try:
                meaning = "A playful nickname for a chaotic group chat friend"
                for i in range(3):
                    code, body = cl.handle_suggest(
                        {
                            "term": "zib",
                            "meaning": meaning,
                            "clientId": f"u{i}",
                        }
                    )
                    self.assertEqual(code, 200)
                    self.assertTrue(body.get("ok"))
                self.assertTrue(body.get("promoted"))
                data = json.loads(cl.COMMUNITY_SLANG_PATH.read_text(encoding="utf-8"))
                self.assertTrue(any("zib" in (e.get("terms") or []) for e in data["entries"]))
            finally:
                cl.SUGGESTIONS_JSONL = old_jsonl
                cl.COMMUNITY_SLANG_PATH = old_comm


if __name__ == "__main__":
    unittest.main()
