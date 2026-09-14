# ADR 0001 — CLI first, MCP deferred (Phase 4)

- **Status:** Accepted
- **Date:** 2026-09-14
- **Tickets:** T0019 (decision), T0020 (CLI spike), T0021 (MCP — deferred)

## Context

Phase 4 asked whether Trendy should expose **CLI** and/or **MCP** so humans, scripts, and AI tools can query slang/trends and drive Radar without the phone UI. Options in `docs/cli-mcp-integration.md`: A defer, B CLI-only, C CLI + local stdio MCP, D hosted remote MCP.

## Decision

1. **CLI: GO now** — ship Option **B** first (thin Python CLI alongside Radar), path toward Option **C** later.
2. **MCP: DEFER** — do not implement a MCP server until the CLI spike proves useful (T0021 stays deferred).
3. **Private / local-only** for now — no hosted remote MCP (Option D rejected for v1).
4. **Must-have CLI commands:** `decode`, `trends`, `radar status`, `radar run`.

## Consequences

- Agents and CI can shell out to `python cli/trendy.py …` (documented in README + `docs/workbench.md`) until MCP lands.
- MCP packaging/schema work is explicitly out of scope for this milestone.
- Revisit T0021 after CLI feedback; preferred next step remains local stdio MCP wrapping the same library (Option C).

## References

- `docs/cli-mcp-integration.md`
- `docs/phased-implementation.md` (Phase 4)
- `docs/backlog.md` (T0019–T0021)
