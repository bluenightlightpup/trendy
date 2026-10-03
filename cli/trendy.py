#!/usr/bin/env python3
"""Trendy CLI spike (Phase 4 / T0020).

Usage (from repo root):
  python cli/trendy.py decode 67
  python cli/trendy.py decode "niche phrase" --live
  python cli/trendy.py serve [--host 0.0.0.0] [--port 8787]
  python cli/trendy.py trends --min-heat 0.7 --limit 20
  python cli/trendy.py radar status
  python cli/trendy.py radar run [-- …flags passed to run_ingest.py]
  python cli/trendy.py mcp

Also: python -m cli <command> ...
MCP (stdio, read-only): python -m cli.mcp_server
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

# Repo root: parent of cli/
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "data"
SLANG_PATH = DATA / "slang.json"
ABBREVE_PATH = DATA / "abbreve.json"
COMMUNITY_PATH = DATA / "community-slang.json"
TRENDS_PATH = DATA / "trends.json"
LAST_RUN_PATH = ROOT / "radar" / "out" / "last-run.json"
INGEST_SCRIPT = ROOT / "radar" / "run_ingest.py"


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


def lookup_lexicon(term: str) -> tuple[dict[str, Any] | None, str | None]:
    """Return (entry, source_label) from slang.json then abbreve.json.

    Prefers longest multi-word phrase matches over single-token hits.
    """
    needle = _norm(term)
    if not needle:
        return None, None
    needle_toks = [x for x in needle.split() if x]

    def score_against(entry_term: str) -> int:
        t = _norm(entry_term)
        if not t:
            return 0
        t_toks = t.split()
        if t == needle:
            return 100000 + len(t_toks) * 1000 + len(t)
        if len(t_toks) >= 2 and t in needle:
            # contiguous phrase inside query
            return 90000 + len(t_toks) * 1000 + len(t)
        if t_toks and all(tok in needle_toks for tok in t_toks):
            base = 80000 if len(t_toks) >= 2 else (20000 if len(needle_toks) >= 2 else 70000)
            return base + len(t_toks) * 1000 + len(t)
        if len(t_toks) == 1 and t in needle_toks:
            return (15000 if len(needle_toks) >= 2 else 60000) + len(t)
        return 0

    best: tuple[int, dict[str, Any] | None, str | None] = (0, None, None)

    slang = _load_json(SLANG_PATH, {"entries": []})
    for entry in slang.get("entries") or []:
        if not isinstance(entry, dict):
            continue
        for t in _entry_terms(entry):
            sc = score_against(t)
            if sc > best[0]:
                best = (sc, entry, "slang")

    community = _load_json(COMMUNITY_PATH, {"entries": []})
    for entry in community.get("entries") or []:
        if not isinstance(entry, dict):
            continue
        for t in _entry_terms(entry):
            sc = score_against(t)
            # curated slang wins ties; community beats abbreve
            if sc > best[0] or (sc == best[0] and best[2] == "abbreve"):
                best = (sc, entry, "community")

    abbreve = _load_json(ABBREVE_PATH, {"entries": []})
    for entry in abbreve.get("entries") or []:
        if not isinstance(entry, dict):
            continue
        for t in _entry_terms(entry):
            sc = score_against(t)
            # slang/community win ties
            if sc > best[0]:
                best = (sc, entry, "abbreve")

    if best[1] is None:
        return None, None
    return best[1], best[2]


def cmd_decode(args: argparse.Namespace) -> int:
    term = args.term
    use_live = bool(getattr(args, "live", False))

    if use_live:
        from cli.live_decode import live_decode, resolve_provider

        if resolve_provider() is None:
            print(
                "no API key for --live. Set OPENAI_API_KEY or ANTHROPIC_API_KEY "
                "(or TRENDY_* variants).",
                file=sys.stderr,
            )
            return 1
        try:
            result = live_decode(term, new_here=True)
        except Exception as e:  # noqa: BLE001
            print(f"live decode failed: {e}", file=sys.stderr)
            return 1
        print(f"{term}  [live:{result.get('provider')}]")
        print(f"short:   {result.get('meaning', '')}")
        print(f"explain: {result.get('explain', '')}")
        print(f"origin:  {result.get('origin', '')}")
        print(f"confidence: {result.get('confidence', '')}")
        return 0

    entry, source = lookup_lexicon(term)
    if entry is None:
        print(f"no lexicon hit for: {term}")
        print(
            "(Lexicon miss. Retry with --live if an API key is set, "
            "or use the PWA Decode tab / `python cli/trendy.py serve`.)"
        )
        return 0

    terms = _entry_terms(entry)
    label = terms[0] if terms else term
    short = (entry.get("short") or "").strip()
    explain = (entry.get("explain") or "").strip()
    origin = (entry.get("origin") or "").strip()

    print(f"{label}" + (f"  [{source}]" if source else ""))
    if short:
        print(f"short:   {short}")
    if explain:
        print(f"explain: {explain}")
    if origin:
        print(f"origin:  {origin}")
    age_line = format_age(entry)
    if age_line:
        print(f"age:     {age_line}")
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    from cli.live_decode import run_serve

    return run_serve(host=args.host, port=int(args.port))


def cmd_trends(args: argparse.Namespace) -> int:
    trends = _load_json(TRENDS_PATH, [])
    if not isinstance(trends, list):
        print("trends.json is not a list", file=sys.stderr)
        return 1

    min_heat = float(args.min_heat)
    limit = int(args.limit)
    world = args.world

    filtered: list[dict[str, Any]] = []
    for t in trends:
        if not isinstance(t, dict):
            continue
        heat = float(t.get("heatScore") or 0)
        if heat < min_heat:
            continue
        if world:
            tw = str(t.get("world") or "")
            if tw.lower() != world.lower():
                continue
        filtered.append(t)

    filtered.sort(key=lambda x: float(x.get("heatScore") or 0), reverse=True)
    filtered = filtered[:limit]

    if not filtered:
        print("no trends matched filters")
        return 0

    for i, t in enumerate(filtered, 1):
        heat = float(t.get("heatScore") or 0)
        title = t.get("title") or t.get("id") or "?"
        world_s = t.get("world") or "?"
        life = t.get("lifecycle") or "?"
        print(f"{i:2d}. [{heat:.2f}] {title}  ({world_s} · {life})")
        summary = (t.get("summary") or "").strip()
        if summary and args.verbose:
            print(f"    {summary}")
    return 0


def cmd_radar_status(_args: argparse.Namespace) -> int:
    if not LAST_RUN_PATH.is_file():
        print(
            f"no last-run summary yet ({LAST_RUN_PATH.relative_to(ROOT)} missing).\n"
            "Run: python cli/trendy.py radar run"
        )
        return 0

    data = _load_json(LAST_RUN_PATH, {})
    ts = data.get("timestamp") or "?"
    signals = data.get("signals", "?")
    print(f"last run: {ts}")
    print(f"signals:  {signals}")

    adapters = data.get("adapters") or []
    if adapters:
        print("adapters:")
        for a in adapters:
            if not isinstance(a, dict):
                continue
            src = a.get("source") or "?"
            ok = a.get("ok")
            skipped = a.get("skipped")
            count = a.get("signal_count", 0)
            mode = a.get("mode") or "?"
            if skipped:
                flag = "skip"
            elif ok:
                flag = "ok"
            else:
                flag = "fail"
            print(f"  - {src}: {flag} (mode={mode}, signals={count})")
            err = a.get("error")
            if err and not ok:
                print(f"      error: {err}")

    trends = data.get("trends") or {}
    slang = data.get("slang") or {}
    if trends or slang:
        print(
            f"catalog: trends={trends.get('total', '?')} "
            f"slang_entries={slang.get('total', '?')}"
        )
    paths = data.get("paths") or {}
    if paths:
        print(f"paths:   {paths}")
    return 0


def cmd_mcp(_args: argparse.Namespace) -> int:
    """Local stdio MCP. Nothing is written to stdout except JSON-RPC."""
    root = str(ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    from cli.mcp_server import serve_stdio

    return serve_stdio()


def cmd_radar_run(args: argparse.Namespace) -> int:
    if not INGEST_SCRIPT.is_file():
        print(f"missing ingest script: {INGEST_SCRIPT}", file=sys.stderr)
        return 1
    extra = list(args.ingest_args or [])
    cmd = [sys.executable, str(INGEST_SCRIPT), *extra]
    print(f"running: {' '.join(cmd)}", flush=True)
    proc = subprocess.run(cmd, cwd=str(ROOT))
    return int(proc.returncode)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="trendy",
        description="Trendy CLI — decode slang, list trends, control Radar (local).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_decode = sub.add_parser("decode", help="Judgment-free lexicon explain")
    p_decode.add_argument("term", help="Term or phrase to look up")
    p_decode.add_argument(
        "--live",
        action="store_true",
        help="Call live model (OPENAI_API_KEY / ANTHROPIC_API_KEY) instead of lexicon",
    )
    p_decode.set_defaults(func=cmd_decode)

    p_serve = sub.add_parser(
        "serve",
        help="Local Decode proxy for PWA live model-on-miss (port 8787)",
        aliases=["decode-proxy"],
    )
    p_serve.add_argument("--host", default="0.0.0.0", help="Bind address (default 0.0.0.0 for LAN)")
    p_serve.add_argument("--port", type=int, default=8787, help="Port (default 8787)")
    p_serve.set_defaults(func=cmd_serve)

    p_trends = sub.add_parser("trends", help="List hot trends from web/data")
    p_trends.add_argument(
        "--min-heat",
        type=float,
        default=0.0,
        help="Minimum heatScore (default: 0)",
    )
    p_trends.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Max rows (default: 20)",
    )
    p_trends.add_argument(
        "--world",
        default=None,
        help="Filter by world (e.g. TikTok)",
    )
    p_trends.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Include summary lines",
    )
    p_trends.set_defaults(func=cmd_trends)

    p_mcp = sub.add_parser(
        "mcp",
        help="Local stdio MCP server (read-only: decode_term, search_slang, get_trends, radar_status)",
    )
    p_mcp.set_defaults(func=cmd_mcp)

    p_radar = sub.add_parser("radar", help="Radar status / run ingest")
    radar_sub = p_radar.add_subparsers(dest="radar_cmd", required=True)

    p_status = radar_sub.add_parser("status", help="Show radar/out/last-run.json")
    p_status.set_defaults(func=cmd_radar_status)

    p_run = radar_sub.add_parser(
        "run",
        help="Invoke radar/run_ingest.py (pass-through flags after --)",
    )
    p_run.add_argument(
        "ingest_args",
        nargs=argparse.REMAINDER,
        help="Flags for run_ingest.py (use -- before flags, e.g. radar run -- --config ...)",
    )
    p_run.set_defaults(func=cmd_radar_run)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    # argparse.REMAINDER may leave a leading '--'
    if getattr(args, "ingest_args", None):
        if args.ingest_args and args.ingest_args[0] == "--":
            args.ingest_args = args.ingest_args[1:]
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
