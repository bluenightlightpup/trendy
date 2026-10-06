# Agent workflow for Trendy

Trendy is a product repo. Agent definitions, skills and usage logs are kept **outside** this repository; don't copy them in. This page covers what an agent needs to work here.

## Source of truth

- Implementation: this repo (`cli/`, `web/`, `radar/`, `App/`).
- Product scope: `docs/prd.md`, `docs/phased-implementation.md`, `docs/backlog.md`.
- Decisions: `docs/adr/`.

## Typical loops

| Task | Where |
|------|-------|
| CLI / MCP feature | `cli/`, tests in `cli/test_*.py` |
| Decode logic in the PWA | `web/decode-ai.js`, tests in `web/tests/` |
| Data fixes | `web/data/*.json` (keep formats; `abbreve.json` is single-line) |
| Radar sources | `radar/adapters/`, `radar/config.yaml`, `radar/test_radar.py` |
| Release / packaging | `pyproject.toml`, `server.json` |

## Use Trendy from an agent

Prefer the CLI or MCP over ad-hoc `jq` on `web/data/*.json`.

```bash
trendy decode <term> --json        # or: python3 cli/trendy.py decode <term> --json
trendy trends --min-heat 0.7 --limit 20 --json
trendy radar status --json
trendy mcp                         # stdio MCP server
```

MCP connector from a checkout (absolute path, works from any cwd):

```json
{
  "mcpServers": {
    "trendy": {
      "command": "python3",
      "args": ["/ABSOLUTE/PATH/TO/trendy/cli/trendy.py", "mcp"]
    }
  }
}
```

Tools: `decode_term`, `search_slang`, `get_trends`, `radar_status`. All read-only, with no secrets in results. Details: `docs/cli-mcp-integration.md`, `docs/adr/0001-cli-mcp.md`.
