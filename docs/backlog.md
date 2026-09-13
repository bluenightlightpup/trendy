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
  - [ ] MIT LICENSE present with 2026 bluenightlightpup copyright
  - [ ] validate.yml checks required docs
  - [ ] Templates render on GitHub
- **Agents/skills:** `implementer`, `git-branch-pr`
- **Depends on:** —
- **Effort:** S

### T0003 — Xcode project from App/ tree
- **Value:** Runnable iOS target for all feature work.
- **Scope:** Create Xcode app + unit test target per `docs/xcode-setup.md`; wire `App/` groups; shared scheme.
- **Out of scope:** Custom fonts packaging; CI macOS build (optional later).
- **Acceptance:**
  - [ ] App builds to Simulator (iOS 17+)
  - [ ] Unit test target runs
  - [ ] Folder groups match architecture
- **Agents/skills:** `ios-engineer`, `ios-xcode-setup`
- **Depends on:** T0002
- **Effort:** M

### T0004 — Design tokens in code
- **Value:** Signal identity visible in UI foundations.
- **Scope:** `TrendyColors`, `TrendyTypography`, heat gradient helpers aligned to `docs/design-tokens.md`.
- **Out of scope:** Shipping custom Space Grotesk / JetBrains Mono files (fallbacks OK).
- **Acceptance:**
  - [ ] Ink + heat tokens available to views
  - [ ] Mono/rounded fallbacks documented in code comments or tokens doc
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0003
- **Effort:** S

### T0005 — Tab shell navigation
- **Value:** Four-tab IA matches product mockup.
- **Scope:** Home / Decode / Explore / You tabs; deep ink chrome; placeholder feature roots.
- **Out of scope:** Feature content beyond placeholders.
- **Acceptance:**
  - [ ] Four tabs switch reliably
  - [ ] Selected tab visible; respects Dynamic Type basics
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0003, T0004
- **Effort:** S

### T0006 — Trend model + mock data service
- **Value:** Unblocks Home/Explore without APIs.
- **Scope:** `Trend`, `HeatLevel`/`heatScore`, `World`; `TrendService` mock list with momentum sort.
- **Out of scope:** Network I/O.
- **Acceptance:**
  - [ ] Mock dataset covers all four worlds
  - [ ] Momentum sort deterministic in tests
- **Agents/skills:** `ios-engineer`, `ios-testing`
- **Depends on:** T0003
- **Effort:** M

### T0007 — HeatMeter component
- **Value:** Signature velocity encoding on cards.
- **Scope:** Track cool → volt → hot; marker for score; reduced-motion safe.
- **Out of scope:** Live backend scores.
- **Acceptance:**
  - [ ] Renders across 0…1 scores
  - [ ] Uses heat tokens (cyan / lime / pink)
  - [ ] Snapshot or unit test for color/stop mapping optional but preferred
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0004
- **Effort:** M

### T0008 — Home heat feed + origin story
- **Value:** Primary “what’s peaking” experience.
- **Scope:** Momentum-sorted cards with HeatMeter; tap → origin story detail (mock copy).
- **Out of scope:** Save/follow; infinite scroll entertainment.
- **Acceptance:**
  - [ ] Feed sorted by momentum
  - [ ] Each card shows heat meter
  - [ ] Origin story reachable in ≤ 2 taps
- **Agents/skills:** `ios-engineer`, `ios-swiftui-feature`
- **Depends on:** T0005, T0006, T0007
- **Effort:** M

### T0009 — Explore by world
- **Value:** Organized browsing without app-hopping.
- **Scope:** Worlds: TikTok, internet culture, abbreviations, gaming; lists from mock service.
- **Out of scope:** Cross-world search ranking sophistication.
- **Acceptance:**
  - [ ] User can switch worlds
  - [ ] Lists filter to selected world
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
  - [ ] User can save and unsaved a trend
  - [ ] Saved list survives relaunch
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

## Suggested order

T0001 → T0002 → T0003 → T0004 → T0005 → T0006 → T0007 → T0008 / T0009 / T0010 → T0012 → T0011 → T0013 → T0014 → T0015 → T0016 → T0017 → T0018
