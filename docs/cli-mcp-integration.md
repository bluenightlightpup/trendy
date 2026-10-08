# CLI & MCP integration (Phase 4)

Status: **shipped.** CLI v0.1.0 plus a local stdio MCP server. Packaged as `trendy-cli` (`pyproject.toml`); not yet published to PyPI. There is no hosted or remote MCP.

## Surfaces

| Surface | Who uses it | Example |
|---------|-------------|---------|
| **CLI** | Humans, scripts, CI, agents that shell out | `trendy decode 67` · `trendy trends --min-heat 0.7 --json` · `trendy word` · `trendy radar status` |
| **MCP server** | Cursor, Claude Desktop, any MCP client | Tools: `decode_term`, `search_slang`, `get_trends`, `radar_status`, `word_of_the_day` |

The Python code in `cli/` (shipped as `trendy_cli`) is the source of truth that agents call. The PWA and the experimental iOS app are clients on the same `web/data`. Trend Radar (`radar/`) refreshes that data; the CLI reads it and can start an ingest from a checkout (`trendy radar run`).

## Install and run

```bash
python3 -m pip install .            # from a clone; installs trendy, trendy-mcp, trendy-cli
trendy mcp                          # stdio MCP server (same as: trendy-mcp)
```

From a checkout without installing, any cwd works because data paths resolve relative to the code:

```bash
python3 /ABSOLUTE/PATH/TO/trendy/cli/trendy.py mcp
python3 -m cli.mcp_server           # from the repo root
```

Only JSON-RPC goes to stdout, always as UTF-8 bytes, even on Windows code pages such as cp1252. Diagnostics go to stderr.

Data resolution order: `TRENDY_DATA_DIR`, then `web/data` in a checkout, then the copy bundled in the installed package. When installed, writable state (community suggestions) goes to `TRENDY_HOME` (default `~/.trendy`).

## Client configuration

Installed:

```json
{ "mcpServers": { "trendy": { "command": "trendy", "args": ["mcp"] } } }
```

From a checkout (absolute path, no `cwd` needed):

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

On Windows, use `"command": "py"` (or the full path to `python.exe`) and an escaped path such as `"C:\\path\\to\\trendy\\cli\\trendy.py"`. With uv: `"command": "uvx", "args": ["--from", "/ABSOLUTE/PATH/TO/trendy", "trendy", "mcp"]`.

## Tools

All tools are annotated `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true` and `openWorldHint: false`. They read only `web/data/*.json` (including `word-of-the-day.json`) and `radar/out/last-run.json`, or the bundled copies when installed.

| Tool | Arguments | Returns |
|------|-----------|---------|
| `decode_term` | `term` (string, required) | `found`, `meaning`, `explain`, `origin`, `age`, `kind` (slang / texting abbreviation / community) |
| `search_slang` | `query` (≥ 2 chars, whole-word match), `limit` 1–50 | matching lexicon hits |
| `get_trends` | `min_heat` 0–1, `limit` 1–50, `world` | hot trends, highest heat first |
| `radar_status` | none | last ingest summary (adapters, errors, catalog size) |
| `word_of_the_day` | `date` (optional, `YYYY-MM-DD`; default today on the server's clock) | `term`, `meaning`, `explain`, `example`, `origin`, `age`, `worlds`, `trend` (lifecycle + heat 0–100, or null), `yesterday`, `share`, `decode_more`, `pool_size`. Same word as the PWA, site and iOS app for that date ([spec](word-of-the-day.md)) |

## Protocol behaviour

- Negotiates `protocolVersion` with the client. Supported: `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`. If the client asks for an unsupported version, the server answers with its latest.
- `structuredContent` is included when the negotiated version is `2025-06-18` or later.
- Unknown tool → JSON-RPC error `-32602`.
- Bad arguments (wrong types, missing required keys, out-of-range values, unknown keys) → a tool result with `isError: true` and a readable message.
- Malformed JSON or invalid UTF-8 → `-32700`. JSON-RPC batches are rejected (`-32600`).

## Security

- **Local stdio only.** No listening port and no hosted endpoint.
- **Read-only tools.** Ingest (`radar run`), the live model (`decode --live`) and the proxy (`serve`) are CLI-only.
- **No secrets in results.** Payloads are a whitelist of lexicon and catalog fields. Token-like keys and values are redacted. The server never reads model API keys.
- **No live model on MCP.** A lexicon miss returns `found: false`.
- The trust boundary is the user running the process.

The optional HTTP proxy (`trendy serve`) is a separate surface. It binds `127.0.0.1` by default, requires `TRENDY_PROXY_TOKEN` for any non-loopback bind, and restricts CORS. See `docs/live-decode.md`.

## MCP registry

`server.json` at the repo root describes the server for the official MCP registry (`io.github.bluenightlightpup/trendy`, PyPI package `trendy-cli`, stdio, argument `mcp`). The README carries the matching `mcp-name:` marker. Publishing order, when the owner decides: make the repo public → publish `trendy-cli` to PyPI → `mcp-publisher publish`.

## Decision log

| Date | Decision | Notes |
|------|----------|-------|
| 2026-09-13 | Phase opened | Options: A defer, B CLI only, C CLI + local stdio MCP, D hosted MCP |
| 2026-09-14 | CLI GO; MCP deferred | ADR `docs/adr/0001-cli-mcp.md` |
| 2026-10-03 | MCP un-deferred and shipped (Option C) | Python stdio next to the CLI; read-only tools; not hosted |
| 2026-10-05 | Productised | MCP spec compliance (version negotiation, -32602, argument validation, UTF-8 bytes), packaging (`trendy-cli`), `server.json`, proxy auth |
| 2026-10-08 | `word_of_the_day` tool + `trendy word` | Fifth read-only tool; deterministic daily pick shared with PWA, site and iOS ([spec](word-of-the-day.md)) |
