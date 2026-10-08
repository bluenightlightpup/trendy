#!/usr/bin/env python3
"""Trendy CLI — decode slang and memes, list hot trends, check Trend Radar.

Usage (installed: `trendy ...`; from a checkout: `python3 cli/trendy.py ...`):
  trendy decode 67
  trendy decode "nah id win" --json
  trendy decode "niche phrase" --live          # needs OPENAI_API_KEY / ANTHROPIC_API_KEY
  trendy trends --min-heat 0.7 --limit 20
  trendy word [--date YYYY-MM-DD] [--json]     # word of the day (alias: wotd)
  trendy radar status
  trendy radar run [-- ...flags for run_ingest.py]   # git checkout only
  trendy mcp                                   # local stdio MCP server
  trendy serve [--host 127.0.0.1] [--port 8787] [--token ...]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

if not __package__:
    # Script mode (`python cli/trendy.py ...`): make the package importable so
    # sibling modules (live_decode, mcp_server, ...) load the same way they do
    # under `python -m cli` or an installed `trendy` console script.
    _PKG = Path(__file__).resolve().parent
    if str(_PKG.parent) not in sys.path:
        sys.path.insert(0, str(_PKG.parent))
    __package__ = _PKG.name  # noqa: A001

from . import __version__, paths  # noqa: E402

ROOT = paths.REPO_ROOT
DATA = paths.data_dir()
SLANG_PATH = DATA / "slang.json"
ABBREVE_PATH = DATA / "abbreve.json"
COMMUNITY_PATH = paths.community_read_path()
TRENDS_PATH = DATA / "trends.json"
WOTD_PATH = DATA / "word-of-the-day.json"
LAST_RUN_PATH = paths.last_run_path()
INGEST_SCRIPT = paths.ingest_script()


def _utf8_stdio() -> None:
    """Force UTF-8 output so curly quotes / em dashes survive Windows consoles and pipes."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass


def _load_json(path: Path, default: Any) -> Any:
    if not path.is_file():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _norm(s: str) -> str:
    """Normalize for lexicon match: case, apostrophes, punctuation, spaces."""
    import re
    import unicodedata

    t = unicodedata.normalize("NFKC", str(s or "")).lower().strip()
    # curly apostrophes/quotes → strip like the PWA decoder
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



AGE_BANDS = ("Gen Alpha", "Gen Z", "Millennial", "Gen X+", "Mixed")
AGE_GLOSS = {
    "Gen Alpha": "mostly kids/tweens right now",
    "Gen Z": "mostly teens and early twenties",
    "Millennial": "mostly late twenties through early forties",
    "Gen X+": "mostly forties and older",
    "Mixed": "used across generations",
}


def format_age(entry: dict[str, Any] | None) -> str:
    """Return 'Band — gloss' when entry.age is a known band, else ''."""
    if not isinstance(entry, dict):
        return ""
    raw = str(entry.get("age") or "").strip()
    if not raw:
        return ""
    band = next((b for b in AGE_BANDS if b.lower() == raw.lower()), "")
    if not band:
        return ""
    gloss = AGE_GLOSS.get(band, "")
    return f"{band} — {gloss}" if gloss else band


def _entry_terms(entry: dict[str, Any]) -> list[str]:
    terms = entry.get("terms") or []
    if isinstance(terms, str):
        return [terms]
    return [str(t) for t in terms]


def is_abbreviation(entry: dict[str, Any] | None, lexicon: str | None = None) -> bool:
    """Abbreve-imported rows (texting acronyms) — matched only on an exact query."""
    if lexicon == "abbreve":
        return True
    return isinstance(entry, dict) and str(entry.get("source") or "").lower() == "abbreve"


def _lexicons() -> list[tuple[str, list[dict[str, Any]]]]:
    out: list[tuple[str, list[dict[str, Any]]]] = []
    for label, path in (("slang", SLANG_PATH), ("community", COMMUNITY_PATH), ("abbreve", ABBREVE_PATH)):
        data = _load_json(path, {"entries": []})
        entries = data.get("entries") if isinstance(data, dict) else None
        out.append((label, [e for e in (entries or []) if isinstance(e, dict)]))
    return out


def lookup_lexicon(term: str) -> tuple[dict[str, Any] | None, str | None]:
    """Return (entry, source_label) from slang.json, community, then abbreve.json.

    Prefers exact matches, then the longest multi-word phrase inside the query,
    then single curated tokens. Texting abbreviations (abbreve rows) only match
    when they ARE the whole query, so ordinary words inside a sentence
    ("i was so tired", "ok so") never decode as acronyms.
    """
    needle = _norm(term)
    if not needle:
        return None, None
    needle_toks = needle.split()

    def score_against(entry_term: str, abbrev: bool) -> int:
        t = _norm(entry_term)
        if not t:
            return 0
        if t == needle:
            return 100000 + len(t.split()) * 1000 + len(t)
        if abbrev:
            return 0
        t_toks = t.split()
        if len(t_toks) >= 2 and f" {t} " in f" {needle} ":
            # contiguous phrase inside query
            return 90000 + len(t_toks) * 1000 + len(t)
        if len(t_toks) >= 2 and all(tok in needle_toks for tok in t_toks):
            return 80000 + len(t_toks) * 1000 + len(t)
        if len(t_toks) == 1 and t in needle_toks and len(t) >= 2:
            return (15000 if len(needle_toks) >= 2 else 60000) + len(t)
        return 0

    best: tuple[int, dict[str, Any] | None, str | None] = (0, None, None)
    for label, entries in _lexicons():
        for entry in entries:
            abbrev = is_abbreviation(entry, label)
            for t in _entry_terms(entry):
                sc = score_against(t, abbrev)
                if sc <= 0:
                    continue
                if sc > best[0]:
                    best = (sc, entry, label)
                elif sc == best[0] and label == "community" and best[2] == "abbreve":
                    # curated slang wins ties; community beats abbreve
                    best = (sc, entry, label)

    if best[1] is None:
        return None, None
    return best[1], best[2]


def other_senses(term: str, primary: dict[str, Any] | None) -> list[dict[str, str]]:
    """Exact-match abbreviation readings that differ from the primary answer (na → N/A)."""
    needle = _norm(term)
    if not needle:
        return []
    primary_short = _norm(str((primary or {}).get("short") or ""))
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for label, entries in _lexicons():
        for entry in entries:
            if entry is primary or not is_abbreviation(entry, label):
                continue
            if not any(_norm(t) == needle for t in _entry_terms(entry)):
                continue
            short = str(entry.get("short") or "").strip()
            key = _norm(short)
            if not short or key == primary_short or key in seen:
                continue
            seen.add(key)
            out.append({"meaning": short, "kind": "abbreviation"})
    return out


def entry_kind(entry: dict[str, Any] | None, lexicon: str | None) -> str:
    """Human label for what kind of answer this is."""
    if is_abbreviation(entry, lexicon):
        return "texting abbreviation"
    worlds = [str(w).lower() for w in ((entry or {}).get("worlds") or [])]
    if "abbreviations" in worlds:
        return "texting abbreviation"
    return "slang"


def decode_payload(term: str) -> dict[str, Any]:
    """Lexicon decode as a plain dict (shared by `decode --json` and MCP)."""
    text = str(term or "").strip()
    entry, source = lookup_lexicon(text)
    if entry is None:
        return {
            "term": text,
            "found": False,
            "meaning": None,
            "explain": None,
            "origin": None,
            "age": None,
            "kind": None,
            "lexicon": None,
            "other_senses": [],
        }
    return {
        "term": text,
        "found": True,
        "terms": _entry_terms(entry),
        "meaning": str(entry.get("short") or "").strip(),
        "explain": str(entry.get("explain") or "").strip(),
        "origin": str(entry.get("origin") or "").strip(),
        "age": format_age(entry) or None,
        "kind": entry_kind(entry, source),
        "lexicon": source,
        "other_senses": other_senses(text, entry),
    }


def _print_json(obj: Any) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def cmd_decode(args: argparse.Namespace) -> int:
    term = args.term
    as_json = bool(getattr(args, "json", False))

    if getattr(args, "live", False):
        from .live_decode import live_decode, resolve_provider

        if resolve_provider() is None:
            print(
                "no API key for --live. Set OPENAI_API_KEY or ANTHROPIC_API_KEY "
                "(or TRENDY_* variants).",
                file=sys.stderr,
            )
            return 2
        try:
            result = live_decode(term, new_here=True)
        except Exception as e:  # noqa: BLE001
            print(f"live decode failed: {e}", file=sys.stderr)
            return 2
        if as_json:
            _print_json({"term": term, "found": True, "live": True, **result})
            return 0
        print(f"{term}  [live:{result.get('provider')}]")
        print(f"short:   {result.get('meaning', '')}")
        print(f"explain: {result.get('explain', '')}")
        print(f"origin:  {result.get('origin', '')}")
        print(f"confidence: {result.get('confidence', '')}")
        return 0

    payload = decode_payload(term)
    if as_json:
        _print_json(payload)
        return 0 if payload["found"] else 1
    if not payload["found"]:
        print(f"no lexicon hit for: {term}")
        print(
            "(Lexicon miss. Retry with --live if an API key is set, "
            "or use the PWA Decode tab / `trendy serve`.)",
            file=sys.stderr,
        )
        return 1

    terms = payload.get("terms") or []
    label = terms[0] if terms else term
    tag = "community" if payload["lexicon"] == "community" else payload["kind"]
    print(f"{label}  [{tag}]")
    for key, name in (("meaning", "short"), ("explain", "explain"), ("origin", "origin"), ("age", "age")):
        value = payload.get(key)
        if value:
            print(f"{name + ':':<8} {value}")
    for sense in payload.get("other_senses") or []:
        print(f"also:    {sense['meaning']} ({sense['kind']})")
    return 0


def word_payload(date: str | None = None) -> dict[str, Any] | None:
    """Word of the Day card for a local date (default: today on this machine). Raises ValueError."""
    from . import wotd

    day = date if date is not None else wotd.local_date_string()
    wotd.parse_date(day)
    slang = _load_json(SLANG_PATH, {"entries": []})
    overrides = _load_json(WOTD_PATH, {})
    word = wotd.word_for_date(slang, day, overrides=overrides)
    if word is None:
        return None
    trends = _load_json(TRENDS_PATH, [])
    out = wotd.details(word, trends)
    yesterday = wotd.word_for_date(slang, wotd.add_days(day, -1), overrides=overrides)
    out["yesterday"] = yesterday["term"] if yesterday else None
    out["share"] = wotd.share_text(out)
    return out


def cmd_word(args: argparse.Namespace) -> int:
    try:
        payload = word_payload(args.date)
    except ValueError as exc:
        print(f"trendy word: {exc}", file=sys.stderr)
        return 2
    if payload is None:
        print("trendy word: no eligible words in the lexicon", file=sys.stderr)
        return 2
    if args.json:
        _print_json(payload)
        return 0
    print(f"Word of the day · {payload['date']}" + ("  (hand-picked)" if payload["override"] else ""))
    print(f"{payload['term']}  [slang]")
    rows = (
        ("meaning", payload.get("meaning")),
        ("explain", payload.get("explain")),
        ("example", payload.get("example")),
        ("origin", payload.get("origin")),
        ("age", payload.get("age")),
    )
    for name, value in rows:
        if value:
            print(f"{name + ':':<8} {value}")
    trend = payload.get("trend")
    if trend:
        life = (trend.get("lifecycle") or "active").capitalize()
        print(f"{'trend:':<8} {trend['title']} · {life} · heat {trend['heat']}")
    if payload.get("yesterday"):
        print(f"{'before:':<8} yesterday was {payload['yesterday']}")
    print(f"{'more:':<8} {payload['decode_more']}")
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    from .live_decode import run_serve

    return run_serve(
        host=args.host,
        port=int(args.port),
        token=args.token,
        allow_origins=args.allow_origin,
    )


def trends_rows(min_heat: float = 0.0, limit: int = 20, world: str | None = None) -> list[dict[str, Any]]:
    trends = _load_json(TRENDS_PATH, [])
    if not isinstance(trends, list):
        raise ValueError("trends.json is not a list")
    world_s = (world or "").strip().lower()
    rows: list[dict[str, Any]] = []
    for t in trends:
        if not isinstance(t, dict):
            continue
        heat = float(t.get("heatScore") or 0)
        if heat < min_heat:
            continue
        if world_s and str(t.get("world") or "").lower() != world_s:
            continue
        rows.append(t)
    rows.sort(key=lambda x: float(x.get("heatScore") or 0), reverse=True)
    return rows[:limit]


def cmd_trends(args: argparse.Namespace) -> int:
    try:
        filtered = trends_rows(float(args.min_heat), int(args.limit), args.world)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.json:
        _print_json(
            [
                {
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "summary": t.get("summary"),
                    "world": t.get("world"),
                    "heat": float(t.get("heatScore") or 0),
                    "lifecycle": t.get("lifecycle"),
                    "age": format_age(t) or None,
                }
                for t in filtered
            ]
        )
        return 0

    if not filtered:
        print("no trends matched filters")
        return 0

    width = len(str(len(filtered)))
    for i, t in enumerate(filtered, 1):
        heat = float(t.get("heatScore") or 0)
        title = t.get("title") or t.get("id") or "?"
        world_s = t.get("world") or "?"
        life = t.get("lifecycle") or "?"
        print(f"{i:>{width}}. [{heat:.2f}] {title}  ({world_s} · {life})")
        summary = (t.get("summary") or "").strip()
        if summary and args.verbose:
            print(f"{'':>{width}}  {summary}")
    return 0


def _short(text: str, limit: int = 140) -> str:
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def cmd_radar_status(args: argparse.Namespace) -> int:
    if not LAST_RUN_PATH.is_file():
        print(
            "no last-run summary yet (radar/out/last-run.json missing).\n"
            "Run from a git checkout: trendy radar run"
        )
        return 0

    data = _load_json(LAST_RUN_PATH, {})
    if getattr(args, "json", False):
        _print_json(data)
        return 0

    ts = data.get("timestamp") or "?"
    signals = data.get("signals", "?")
    print(f"last run: {ts}" + ("" if paths.is_checkout() else "  (snapshot bundled with this install)"))
    print(f"signals:  {signals}")

    adapters = data.get("adapters") or []
    seed_signals = 0
    if adapters:
        print("adapters:")
        for a in adapters:
            if not isinstance(a, dict):
                continue
            src = a.get("source") or "?"
            count = a.get("signal_count", 0) or 0
            mode = a.get("mode") or "?"
            if src == "mock_seed" or mode == "seed":
                seed_signals += int(count)
            if a.get("skipped"):
                flag = "skip"
            elif a.get("ok"):
                flag = "ok"
            else:
                flag = "fail"
            print(f"  - {src}: {flag} (mode={mode}, signals={count})")
            err = a.get("error")
            if err and not a.get("ok"):
                print(f"      error: {_short(err)}")
    if seed_signals and isinstance(signals, int) and signals:
        print(f"note:     {seed_signals} of {signals} signals came from the built-in seed list")

    trends = data.get("trends") or {}
    slang = data.get("slang") or {}
    if trends or slang:
        print(
            f"catalog:  trends={trends.get('total', '?')} "
            f"slang_entries={slang.get('total', '?')}"
        )
    path_map = data.get("paths") or {}
    if not paths.is_checkout():
        print(f"data:     {DATA}")
    elif isinstance(path_map, dict) and path_map:
        print("paths:    " + ", ".join(f"{k}={v}" for k, v in path_map.items()))
    return 0


def cmd_mcp(_args: argparse.Namespace) -> int:
    """Local stdio MCP. Nothing is written to stdout except JSON-RPC."""
    from .mcp_server import serve_stdio

    return serve_stdio()


def cmd_radar_run(args: argparse.Namespace) -> int:
    if INGEST_SCRIPT is None:
        print(
            "radar run needs a git checkout of github.com/bluenightlightpup/trendy "
            "(radar/run_ingest.py is not part of the installed package).",
            file=sys.stderr,
        )
        return 2
    extra = list(args.ingest_args or [])
    cmd = [sys.executable, str(INGEST_SCRIPT), *extra]
    print(f"running: {' '.join(cmd)}", flush=True)
    proc = subprocess.run(cmd, cwd=str(ROOT))
    return int(proc.returncode)


def _positive_int(value: str) -> int:
    try:
        n = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"invalid int value: {value!r}") from exc
    if n < 1:
        raise argparse.ArgumentTypeError("must be >= 1")
    return n


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="trendy",
        description="Trendy — decode slang and memes, list hot trends, check Trend Radar (local).",
        epilog="Exit codes: 0 ok, 1 no lexicon match (decode), 2 usage or runtime error.",
    )
    parser.add_argument("--version", action="version", version=f"trendy {__version__}")
    sub = parser.add_subparsers(dest="command", required=True, metavar="command")

    p_decode = sub.add_parser("decode", help="Explain a slang term, meme, or abbreviation")
    p_decode.add_argument("term", help="Term or phrase to look up")
    p_decode.add_argument(
        "--live",
        action="store_true",
        help="Ask a live model (needs OPENAI_API_KEY or ANTHROPIC_API_KEY) instead of the lexicon",
    )
    p_decode.add_argument("--json", action="store_true", help="Print a JSON object")
    p_decode.set_defaults(func=cmd_decode)

    p_word = sub.add_parser(
        "word",
        help="Word of the day: one curated slang word per local date",
        aliases=["wotd"],
    )
    p_word.add_argument(
        "--date",
        default=None,
        metavar="YYYY-MM-DD",
        help="Local calendar date (default: today on this machine)",
    )
    p_word.add_argument("--json", action="store_true", help="Print a JSON object")
    p_word.set_defaults(func=cmd_word)

    p_trends = sub.add_parser("trends", help="List hot trends, highest heat first")
    p_trends.add_argument("--min-heat", type=float, default=0.0, help="Minimum heat 0–1 (default: 0)")
    p_trends.add_argument("--limit", type=_positive_int, default=20, help="Max rows, >= 1 (default: 20)")
    p_trends.add_argument("--world", default=None, help="Filter by world, e.g. TikTok")
    p_trends.add_argument("-v", "--verbose", action="store_true", help="Include summary lines")
    p_trends.add_argument("--json", action="store_true", help="Print a JSON array")
    p_trends.set_defaults(func=cmd_trends)

    p_radar = sub.add_parser("radar", help="Trend Radar status / run ingest")
    radar_sub = p_radar.add_subparsers(dest="radar_cmd", required=True, metavar="radar_command")
    p_status = radar_sub.add_parser("status", help="Show the last ingest summary")
    p_status.add_argument("--json", action="store_true", help="Print the raw summary JSON")
    p_status.set_defaults(func=cmd_radar_status)
    p_run = radar_sub.add_parser(
        "run",
        help="Run radar/run_ingest.py (git checkout only; pass flags after --)",
    )
    p_run.add_argument(
        "ingest_args",
        nargs=argparse.REMAINDER,
        help="Flags for run_ingest.py (use -- before flags, e.g. radar run -- --config ...)",
    )
    p_run.set_defaults(func=cmd_radar_run)

    p_mcp = sub.add_parser(
        "mcp",
        help="Run the local stdio MCP server (read-only tools for AI agents)",
    )
    p_mcp.set_defaults(func=cmd_mcp)

    p_serve = sub.add_parser(
        "serve",
        help="Local Decode proxy for the PWA (live model on lexicon misses)",
        aliases=["decode-proxy"],
    )
    p_serve.add_argument(
        "--host",
        default="127.0.0.1",
        help="Bind address (default 127.0.0.1; use 0.0.0.0 for LAN, which requires a token)",
    )
    p_serve.add_argument("--port", type=int, default=8787, help="Port (default 8787)")
    p_serve.add_argument(
        "--token",
        default=None,
        help="Shared secret clients must send (default: TRENDY_PROXY_TOKEN env var)",
    )
    p_serve.add_argument(
        "--allow-origin",
        action="append",
        default=None,
        metavar="ORIGIN",
        help="Extra browser origin allowed by CORS (repeatable; default: localhost and private-LAN origins)",
    )
    p_serve.set_defaults(func=cmd_serve)

    return parser


def main(argv: list[str] | None = None) -> int:
    _utf8_stdio()
    parser = build_parser()
    args = parser.parse_args(argv)
    # argparse.REMAINDER may leave a leading '--'
    if getattr(args, "ingest_args", None):
        if args.ingest_args and args.ingest_args[0] == "--":
            args.ingest_args = args.ingest_args[1:]
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
