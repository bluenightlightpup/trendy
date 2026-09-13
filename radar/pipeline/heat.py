"""Heat score + lifecycle from velocity / mentions."""

from __future__ import annotations

from typing import Any


def score_heat(metrics: dict[str, Any] | None) -> float:
    m = metrics or {}
    mentions = float(m.get("mentions") or 0)
    score = float(m.get("score") or 0)
    comments = float(m.get("comments") or 0)
    velocity = float(m.get("velocity") or 0)

    # Soft normalize: Reddit scores often 0–5k; seed metrics are small.
    engagement = mentions + score + comments * 2.0
    base = min(0.95, engagement / (engagement + 200.0))
    # Velocity nudge (0–1 expected from seeds; Reddit may omit → 0)
    heat = min(1.0, max(0.05, base * 0.85 + min(1.0, max(0.0, velocity)) * 0.25))
    return round(heat, 3)


def lifecycle_from_heat(heat: float, metrics: dict[str, Any] | None = None) -> str:
    m = metrics or {}
    velocity = float(m.get("velocity") or 0)
    if heat >= 0.75 and velocity >= 0.35:
        return "rising"
    if heat >= 0.7:
        return "peaking"
    if heat >= 0.4:
        return "cooling"
    return "cooling"


def apply_heat(signal: dict[str, Any]) -> tuple[float, str]:
    heat = score_heat(signal.get("metrics"))
    life = lifecycle_from_heat(heat, signal.get("metrics"))
    return heat, life
