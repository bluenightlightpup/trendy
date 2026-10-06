# CLAUDE.md — Trendy

**App:** Trendy helps people stay current on trends, memes and slang without endless scrolling. It explains meanings, origins and abbreviations, judgment-free.

**License:** MIT (Copyright (c) 2026 bluenightlightpup). The Abbreve-derived data in `web/data/abbreve.json` is Apache-2.0 (see `NOTICE`).

**Product surfaces, in priority order:**

1. **CLI + MCP** (`cli/`): stdlib Python. `trendy decode|trends|radar|mcp|serve`. Installable via `pyproject.toml` (`trendy-cli`).
2. **PWA** (`web/`): static client on the same `web/data`.
3. **iOS / SwiftUI** (`App/`): experimental; see `docs/xcode-setup.md`.

**Rules:**

1. No secrets in the repo. Never commit `.env`, API keys, or `CLAUDE.local.md`.
2. Follow `docs/prd.md`, `docs/phased-implementation.md` and `docs/backlog.md`.
3. Keep Decode explanations judgment-free. This product serves people catching up and older audiences.
4. MCP tools are read-only. Don't add write tools without an ADR.
5. Design tokens: deep ink background with a hot pink / acid-lime / cyan heat scale. See `docs/design-tokens.md`.
6. Run the Python and node tests before pushing (see `AGENTS.md`).
