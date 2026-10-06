# Phased implementation — Trendy

Aligned with workbench skills: `write-prd`, `product-spec-to-tickets`, `ios-xcode-setup`, `ios-swiftui-feature`, `api-client-design`, `ios-testing`, `ios-app-store-release`, `software-dev-loop`.

## Phase 0 — Foundations (docs & repo)

**Outcome:** Shared product truth and a clean app repo scaffold.

- [x] PRD (`docs/prd.md`)
- [x] Repo structure, MIT license, contributing/security, CODEOWNERS
- [x] Backlog with acceptance criteria (`docs/backlog.md`)
- [x] Architecture + design tokens + workbench usage docs
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

- [x] Pluggable adapters (`radar/adapters/`): Reddit (currently HTTP 403 without OAuth) + seed list; STUB TikTok/Instagram; Wikipedia/YouTube disabled (noise)
- [x] Normalize → heat → merge pipeline into PWA JSON schemas
- [x] Slang heuristics (short tokens, ALLCAPS, quoted phrases) with `confidence: low` placeholders
- [x] `radar/run_ingest.py` CLI + `radar/out/last-run.json` summary
- [x] GitHub Actions cron (daily 06:00 UTC since 2026-10-05; was every 2h) + `workflow_dispatch`
- [x] Docs: `docs/radar.md`, `radar/README.md`; ethics / official-API notes

**Exit criteria:** Local ingest run succeeds (partial OK if Reddit blocks); PWA JSON remains valid; stubs document key requirements for TikTok/IG.

## Phase map (quick)

| Phase | Focus |
|-------|--------|
| **P0** | PRD, repo, backlog |
| **P1** | Skeleton, design tokens, Home heat feed, Explore worlds, mock data |
| **P2** | Decode Claude chat, You personalization, real APIs |
| **P3** | Save/follow, polish, tests, TestFlight |
| **Radar** | Daily ingest → web/data (seed list; Reddit 403 for now; STUB TikTok/IG) |
| **P4** | CLI + local stdio MCP shipped and packaged (`trendy-cli`); not hosted (`docs/cli-mcp-integration.md`) |
| **P5** | Product landscape (Urban Dictionary & peers) + novelty use cases |


## Phase 4 — CLI & MCP integration (decision gate)

**Outcome:** Deliberate go / no-go on **CLI** and **MCP** so integrated AI tools can query Trendy’s radar, slang lexicon, and decode pipeline — without blocking phone UX work.

**Owner decision (2026-09-14):** **CLI GO** (Option B → path to C). Private/local-only; no hosted remote MCP.

**Update (2026-10-03):** The MCP server shipped: a Python stdio server beside the CLI (T0021). The phone PWA is a client; `cli/` and `radar/` are what agents should call. Not hosted.

**Update (2026-10-05):** Productised. MCP spec compliance, packaging (`pyproject.toml`, `server.json`), proxy token auth. See `docs/cli-mcp-integration.md`.

### Why consider it
- Agents already run in the owner's agent workbench (kept outside this repo); a Trendy MCP server lets them pull live slang/trends instead of pasting JSON.
- A `trendy` CLI lets Radar ops, Decode experiments, CI, and agents share one interface (`decode`, `trends`, `radar status` / `radar run`).
- Aligns with owner intent: continuous training + AI-native tooling.

### Decision criteria (answered 2026-09-14)
1. **Audience:** Private ops / local agents for now.
2. **Trust boundary:** CLI read lexicon/trends; `radar run` is the write path (local ingest).
3. **Auth:** Local-only; no remote MCP.
4. **Scope v1 CLI:** decode + trends + radar status/run.
5. **Cost/complexity:** CLI in parallel with Phase 3; MCP initially deferred so it would not block phone polish (un-deferred 2026-10-03).

### Deliverables
- [x] ADR: `docs/adr/0001-cli-mcp.md` (CLI GO; local stdio MCP, not hosted)
- [x] `docs/cli-mcp-integration.md` — CLI + stdio MCP run command and Cursor snippet
- [x] CLI: `cli/trendy.py` (`decode`, `trends`, `radar status`, `radar run`) — T0020
- [x] MCP server (T0021) — `trendy mcp` (read-only stdio)
- [x] Packaging: `pyproject.toml` (`trendy-cli`, console script `trendy`), `server.json` for the MCP registry (not yet published)
- [x] Community suggest → consensus lexicon (T0026) — PWA + LAN proxy
- [x] README + agent docs for CLI usage
- [x] Security notes: read-only tools, no secrets in results, no remote surface (rate limits N/A for local stdio)

### Non-goals (this phase)
- Replacing the PWA or iOS app
- Scraping TikTok/IG via MCP (still official APIs only)
- Shipping a public hosted MCP without auth decision
**Exit criteria:** Written go/no-go in ADR (**met**); CLI merged + documented (**met**); MCP stdio server shipped (**met**, 2026-10-03).


## Phase 5 — Product landscape & novelty

**Outcome:** Know the slang-translator landscape (Urban Dictionary, Gen Z apps, AI translators) and choose novel Trendy uses that competitors under-serve.

- [ ] Competitive matrix vs Urban Dictionary, Slangora, Wordyex, Musely, GenZ translator apps, general LLMs
- [ ] Lock Trendy differentiators (heat/lifecycle, New here, Radar, judgment-free Decode)
- [ ] Explore novelty concepts (family translator, classroom-safe, creator brief, anti-doomscroll digest, agent workflows, time machine, etc.)
- [ ] Pick ≥2 novelty bets for backlog; update PRD non-goals if needed

**Docs:** [`docs/product-landscape.md`](product-landscape.md) · [`docs/novelty-use-cases.md`](novelty-use-cases.md)

**Exit criteria:** Owner-reviewed landscape + ranked novelty bets; tickets filed.
