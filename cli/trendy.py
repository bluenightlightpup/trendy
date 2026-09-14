#!/usr/bin/env python3
"""Trendy CLI spike (Phase 4 / T0020).

Usage (from repo root):
  python cli/trendy.py decode 67
  python cli/trendy.py trends --min-heat 0.7 --limit 20
  python cli/trendy.py radar status
  python cli/trendy.py radar run [-- …flags passed to run_ingest.py]

Also: python -m cli <command> ...
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
TRENDS_PATH = DATA / "trends.json"
LAST_RUN_PATH = ROOT / "radar" / "out" / "last-run.json"
INGEST_SCRIPT = ROOT / "radar" / "run_ingest.py"


def _load_json(path: Path, default: Any) -> Any:
    if not path.is_file():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _norm(s: str) -> str:
    return " ".join(s.strip().lower().split())


def _entry_terms(entry: dict[str, Any]) -> list[str]:
    terms = entry.get("terms") or []
    if isinstance(terms, str):
        return [terms]
    return [str(t) for t in terms]


def lookup_lexicon(term: str) -> tuple[dict[str, Any] | None, str | None]:
    """Return (entry, source_label) from slang.json then abbreve.json."""
    needle = _norm(term)
    if not needle:
        return None, None

    slang = _load_json(SLANG_PATH, {"entries": []})
    for entry in slang.get("entries") or []:
        if not isinstance(entry, dict):
            continue
        for t in _entry_terms(entry):
            if _norm(t) == needle:
                return entry, "slang"

    abbreve = _load_json(ABBREVE_PATH, {"entries": []})
    for entry in abbreve.get("entries") or []:
        if not isinstance(entry, dict):
            continue
        for t in _entry_terms(entry):
            if _norm(t) == needle:
                return entry, "abbreve"

    return None, None


def cmd_decode(args: argparse.Namespace) -> int:
    term = args.term
    entry, source = lookup_lexicon(term)
    if entry is None:
        print(f"no lexicon hit for: {term}")
        print(
            "(CLI spike is lexicon-only; the PWA Decode tab has extra "
            "built-in fallbacks and AI assist.)"
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
    return 0


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
    p_decode.set_defaults(func=cmd_decode)

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
