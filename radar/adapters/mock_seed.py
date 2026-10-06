"""LIVE always-on seed adapter — ensures a baseline catalog if other sources fail."""

from __future__ import annotations

from typing import Any

from .base import BaseAdapter

# Evergreen seeds across ALL Explore worlds/niches (deduped on merge by title).
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
    {
        "local_id": "seed-67",
        "title": "67 (six seven)",
        "text": "Gen Alpha / TikTok brainrot catchphrase — yelled for the bit.",
        "world_hint": "TikTok",
        "tags": ["brainrot", "tiktok", "seed"],
        "metrics": {"mentions": 95, "score": 95, "velocity": 0.55},
    },
    {
        "local_id": "seed-aura-farming",
        "title": "Aura farming",
        "text": "Doing something cool on purpose to collect social points.",
        "world_hint": "TikTok",
        "tags": ["slang", "flex", "seed"],
        "metrics": {"mentions": 85, "score": 85, "velocity": 0.5},
    },
    {
        "local_id": "seed-ootl",
        "title": "OOTL",
        "text": "Out Of The Loop — asking for a judgment-free catch-up.",
        "world_hint": "Abbreviations",
        "tags": ["abbrev", "catch-up", "seed"],
        "metrics": {"mentions": 50, "score": 50, "velocity": 0.3},
    },
    {
        "local_id": "seed-situationship",
        "title": "Situationship",
        "text": "More than friends, less than a defined relationship.",
        "world_hint": "Dating",
        "tags": ["dating", "relationship", "seed"],
        "metrics": {"mentions": 78, "score": 78, "velocity": 0.42},
    },
    {
        "local_id": "seed-soft-launch",
        "title": "Soft launch",
        "text": "Hinting at a partner online without a full face reveal.",
        "world_hint": "Dating",
        "tags": ["dating", "social", "seed"],
        "metrics": {"mentions": 72, "score": 72, "velocity": 0.4},
    },
    {
        "local_id": "seed-midterm-arc",
        "title": "Midterm arc",
        "text": "Campus joke framing exam week as chaotic character development.",
        "world_hint": "School / campus",
        "tags": ["campus", "exams", "seed"],
        "metrics": {"mentions": 68, "score": 68, "velocity": 0.38},
    },
    {
        "local_id": "seed-w",
        "title": "W",
        "text": "A win — literal sports result or metaphorical internet W.",
        "world_hint": "Sports",
        "tags": ["sports", "slang", "seed"],
        "metrics": {"mentions": 74, "score": 74, "velocity": 0.36},
    },
    {
        "local_id": "seed-stan",
        "title": "Stan",
        "text": "An extremely dedicated fan — noun or verb.",
        "world_hint": "Music / fandom",
        "tags": ["fandom", "slang", "seed"],
        "metrics": {"mentions": 77, "score": 77, "velocity": 0.37},
    },
    {
        "local_id": "seed-bias",
        "title": "Bias",
        "text": "Your favorite member in a group — K-pop fandom staple.",
        "world_hint": "Music / fandom",
        "tags": ["fandom", "kpop", "seed"],
        "metrics": {"mentions": 70, "score": 70, "velocity": 0.34},
    },
    {
        "local_id": "seed-circle-back",
        "title": "Circle back",
        "text": "Corporate speak for 'later' — sometimes never.",
        "world_hint": "Work / tech",
        "tags": ["work", "corp-speak", "seed"],
        "metrics": {"mentions": 65, "score": 65, "velocity": 0.32},
    },
    {
        "local_id": "seed-lgtm",
        "title": "LGTM",
        "text": "Looks Good To Me — code review approval shorthand.",
        "world_hint": "Work / tech",
        "tags": ["work", "tech", "abbrev", "seed"],
        "metrics": {"mentions": 58, "score": 58, "velocity": 0.28},
    },
    {
        "local_id": "seed-bag",
        "title": "Bag",
        "text": "Money / winning financially — 'secure the bag.'",
        "world_hint": "Money",
        "tags": ["money", "slang", "seed"],
        "metrics": {"mentions": 73, "score": 73, "velocity": 0.39},
    },
    {
        "local_id": "seed-rug-pull",
        "title": "Rug pull",
        "text": "Scam abandonment of a project — crypto caution meme now used broadly.",
        "world_hint": "Money",
        "tags": ["money", "crypto", "caution", "seed"],
        "metrics": {"mentions": 66, "score": 66, "velocity": 0.33},
    },
    {
        "local_id": "seed-clutch",
        "title": "Clutch",
        "text": "Winning despite terrible odds — gaming highlight energy.",
        "world_hint": "Gaming",
        "tags": ["gaming", "praise", "seed"],
        "metrics": {"mentions": 64, "score": 64, "velocity": 0.31},
    },
    {
        "local_id": "seed-locked-in",
        "title": "Locked in",
        "text": "Fully focused — athlete / study / grind mode.",
        "world_hint": "Sports",
        "tags": ["sports", "focus", "seed"],
        "metrics": {"mentions": 69, "score": 69, "velocity": 0.35},
    },
]


class MockSeedAdapter(BaseAdapter):
    name = "mock_seed"
    mode = "seed"

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
