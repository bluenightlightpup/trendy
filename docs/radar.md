# Trend Radar — product & eng overview

Trendy’s owner intent: the app should **keep learning slang continuously** across platforms (TikTok, Instagram, Reddit, YouTube, …) so Decode, Explore niches, and the Home heat feed stay current without doomscrolling. Explore niche map: [`explore-niches.md`](explore-niches.md). Platform access honesty (LIVE vs STUB, no ToS scrapers): [`platform-access.md`](platform-access.md).

## Honest constraints

- **TikTok / Instagram official APIs are limited and ToS-sensitive.** Shipping a secret scraper would be brittle and non-compliant.
- Radar therefore uses a **pluggable adapter architecture**:
  - **Seed** adapter (`mock_seed`): a curated list that currently supplies most signals.
  - **Reddit** public JSON: implemented, but unauthenticated requests currently get **HTTP 403** from CI runners and our test box. Reviving it needs OAuth.
  - **Disabled:** YouTube RSS and Wikipedia current events (off-topic rows; purged with `merge.drop_sources`).
  - **STUB** adapters for TikTok & Instagram that document the official Research / Graph / partner path for later.


## Bridge until TikTok / IG APIs

We **do** want Radar to train on TikTok and Instagram. Official APIs / partner feeds are the path; scrapers that violate ToS are not. Until those stubs go LIVE, Decode relies on **curated packs** plus **spelling/fuzzy aliases** (e.g. `skibiti` → `skibidi`) so brainrot queries still resolve. See [`platform-access.md`](platform-access.md).

## Pipeline

| Stage | Module | Role |
|-------|--------|------|
| Fetch | `radar/adapters/*` | Platform-specific signals |
| Normalize | `radar/pipeline/normalize.py` | → Trend + slang candidates |
| Heat | `radar/pipeline/heat.py` | `heatScore` + lifecycle |
| Merge | `radar/pipeline/merge.py` | Dedupe into `web/data/*.json` |
| Store | `radar/pipeline/store.py` | Atomic JSON writes |
| CLI | `radar/run_ingest.py` | Orchestration + `last-run.json` |

## Slang training

From Reddit titles/selftext (and other text signals), simple heuristics extract:

- short tokens
- ALLCAPS abbreviations
- quoted phrases

New entries get judgment-free placeholder `short` / `explain` and a **low-confidence** origin note with a source link when available. Curated PWA entries are not overwritten.

## Ops

- Cron: GitHub Actions daily at 06:00 UTC (`.github/workflows/radar-ingest.yml`), plus manual `workflow_dispatch`.
- Status: `trendy radar status` (or `--json`) shows per-adapter results, errors and how many signals came from the seed list.
- Manual: `python3 radar/run_ingest.py` from repo root.
- Exit policy: partial success → 0; write failure → non-zero.

## Related docs

- Platform access: [`platform-access.md`](platform-access.md)
- Operator README: [`radar/README.md`](../radar/README.md)
- Architecture: [`architecture.md`](architecture.md)
- Phases: [`phased-implementation.md`](phased-implementation.md)
