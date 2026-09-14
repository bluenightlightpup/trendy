"""Map Radar signals → Trend + slang entry candidates."""

from __future__ import annotations

import hashlib
import re
from typing import Any

from .heat import apply_heat

_WORLDS = {
    "TikTok",
    "Internet culture",
    "Abbreviations",
    "Gaming",
    "Dating",
    "School / campus",
    "Sports",
    "Music / fandom",
    "Work / tech",
    "Money",
}

# Common short tokens / English filler that are not slang candidates
_STOP = {
    "a", "an", "the", "and", "or", "but", "if", "to", "of", "in", "on", "for",
    "is", "it", "this", "that", "with", "from", "as", "at", "by", "be", "are",
    "was", "were", "will", "can", "do", "did", "does", "not", "no", "yes",
    "me", "my", "you", "your", "we", "our", "they", "their", "he", "she",
    "what", "why", "how", "when", "where", "who", "which", "eli5", "ootl",
    "nsq", "amp", "http", "https", "www", "com", "org", "reddit", "edit",
    "deleted", "removed", "title", "post", "like", "just", "im", "ive",
    "dont", "cant", "wont", "its", "thats", "theres", "about", "into",
    "than", "then", "also", "some", "any", "all", "more", "most", "very",
    "skill", "issue", "energy", "dinner", "girl", "touch", "grass", "still",
    "circulating", "group", "chats", "captions", "means", "problem", "game",
    "general", "internet", "outside", "reconnect", "reality", "insider",
    "caption", "shorthand", "playful", "often", "aspirational", "chaos",
    "about", "crushes", "fantasies", "possible", "spotted", "wild",
    "wikipedia", "portal", "current", "events", "video", "watch", "official",
    "new", "old", "get", "got", "has", "have", "had", "been", "being",
    "would", "could", "should", "please", "help", "need", "know", "someone",
    "something", "anything", "everyone", "people", "time", "year", "today",
}

_ALLCAPS = re.compile(r"\b([A-Z]{2,8})\b")
_QUOTED = re.compile(r"[\"'“”‘’]([^\"'“”‘’\n\r]{2,40})[\"'“”‘’]")
_WORD = re.compile(r"[A-Za-z][A-Za-z0-9'_-]{1,23}")
# Phrase-ish titles already short (good slang seeds)
_SHORT_TITLE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 '_/-]{1,32}$")


def _trend_id(title: str, source: str) -> str:
    digest = hashlib.sha1(f"{source}:{title.lower().strip()}".encode()).hexdigest()[:10]
    return f"r_{digest}"


def signal_to_trend(signal: dict[str, Any]) -> dict[str, Any] | None:
    title = (signal.get("title") or "").strip()
    if not title or len(title) < 3:
        return None
    # Skip pure seed rows that only duplicate curated catalog titles —
    # still useful as heat bumps via merge, so keep them.
    heat, lifecycle = apply_heat(signal)
    world = signal.get("world_hint") or "Internet culture"
    if world not in _WORLDS:
        world = "Internet culture"
    text = (signal.get("text") or "").strip()
    summary = text.split("\n")[0].strip() if text else title
    if len(summary) > 180:
        summary = summary[:177] + "…"
    url = signal.get("url")
    origin_bits = [
        f"Observed via Radar source `{signal.get('source')}`",
    ]
    if url:
        origin_bits.append(f"Source link: {url}")
    origin_bits.append(
        "This is an automatically ingested signal — origin details may be incomplete; "
        "Decode stays judgment-free and may refine later."
    )
    tags = list(signal.get("tags") or [])
    if "radar" not in tags:
        tags.append("radar")
    return {
        "id": _trend_id(title, str(signal.get("source") or "radar")),
        "title": title[:120],
        "summary": summary,
        "originStory": " ".join(origin_bits),
        "world": world,
        "heatScore": heat,
        "lifecycle": lifecycle,
        "tags": tags[:12],
        "radarSource": signal.get("source"),
        "radarUrl": url,
        "radarSignalId": signal.get("id"),
    }


def extract_slang_candidates(
    signal: dict[str, Any],
    *,
    min_len: int = 2,
    max_len: int = 24,
) -> list[dict[str, Any]]:
    """Heuristic slang/abbrev extraction — judgment-free placeholders, low confidence."""
    source = signal.get("source")
    # mock_seed mirrors curated slang; YouTube descriptions are noisy marketing copy
    if source in ("mock_seed", "youtube"):
        return []

    title = signal.get("title") or ""
    text = signal.get("text") or ""
    blob = f"{title}\n{text}"
    url = signal.get("url")

    terms: list[str] = []

    # Short whole-title phrases (e.g. "IYKYK", "touch grass") from discussion posts
    tstrip = title.strip()
    if (
        _SHORT_TITLE.match(tstrip)
        and 2 <= len(tstrip) <= 32
        and tstrip.lower() not in _STOP
        and not tstrip.lower().startswith("wikipedia:")
    ):
        # Prefer as a multi-word or abbrev candidate
        if " " in tstrip or tstrip.isupper() or len(tstrip) <= 12:
            terms.append(tstrip.lower())

    for m in _QUOTED.findall(blob):
        phrase = m.strip()
        if min_len <= len(phrase) <= max_len and phrase.lower() not in _STOP:
            if " " not in phrase or 1 <= phrase.count(" ") <= 3:
                terms.append(phrase.lower())

    for m in _ALLCAPS.findall(title + "\n" + text[:400]):
        low = m.lower()
        if low in _STOP:
            continue
        if min_len <= len(m) <= max_len:
            terms.append(low)

    # Single tokens only from title, and only if abbrev-ish (≤4) or contains digit/'
    for m in _WORD.findall(title):
        tok = m.lower().strip("_-")
        if tok in _STOP:
            continue
        if not (min_len <= len(tok) <= max_len):
            continue
        if len(tok) <= 4 or any(c.isdigit() or c in ("'", "_") for c in tok):
            terms.append(tok)

    seen: set[str] = set()
    uniq: list[str] = []
    for t in terms:
        if t not in seen and t not in _STOP:
            seen.add(t)
            uniq.append(t)

    out: list[dict[str, Any]] = []
    for term in uniq[:10]:
        origin = (
            f"Candidate spotted in {source} ingest"
            + (f" ({url})" if url else "")
            + ". Not a verified etymology — flagged low confidence for human/Decode review."
        )
        out.append(
            {
                "terms": [term],
                "short": f"Possible slang/abbrev spotted in the wild: “{term}”.",
                "explain": (
                    "Radar pulled this as a likely slang or abbreviation candidate from "
                    "public discussion. Meaning isn't confirmed yet — ask Decode with more "
                    "context, or wait for a curated update. No judgment either way."
                ),
                "origin": origin,
                "confidence": "low",
                "radarSource": source,
                "radarUrl": url,
            }
        )
    return out


def normalize_signals(
    signals: list[dict[str, Any]],
    slang_cfg: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cfg = slang_cfg or {}
    min_len = int(cfg.get("min_token_len", 2))
    max_len = int(cfg.get("max_token_len", 24))
    max_new = int(cfg.get("max_new_per_run", 40))

    trends: list[dict[str, Any]] = []
    slang: list[dict[str, Any]] = []
    for sig in signals:
        tr = signal_to_trend(sig)
        if tr:
            trends.append(tr)
        slang.extend(
            extract_slang_candidates(sig, min_len=min_len, max_len=max_len)
        )
    return trends, slang[:max_new]
