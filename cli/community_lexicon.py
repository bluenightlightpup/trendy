"""Community suggest → consensus → lexicon (stdlib only).

Used by the LAN Decode proxy. Suggestions append to a JSONL log; when enough
similar definitions agree on the same normalized term, upsert into
web/data/community-slang.json for the PWA to load.
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:  # package import (checkout `cli` or installed `trendy_cli`)
    from . import paths as _paths
except ImportError:  # pragma: no cover — imported as a top-level module
    import paths as _paths  # type: ignore[no-redef]

# Checkout: radar/out + web/data. Installed: ~/.trendy (TRENDY_HOME).
SUGGESTIONS_JSONL = _paths.suggestions_path()
COMMUNITY_SLANG_PATH = _paths.community_write_path()

# Product defaults (configurable constants)
CONSENSUS_THRESHOLD = 3
JACCARD_THRESHOLD = 0.45
MIN_MEANING_LEN = 12
MAX_TERM_LEN = 80
MAX_MEANING_LEN = 800
MAX_ORIGIN_LEN = 240
AGE_BANDS = ("Gen Alpha", "Gen Z", "Millennial", "Gen X+", "Mixed")


def canonical_age(value: Any) -> str:
    """Map optional suggest age to a band, or '' if missing/unknown.

    Unknown values are ignored so a bad age never rejects an otherwise valid suggest.
    """
    raw = strip_html(str(value or "")).strip()
    if not raw:
        return ""
    for band in AGE_BANDS:
        if raw.lower() == band.lower():
            return band
    return ""




def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_term(s: str) -> str:
    t = unicodedata.normalize("NFKC", str(s or "")).lower().strip()
    for a, b in {
        "‘": "'",
        "’": "'",
        "‚": "'",
        "‛": "'",
        "“": "",
        "”": "",
        "„": "",
        "‟": "",
        '"': "",
        "'": "",
    }.items():
        t = t.replace(a, b)
    t = re.sub(r"[^a-z0-9+]+", " ", t)
    return " ".join(t.split())


def strip_html(s: str) -> str:
    t = re.sub(r"<[^>]+>", " ", str(s or ""))
    t = (
        t.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    return re.sub(r"\s+", " ", t).strip()


def normalize_meaning(s: str) -> str:
    return normalize_term(strip_html(s))


def tokenize(s: str) -> set[str]:
    n = normalize_meaning(s)
    if not n:
        return set()
    return {tok for tok in n.split() if tok}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def meanings_similar(a: str, b: str, threshold: float = JACCARD_THRESHOLD) -> bool:
    """True if token Jaccard ≥ threshold OR one normalized meaning contains the other."""
    na = normalize_meaning(a)
    nb = normalize_meaning(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    # Containment after normalize (explainable + boring)
    if len(na) >= 8 and len(nb) >= 8 and (na in nb or nb in na):
        return True
    return jaccard(tokenize(a), tokenize(b)) >= threshold


def validate_suggest(payload: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    """Return (clean_record, error_code)."""
    if not isinstance(payload, dict):
        return None, "invalid_json"
    term = strip_html(str(payload.get("term") or "")).strip()
    meaning = strip_html(str(payload.get("meaning") or "")).strip()
    origin_raw = payload.get("origin")
    origin = strip_html(str(origin_raw or "")).strip() if origin_raw is not None else ""
    client_id = strip_html(str(payload.get("clientId") or "")).strip()[:64]

    if not term:
        return None, "term_required"
    if len(term) > MAX_TERM_LEN:
        return None, "term_too_long"
    if not meaning:
        return None, "meaning_required"
    if len(meaning) < MIN_MEANING_LEN:
        return None, "meaning_too_short"
    if len(meaning) > MAX_MEANING_LEN:
        return None, "meaning_too_long"
    if len(origin) > MAX_ORIGIN_LEN:
        origin = origin[:MAX_ORIGIN_LEN]

    norm = normalize_term(term)
    if not norm:
        return None, "term_required"

    record = {
        "term": term,
        "termNorm": norm,
        "meaning": meaning,
        "origin": origin,
        "clientId": client_id or "anonymous",
        "ts": utc_now_iso(),
    }
    age = canonical_age(payload.get("age"))
    if age:
        record["age"] = age
    return record, None


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def append_suggestion(record: dict[str, Any], path: Path | None = None) -> None:
    path = path or SUGGESTIONS_JSONL
    ensure_parent(path)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def load_suggestions(path: Path | None = None) -> list[dict[str, Any]]:
    path = path or SUGGESTIONS_JSONL
    if not path.is_file():
        return []
    out: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict) and obj.get("termNorm") and obj.get("meaning"):
                out.append(obj)
    return out


def load_community(path: Path | None = None) -> dict[str, Any]:
    path = path or COMMUNITY_SLANG_PATH
    if not path.is_file():
        return {"entries": [], "meta": {"source": "community"}}
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {"entries": [], "meta": {"source": "community"}}
        if not isinstance(data.get("entries"), list):
            data["entries"] = []
        return data
    except (json.JSONDecodeError, OSError):
        return {"entries": [], "meta": {"source": "community"}}


def save_community(data: dict[str, Any], path: Path | None = None) -> None:
    path = path or COMMUNITY_SLANG_PATH
    ensure_parent(path)
    payload = {
        "entries": data.get("entries") or [],
        "meta": data.get("meta")
        or {
            "source": "community",
            "note": "Promoted by suggest consensus on the LAN proxy.",
        },
    }
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def cluster_similar(meanings: list[str]) -> list[list[int]]:
    """Greedy clusters of meaning indices that are pairwise-similar to the seed."""
    n = len(meanings)
    used = [False] * n
    clusters: list[list[int]] = []
    for i in range(n):
        if used[i]:
            continue
        group = [i]
        used[i] = True
        for j in range(i + 1, n):
            if used[j]:
                continue
            if meanings_similar(meanings[i], meanings[j]):
                group.append(j)
                used[j] = True
        clusters.append(group)
    return clusters


def pick_canonical_meaning(records: list[dict[str, Any]]) -> str:
    """Prefer the longest meaning in the winning cluster (more informative)."""
    best = ""
    for r in records:
        m = str(r.get("meaning") or "").strip()
        if len(m) > len(best):
            best = m
    return best


def pick_origin(records: list[dict[str, Any]]) -> str:
    for r in records:
        o = str(r.get("origin") or "").strip()
        if o:
            return o
    return "Community consensus on Trendy"


def consensus_for_term(
    term_norm: str,
    suggestions: list[dict[str, Any]] | None = None,
    threshold: int = CONSENSUS_THRESHOLD,
) -> dict[str, Any] | None:
    """If ≥ threshold similar meanings for term_norm, return a slang-shaped entry."""
    suggestions = suggestions if suggestions is not None else load_suggestions()
    rows = [s for s in suggestions if s.get("termNorm") == term_norm]
    if len(rows) < threshold:
        return None
    meanings = [str(r.get("meaning") or "") for r in rows]
    clusters = cluster_similar(meanings)
    # largest cluster wins
    clusters.sort(key=len, reverse=True)
    top = clusters[0]
    if len(top) < threshold:
        return None
    winners = [rows[i] for i in top]
    meaning = pick_canonical_meaning(winners)
    origin_user = pick_origin(winners)
    # Prefer display term from most recent winner
    display = str(winners[-1].get("term") or term_norm).strip() or term_norm
    conf = "high" if len(top) >= threshold + 2 else "medium"
    entry: dict[str, Any] = {
        "terms": [display, term_norm] if display.lower() != term_norm else [display],
        "short": meaning,
        "explain": meaning,
        "origin": (
            f"Community consensus on Trendy"
            + (f" — {origin_user}" if origin_user and origin_user != "Community consensus on Trendy" else "")
        ),
        "worlds": ["Internet culture"],
        "source": "community",
        "confidence": conf,
        "updated_at": utc_now_iso(),
        "consensusCount": len(top),
    }
    ages = [canonical_age(r.get("age")) for r in winners]
    ages = [a for a in ages if a]
    if ages:
        # Majority band if people bothered to send one; else the first valid band.
        entry["age"] = max(set(ages), key=ages.count)
    return entry


def upsert_community_entry(entry: dict[str, Any], path: Path | None = None) -> dict[str, Any]:
    path = path or COMMUNITY_SLANG_PATH
    data = load_community(path)
    entries: list[dict[str, Any]] = list(data.get("entries") or [])
    norms = {normalize_term(t) for t in (entry.get("terms") or []) if t}
    norms.discard("")

    def entry_norms(e: dict[str, Any]) -> set[str]:
        return {normalize_term(t) for t in (e.get("terms") or []) if t} - {""}

    replaced = False
    for i, existing in enumerate(entries):
        if entry_norms(existing) & norms:
            entries[i] = entry
            replaced = True
            break
    if not replaced:
        entries.append(entry)
    data["entries"] = entries
    data["meta"] = {
        "source": "community",
        "note": "Promoted by suggest consensus on the LAN proxy.",
        "updated_at": utc_now_iso(),
    }
    save_community(data, path)
    return data


def run_consensus_after_suggest(
    term_norm: str,
    threshold: int = CONSENSUS_THRESHOLD,
) -> dict[str, Any]:
    """Append already done; check consensus and maybe promote. Returns status dict."""
    suggestions = load_suggestions()
    for_term = [s for s in suggestions if s.get("termNorm") == term_norm]
    entry = consensus_for_term(term_norm, suggestions, threshold=threshold)
    promoted = False
    if entry:
        upsert_community_entry(entry)
        promoted = True
    return {
        "ok": True,
        "termNorm": term_norm,
        "suggestionCount": len(for_term),
        "threshold": threshold,
        "promoted": promoted,
        "entry": entry if promoted else None,
    }


def suggest_stats(term: str) -> dict[str, Any]:
    term_norm = normalize_term(term)
    suggestions = load_suggestions()
    rows = [s for s in suggestions if s.get("termNorm") == term_norm] if term_norm else []
    meanings = [str(r.get("meaning") or "") for r in rows]
    clusters = cluster_similar(meanings) if meanings else []
    largest = max((len(c) for c in clusters), default=0)
    community = load_community()
    in_lexicon = False
    if term_norm:
        for e in community.get("entries") or []:
            for t in e.get("terms") or []:
                if normalize_term(t) == term_norm:
                    in_lexicon = True
                    break
    return {
        "term": term,
        "termNorm": term_norm,
        "suggestionCount": len(rows),
        "largestSimilarCluster": largest,
        "threshold": CONSENSUS_THRESHOLD,
        "inCommunityLexicon": in_lexicon,
        "jaccardThreshold": JACCARD_THRESHOLD,
    }


def handle_suggest(payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    """Validate, append, run consensus. Returns (http_code, json_body)."""
    record, err = validate_suggest(payload)
    if err or record is None:
        return 400, {"error": err or "invalid", "message": _err_message(err or "invalid")}
    append_suggestion(record)
    status = run_consensus_after_suggest(record["termNorm"])
    return 200, {
        "ok": True,
        "saved": True,
        "termNorm": record["termNorm"],
        "suggestionCount": status["suggestionCount"],
        "threshold": status["threshold"],
        "promoted": status["promoted"],
        "message": (
            "Thanks — promoted to community lexicon."
            if status["promoted"]
            else "Thanks — if enough people agree, it’ll join the lexicon."
        ),
    }


def _err_message(code: str) -> str:
    return {
        "term_required": "Please include a term.",
        "meaning_required": "Please include a meaning.",
        "meaning_too_short": f"Meaning needs at least {MIN_MEANING_LEN} characters.",
        "meaning_too_long": "Meaning is too long.",
        "term_too_long": "Term is too long.",
        "invalid_json": "Invalid JSON body.",
    }.get(code, "Could not save suggestion.")
