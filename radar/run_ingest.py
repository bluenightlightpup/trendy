#!/usr/bin/env python3
"""Trendy Trend Radar — fetch → normalize → merge → write web/data.

Exit 0 on partial adapter success; non-zero only if catalog write fails.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any

import yaml

# Allow `python3 radar/run_ingest.py` from repo root
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from radar.adapters.base import utc_now_iso  # noqa: E402
from radar.adapters.instagram import InstagramAdapter  # noqa: E402
from radar.adapters.mock_seed import MockSeedAdapter  # noqa: E402
from radar.adapters.reddit import RedditAdapter  # noqa: E402
from radar.adapters.tiktok import TikTokAdapter  # noqa: E402
from radar.adapters.wikipedia_current import WikipediaCurrentAdapter  # noqa: E402
from radar.adapters.youtube import YouTubeAdapter  # noqa: E402
from radar.pipeline.merge import merge_slang, merge_trends  # noqa: E402
from radar.pipeline.normalize import normalize_signals  # noqa: E402
from radar.pipeline.store import read_json, write_json_atomic  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("radar")

ADAPTERS = {
    "mock_seed": MockSeedAdapter,
    "reddit": RedditAdapter,
    "wikipedia_current": WikipediaCurrentAdapter,
    "youtube": YouTubeAdapter,
    "tiktok": TikTokAdapter,
    "instagram": InstagramAdapter,
}


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Trendy Trend Radar ingest")
    parser.add_argument(
        "--config",
        default=str(ROOT / "radar" / "config.yaml"),
        help="Path to config.yaml",
    )
    parser.add_argument(
        "--repo-root",
        default=str(ROOT),
        help="Repo root (for web/data paths)",
    )
    args = parser.parse_args(argv)
    repo = Path(args.repo_root).resolve()
    cfg_path = Path(args.config)
    if not cfg_path.is_absolute():
        cfg_path = (repo / cfg_path).resolve()

    cfg = load_config(cfg_path)
    paths = cfg.get("paths") or {}
    trends_path = repo / paths.get("trends", "web/data/trends.json")
    slang_path = repo / paths.get("slang", "web/data/slang.json")
    last_run_path = repo / paths.get("last_run", "radar/out/last-run.json")

    sources_cfg = cfg.get("sources") or {}
    # Ensure required sources exist in config
    if "mock_seed" not in sources_cfg:
        sources_cfg["mock_seed"] = {"enabled": True, "mode": "live"}
    if "reddit" not in sources_cfg:
        sources_cfg["reddit"] = {"enabled": True, "mode": "live"}

    all_signals: list[dict[str, Any]] = []
    adapter_summaries: list[dict[str, Any]] = []

    # Run order: mock_seed first (baseline), then others
    order = ["mock_seed", "reddit", "wikipedia_current", "youtube", "tiktok", "instagram"]
    for name in order:
        if name not in ADAPTERS:
            continue
        src_cfg = dict(sources_cfg.get(name) or {})
        # Mode from config overrides class default when set
        cls = ADAPTERS[name]
        adapter = cls(src_cfg, cfg)
        if src_cfg.get("mode"):
            adapter.mode = str(src_cfg["mode"])
        log.info("adapter %s enabled=%s mode=%s", name, adapter.enabled, adapter.mode)
        result = adapter.run()
        adapter_summaries.append(result.summary())
        if result.skipped:
            log.info("  skip %s: %s", name, result.notes or result.error)
        elif not result.ok:
            log.warning("  fail %s: %s", name, result.error)
        else:
            log.info("  ok %s: %d signals", name, len(result.signals))
            all_signals.extend(result.signals)

    trends_in, slang_in = normalize_signals(
        all_signals, slang_cfg=cfg.get("slang_heuristics")
    )
    log.info(
        "normalized: %d trend candidates, %d slang candidates",
        len(trends_in),
        len(slang_in),
    )

    existing_trends = read_json(trends_path, default=[])
    if not isinstance(existing_trends, list):
        existing_trends = []
    existing_slang = read_json(slang_path, default={"entries": [], "fallback": {}})
    if not isinstance(existing_slang, dict):
        existing_slang = {"entries": [], "fallback": {}}

    merged_trends, trend_stats = merge_trends(existing_trends, trends_in)
    merged_slang, slang_stats = merge_slang(existing_slang, slang_in)

    summary = {
        "timestamp": utc_now_iso(),
        "signals": len(all_signals),
        "adapters": adapter_summaries,
        "trends": trend_stats,
        "slang": slang_stats,
        "paths": {
            "trends": str(trends_path.relative_to(repo)),
            "slang": str(slang_path.relative_to(repo)),
        },
    }

    try:
        write_json_atomic(trends_path, merged_trends)
        write_json_atomic(slang_path, merged_slang)
        write_json_atomic(last_run_path, summary)
    except Exception as exc:  # noqa: BLE001
        log.error("write failed: %s", exc)
        return 1

    log.info(
        "wrote trends=%d slang_entries=%d last-run → %s",
        trend_stats["total"],
        slang_stats["total"],
        last_run_path,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
