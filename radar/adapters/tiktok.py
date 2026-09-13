"""STUB TikTok adapter — interface + TODO for official Research API / partner feed.

Ethics / ToS:
- Do NOT credential-stuff or scrape TikTok in violation of ToS.
- Prefer TikTok Research API, Commercial Content API, or partner feeds
  when the owner adds keys via environment variables.
"""

from __future__ import annotations

from typing import Any

from .base import BaseAdapter


class TikTokAdapter(BaseAdapter):
    name = "tiktok"
    mode = "stub"

    def fetch(self) -> list[dict[str, Any]]:
        # Never called while mode=stub / enabled=false; kept for future LIVE flip.
        raise NotImplementedError(
            "TikTok LIVE requires official Research API / partner access. "
            "Set TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET (or partner token) "
            "and flip config sources.tiktok to enabled+mode:live after ToS review."
        )

    def todo_notes(self) -> str:
        return (
            "TODO: Implement OAuth client-credentials against TikTok Research API; "
            "map trending hashtags/sounds → RadarSignal; store keys only in env/CI secrets; "
            "never commit credentials; no unofficial scraping."
        )
