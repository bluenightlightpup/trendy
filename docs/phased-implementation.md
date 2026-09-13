# Phased implementation — Trendy

Aligned with workbench skills: `write-prd`, `product-spec-to-tickets`, `ios-xcode-setup`, `ios-swiftui-feature`, `api-client-design`, `ios-testing`, `ios-app-store-release`, `software-dev-loop`.

## Phase 0 — Foundations (docs & repo)

**Outcome:** Shared product truth and a clean app repo scaffold.

- [x] PRD (`docs/prd.md`)
- [x] Repo structure, MIT license, contributing/security, CODEOWNERS
- [x] Backlog with acceptance criteria (`docs/backlog.md`)
- [x] Architecture + design tokens + workbench usage docs
- [x] Idea extracts under `docs/ideas/`
- [x] Light CI validate workflow for required docs

**Exit criteria:** PRD reviewed; tickets ordered; scaffold opens cleanly on GitHub as `bluenightlightpup/trendy`.

## Phase 1 — Skeleton + Home/Explore with mock data

**Outcome:** Runnable SwiftUI shell with signal design and browsable mock trends.

- [x] XcodeGen `project.yml` + `docs/xcode-setup.md` (`ios-xcode-setup`) — generate `Trendy.xcodeproj` on a Mac with `xcodegen generate`
- [x] Design tokens in code (ink + heat scale; font fallbacks)
- [x] Tab shell: Home, Decode, Explore, You
- [x] **Home:** `HomeViewModel` + momentum-sorted mock feed + **HeatMeter** + lifecycle chips; pull-to-refresh; tap → origin story
- [x] **Explore:** worlds (TikTok, internet culture, abbreviations, gaming) filtered via shared `MockTrendService`; empty state per world
- [x] Placeholder Decode / You screens
- [x] Mock `Trend` models (`heatScore`, `HeatLevel`, `TrendLifecycle`) + in-memory service (~12 samples)
- [x] Unit tests for heat bands, momentum sort, lifecycle coverage

**Exit criteria:** Simulator build; Home heat feed and Explore worlds demoable with mocks. *(Generate & build on Mac via XcodeGen.)*

## Phase 2 — Decode + You + real APIs

**Outcome:** Live Decode chat and personalization wired to real services.

- **Decode:** Claude-backed chat (`api-client-design`); judgment-free system prompt; error/empty states
- **You:** interest toggles, digest frequency, New here mode (persisted preferences)
- Real trend/momentum APIs or curated backend (ADR via `architecture-decision`)
- Secure key handling (no secrets in repo)
- Basic analytics/logging hooks as needed (privacy-aware)

**Exit criteria:** Decode explains live slang; You settings affect feed/digest behavior; API client tested.

## Phase 3 — Save/follow, polish, tests, TestFlight

**Outcome:** Retention features, quality bar, external beta.

- [x] Save / follow trends (**PWA primary**) — `trendy.saved.v1`, card ♡/♥, detail toggle, You “Saved trends”, Home All|Saved filter
- [x] Polish heat meter, motion, accessibility, empty/error states (reduced-motion, stronger aria-labels, focus-visible, New-here empty copy)
- [x] Unit tests for Decode + saved helpers (`web/tests/*.mjs`, `npm test` / CI `node-web-tests`)
- [ ] iOS UI tests / full native save UI (`ios-testing`) — stub `SavedTrendsStore` only for now
- [ ] TestFlight via `ios-app-store-release` — see `docs/testflight.md` (**needs Mac**)
- [ ] Backlog grooming for post-v1 (social light features only if justified)

**Exit criteria:** TestFlight build *(pending Mac)*; PWA save/follow works; node tests green on CI.


## Phase Radar — Continuous multi-platform training

**Outcome:** 24/7 Trend Radar ingests slang/trend signals and refreshes `web/data` without ToS-violating scrapers.

- [x] Pluggable adapters (`radar/adapters/`) — LIVE Reddit + mock_seed; STUB TikTok/Instagram; optional Wikipedia/YouTube
- [x] Normalize → heat → merge pipeline into PWA JSON schemas
- [x] Slang heuristics (short tokens, ALLCAPS, quoted phrases) with `confidence: low` placeholders
- [x] `radar/run_ingest.py` CLI + `radar/out/last-run.json` summary
- [x] GitHub Actions cron every 2 hours UTC + `workflow_dispatch`
- [x] Docs: `docs/radar.md`, `radar/README.md`; ethics / official-API notes

**Exit criteria:** Local ingest run succeeds (partial OK if Reddit blocks); PWA JSON remains valid; stubs document key requirements for TikTok/IG.

## Phase map (quick)

| Phase | Focus |
|-------|--------|
| **P0** | PRD, repo, backlog |
| **P1** | Skeleton, design tokens, Home heat feed, Explore worlds, mock data |
| **P2** | Decode Claude chat, You personalization, real APIs |
| **P3** | Save/follow, polish, tests, TestFlight |
| **Radar** | Continuous ingest → web/data (LIVE Reddit/seed; STUB TikTok/IG) |
| **P4** | **Decision gate:** CLI + MCP for integrated AI tools (see `docs/cli-mcp-integration.md`) |
| **P5** | Product landscape (Urban Dictionary & peers) + novelty use cases |


## Phase 4 — CLI & MCP integration (decision gate)

**Outcome:** A deliberate go / no-go on shipping **CLI** and **MCP** surfaces so integrated AI tools (Cursor, Claude Desktop, custom agents, scripts) can query Trendy’s radar, slang lexicon, and decode pipeline — without blocking phone UX work.

This phase is a **consideration + design** phase first. Implementation only proceeds after an explicit approve.

### Why consider it
- Agents already live in [my-workbench](https://github.com/bluenightlightpup/my-workbench); a Trendy MCP server would let them pull live slang/trends instead of pasting JSON.
- A `trendy` CLI would let Radar ops, Decode experiments, and CI scripts share one interface (`trendy decode 67`, `trendy radar run`, `trendy trends --hot`).
- Aligns with owner intent: continuous training + AI-native tooling.

### Decision criteria (must answer before building)
1. **Audience:** Just us (private ops) vs other AI tools / contributors?
2. **Trust boundary:** Read-only lexicon/trends vs write (ingest, lexicon edits)?
3. **Auth:** Local-only stdio MCP vs remote HTTP + tokens?
4. **Scope v1:** Decode + trends read enough, or full Radar control?
5. **Cost/complexity:** Does this delay Phase 3 polish / TestFlight?

### Proposed deliverables (if GO)
- [ ] ADR: `docs/adr/0001-cli-mcp-integration.md` (decision recorded)
- [ ] `docs/cli-mcp-integration.md` — product/eng design (drafted this phase)
- [ ] Optional spike: `packages/trendy-cli` or `radar/cli.py` + MCP server stub exposing:
  - `get_trends` / `search_slang` / `decode_term` / `radar_status`
- [ ] Wire README “AI tooling” section with install snippets
- [ ] Security review: no secrets in MCP tool results; rate limits

### Non-goals (this phase)
- Replacing the PWA or iOS app
- Scraping TikTok/IG via MCP (still official APIs only)
- Shipping a public hosted MCP without auth decision

**Exit criteria:** Written go/no-go in ADR (or explicit defer); if go, spike merged behind clear README docs; if no-go, backlog tickets cancelled with rationale.


## Phase 5 — Product landscape & novelty

**Outcome:** Know the slang-translator landscape (Urban Dictionary, Gen Z apps, AI translators) and choose novel Trendy uses that competitors under-serve.

- [ ] Competitive matrix vs Urban Dictionary, Slangora, Wordyex, Musely, GenZ translator apps, general LLMs
- [ ] Lock Trendy differentiators (heat/lifecycle, New here, Radar, judgment-free Decode)
- [ ] Explore novelty concepts (family translator, classroom-safe, creator brief, anti-doomscroll digest, agent workflows, time machine, etc.)
- [ ] Pick ≥2 novelty bets for backlog; update PRD non-goals if needed

**Docs:** [`docs/product-landscape.md`](product-landscape.md) · [`docs/novelty-use-cases.md`](novelty-use-cases.md)

**Exit criteria:** Owner-reviewed landscape + ranked novelty bets; tickets filed.
