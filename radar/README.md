# Trend Radar

Scheduled multi-platform ingest for Trendy. It collects slang and trend signals across **all Explore niches** and merges them into the catalogs under `web/data/` (used by the CLI, MCP server and PWA). Niche list: `docs/explore-niches.md`.

> **Honest status (2026-10):** Most current signals come from the curated seed list (`mock_seed`). Reddit is wired up but answers **HTTP 403** to unauthenticated requests from GitHub runners (and our test box). YouTube and Wikipedia are disabled because they produced off-topic rows. TikTok and Instagram are stubs. `trendy radar status` shows exactly what the last run did.

## How it works

```
adapters (fetch) → normalize → heat score → merge → web/data/{trends,slang}.json
                                              ↘ radar/out/last-run.json
```

1. **Adapters** pull (or stub) signals from each platform.
2. **Normalize** maps signals to Trend rows + slang entry candidates.
3. **Heat** scores `heatScore` / `lifecycle` from mentions / score / velocity.
4. **Merge** dedupes into existing PWA JSON (read first — preserves curated copy).
5. **Store** writes atomically; `last-run.json` summarizes the run.

## Ops

- **Local:** `python3 radar/run_ingest.py` from the repo root (needs `httpx` and `PyYAML`; see `requirements.txt`).
- **CI cron:** `.github/workflows/radar-ingest.yml` runs **daily at 06:00 UTC**, plus `workflow_dispatch`. It runs the CLI tests, then commits changed `web/data/*.json` and `radar/out/last-run.json` with `GITHUB_TOKEN`.
- **Tests:** `python3 -m unittest discover -s radar -t . -p "test_*.py"`.

Partial adapter failure is OK (exit 0). Non-zero only if writing catalogs fails.

## Live vs stub

| Source | Status | Notes |
|--------|--------|-------|
| `mock_seed` | **SEED** | Curated built-in list; always on so catalogs never go empty. Reported as `mode=seed` |
| `reddit` | **LIVE, currently blocked** | Public `.json` listings (OOTL, ELI5, NSQ, …) with a polite User-Agent. Reddit returns HTTP 403 without OAuth; reviving it needs a Reddit app + OAuth client credentials |
| `wikipedia_current` | **DISABLED** | Produced current-events noise, not slang. Rows purged via `merge.drop_sources` |
| `youtube` | **DISABLED** | Public RSS titles were off-topic. Keyword filter (`require_keywords`) added in case it is re-enabled; rows purged |
| `tiktok` | **STUB** | Needs Research API / partner feed + owner keys |
| `instagram` | **STUB** | Needs Meta Graph / official access + owner keys |

## Legal / ethics (read this)

- Official **TikTok** and **Instagram** APIs are **limited and ToS-sensitive**. We ship **stubs**, not scrapers.
- **No credential stuffing**, no session hijacking, no ToS-violating scraping of TikTok/IG.
- Prefer **official APIs** when the owner adds keys via environment / CI secrets.
- Reddit public JSON is used politely (rate limits in `config.yaml`, identifiable User-Agent). When Reddit blocks us (as now), we do not work around it; ingest falls back to `mock_seed`.

## Config

See `config.yaml`: enabled sources, rate limits, schedule hints, output paths.

## Schema

Normalized adapter output: `schema/signal.schema.json`.

PWA-facing catalogs keep existing fields:

- Trends: `id`, `title`, `summary`, `originStory`, `world`, `heatScore`, `lifecycle`, `tags` (+ optional Radar extras).
- Slang: `entries[].terms|short|explain|origin` (+ optional `confidence`, `radarSource`, `radarUrl`). New slang from heuristics is marked **`confidence: low`** — we do **not** invent fake origins as facts.

## Layout

```
radar/
  run_ingest.py
  config.yaml
  requirements.txt
  schema/signal.schema.json
  adapters/
  pipeline/
  out/           # last-run.json committed-friendly; raw/ gitignored
```

Product overview: [`docs/radar.md`](../docs/radar.md).
