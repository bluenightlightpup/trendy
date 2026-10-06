# Contributing

Thanks for helping build **Trendy**.

## Ground rules

- The CLI and MCP server (`cli/`) come first. They are stdlib-only Python 3.10+. The PWA (`web/`) is a client on the same data. The SwiftUI app (`App/`) is experimental.
- Tickets live in `docs/backlog.md`. Prefer vertical slices with clear acceptance criteria.
- Do **not** commit secrets, `.env`, API keys, or `CLAUDE.local.md`.
- Keep Decode UX judgment-free; "New here mode" audiences matter.
- Trendy is MIT. Third-party data must carry a compatible license and attribution: Abbreve is Apache-2.0, see `NOTICE`.

## Workflow

1. Pick a ticket from `docs/backlog.md` (or open a feature request).
2. Create a branch (`feat/…`, `fix/…`, `docs/…`).
3. Implement and add or update tests:
   ```bash
   python3 -m unittest discover -s cli -t .
   python3 -m unittest discover -s radar -t . -p "test_*.py"
   cd web && node --test tests/*.mjs
   ```
4. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md`.
5. Keep `.github/workflows/validate.yml` green.

The Radar workflow commits data daily, so run `git pull --rebase` before pushing.

## Xcode project

If you need a fresh Xcode app target, follow `docs/xcode-setup.md`.

## Docs changes

Product scope changes should update `docs/prd.md` and the backlog together.
