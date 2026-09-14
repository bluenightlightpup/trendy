# Platform access — honesty for Decode & Radar

**Yes:** Trendy wants Decode and Trend Radar to learn slang and heat from **TikTok, Instagram, YouTube, Reddit**, and other culture surfaces so the app stays current without doomscrolling.

**How we get there:** official APIs and partner feeds. **Not** ToS-violating scrapers, credential stuffing, or unofficial session reuse.

## Path vs. non-path

| We will | We will not |
|---------|-------------|
| Official platform APIs (TikTok Research / Commercial Content, Meta Graph, YouTube Data, Reddit, …) | Secret HTML/app scrapers that break ToS |
| Licensed or partner firehoses / research programs | Credential stuffing, stolen cookies, or driving a signed-in user session |
| Public, ToS-allowed feeds (Reddit `.json`, YouTube Atom/RSS, Wikipedia REST) | Pretending a stub is live TikTok/IG ingest |
| Curated packs + spelling/fuzzy aliases as a **bridge** | Inventing fake “we scraped the FYP” provenance |

Keys live in environment / CI secrets only. Adapters stay pluggable so a stub can flip to LIVE after ToS review.

## Current ingest (honest)

LIVE today (see `radar/config.yaml` and `radar/adapters/`):

- **mock_seed** — always-on baseline so catalogs never go empty
- **reddit** — public JSON listings (polite User-Agent, rate limits)
- **youtube** — public channel Atom/RSS, best-effort, no API key (may return empty)
- **wikipedia_current** — optional REST summaries; soft-fails

STUB today (enabled=false until owner keys exist):

- **tiktok** — TikTok Research API / Commercial Content API / partner feed
- **instagram** — Meta Graph / official partner products

Product overview: [`radar.md`](radar.md). Operator notes: [`../radar/README.md`](../radar/README.md).

## Bridge until TikTok / Instagram APIs unlock

Until those official pipes are on:

1. **Curated high-confidence packs** (CORE + `source: curated`) train Decode on TikTok-era slang (skibidi, gyatt, Fanum tax, mewing, …) judgment-free.
2. **Spelling / fuzzy aliases** catch common misspellings (`skibiti` → `skibidi`, Skibidi Toilet variants) so a 2-letter Abbreve substring cannot steal the answer.
3. **Radar merge** still learns from LIVE sources (Reddit, YouTube RSS, Wikipedia) without overwriting curated copy.

That bridge is temporary coverage, not a substitute for partner access. When keys land, flip the stub adapters to LIVE — do not add scrapers.

## Decode matching rules (why this doc exists)

Radar/lexicon volume includes short Abbreve tokens (`ib` = Inspired By). Partial substring matching must **never** treat 2-letter terms as hits inside longer words (`skibidi` is not Inspired By). Exact and token matches first; CORE / curated / high-confidence beat Abbreve; longest matching term wins.
