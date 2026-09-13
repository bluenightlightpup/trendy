# Trendy

**Trendy** is a phone-first iOS app: an AI assistant that helps you stay current on trends, memes, and slang **without** burning hours of screentime. Catch up on culture, decode abbreviations judgment-free, and keep signals organized in one place — built for people who don’t want FOMO and for older users who want slang context.

> **License:** MIT · Copyright (c) 2026 bluenightlightpup  
> **GitHub:** https://github.com/bluenightlightpup/trendy  
> **Workbench (agents/skills):** [my-workbench](https://github.com/bluenightlightpup/my-workbench) — this app repo is separate; do not clone the workbench into here.

## Product snapshot

| Tab | Role |
|-----|------|
| **Home** | Trend feed sorted by momentum; **heat meter** (cool → volt → hot) on every card; tap for origin story |
| **Decode** | AI chat (Claude) explaining slang / memes / abbreviations — judgment-free |
| **Explore** | Browse by world: TikTok, internet culture, abbreviations, gaming |
| **You** | Interest toggles, digest frequency, **New here mode** |

Later: save / follow trends.

Design identity (“signal”): deep ink background; hot pink / acid-lime / cyan temperature scale; Space Grotesk + JetBrains Mono vibe (system fallbacks OK initially). See `docs/design-tokens.md`.

## App preview

![Trendy Home — heat feed with 67, rizz, and skill issue](docs/images/trendy-home.png)

![Trendy Decode — judgment-free slang chat](docs/images/trendy-decode.png)

## Roadmap phases

| Phase | Focus | Status |
|-------|--------|--------|
| **P0** | PRD, repo, backlog | Done |
| **P1** | SwiftUI shell, Home heat feed, Explore | Done (XcodeGen on Mac) |
| **P2** | Decode + You + APIs | PWA Decode/You live; iOS Claude API next |
| **P3** | Save/follow, polish, TestFlight | Pending |
| **Radar** | 24/7 multi-platform ingest | Live (TikTok/IG stubs) |
| **P4** | **Consider CLI + MCP** for integrated AI tools | Decision gate — see below |
| **P5** | Landscape (Urban Dictionary & peers) + novelty uses | Open — research |

Details: [`docs/phased-implementation.md`](docs/phased-implementation.md) · tickets in [`docs/backlog.md`](docs/backlog.md).

## Phase 4 — CLI & MCP for integrated AI tools *(consider)*

**CLI** = terminal commands for humans/scripts (`trendy decode 67`).  
**MCP** = a plug so AI tools (Cursor, Claude, workbench agents) can call Trendy as tools automatically.

Should we expose them so agents/scripts decode slang and pull hot trends without the phone UI?

This is a **go / no-go phase**, not automatic build work. Design brief: [`docs/cli-mcp-integration.md`](docs/cli-mcp-integration.md).

**If GO:** thin CLI + local stdio MCP (read-mostly: `decode`, `trends`, `radar status`).  
**If NO-GO / defer:** keep polishing Phase 3 phone experience first.

Owner decision tracked as backlog **T0019**.

## Phase 5 — Landscape & novelty *(research)*

Review slang translators (Urban Dictionary, Slangora, Wordyex, Musely, GenZ apps, general LLMs) and explore novel Trendy uses (family Decode, anti-FOMO digest, heat time machine, creator “am I late?”, agent briefs, …).

- Landscape: [`docs/product-landscape.md`](docs/product-landscape.md)
- Novelty bets: [`docs/novelty-use-cases.md`](docs/novelty-use-cases.md)
- Tickets: **T0022–T0024**


## Repo layout

```
App/                 SwiftUI source (create Xcode project via docs/xcode-setup.md)
web/                 Progressive Web App (static; try on phone without Xcode)
radar/               Trend Radar — continuous multi-platform ingest → web/data
Tests/TrendyTests/   Unit test stubs
docs/                PRD, phases, backlog, architecture, design tokens, ideas
.github/             Issue/PR templates + validate + radar-ingest cron
```

## Getting started (Xcode)

Source files live under `App/`. Generate the Xcode project on a Mac with [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
brew install xcodegen
xcodegen generate
open Trendy.xcodeproj
```

See **`docs/xcode-setup.md`** (aligned with workbench skill `ios-xcode-setup`) for details and a manual fallback.

Minimum iOS: **17.0** (documented in architecture).

## Docs map

| Doc | Purpose |
|-----|---------|
| `docs/prd.md` | Product requirements |
| `docs/backlog.md` | Numbered tickets (T0001+) |
| `docs/architecture.md` | App structure & boundaries |
| `docs/design-tokens.md` | Colors, type, heat scale |
| `docs/workbench.md` | How this repo uses my-workbench |
| `docs/xcode-setup.md` | Create Xcode project from this tree |
| `docs/ideas/` | Owner idea extracts (plain text) |
| `docs/radar.md` | Trend Radar continuous ingest (24/7 slang/trends) |

## Sync note

Local idea path may be Desktop “trendy docs”; **this app repo is separate from my-workbench**. Agents/skills stay in the workbench; product code and app docs live here.


## Try on your phone

A static **Progressive Web App** lives in [`web/`](web/) — same tabs (Home, Decode, Explore, You), mock trends, and slang decoder. No Xcode required.

```bash
npx --yes serve web -l 4173
# or: python3 -m http.server 4173 --directory web
```

Open the URL on your phone (same Wi‑Fi), then Add to Home Screen. Details: [`web/README.md`](web/README.md).


## Trend Radar (continuous training)

Radar ingests public signals on a schedule, normalizes them, and merges into `web/data/trends.json` + `web/data/slang.json` so the PWA stays fresh.

```bash
pip install -r radar/requirements.txt
python3 radar/run_ingest.py
```

- **LIVE now:** Reddit (public JSON), mock seed, best-effort YouTube RSS / Wikipedia.
- **STUB:** TikTok & Instagram (official APIs / partner feeds when you add keys — no ToS-violating scrapers).
- **Cron:** GitHub Actions every 2 hours UTC (`.github/workflows/radar-ingest.yml`).

Details: [`radar/README.md`](radar/README.md) · [`docs/radar.md`](docs/radar.md).

## Contributing

See `CONTRIBUTING.md`. Use workbench skills (`git-branch-pr`, `software-dev-loop`, etc.). Security: `SECURITY.md`. Owner: `@bluenightlightpup` (`CODEOWNERS`).
