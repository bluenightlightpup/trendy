# Contributing

Thanks for helping build **Trendy**.

## Ground rules

- Phone-first **iOS / SwiftUI**. Follow `docs/architecture.md` and `docs/design-tokens.md`.
- Tickets live in `docs/backlog.md`. Prefer vertical slices with clear acceptance criteria.
- Use **my-workbench** skills by name (`ios-swiftui-feature`, `software-dev-loop`, `git-branch-pr`, …). See `docs/workbench.md` and `AGENTS.md`.
- Do **not** commit secrets, `.env`, API keys, or `CLAUDE.local.md`.
- Keep Decode UX judgment-free; “New here mode” audiences matter.
- License is MIT — do not add restrictive licenses to seeded content.

## Workflow

1. Pick a ticket from `docs/backlog.md` (or open a feature request).
2. Branch via `git-branch-pr` conventions from the workbench.
3. Implement with `ios-swiftui-feature` / `api-client-design` as appropriate.
4. Add or update tests (`ios-testing`).
5. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md`.
6. Keep `.github/workflows/validate.yml` green.

## Xcode project

If you need a fresh Xcode app target, follow `docs/xcode-setup.md` (`ios-xcode-setup`).

## Docs changes

Product scope changes should update `docs/prd.md` and the backlog together (`write-prd`, `product-spec-to-tickets`). Prefer `product-strategist` + `ios-engineer` for larger shifts.
