"""LIVE always-on seed adapter — ensures a baseline catalog if other sources fail."""

from __future__ import annotations

from typing import Any

from .base import BaseAdapter

# Lightweight evergreen seeds (not invented origins-as-facts for slang merge;
# used as trend candidates that merge will dedupe against existing PWA data).
_SEEDS = [
    {
        "local_id": "seed-rizz",
        "title": "Rizz",
        "text": "Charisma / flirtation game — still circulating in group chats and captions.",
        "world_hint": "Internet culture",
        "tags": ["slang", "gen-z", "seed"],
        "metrics": {"mentions": 80, "score": 80, "velocity": 0.4},
    },
    {
        "local_id": "seed-skill-issue",
        "title": "Skill issue",
        "text": "Gaming roast that means the problem is you, not the game — now general internet.",
        "world_hint": "Gaming",
        "tags": ["gaming", "slang", "seed"],
        "metrics": {"mentions": 70, "score": 70, "velocity": 0.35},
    },
    {
        "local_id": "seed-touch-grass",
        "title": "Touch grass",
        "text": "Log off and go outside / reconnect with reality.",
        "world_hint": "Internet culture",
        "tags": ["advice", "meme", "seed"],
        "metrics": {"mentions": 60, "score": 60, "velocity": 0.3},
    },
    {
        "local_id": "seed-iykyk",
        "title": "IYKYK",
        "text": "If You Know, You Know — insider caption shorthand.",
        "world_hint": "Abbreviations",
        "tags": ["abbrev", "seed"],
        "metrics": {"mentions": 55, "score": 55, "velocity": 0.25},
    },
    {
        "local_id": "seed-delulu",
        "title": "Delulu",
        "text": "Playful 'delusional' — often aspirational chaos about crushes or fantasies.",
        "world_hint": "Internet culture",
        "tags": ["slang", "tiktok", "seed"],
        "metrics": {"mentions": 75, "score": 75, "velocity": 0.45},
    },
]


class MockSeedAdapter(BaseAdapter):
    name = "mock_seed"
    mode = "live"

    def fetch(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for seed in _SEEDS:
            out.append(
                self.make_signal(
                    local_id=seed["local_id"],
                    title=seed["title"],
                    text=seed["text"],
                    url=None,
                    world_hint=seed["world_hint"],
                    tags=list(seed["tags"]),
                    metrics=dict(seed["metrics"]),
                    raw_refs={"seed": True},
                )
            )
        return out
