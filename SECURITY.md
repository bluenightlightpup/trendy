# Security Policy

## Supported versions

Trendy is actively maintained on the default branch. Report issues against the latest commit.

## Reporting a vulnerability

Do **not** open a public GitHub issue for security-sensitive findings.

Use GitHub's **private vulnerability reporting** (Security tab → *Report a vulnerability*) or privately message the owner (**@bluenightlightpup**) with:

- Description of the issue
- Steps to reproduce (if applicable)
- Impact assessment
- Any suggested fix

## Scope notes

- This repo must not contain secrets, API keys, tokens, or private credentials.
- Claude / third-party API keys belong in local gitignored config or CI secrets — never in source.
- `CLAUDE.local.md` and `.env*` are gitignored — never force-add them.
- Treat Decode prompts carefully: do not instruct models to exfiltrate user credentials or bypass access controls.
- The MCP server is local stdio and read-only. The optional HTTP proxy (`trendy serve`) binds `127.0.0.1` by default, refuses non-loopback binds without `TRENDY_PROXY_TOKEN`, and restricts CORS to local and private-LAN origins. Reports about bypassing these controls are in scope.
