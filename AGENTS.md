# AGENTS.md — Trendy

Guidance for AI coding agents (Cursor, Claude Code, Codex, …) working in this repo.

## What Trendy is

A Python CLI and read-only stdio MCP server for decoding slang, abbreviations and meme trends. Agents call it. The PWA in `web/` is a client on the same data. The SwiftUI app in `App/` is experimental.

## Ground rules

- `cli/` is stdlib-only. Do not add runtime dependencies without an ADR.
- Data lives in `web/data/`. `abbreve.json` is Apache-2.0 (see `NOTICE`); keep attribution intact.
- No secrets in the repo: no `.env`, no API keys, no `CLAUDE.local.md`.
- Keep Decode wording judgment-free and parent-safe. If a term has a sexual meaning, say so plainly and without graphic detail.
- MCP tools stay read-only. Ingest (`trendy radar run`) is CLI-only.
- The Radar bot commits `web/data/*.json` and `radar/out/last-run.json` daily. Rebase before you push.

## Checks before a PR

```bash
python3 -m unittest discover -s cli -t .
python3 -m unittest discover -s radar -t . -p "test_*.py"
cd web && node --test tests/*.mjs
```

## Useful roles

| Role | When |
|------|------|
| implementer | Ticket-sized code or doc changes |
| reviewer | PR quality and risk review |
| product | PRD, backlog and acceptance criteria (`docs/prd.md`, `docs/backlog.md`) |
| researcher | Trend sources, API options, landscape notes |

See also `docs/workbench.md` (agent workflow) and `docs/cli-mcp-integration.md`.
