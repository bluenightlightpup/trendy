# Backlog — Trendy

Generated in `product-spec-to-tickets` style. Foundations first. Effort: S / M / L.

---

### T0001 — Confirm PRD and product vocabulary
- **Value:** Shared language for heat, worlds, New here mode, Decode tone.
- **Scope:** Review `docs/prd.md` + idea extracts; lock terms (cool/volt/hot, worlds list).
- **Out of scope:** UI implementation.
- **Acceptance:**
  - [ ] PRD goals/non-goals agreed
  - [ ] Heat scale and worlds listed consistently across docs
- **Agents/skills:** `product-strategist`, `write-prd`
- **Depends on:** —
- **Effort:** S

### T0002 — Repo hygiene and GitHub templates
- **Value:** Safe open-source baseline for `bluenightlightpup/trendy`.
- **Scope:** LICENSE MIT, CODEOWNERS, CONTRIBUTING, SECURITY, issue/PR templates, validate workflow.
- **Out of scope:** App Store metadata.
- **Acceptance:**
  - [x] MIT LICENSE present with 2026 bluenightlightpup copyright
  - [x] validate.yml checks required docs
  - [x] Templates render on GitHub
- **Agents/skills:** `implementer`, `git-branch-pr`
- **Depends on:** —
- **Effort:** S

### T0003 — Xcode project from App/ tree
- **Value:** Runnable iOS target for all feature work.
- **Scope:** Create Xcode app + unit test target per `docs/xcode-setup.md`; wire `App/` groups; shared scheme.
- **Out of scope:** Custom fonts packaging; CI macOS build (optional later).
- **Acceptance:**
  - [x] `project.yml` + XcodeGen docs (`brew install xcodegen && xcodegen generate`)
  - [ ] App builds to Simulator (iOS 17+) — run generate on Mac
  - [ ] Unit test target runs — after generate on Mac
  - [x] Folder groups match architecture (`App/`, `Tests/TrendyTests`)
- **Agents/skills:** `ios-engineer`, `ios-xcode-setup`
- **Depends on:** T0002
- **Effort:** M

### T0004 — Design tokens in code
- **Value:** Signal identity visible in UI foundations.
- **Scope:** `TrendyColors`, `TrendyTypography`, heat gradient helpers aligned to `docs/design-tokens.md`.
- **Out of scope:** Shipping custom Space Grotesk / JetBrains Mono files (fallbacks OK).
- **Acceptance:**
  - [x] Ink + heat tokens available to views
  - [x] Mono/rounded fallbacks documented in code comments or tokens doc
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0003
- **Effort:** S

### T0005 — Tab shell navigation
- **Value:** Four-tab IA matches product mockup.
- **Scope:** Home / Decode / Explore / You tabs; deep ink chrome; placeholder feature roots.
- **Out of scope:** Feature content beyond placeholders.
- **Acceptance:**
  - [x] Four tabs switch reliably
  - [x] Selected tab visible; respects Dynamic Type basics
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0003, T0004
- **Effort:** S

### T0006 — Trend model + mock data service
- **Value:** Unblocks Home/Explore without APIs.
- **Scope:** `Trend`, `HeatLevel`/`heatScore`, `TrendLifecycle`, `World`; `TrendService` mock list with momentum sort.
- **Out of scope:** Network I/O.
- **Acceptance:**
  - [x] Mock dataset covers all four worlds
  - [x] Momentum sort deterministic in tests
  - [x] Lifecycle present on samples (rising / peaking / cooling)
- **Agents/skills:** `ios-engineer`, `ios-testing`
- **Depends on:** T0003
- **Effort:** M

### T0007 — HeatMeter component
- **Value:** Signature velocity encoding on cards.
- **Scope:** Track cool → volt → hot; marker for score; reduced-motion safe.
- **Out of scope:** Live backend scores.
- **Acceptance:**
  - [x] Renders across 0…1 scores
  - [x] Uses heat tokens (cyan / lime / pink)
  - [x] Unit tests for heat band boundaries (`HeatLevel.from`)
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0004
- **Effort:** M

### T0008 — Home heat feed + origin story
- **Value:** Primary “what’s peaking” experience.
- **Scope:** Momentum-sorted cards with HeatMeter + lifecycle; tap → origin story detail (mock copy); pull-to-refresh.
- **Out of scope:** Save/follow; infinite scroll entertainment.
- **Acceptance:**
  - [x] Feed sorted by momentum
  - [x] Each card shows heat meter + heat label + lifecycle chip
  - [x] Origin story reachable in ≤ 2 taps
  - [x] Loading / loaded / empty states via `HomeViewModel`
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0005, T0006, T0007
- **Effort:** M

### T0009 — Explore by world
- **Value:** Organized browsing without app-hopping.
- **Scope:** Worlds: TikTok, internet culture, abbreviations, gaming; lists from mock service.
- **Out of scope:** Cross-world search ranking sophistication.
- **Acceptance:**
  - [x] User can switch worlds
  - [x] Lists filter to selected world
  - [x] Empty state when a world has no trends
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0005, T0006
- **Effort:** M

### T0010 — Decode chat UI (offline/mock path)
- **Value:** Prove chat UX before live Claude.
- **Scope:** Message list, composer, mock assistant replies; judgment-free copy guidelines in UI strings.
- **Out of scope:** Live API.
- **Acceptance:**
  - [ ] User can send a term and see a reply bubble
  - [ ] Empty and loading states exist
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0005
- **Effort:** M

### T0011 — Decode Claude client
- **Value:** Real explanations for slang/memes/abbreviations.
- **Scope:** API client + system prompt (judgment-free, origin-aware); secure key injection; error mapping.
- **Out of scope:** Multi-provider routing; voice input.
- **Acceptance:**
  - [ ] Live explanation returns for sample slang in debug/staging
  - [ ] No secrets committed
  - [ ] Failure surfaces friendly error
- **Agents/skills:** `ios-engineer`, `api-client-design`, `architecture-decision`
- **Depends on:** T0010
- **Effort:** L

### T0012 — You personalization
- **Value:** Feed/digest relevance + New here accessibility.
- **Scope:** Interest toggles, digest frequency, New here mode persistence (UserDefaults or equivalent).
- **Out of scope:** Account sync / login.
- **Acceptance:**
  - [ ] Preferences persist across launches
  - [ ] New here mode flag readable by Home/Decode (even if behavior is stubbed)
  - [ ] Digest frequency enum stored
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0005
- **Effort:** M

### T0013 — Wire preferences into feed / Decode tone
- **Value:** Personalization affects product behavior.
- **Scope:** Filter Home/Explore by interests; Decode/Home copy expands context when New here mode on.
- **Out of scope:** ML personalization.
- **Acceptance:**
  - [ ] Disabling a world hides it from Explore/Home filters
  - [ ] New here mode visibly changes explanation verbosity (mock or live)
- **Agents/skills:** `ios-engineer`, `product-strategist`
- **Depends on:** T0008, T0009, T0011, T0012
- **Effort:** M

### T0014 — Real trend / momentum API
- **Value:** Replace mocks with production-shaped data.
- **Scope:** Client + models; ADR for source; mapping to heat scores.
- **Out of scope:** Building a full scraping farm in-app.
- **Acceptance:**
  - [ ] ADR recorded
  - [ ] Home/Explore load remote data with loading/error states
  - [ ] Heat scores populate HeatMeter
- **Agents/skills:** `ios-engineer`, `api-client-design`, `architecture-decision`
- **Depends on:** T0006, T0008
- **Effort:** L

### T0015 — Save / follow trends
- **Value:** Return to items that matter; retention.
- **Scope:** Save toggle on card/detail; You or Home section for saved; local persistence.
- **Out of scope:** Social following of people.
- **Acceptance:**
  - [x] User can save and unsaved a trend (PWA; iOS stub)
  - [x] Saved list survives relaunch (PWA `trendy.saved.v1`)
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0008, T0012
- **Effort:** M

### T0016 — Polish, a11y, empty/error states
- **Value:** Trust and inclusivity for catching-up audiences.
- **Scope:** Dynamic Type, VoiceOver labels on HeatMeter, reduced motion, empty worlds, Decode errors.
- **Out of scope:** Full brand illustration set.
- **Acceptance:**
  - [ ] VoiceOver reads heat level meaningfully
  - [ ] Reduced motion disables non-essential animation
  - [ ] Empty/error states copy is non-judgmental
- **Agents/skills:** `ios-engineer`, `ios-debugging`
- **Depends on:** T0008, T0009, T0011
- **Effort:** M

### T0017 — Test suite expansion
- **Value:** Regression safety for heat, prefs, clients.
- **Scope:** Unit tests for models/services; smoke UI tests for tabs; CI note for macOS runners if added.
- **Out of scope:** Full snapshot library mandate.
- **Acceptance:**
  - [ ] Model/service tests green
  - [ ] At least one UI smoke test for tab shell
- **Agents/skills:** `ios-engineer`, `ios-testing`
- **Depends on:** T0003, T0006, T0012
- **Effort:** M

### T0018 — TestFlight beta
- **Value:** External feedback before store submission.
- **Scope:** Signing, archive, TestFlight checklist per `ios-app-store-release`.
- **Out of scope:** App Store public release copy finalization (can draft).
- **Acceptance:**
  - [ ] Build uploaded to TestFlight
  - [ ] Internal testers can install
  - [ ] Known issues listed
- **Agents/skills:** `ios-engineer`, `ios-app-store-release`, `software-dev-loop`
- **Depends on:** T0015, T0016, T0017
- **Effort:** L

---


### T0019 — Phase 4 decision: CLI & MCP for AI tools
- **Value:** Decide whether integrated AI tools get first-class Trendy access without derailing phone polish.
- **Scope:** Review `docs/cli-mcp-integration.md`; record go/no-go/defer in ADR; update phase checklist.
- **Out of scope:** Full MCP implementation (that's T0020+ if GO).
- **Acceptance:**
  - [x] Owner decision recorded (go / no-go / defer-until-P3) — **2026-09-14: CLI GO (Option B→C later); MCP DEFER**
  - [x] ADR or decision table in `docs/cli-mcp-integration.md` updated (`docs/adr/0001-cli-mcp.md`)
  - [x] README phase map matches decision
- **Agents/skills:** `product-strategist`, `architecture-decision`
- **Depends on:** Radar phase docs
- **Effort:** S
- **Status:** Done

### T0020 — Spike CLI (if Phase 4 GO)
- **Value:** Scriptable decode + radar ops for humans and CI.
- **Scope:** Thin CLI over lexicon + trends + `radar/run_ingest.py`.
- **Out of scope:** Remote API server.
- **Acceptance:**
  - [x] `trendy decode <term>` prints judgment-free explain from slang.json
  - [x] `trendy trends` lists hot items
  - [x] `trendy radar run` invokes ingest
  - [x] Documented in README
- **Agents/skills:** `implementer`, `software-dev-loop`
- **Depends on:** T0019 = GO
- **Effort:** M
- **Status:** Done (spike in `cli/`)

### T0021 — Spike MCP server (Python stdio) — **DONE (spike)**
- **Value:** Cursor / workbench agents can call Trendy tools natively.
- **Scope:** Local stdio MCP: `search_slang`, `get_trends`, `decode_term`, `radar_status`.
- **Out of scope:** Hosted remote MCP; write tools without auth story.
- **Acceptance:**
  - [x] MCP server starts via documented command (`trendy mcp`, `python3 cli/trendy.py mcp` from any cwd, or `python3 -m cli.mcp_server`)
  - [x] Tools return valid JSON against web/data
  - [x] Security notes in docs (no secrets leaked; read-only; no live-model keys)
  - [x] Optional workbench connector instructions (`docs/workbench.md`, Cursor snippet in `docs/cli-mcp-integration.md`)
- **Agents/skills:** `implementer`, `architecture-decision`
- **Depends on:** T0019 = GO, T0020 preferred first
- **Effort:** L
- **Status:** **Done** (spike, 2026-10-03) — local Python stdio next to the CLI. Tools: `decode_term`, `search_slang`, `get_trends`, `radar_status`. No hosted remote MCP. No write tools.

---


### T0022 — Phase 5 landscape review (Urban Dictionary & peers)
- **Value:** Avoid cloning UD; target real gaps (heat, New here, Radar).
- **Scope:** Complete matrix in `docs/product-landscape.md`; 5–8 competitors; differentiator lock.
- **Out of scope:** Building partnership integrations this ticket.
- **Acceptance:**
  - [ ] Matrix filled
  - [ ] Top 3 differentiators written into PRD addendum or landscape doc
  - [ ] Owner reviewed
- **Agents/skills:** `product-strategist`, `researcher`
- **Depends on:** —
- **Effort:** M

### T0023 — Rank and ticket novelty bets
- **Value:** Expand Trendy beyond lookup into sticky, ownable moments.
- **Scope:** Rank list in `docs/novelty-use-cases.md`; create tickets for top 2.
- **Out of scope:** Full build of all novelty ideas.
- **Acceptance:**
  - [ ] Top 2 bets chosen
  - [ ] Each has acceptance criteria ticket
  - [ ] Non-goals confirmed
- **Agents/skills:** `product-strategist`
- **Depends on:** T0022
- **Effort:** S

### T0024 — Prototype one novelty bet on PWA (after choice)
- **Value:** Learn fast on phone without waiting for iOS TestFlight.
- **Scope:** Ship a thin PWA experiment for chosen bet (e.g. anti-FOMO digest or paste-a-thread Decode).
- **Out of scope:** App Store release of the experiment.
- **Acceptance:**
  - [ ] Prototype usable on phone
  - [ ] Feedback notes captured
  - [ ] Keep / kill / iterate decision
- **Agents/skills:** `implementer`, `ios-engineer` (if porting), `product-strategist`
- **Depends on:** T0023
- **Effort:** M



### T0025 — Live Decode model-on-miss (LAN proxy)
- **Value:** Fresh niche slang without endless pack downloads; keys stay off-device.
- **Scope:** `python cli/trendy.py serve` proxy; PWA miss path + You prefs `liveDecodeUrl`; docs.
- **Out of scope:** Hosted public proxy; putting API keys in the browser.
- **Acceptance:**
  - [x] Proxy `POST /v1/decode` + `GET /health` on :8787 (CORS for LAN)
  - [x] PWA calls live only on weak/miss answers; curated/core hits skip live
  - [x] Timeout fallback never blank; SW trendy-v12
  - [x] Docs for Windows LAN setup (`docs/live-decode.md`)
- **Agents/skills:** `implementer`
- **Depends on:** T0020
- **Effort:** M
- **Status:** **Done** (2026-09-15 spike)

### T0026 — Community suggest → consensus → lexicon
- **Value:** Grow Decode coverage from real usage without endless curated packs; judgment-free.
- **Scope:** Suggest UI on weak answers; localStorage queue; `POST /v1/suggest` + consensus → `web/data/community-slang.json`; PWA load + rank; on-device demo mode; docs.
- **Out of scope:** Public hosted suggest API; moderation console; ML similarity.
- **Acceptance:**
  - [x] Suggest UI only on weak Decode (not curated/core hits)
  - [x] Min length + HTML strip + light local rate limit
  - [x] Consensus threshold 3; Jaccard ≥ 0.45 or containment
  - [x] Promoted `source: "community"`; PWA rankBonus 2000
  - [x] Proxy endpoints + local-only demo path
  - [x] Docs `docs/community-lexicon.md`; SW trendy-v13
- **Agents/skills:** `implementer`
- **Depends on:** T0025
- **Effort:** M
- **Status:** **Done** (2026-09-15)

### T0027 — Publish-readiness (v0.1.0)
- **Value:** Trendy can be installed and attached to agents safely, and the repo can go public once the owner chooses.
- **Scope:** Personal-info removal from the current tree; MCP spec compliance (UTF-8 bytes, version negotiation, -32602, argument validation, read-only annotations); `pyproject.toml` (`trendy-cli`) with bundled data; `server.json`; Abbreve Apache-2.0 license + `NOTICE`; proxy loopback default + token + CORS; data cleanup (abbreviation hijacks, junk YouTube/Wikipedia trends, age bands); PWA UI fixes; honest docs; Python CI job; daily Radar cron.
- **Out of scope:** Publishing to PyPI or the MCP registry; making the repo public; rewriting git history (needs separate owner confirmation).
- **Acceptance:**
  - [x] `pip install .` → `trendy decode`, `trendy mcp` work from any directory
  - [x] Python (CLI/MCP/proxy/radar) and node tests green in CI
  - [x] CLI + MCP output valid UTF-8 under `PYTHONIOENCODING=cp1252`
  - [ ] Owner: history scrub, make public, publish `trendy-cli` + registry entry
- **Status:** **Done** in-repo (2026-10-05); owner steps pending

## Suggested order

T0001 → … → T0018 → T0019 ✓ → T0020 ✓ → T0021 ✓ → T0025 ✓ → T0026 ✓ → T0027 ✓ → **T0022 → T0023 → T0024**
