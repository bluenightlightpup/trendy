# Trendy

**Trendy** is a phone-first iOS app: an AI assistant that helps you stay current on trends, memes, and slang **without** burning hours of screentime. Catch up on culture, decode abbreviations judgment-free, and keep signals organized in one place — built for people who don’t want FOMO and for older users who want slang context.

> **License:** MIT · Copyright (c) 2026 bluenightlightpup  
> **GitHub (planned):** `bluenightlightpup/trendy`  
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

## Repo layout

```
App/                 SwiftUI source (create Xcode project via docs/xcode-setup.md)
web/                 Progressive Web App (static; try on phone without Xcode)
Tests/TrendyTests/   Unit test stubs
docs/                PRD, phases, backlog, architecture, design tokens, ideas
.github/             Issue/PR templates + light validate workflow
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
| `docs/phased-implementation.md` | Phase 0–3 plan |
| `docs/backlog.md` | Numbered tickets (T0001+) |
| `docs/architecture.md` | App structure & boundaries |
| `docs/design-tokens.md` | Colors, type, heat scale |
| `docs/workbench.md` | How this repo uses my-workbench |
| `docs/xcode-setup.md` | Create Xcode project from this tree |
| `docs/ideas/` | Owner idea extracts (plain text) |

## Sync note

Local idea path may be Desktop “trendy docs”; **this app repo is separate from my-workbench**. Agents/skills stay in the workbench; product code and app docs live here.


## Try on your phone

A static **Progressive Web App** lives in [`web/`](web/) — same tabs (Home, Decode, Explore, You), mock trends, and slang decoder. No Xcode required.

```bash
npx --yes serve web -l 4173
# or: python3 -m http.server 4173 --directory web
```

Open the URL on your phone (same Wi‑Fi), then Add to Home Screen. Details: [`web/README.md`](web/README.md).

## Contributing

See `CONTRIBUTING.md`. Use workbench skills (`git-branch-pr`, `software-dev-loop`, etc.). Security: `SECURITY.md`. Owner: `@bluenightlightpup` (`CODEOWNERS`).
