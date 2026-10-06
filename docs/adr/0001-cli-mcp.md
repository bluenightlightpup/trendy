# ADR 0001 — CLI first, then a local stdio MCP (Phase 4)

- **Status:** Accepted (amended 2026-10-03 and 2026-10-05)
- **Date:** 2026-09-14
- **Tickets:** T0019 (decision), T0020 (CLI), T0021 (MCP stdio server)

## Context

Phase 4 asked whether Trendy should expose a **CLI** and/or **MCP** so humans, scripts and AI tools can query slang and trends and drive Radar without the phone UI. The options in `docs/cli-mcp-integration.md` were: A defer, B CLI only, C CLI + local stdio MCP, D hosted remote MCP.

## Decision

1. **CLI: GO** (2026-09-14). A thin stdlib Python CLI beside Radar with `decode`, `trends`, `radar status` and `radar run`.
2. **MCP: local stdio server (Option C)** (2026-10-03). It was deferred at first, then un-deferred once the owner made "CLI + MCP for AI tools" the product's purpose. Tools are read-only: `decode_term`, `search_slang`, `get_trends`, `radar_status`.
3. **No hosted remote MCP (Option D rejected)** for v1. Auth, hosting cost and abuse risk outweigh the benefit.
4. **Packaging** (2026-10-05). Installable as `trendy-cli` with the data bundled. `server.json` is prepared for the MCP registry; publishing is a separate owner decision.

## Consequences

- Agents can shell out to `trendy …` or attach `trendy mcp`.
- MCP stays read-only. Ingest, the live model and the HTTP proxy remain CLI-only.
- The stdio server is hand-rolled on the stdlib (no SDK dependency), so protocol-version support has to be maintained in `cli/mcp_server.py`. `cli/test_mcp.py` covers it.

## References

- `docs/cli-mcp-integration.md`
- `docs/phased-implementation.md` (Phase 4)
- `docs/backlog.md` (T0019–T0021)
