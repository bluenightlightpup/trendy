# CLI & MCP integration — design brief (Phase 4)

Status: **APPROVED — CLI GO; MCP DEFERRED** (2026-09-14)

## Intent

Give integrated AI tools a first-class way to talk to Trendy:

| Surface | Who uses it | Example | Status |
|---------|-------------|---------|--------|
| **CLI** | Humans + scripts + CI + agents (shell-out) | `python cli/trendy.py decode 67` · `… radar run` · `… trends --min-heat 0.7` | **GO — spike shipped (T0020)** |
| **MCP server** | Cursor / Claude Desktop / workbench agents | Tools: `search_slang`, `get_trends`, `decode_term`, `radar_last_run` | **DEFERRED (T0021)** until CLI proves useful |

## Relationship to existing pieces

- **PWA / iOS** remain the primary human product.
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
3. **MCP deferred** — revisit after CLI spike feedback; then wrap the same library as local stdio MCP (Option C).
4. Private/local-only; no hosted remote MCP.
5. Document in README; workbench note under `docs/workbench.md`.

## Open questions (remaining)

1. ~~Approve Phase 4 implementation now, or after Phase 3 TestFlight?~~ → **CLI approved now**; phone polish continues in parallel.
2. Private-only forever, or eventual public MCP for contributors? → **Private/local for now**; revisit with T0021.
3. Any must-have tools beyond decode + trends + radar status? → **Must-haves locked** for CLI v1; MCP tool list TBD when un-deferred.

## Decision log

| Date | Decision | Notes |
|------|----------|-------|
| 2026-09-13 | Phase opened | Docs + README updated; awaiting go/no-go |
| 2026-09-14 | **CLI GO (Option B → path to C); MCP DEFER** | Owner: continue Phase 4. CLI approved (Option B first). MCP deferred until CLI spike proves useful (T0021). Private/local-only; no hosted remote MCP. Must-have CLI: decode, trends, radar status/run. ADR: `docs/adr/0001-cli-mcp.md`. |
