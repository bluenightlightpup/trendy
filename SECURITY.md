# Security Policy

## Supported versions

Trendy is actively maintained on the default branch. Report issues against the latest commit.

## Reporting a vulnerability

Do **not** open a public GitHub issue for security-sensitive findings.

Privately message the owner (**@bluenightlightpup**) with:

- Description of the issue
- Steps to reproduce (if applicable)
- Impact assessment
- Any suggested fix

## Scope notes

- This repo must not contain secrets, API keys, tokens, or private credentials.
- Claude / third-party API keys belong in local gitignored config or CI secrets — never in source.
- `CLAUDE.local.md` and `.env*` are gitignored — never force-add them.
- Treat Decode prompts carefully: do not instruct models to exfiltrate user credentials or bypass access controls.
