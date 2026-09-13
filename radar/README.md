# Trend Radar

Continuous multi-platform ingest for Trendy: train on slang and trend signals around the clock, then merge into the PWA catalogs under `web/data/`.

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

## 24/7 ops

- **Local:** `python3 radar/run_ingest.py` from the repo root (needs `httpx`, `PyYAML` — see `requirements.txt`).
- **CI cron:** `.github/workflows/radar-ingest.yml` every **2 hours UTC** + `workflow_dispatch`. On change, commits updated `web/data/*.json` with `GITHUB_TOKEN`.

Partial adapter failure is OK (exit 0). Non-zero only if writing catalogs fails.

## Live vs stub

| Source | Status | Notes |
|--------|--------|-------|
| `mock_seed` | **LIVE** | Always-on baseline so catalogs never go empty |
| `reddit` | **LIVE** | Public `.json` listings (OOTL, ELI5, NSQ, tiktokcringe, …) + polite User-Agent |
| `wikipedia_current` | **LIVE** (optional) | REST summary for current-events portal; soft-fails if fragile |
| `youtube` | **LIVE** (best-effort) | Public Atom/RSS — no API key; may return empty |
| `tiktok` | **STUB** | Needs Research API / partner feed + owner keys |
| `instagram` | **STUB** | Needs Meta Graph / official access + owner keys |

## Legal / ethics (read this)

- Official **TikTok** and **Instagram** APIs are **limited and ToS-sensitive**. We ship **stubs**, not scrapers.
- **No credential stuffing**, no session hijacking, no ToS-violating scraping of TikTok/IG.
- Prefer **official APIs** when the owner adds keys via environment / CI secrets.
- Reddit public JSON is used politely (rate limits in `config.yaml`, identifiable User-Agent). Respect robots / blocks — ingest falls back to `mock_seed`.

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
