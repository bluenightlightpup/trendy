"""STUB Instagram adapter — interface + TODO for Meta Graph / official access.

Ethics / ToS:
- Do NOT scrape Instagram or use credential stuffing.
- Prefer Meta Graph API / official partner products when the owner adds keys.
"""

from __future__ import annotations

from typing import Any

from .base import BaseAdapter


class InstagramAdapter(BaseAdapter):
    name = "instagram"
    mode = "stub"

    def fetch(self) -> list[dict[str, Any]]:
        raise NotImplementedError(
            "Instagram LIVE requires Meta Graph API / official partner access. "
            "Set META_ACCESS_TOKEN (env) and flip config sources.instagram "
            "to enabled+mode:live after ToS review."
        )

    def todo_notes(self) -> str:
        return (
            "TODO: Use Instagram Graph / Hashtag Search (where permitted) or "
            "Business Discovery; normalize captions/hashtags → RadarSignal; "
            "keys via env only; no ToS-violating scrapers."
        )
