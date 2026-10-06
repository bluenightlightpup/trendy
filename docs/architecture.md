# Architecture — Trendy

> **Current shape (2026-10):** The primary surface is the Python CLI + local stdio MCP in `cli/`, reading `web/data`. The PWA (`web/`) is the phone client. The SwiftUI app described below is experimental. See `docs/cli-mcp-integration.md`.

**Min iOS:** 17.0 (experimental app)  
**UI:** SwiftUI, phone-first

## High-level

```
┌─────────────────────────────────────────────┐
│                 TrendyApp                    │
│              ContentView / Tabs              │
├──────────┬──────────┬──────────┬────────────┤
│  Home    │ Decode   │ Explore  │    You     │
│  Feature │ Feature  │ Feature  │  Feature   │
├──────────┴──────────┴──────────┴────────────┤
│           DesignSystem (tokens, HeatMeter)   │
├─────────────────────────────────────────────┤
│  Services (TrendService, DecodeClient, …)    │
├─────────────────────────────────────────────┤
│  Models (Trend, HeatLevel, World, Prefs)     │
└─────────────────────────────────────────────┘
```

## Folder conventions (`App/`)

| Path | Responsibility |
|------|----------------|
| `TrendyApp.swift` | `@main` entry |
| `ContentView.swift` | Root host |
| `Navigation/` | Tab shell / routing |
| `Features/Home/` | Feed, cards, heat, origin detail |
| `Features/Decode/` | Chat UI + view model |
| `Features/Explore/` | Worlds browser |
| `Features/You/` | Preferences, New here mode |
| `DesignSystem/` | Colors, typography, shared controls |
| `Services/` | Networking, persistence, mock providers |
| `Models/` | Codable / domain types |
| `Resources/` | Assets, localization (later) |

## Boundaries

- **Features** own UI + feature state; depend on Models + Services + DesignSystem.
- **Services** own I/O (HTTP, Keychain/UserDefaults). No SwiftUI imports.
- **Decode** talks to Claude through a dedicated client — never hardcode keys.
- **Heat** is a domain concept (`HeatLevel` / score) rendered by `HeatMeter`; colors come from design tokens.

## Data (v1 sketch)

- **Phase 1:** in-memory mock trends.
- **Phase 2:** remote trend feed + Claude Messages API (or gateway); preferences local.
- **Radar:** scheduled merge into `web/data` (PWA); Swift mocks may lag until wired to the same feed.
- **Phase 3:** saved/followed IDs persisted (local first; sync optional later).

## Navigation

Four tabs — Home, Decode, Explore, You. Home card → push/sheet origin story. Decode is chat-first (no nested tabs).

## Testing

- Unit: Models heat mapping, preference encoding, client request building.
- UI: tab smoke + Home card presence (Phase 3 emphasis).
- Python: `python3 -m unittest discover -s cli -t .`; PWA: `node --test web/tests/*.mjs` (both in CI).


## Trend Radar (data plane)

Continuous ingest lives under `radar/` (Python): pluggable adapters → normalize/heat/merge → `web/data/*.json`.

- **Seed:** a curated built-in list (`mock_seed`) currently supplies most signals.
- **Reddit:** wired up, but unauthenticated requests currently get **HTTP 403** from CI runners and our test box (needs OAuth to revive).
- **Disabled:** YouTube RSS and Wikipedia current events (off-topic noise; rows purged via `merge.drop_sources`).
- **STUB:** TikTok / Instagram. The Research API / Meta Graph path is documented; enable when the owner supplies keys.
- **Ethics:** no ToS-violating scrapers; prefer official APIs. See `docs/radar.md` and `radar/README.md`.
- **Ops:** `python3 radar/run_ingest.py`; daily cron via `.github/workflows/radar-ingest.yml` (06:00 UTC).

The iOS app and PWA remain consumers of curated/merged catalogs; Radar does not embed platform SDKs in the client.

## Open ADRs (to file when decided)

- Trend data source (curated CMS vs scraped aggregators vs partner APIs).
- Claude access path (direct vs backend proxy — prefer proxy for key safety in production).
