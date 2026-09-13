"""LIVE Reddit adapter — public JSON listings (no OAuth).

Uses Reddit's public `.json` endpoints with a polite User-Agent.
Tries www → old → api hosts. If all block/rate-limit, fails soft; ingest continues.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from .base import BaseAdapter

_HOSTS = (
    "https://www.reddit.com",
    "https://old.reddit.com",
    "https://api.reddit.com",
)


class RedditAdapter(BaseAdapter):
    name = "reddit"
    mode = "live"

    def fetch(self) -> list[dict[str, Any]]:
        subs = self.config.get("subreddits") or [
            "OutOfTheLoop",
            "explainlikeimfive",
            "NoStupidQuestions",
            "tiktokcringe",
        ]
        listing = self.config.get("listing", "hot")
        limit = int(self.config.get("limit", 25))
        interval = float(
            (self.global_config.get("rate_limits") or {}).get(
                "reddit_min_interval_seconds", 2
            )
        )

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }
        signals: list[dict[str, Any]] = []
        errors: list[str] = []

        with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
            for i, sub in enumerate(subs):
                if i:
                    time.sleep(interval)
                children = None
                last_err = None
                for host in _HOSTS:
                    url = f"{host}/r/{sub}/{listing}.json"
                    try:
                        resp = client.get(url, params={"limit": limit, "raw_json": 1})
                        if resp.status_code in (403, 429, 503):
                            last_err = f"r/{sub}@{host}: HTTP {resp.status_code}"
                            continue
                        resp.raise_for_status()
                        payload = resp.json()
                        children = (
                            (payload.get("data") or {}).get("children")
                            if isinstance(payload, dict)
                            else None
                        ) or []
                        break
                    except Exception as exc:  # noqa: BLE001
                        last_err = f"r/{sub}@{host}: {exc}"
                        continue
                if children is None:
                    if last_err:
                        errors.append(last_err)
                    continue

                for child in children:
                    data = (child or {}).get("data") or {}
                    if data.get("stickied"):
                        continue
                    post_id = data.get("id") or data.get("name")
                    title = data.get("title") or ""
                    if not post_id or not title:
                        continue
                    permalink = data.get("permalink") or ""
                    post_url = (
                        f"https://www.reddit.com{permalink}"
                        if permalink.startswith("/")
                        else (data.get("url") or None)
                    )
                    world = self._world_hint(sub, title, data.get("selftext") or "")
                    signals.append(
                        self.make_signal(
                            local_id=str(post_id),
                            title=title,
                            text=data.get("selftext") or "",
                            url=post_url,
                            world_hint=world,
                            tags=["reddit", f"r/{sub}", listing],
                            metrics={
                                "score": float(data.get("score") or 0),
                                "comments": float(data.get("num_comments") or 0),
                                "mentions": float(data.get("score") or 0)
                                + float(data.get("num_comments") or 0),
                            },
                            raw_refs={"subreddit": sub, "name": data.get("name")},
                        )
                    )

        if not signals and errors:
            raise RuntimeError("; ".join(errors[:8]))
        return signals

    @staticmethod
    def _world_hint(sub: str, title: str, text: str) -> str:
        blob = f"{sub} {title} {text}".lower()
        if any(k in blob for k in ("tiktok", "ig ", "instagram", "reel", "fyp")):
            return "TikTok"
        if any(k in blob for k in ("game", "gaming", "steam", "esport", "npc", "gg ")):
            return "Gaming"
        if any(
            k in blob for k in ("abbrev", "acronym", "stand for", "what does", "mean")
        ):
            return "Abbreviations"
        return "Internet culture"
