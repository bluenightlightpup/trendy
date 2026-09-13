# CLAUDE.md — Trendy

**App:** Trendy — an AI assistant that helps people stay current on trends, memes, and slang without massive screentime. Reduce FOMO; explain origins and abbreviations; organize culture signals in one place.

**License:** MIT (Copyright (c) 2026 bluenightlightpup).

**Platform:** Phone-first **iOS / SwiftUI**. Prefer building against the App folder tree; create the Xcode project per `docs/xcode-setup.md` and the workbench skill `ios-xcode-setup`.

**Workbench:** Agents and skills live in [my-workbench](https://github.com/bluenightlightpup/my-workbench). Do not duplicate the workbench into this repo. Use these skill names when working here:

- `ios-xcode-setup`, `ios-swiftui-feature`, `ios-testing`, `ios-debugging`, `ios-app-store-release`
- `api-client-design`, `architecture-decision`, `software-dev-loop`
- `product-spec-to-tickets`, `write-prd`, `git-branch-pr`, `log-usage`

**Rules:**

1. No secrets in the repo. Never commit `.env`, API keys, or `CLAUDE.local.md`.
2. Follow `docs/prd.md`, `docs/phased-implementation.md`, and `docs/backlog.md`.
3. Prefer workbench skills over one-off prompts; log meaningful usage via `log-usage` in the workbench.
4. Keep Decode explanations judgment-free — this product serves catching-up and older audiences.
5. Design tokens: deep ink + hot pink / acid-lime / cyan heat scale — see `docs/design-tokens.md`.
