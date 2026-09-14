"""Merge normalized candidates into web/data trends.json + slang.json."""

from __future__ import annotations

import re
from typing import Any


def _norm_title(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _term_key(terms: list[str]) -> frozenset[str]:
    return frozenset(t.strip().lower() for t in (terms or []) if t and t.strip())


def merge_trends(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    *,
    max_items: int = 250,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Dedupe by normalized title; bump heat on match; append new radar rows."""
    by_title: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for item in existing:
        key = _norm_title(str(item.get("title") or ""))
        if not key:
            continue
        if key not in by_title:
            order.append(key)
            by_title[key] = dict(item)

    added = 0
    updated = 0
    for cand in incoming:
        key = _norm_title(str(cand.get("title") or ""))
        if not key:
            continue
        if key in by_title:
            cur = by_title[key]
            # Preserve curated originStory unless it looks auto-ingested
            new_heat = float(cand.get("heatScore") or 0)
            old_heat = float(cur.get("heatScore") or 0)
            old_life = str(cur.get("lifecycle") or "").lower()
            # Don't let noisy ingest immediately resurrect fading/dormant
            # museum pieces — require a clear jump past cooling territory.
            if old_life in ("fading", "dormant") and new_heat < 0.7:
                new_heat = min(new_heat, old_heat)
            elif old_life == "cooling" and new_heat < 0.65:
                new_heat = min(new_heat, max(old_heat, new_heat * 0.85 + old_heat * 0.15))
            if new_heat > old_heat:
                cur["heatScore"] = new_heat
                cur["lifecycle"] = cand.get("lifecycle") or cur.get("lifecycle")
                updated += 1
            for stamp in ("peakedAt", "lastSeenAt"):
                if cand.get(stamp) and not cur.get(stamp):
                    cur[stamp] = cand[stamp]
            # Merge tags
            tags = list(cur.get("tags") or [])
            for t in cand.get("tags") or []:
                if t not in tags:
                    tags.append(t)
            cur["tags"] = tags[:16]
            if cand.get("radarUrl") and not cur.get("radarUrl"):
                cur["radarUrl"] = cand.get("radarUrl")
            by_title[key] = cur
        else:
            by_title[key] = dict(cand)
            order.append(key)
            added += 1

    merged = [by_title[k] for k in order if k in by_title]
    # Keep higher heat first for PWA default sort friendliness, but preserve
    # curated items preference by not dropping early IDs aggressively.
    merged.sort(key=lambda x: float(x.get("heatScore") or 0), reverse=True)
    if len(merged) > max_items:
        # Prefer keeping non-radar-only curated (ids like t01) then top heat
        curated = [x for x in merged if str(x.get("id", "")).startswith("t")]
        rest = [x for x in merged if not str(x.get("id", "")).startswith("t")]
        keep = curated[: max(40, max_items // 2)]
        room = max_items - len(keep)
        keep.extend(rest[:room])
        merged = keep
        merged.sort(key=lambda x: float(x.get("heatScore") or 0), reverse=True)

    return merged, {"added": added, "updated": updated, "total": len(merged)}


def merge_slang(
    existing_doc: dict[str, Any],
    incoming: list[dict[str, Any]],
    *,
    max_entries: int = 500,
) -> tuple[dict[str, Any], dict[str, int]]:
    """Merge slang candidates; dedupe by overlapping terms."""
    doc = dict(existing_doc) if existing_doc else {}
    entries = [dict(e) for e in (doc.get("entries") or [])]
    fallback = doc.get("fallback")

    term_index: dict[str, int] = {}
    for i, entry in enumerate(entries):
        for t in entry.get("terms") or []:
            term_index[str(t).lower()] = i

    added = 0
    updated = 0
    for cand in incoming:
        terms = [str(t).lower() for t in (cand.get("terms") or []) if t]
        if not terms:
            continue
        hit_idx = None
        for t in terms:
            if t in term_index:
                hit_idx = term_index[t]
                break
        if hit_idx is not None:
            # Already known — optionally attach radar meta without rewriting curated copy
            cur = entries[hit_idx]
            if cand.get("radarUrl") and not cur.get("radarUrl"):
                cur["radarUrl"] = cand.get("radarUrl")
            if "confidence" not in cur and cand.get("confidence"):
                # don't downgrade curated; only set if somehow missing
                pass
            entries[hit_idx] = cur
            updated += 1
            continue

        # New low-confidence entry
        new_entry = {
            "terms": terms,
            "short": cand.get("short") or f"Possible slang: {terms[0]}",
            "explain": cand.get("explain")
            or "Spotted by Trend Radar; meaning not confirmed yet.",
            "origin": cand.get("origin")
            or "Radar candidate — not a verified etymology.",
            "confidence": cand.get("confidence") or "low",
        }
        if cand.get("radarSource"):
            new_entry["radarSource"] = cand.get("radarSource")
        if cand.get("radarUrl"):
            new_entry["radarUrl"] = cand.get("radarUrl")
        entries.append(new_entry)
        idx = len(entries) - 1
        for t in terms:
            term_index[t] = idx
        added += 1

    if len(entries) > max_entries:
        # Keep original curated first chunk, then newest radar additions trimmed
        # Heuristic: entries without confidence field are curated
        curated = [e for e in entries if "confidence" not in e]
        low = [e for e in entries if "confidence" in e]
        room = max(0, max_entries - len(curated))
        entries = curated + low[:room]

    out = {"entries": entries}
    if fallback is not None:
        out["fallback"] = fallback
    else:
        out["fallback"] = {
            "short": "I don't have a solid match for that yet.",
            "explain": (
                "I couldn't confidently decode that one. Try a different spelling, "
                "a shorter phrase, or drop a bit more context. No judgment — slang "
                "moves fast and I'm still learning with you."
            ),
            "origin": None,
        }
    return out, {"added": added, "updated": updated, "total": len(entries)}
