# Explore niches

Explore is meant to feel **vast** and **continuously updated** — not a handful of TikTok cards. Users catch up by niche without doomscrolling.

## Worlds (niches)

| World | Examples |
|-------|----------|
| TikTok | FYP sounds, brainrot, soft/hard launches as content |
| Internet culture | Cross-platform memes & slang |
| Abbreviations | Trend-y short forms (FR, NGL, OOTL, …) |
| Gaming | Roasts, meta, clutch, AFK |
| Dating | Situationship, soft launch, flags |
| School / campus | Midterm arc, dorm/roommate lore |
| Sports | W/L, locked in, run it back |
| Music / fandom | Stan, bias, comeback eras |
| Work / tech | Circle back, bandwidth, LGTM |
| Money | Bag, rug pull, WAGMI/NGMI (accessible, not advice) |

PWA: `WORLDS` in `web/app.js` · Swift: `TrendWorld` in `App/Models/Trend.swift` · You prefs toggle every world (default ON).

## How Radar keeps Explore fresh

1. **mock_seed** emits evergreen signals across **all** worlds so catalogs never stall on one niche.
2. Live adapters (Reddit, Wikipedia current, YouTube feeds, …) normalize with `world_hint` covering the same niche set.
3. **Merge caps** (`radar/config.yaml` → `merge.max_trends` / `max_slang_entries`) stay high enough that ingest does not trim Explore back to a tiny feed.
4. Scheduled ingest (`radar/run_ingest.py` + GitHub Actions) merges into `web/data/trends.json` and `web/data/slang.json`.

Judgment-free tone stays in curated origin stories; Radar rows are labeled as auto-ingested until curated.
