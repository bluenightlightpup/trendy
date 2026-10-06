"""YouTube signals via public channel Atom feeds (no API key). Disabled by default.

Channel upload feeds are mostly ordinary video titles, not slang. When enabled,
only videos whose title mentions one of ``require_keywords`` are kept, and
sponsor / link lines are stripped from descriptions. Empty results are OK —
ingest continues with other sources.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

import httpx

from .base import BaseAdapter

# Public Atom feeds (channel uploads) — no key. Swap/extend in config later.
_DEFAULT_FEEDS = [
    # Veritasium / culture-adjacent science (stable public feed)
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA",  # Veritasium
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCY1kMZp36IQSyNx_9h4mpCg",  # Mark Rober
]

_DEFAULT_KEYWORDS = [
    "slang", "meme", "memes", "trend", "trending", "tiktok", "brainrot", "rizz",
    "gen z", "gen alpha", "viral",
]

_SPONSOR = re.compile(r"(https?://|www\.|sponsor|shout ?out to|use code|promo|patreon|merch)", re.I)


def clean_description(text: str) -> str:
    """Drop sponsor / link lines so ad copy never becomes a trend summary."""
    lines = [ln.strip() for ln in (text or "").splitlines()]
    kept = [ln for ln in lines if ln and not _SPONSOR.search(ln)]
    return " ".join(kept)


def title_matches(title: str, keywords: list[str]) -> bool:
    low = f" {title.lower()} "
    return any(re.search(rf"(?<![a-z0-9]){re.escape(k.lower())}(?![a-z0-9])", low) for k in keywords)


_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


class YouTubeAdapter(BaseAdapter):
    name = "youtube"
    mode = "live"

    def fetch(self) -> list[dict[str, Any]]:
        feeds = list(self.config.get("feeds") or _DEFAULT_FEEDS)
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/atom+xml, application/xml, text/xml, */*",
        }
        signals: list[dict[str, Any]] = []
        with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
            for feed_url in feeds:
                try:
                    resp = client.get(feed_url)
                    if resp.status_code >= 400:
                        continue
                    body = resp.text or ""
                    if "<entry" not in body:
                        continue
                    signals.extend(self._parse_feed(body, feed_url)[:3])
                except Exception:  # noqa: BLE001
                    continue
        return signals

    def _parse_feed(self, body: str, feed_url: str) -> list[dict[str, Any]]:
        root = ET.fromstring(body)
        out: list[dict[str, Any]] = []
        for entry in root.findall("atom:entry", _NS):
            title_el = entry.find("atom:title", _NS)
            title = (title_el.text or "").strip() if title_el is not None else ""
            video_id_el = entry.find("yt:videoId", _NS)
            video_id = (video_id_el.text or "").strip() if video_id_el is not None else ""
            link = None
            for link_el in entry.findall("atom:link", _NS):
                if link_el.get("rel") in (None, "alternate"):
                    link = link_el.get("href")
                    break
            summary_el = entry.find("media:group/media:description", _NS)
            if summary_el is None:
                summary_el = entry.find("atom:summary", _NS)
            text = clean_description(summary_el.text or "") if summary_el is not None else ""
            if not title:
                continue
            keywords = list(self.config.get("require_keywords") or _DEFAULT_KEYWORDS)
            if not title_matches(title, keywords):
                continue
            local_id = video_id or re.sub(r"\W+", "-", title.lower())[:40]
            out.append(
                self.make_signal(
                    local_id=local_id,
                    title=title,
                    text=text[:800],
                    url=link
                    or (f"https://www.youtube.com/watch?v={video_id}" if video_id else None),
                    world_hint="Internet culture",
                    tags=["youtube", "rss"],
                    metrics={"mentions": 25, "score": 25, "velocity": 0.15},
                    raw_refs={"feed": feed_url, "video_id": video_id},
                )
            )
        return out
