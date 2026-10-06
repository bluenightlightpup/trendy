"""Tests for Radar noise filters (merge drop_sources, YouTube keyword filter)."""

from __future__ import annotations

import unittest

from radar.pipeline.merge import merge_trends

try:
    from radar.adapters.youtube import clean_description, title_matches
except ImportError:  # httpx not installed
    clean_description = title_matches = None  # type: ignore[assignment]


class MergeDropSourcesTest(unittest.TestCase):
    def test_drop_sources_purges_existing_and_incoming(self) -> None:
        existing = [
            {"id": "t1", "title": "Rizz", "heatScore": 0.8},
            {"id": "r_1", "title": "Heating A Ball", "heatScore": 0.2, "radarSource": "youtube"},
            {"id": "r_2", "title": "Wikipedia: Portal:Current events", "heatScore": 0.3, "radarSource": "wikipedia"},
        ]
        incoming = [{"id": "r_3", "title": "Another video", "heatScore": 0.4, "radarSource": "youtube"}]
        merged, stats = merge_trends(existing, incoming, drop_sources=["youtube", "wikipedia"])
        self.assertEqual([t["title"] for t in merged], ["Rizz"])
        self.assertEqual(stats["total"], 1)


@unittest.skipIf(title_matches is None, "httpx not installed")
class YouTubeFilterTest(unittest.TestCase):
    def test_title_keywords_are_whole_words(self) -> None:
        kws = ["meme", "tiktok", "gen z"]
        self.assertTrue(title_matches("The TikTok trend explained", kws))
        self.assertTrue(title_matches("Why Gen Z says this", kws))
        self.assertFalse(title_matches("The Most Dangerous Escalator In Europe", kws))
        self.assertFalse(title_matches("Memento review", kws))

    def test_sponsor_lines_removed(self) -> None:
        text = "Great video about slang.\nShoutout to our sponsor! Try them: http://x.y\nUse code ABC"
        self.assertEqual(clean_description(text), "Great video about slang.")


if __name__ == "__main__":
    unittest.main()
