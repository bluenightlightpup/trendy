# CLI & MCP integration — design brief (Phase 4)

Status: **CLI GO; MCP NEXT** (updated 2026-10-03). Local Python stdio beside the CLI. Not a hosted server yet.

## Intent

Give integrated AI tools a first-class way to talk to Trendy:

| Surface | Who uses it | Example | Status |
|---------|-------------|---------|--------|
| **CLI** | Humans + scripts + CI + agents (shell-out) | `python cli/trendy.py decode 67` · `… radar run` · `… trends --min-heat 0.7` | **GO — spike shipped (T0020)** |
| **MCP server** | Cursor / Claude Desktop / workbench agents | Tools: `search_slang`, `get_trends`, `decode_term`, `radar_last_run` | **NEXT (T0021)** — Python stdio next to the CLI; not implemented in this pass |

## Relationship to existing pieces

- **Python (`cli/` + `radar/`)** is the source of truth agents call. The PWA / iOS app is a phone client on the same `web/data`, not the only product.
- **Trend Radar** (`radar/`) remains the training brain; CLI calls the same `web/data` + `radar/run_ingest.py` — not a second source of truth.
- **my-workbench** stays the agent/skills home; agents can shell out to the CLI until a Trendy MCP connector lands.

## Options

### A — Defer (ship phone polish first)
Pros: focus on Phase 3. Cons: agents keep reading raw JSON.

### B — CLI only (thin wrapper) ← **chosen for now**
Pros: fast, testable, useful for Radar ops. Cons: weaker “integrated AI” story than MCP.

### C — CLI + local stdio MCP (path later)
Pros: Cursor/Claude can call tools; still local/private. Cons: packaging + schema maintenance.

### D — Hosted remote MCP
Pros: always-on. Cons: auth, hosting cost, abuse — **not recommended for v1** (rejected for now).

## Current plan

1. **CLI in Python** (alongside Radar) — `cli/trendy.py` / `python -m cli`.
2. Must-have commands: `decode`, `trends`, `radar status`, `radar run`.
3. **MCP is no longer deferred** (owner, 2026-10-03). Next build is a **Python stdio** server beside the CLI (Option C), wrapping the same decode / trends / radar functions. Do not stand up a hosted remote MCP for that step.
4. Private/local-only; no hosted remote MCP.
5. Document in README; workbench note under `docs/workbench.md`.

## Open questions (remaining)

1. ~~Approve Phase 4 implementation now, or after Phase 3 TestFlight?~~ → **CLI approved now**; phone polish continues in parallel.
2. Private-only forever, or eventual public MCP for contributors? → **Private/local for now**; revisit with T0021.
3. Any must-have tools beyond decode + trends + radar status? → **Must-haves locked** for CLI v1. MCP tools stay `search_slang`, `get_trends`, `decode_term`, `radar_status` when the stdio server is built.

## Decision log

| Date | Decision | Notes |
|------|----------|-------|
| 2026-09-13 | Phase opened | Docs + README updated; awaiting go/no-go |
| 2026-09-14 | **CLI GO (Option B → path to C); MCP DEFER** | Owner: continue Phase 4. CLI approved (Option B first). MCP deferred until CLI spike proves useful (T0021). Private/local-only; no hosted remote MCP. Must-have CLI: decode, trends, radar status/run. ADR: `docs/adr/0001-cli-mcp.md`. |
| 2026-10-03 | **MCP un-deferred** | Owner: Trendy’s purpose is a CLI + MCP interface for AI tools. Server will be Python stdio next to `cli/trendy.py` (not hosted). T0021 is next, not deferred. PWA stays a client. |
