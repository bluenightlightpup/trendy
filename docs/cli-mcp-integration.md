# CLI & MCP integration — design brief (Phase 4)

Status: **UNDER CONSIDERATION** (decision gate — not yet approved to implement)

## Intent

Give integrated AI tools a first-class way to talk to Trendy:

| Surface | Who uses it | Example |
|---------|-------------|---------|
| **CLI** | Humans + scripts + CI | `trendy decode "67"` · `trendy radar run` · `trendy trends --min-heat 0.7` |
| **MCP server** | Cursor / Claude Desktop / workbench agents | Tools: `search_slang`, `get_trends`, `decode_term`, `radar_last_run` |

## Relationship to existing pieces

- **PWA / iOS** remain the primary human product.
- **Trend Radar** (`radar/`) remains the training brain; CLI/MCP would call the same merge/store layer — not a second source of truth.
- **my-workbench** stays the agent/skills home; Trendy MCP would be a *connector* those agents can use.

## Options

### A — Defer (ship phone polish first)
Pros: focus on Phase 3. Cons: agents keep reading raw JSON.

### B — CLI only (thin wrapper)
Pros: fast, testable, useful for Radar ops. Cons: weaker “integrated AI” story than MCP.

### C — CLI + local stdio MCP (recommended if GO)
Pros: Cursor/Claude can call tools; still local/private. Cons: packaging + schema maintenance.

### D — Hosted remote MCP
Pros: always-on. Cons: auth, hosting cost, abuse — **not recommended for v1**.

## Recommended default if we greenlight

**Option C**, read-mostly v1:

1. CLI in Python (alongside Radar) or Node — pick one runtime.
2. MCP stdio server wrapping the same library.
3. Tools: `search_slang`, `get_trends`, `decode_term`, `radar_status` (read); optional `radar_run` gated behind `--write` / env flag.
4. Document in README; add workbench note under `docs/workbench.md`.

## Open questions for owner

1. Approve Phase 4 implementation now, or after Phase 3 TestFlight?
2. Private-only forever, or eventual public MCP for contributors?
3. Any must-have tools beyond decode + trends + radar status?

## Decision log

| Date | Decision | Notes |
|------|----------|-------|
| 2026-09-13 | Phase opened | Docs + README updated; awaiting go/no-go |
