"""Word of the Day: one curated, 13+-safe slang word per local calendar date.

Deterministic and offline. The same algorithm lives in ``web/wotd.js`` (PWA + website) and
``App/Core/WordOfTheDay.swift`` (iOS); ``Tests/Fixtures/wotd-golden.json`` holds golden
vectors every implementation's tests must match. Spec: ``docs/word-of-the-day.md``.

  pool  = slang.json entries with a meaning + origin, not Abbreve rows, not Radar candidates,
          not opted out (``wotd: false`` / ``mature: true``) and clean for a 13+ audience
  order = pool stable-sorted by key (first term, lowercased, code-point order)
  days  = date - 2026-01-01; cycle = days // N; slot = days % N
  perm  = Fisher-Yates over range(N) with mulberry32(seed(cycle)); if perm[0] is the previous
          cycle's last word, swap perm[0] and perm[1]
  word  = order[perm[slot]]; an override (date -> term) wins when the term is in the pool.
"""

from __future__ import annotations

import datetime as _dt
import re
from typing import Any

EPOCH = _dt.date(2026, 1, 1)
SEED_BASE = 20260101
_GOLDEN = 0x9E3779B1
_MASK = 0xFFFFFFFF
APP_URL = "https://bluenightlightpup.github.io/trendy/app/"

UNSAFE_WORDS = (
    "sex", "sexual", "sexually", "sexy", "hookup", "hookups", "hook-up", "nsfw", "porn", "nude", "nudes",
    "naked", "horny", "orgasm", "kink", "kinky", "fetish", "onlyfans", "drug", "drugs", "weed", "cannabis",
    "marijuana", "stoned", "drunk", "alcohol", "booze", "beer", "vape", "vaping", "cocaine", "opium",
    "slur", "slurs", "fuck", "fucking", "shit", "bitch", "cunt", "dick", "piss", "asshole", "goddamn",
    "wtf", "stfu", "lmfao",
)
# Rows App/Core/ContentSafety.swift rewrites for sexual meanings.
BLOCKED_TERMS = ("dtf", "nnn", "edging", "fwb")
_UNSAFE_RE = re.compile(
    r"(^|[^a-z0-9])(" + "|".join(re.escape(w) for w in UNSAFE_WORDS) + r")($|[^a-z0-9])"
)
_MASKED_RE = re.compile(r"[a-z]\*\*")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

AGE_BANDS = ("Gen Alpha", "Gen Z", "Millennial", "Gen X+", "Mixed")
AGE_GLOSS = {
    "Gen Alpha": "mostly kids/tweens right now",
    "Gen Z": "mostly teens and early twenties",
    "Millennial": "mostly late twenties through early forties",
    "Gen X+": "mostly forties and older",
    "Mixed": "used across generations",
}


def _s(value: Any) -> str:
    return value if isinstance(value, str) else ""


def normalize_term(text: Any) -> str:
    """Lowercase, straighten curly apostrophes, collapse whitespace (sort keys, override match)."""
    t = _s(text).lower()
    for ch in ("\u2018", "\u2019", "\u02bc"):
        t = t.replace(ch, "'")
    return " ".join(t.split())


def terms_of(entry: Any) -> list[str]:
    terms = entry.get("terms") if isinstance(entry, dict) else None
    if isinstance(terms, str):
        return [terms] if terms.strip() else []
    if isinstance(terms, list):
        return [t for t in terms if isinstance(t, str) and t.strip()]
    return []


def _safety_text(entry: dict[str, Any]) -> str:
    parts = terms_of(entry) + [
        _s(entry.get(k)) for k in ("short", "explain", "origin", "wotdExample", "example")
    ]
    return " \n ".join(parts).lower()


def is_safe(entry: dict[str, Any]) -> bool:
    if any(normalize_term(t) in BLOCKED_TERMS for t in terms_of(entry)):
        return False
    text = _safety_text(entry)
    return not _UNSAFE_RE.search(text) and not _MASKED_RE.search(text)


def is_eligible(entry: Any) -> bool:
    if not isinstance(entry, dict) or not terms_of(entry):
        return False
    if not _s(entry.get("short")).strip() or not _s(entry.get("origin")).strip():
        return False
    if _s(entry.get("source")).lower() == "abbreve":
        return False
    if _s(entry.get("confidence")).lower() == "low" or entry.get("radarSource"):
        return False
    if entry.get("wotd") is False or entry.get("mature") is True:
        return False
    return is_safe(entry)


def _entries(slang: Any) -> list[Any]:
    if isinstance(slang, list):
        return slang
    if isinstance(slang, dict) and isinstance(slang.get("entries"), list):
        return slang["entries"]
    return []


def build_pool(slang: Any) -> list[dict[str, Any]]:
    """Eligible entries, stable-sorted by first term (Python str order = code points)."""
    rows = [
        (normalize_term(terms_of(e)[0]), i, e)
        for i, e in enumerate(_entries(slang))
        if is_eligible(e)
    ]
    rows.sort(key=lambda r: (r[0], r[1]))
    return [r[2] for r in rows]


def parse_date(text: Any) -> _dt.date:
    """Strict YYYY-MM-DD → date. Raises ValueError."""
    s = _s(text)
    if not _DATE_RE.match(s):
        raise ValueError(f"date must be YYYY-MM-DD, got {text!r}")
    try:
        return _dt.date.fromisoformat(s)
    except ValueError as exc:
        raise ValueError(f"not a real calendar date: {s}") from exc


def is_valid_date(text: Any) -> bool:
    try:
        parse_date(text)
    except ValueError:
        return False
    return True


def local_date_string(now: _dt.date | None = None) -> str:
    """The local calendar date (the machine's time zone) as YYYY-MM-DD."""
    return (now or _dt.date.today()).isoformat()


def add_days(date_str: str, n: int) -> str:
    return (parse_date(date_str) + _dt.timedelta(days=n)).isoformat()


def days_since_epoch(date_str: str) -> int:
    return parse_date(date_str).toordinal() - EPOCH.toordinal()


def _rng(seed: int):
    state = seed & _MASK

    def _imul(a: int, b: int) -> int:
        return (a * b) & _MASK

    def next_u32() -> int:
        nonlocal state
        state = (state + 0x6D2B79F5) & _MASK
        t = state
        t = _imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & _MASK)) & _MASK
        return (t ^ (t >> 14)) & _MASK

    return next_u32


def cycle_seed(cycle: int) -> int:
    return (SEED_BASE ^ ((cycle * _GOLDEN) & _MASK)) & _MASK


def _shuffled(n: int, cycle: int) -> list[int]:
    perm = list(range(n))
    nxt = _rng(cycle_seed(cycle))
    for i in range(n - 1, 0, -1):
        j = nxt() % (i + 1)
        perm[i], perm[j] = perm[j], perm[i]
    return perm


def cycle_order(n: int, cycle: int) -> list[int]:
    """Permutation of pool indexes for one cycle (no back-to-back repeat at the boundary)."""
    perm = _shuffled(n, cycle)
    if n > 2:
        prev_last = _shuffled(n, cycle - 1)[n - 1]
        if perm[0] == prev_last:
            perm[0], perm[1] = perm[1], prev_last
    return perm


def pick_index(n: int, date_str: str) -> dict[str, int] | None:
    if n <= 0:
        return None
    days = days_since_epoch(date_str)
    cycle, slot = divmod(days, n)  # floor semantics, also before the epoch
    return {"cycle": cycle, "slot": slot, "index": cycle_order(n, cycle)[slot]}


def overrides_of(doc: Any) -> dict[str, str]:
    raw = doc
    if isinstance(doc, dict) and isinstance(doc.get("overrides"), dict):
        raw = doc["overrides"]
    if not isinstance(raw, dict):
        return {}
    return {
        k: v for k, v in raw.items() if is_valid_date(k) and isinstance(v, str) and v.strip()
    }


def display_term(term: str) -> str:
    t = _s(term).strip()
    return t.upper() if re.fullmatch(r"[a-z]", t) else t


def word_for_date(
    slang: Any,
    date_str: str | None = None,
    overrides: Any = None,
    pool: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """{date, term, entry, override, cycle, slot, index, pool_size} or None for an empty pool."""
    pool = pool if pool is not None else build_pool(slang)
    if not pool:
        return None
    date = date_str or local_date_string()
    parse_date(date)
    wanted = overrides_of(overrides).get(date)
    if wanted:
        needle = normalize_term(wanted)
        for i, entry in enumerate(pool):
            hit = next((t for t in terms_of(entry) if normalize_term(t) == needle), None)
            if hit:
                return {
                    "date": date, "term": display_term(hit), "entry": entry, "override": True,
                    "cycle": None, "slot": None, "index": i, "pool_size": len(pool),
                }
    p = pick_index(len(pool), date)
    assert p is not None
    entry = pool[p["index"]]
    return {
        "date": date, "term": display_term(terms_of(entry)[0]), "entry": entry, "override": False,
        "cycle": p["cycle"], "slot": p["slot"], "index": p["index"], "pool_size": len(pool),
    }


def format_age(age: Any) -> str:
    raw = _s(age).strip().lower()
    band = next((b for b in AGE_BANDS if b.lower() == raw), "")
    return f"{band} — {AGE_GLOSS[band]}" if band else ""


def _loose(text: Any) -> str:
    t = _s(text).lower()
    for ch in ("\u2018", "\u2019", "'"):
        t = t.replace(ch, "")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", t).split())


def match_trend(entry: dict[str, Any], trends: Any) -> dict[str, Any] | None:
    """Hottest trend whose title (or the part before " (") matches one of the entry's terms."""
    keys = {k for k in (_loose(t) for t in terms_of(entry)) if k}
    best = None
    for t in trends if isinstance(trends, list) else []:
        if not isinstance(t, dict):
            continue
        title = _s(t.get("title"))
        if _loose(title) in keys or _loose(title.split("(")[0]) in keys:
            if best is None or _heat(t) > _heat(best):
                best = t
    return best


def _heat(trend: dict[str, Any]) -> float:
    try:
        return float(trend.get("heatScore") or 0)
    except (TypeError, ValueError):
        return 0.0


def details(word: dict[str, Any] | None, trends: Any = None) -> dict[str, Any] | None:
    """Card payload shared by `trendy word --json` and the MCP tool."""
    if not word:
        return None
    e = word["entry"]
    trend = match_trend(e, trends)
    example = _s(e.get("wotdExample")).strip() or _s(e.get("example")).strip()
    age = format_age(e.get("age"))
    term = word["term"]
    return {
        "date": word["date"],
        "term": term,
        "meaning": _s(e.get("short")).strip(),
        "explain": _s(e.get("explain")).strip(),
        "example": example or None,
        "origin": _s(e.get("origin")).strip(),
        "age": age or None,
        "worlds": [w for w in (e.get("worlds") or []) if isinstance(w, str)],
        "override": bool(word.get("override")),
        "trend": (
            {
                "id": _s(trend.get("id")),
                "title": _s(trend.get("title")),
                "lifecycle": _s(trend.get("lifecycle")) or None,
                "heat": round(min(1.0, max(0.0, _heat(trend))) * 100),
            }
            if trend
            else None
        ),
        "decode_more": f"trendy decode {_shell_quote(term)}",
        "pool_size": word["pool_size"],
    }


def _shell_quote(term: str) -> str:
    return term if re.fullmatch(r"[A-Za-z0-9_+.-]+", term) else '"' + term.replace('"', '\\"') + '"'


def share_text(d: dict[str, Any], url: str = APP_URL) -> str:
    meaning = " ".join(_s(d.get("meaning")).split())
    if len(meaning) > 140:
        meaning = meaning[:139].rstrip() + "…"
    return f"Trendy word of the day: {d['term']} — {meaning} {url}"
