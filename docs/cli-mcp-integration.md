# CLI & MCP integration — design brief (Phase 4)

Status: **CLI GO; MCP spike shipped** (updated 2026-10-03). Local Python stdio beside the CLI. Not a hosted server.

## Intent

Give integrated AI tools a first-class way to talk to Trendy:

| Surface | Who uses it | Example | Status |
|---------|-------------|---------|--------|
| **CLI** | Humans + scripts + CI + agents (shell-out) | `python cli/trendy.py decode 67` · `… radar run` · `… trends --min-heat 0.7` | **GO — spike shipped (T0020)** |
| **MCP server** | Cursor / Claude Desktop / workbench agents | Tools: `decode_term`, `search_slang`, `get_trends`, `radar_status` | **Spike shipped (T0021)** — local Python stdio; not hosted |

## Relationship to existing pieces

- **Python (`cli/` + `radar/`)** is the source of truth agents call. The PWA / iOS app is a phone client on the same `web/data`, not the only product.
- **Trend Radar** (`radar/`) remains the training brain; CLI calls the same `web/data` + `radar/run_ingest.py` — not a second source of truth.
- **my-workbench** stays the agent/skills home. Agents can shell out to the CLI or attach the local stdio MCP connector below.

## Options

### A — Defer (ship phone polish first)
Pros: focus on Phase 3. Cons: agents keep reading raw JSON.

### B — CLI only (thin wrapper) ← **chosen for now**
Pros: fast, testable, useful for Radar ops. Cons: weaker “integrated AI” story than MCP.

### C — CLI + local stdio MCP ← **shipped as a spike (T0021)**
Pros: Cursor/Claude can call tools; still local/private. Cons: packaging + schema maintenance.

### D — Hosted remote MCP
Pros: always-on. Cons: auth, hosting cost, abuse — **not recommended for v1** (rejected for now).

## Current plan

1. **CLI in Python** (alongside Radar) — `cli/trendy.py` / `python -m cli`.
2. Must-have commands: `decode`, `trends`, `radar status`, `radar run`.
3. **MCP spike is in** (owner, 2026-10-03). A **Python stdio** server sits beside the CLI (Option C) and wraps the same decode / trends / radar reads. Do not stand up a hosted remote MCP.
4. Private/local-only; no hosted remote MCP. No write tools on MCP (`radar run` stays CLI-only).
5. Documented in README and `docs/workbench.md`.


## Run the MCP server

Stdlib JSON-RPC over stdin/stdout (no extra packages). **cwd = repo root.** Nothing but JSON-RPC goes to stdout.

```bash
python cli/trendy.py mcp
# or
python -m cli.mcp_server
```

Tools (read-only, same files as the CLI: `web/data/*.json`, `radar/out/last-run.json`):

| Tool | Arguments | Returns |
|------|-----------|---------|
| `decode_term` | `term` | `meaning`, `explain`, `origin`, `age` when the lexicon has them |
| `search_slang` | `query`, optional `limit` (1–50, default 20) | matching lexicon hits |
| `get_trends` | optional `min_heat`, `limit`, `world` | hot trends from `web/data/trends.json` |
| `radar_status` | none | last local ingest summary |

MCP does **not** call the live Decode model and does **not** run ingest. Use the CLI for `decode --live`, `serve`, and `radar run`.

### Cursor / Claude Desktop

Snippet for Cursor (`~/.cursor/mcp.json`) or the same shape in Claude Desktop (`claude_desktop_config.json`). Replace the path with this checkout. `cwd` must be the repo root so `cli` imports and `web/data` resolve.

```json
{
  "mcpServers": {
    "trendy": {
      "command": "python",
      "args": ["cli/trendy.py", "mcp"],
      "cwd": "/ABSOLUTE/PATH/TO/trendy"
    }
  }
}
```

Equivalent command: `python -m cli.mcp_server` with the same `cwd`.

## Security

- **Local stdio only.** There is no hosted remote MCP and no listening port on this server.
- **Read-only tools.** No create/update/delete. Radar ingest stays on the CLI (`radar run`).
- **No secrets in results.** Tool payloads are a whitelist of lexicon and catalog fields. Keys named like tokens/passwords are redacted, and token-shaped strings are replaced with `[redacted]`. The server never reads `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` and never puts the environment into a result.
- **No live model on MCP.** A lexicon miss returns `found: false`. It does not fall through to a provider.
- Trust boundary is the user running the process. Do not point the command at a shared host or pipe untrusted stdin from the public internet.

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
| 2026-10-03 | **T0021 spike done** | Local stdio MCP: `python cli/trendy.py mcp`. Tools `decode_term`, `search_slang`, `get_trends`, `radar_status`. Read-only. No hosted remote MCP. |
