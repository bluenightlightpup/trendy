# Phased implementation — Trendy

Aligned with workbench skills: `write-prd`, `product-spec-to-tickets`, `ios-xcode-setup`, `ios-swiftui-feature`, `api-client-design`, `ios-testing`, `ios-app-store-release`, `software-dev-loop`.

## Phase 0 — Foundations (docs & repo)

**Outcome:** Shared product truth and a clean app repo scaffold.

- PRD (`docs/prd.md`)
- Repo structure, MIT license, contributing/security, CODEOWNERS
- Backlog with acceptance criteria (`docs/backlog.md`)
- Architecture + design tokens + workbench usage docs
- Idea extracts under `docs/ideas/`
- Light CI validate workflow for required docs

**Exit criteria:** PRD reviewed; tickets ordered; scaffold opens cleanly on GitHub as `bluenightlightpup/trendy`.

## Phase 1 — Skeleton + Home/Explore with mock data

**Outcome:** Runnable SwiftUI shell with signal design and browsable mock trends.

- Xcode project per `docs/xcode-setup.md` / `ios-xcode-setup`
- Design tokens in code (ink + heat scale; font fallbacks)
- Tab shell: Home, Decode, Explore, You
- **Home:** momentum-sorted mock feed + **HeatMeter** on cards; tap → origin story (mock)
- **Explore:** worlds (TikTok, internet culture, abbreviations, gaming) with mock lists
- Placeholder Decode / You screens
- Mock `Trend` models + in-memory service

**Exit criteria:** Simulator build; Home heat feed and Explore worlds demoable with mocks.

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

- Save / follow trends
- Polish heat meter, motion, accessibility, empty/error states
- Unit + UI tests (`ios-testing`); debugging playbook (`ios-debugging`)
- TestFlight via `ios-app-store-release`
- Backlog grooming for post-v1 (social light features only if justified)

**Exit criteria:** TestFlight build; save/follow works; tests green on CI where applicable.

## Phase map (quick)

| Phase | Focus |
|-------|--------|
| **P0** | PRD, repo, backlog |
| **P1** | Skeleton, design tokens, Home heat feed, Explore worlds, mock data |
| **P2** | Decode Claude chat, You personalization, real APIs |
| **P3** | Save/follow, polish, tests, TestFlight |
