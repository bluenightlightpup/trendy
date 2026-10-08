# CLAUDE.md — Trendy

**App:** Trendy helps people stay current on trends, memes and slang without endless scrolling. It explains meanings, origins and abbreviations, judgment-free.

**License:** MIT (Copyright (c) 2026 bluenightlightpup). The Abbreve-derived data in `web/data/abbreve.json` is Apache-2.0 (see `NOTICE`).

**Product surfaces, in priority order:**

1. **CLI + MCP** (`cli/`): stdlib Python. `trendy decode|trends|word|radar|mcp|serve`. Installable via `pyproject.toml` (`trendy-cli`).
2. **PWA** (`web/`): static client on the same `web/data`.
3. **iOS / SwiftUI** (`App/`): native app built from `project.yml` (XcodeGen), bundling `web/data/`; see `docs/xcode-setup.md`. Keep `App/Core/DecodeEngine.swift` in step with `web/decode-ai.js`, regenerate `App/Core/CoreLexicon.swift` with `node scripts/gen-core-lexicon.mjs` when CORE_ABBREVS change, and run `scripts/swift-linux-check.sh`. Word of the day must match across `web/wotd.js`, `cli/wotd.py` and `App/Core/WordOfTheDay.swift` (golden vectors in `Tests/Fixtures/wotd-golden.json`; spec `docs/word-of-the-day.md`).

**Rules:**

1. No secrets in the repo. Never commit `.env`, API keys, or `CLAUDE.local.md`.
2. Follow `docs/prd.md`, `docs/phased-implementation.md` and `docs/backlog.md`.
3. Keep Decode explanations judgment-free. This product serves people catching up and older audiences.
4. MCP tools are read-only. Don't add write tools without an ADR.
5. Design tokens: deep ink background with a hot pink / acid-lime / cyan heat scale. See `docs/design-tokens.md`.
6. Run the Python and node tests before pushing (see `AGENTS.md`).
