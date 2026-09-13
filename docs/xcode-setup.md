# Xcode setup — Trendy

Follow workbench skill **`ios-xcode-setup`**. This repo ships Swift sources under `App/` plus an **XcodeGen** `project.yml` so a Mac can generate `Trendy.xcodeproj` without hand-wiring groups.

## Prerequisites

- Xcode 15+ (SwiftUI lifecycle)
- Deployment target **iOS 17.0**
- Bundle ID: `com.bluenightlightpup.trendy`
- [Homebrew](https://brew.sh) (for XcodeGen)

## Recommended: generate with XcodeGen

From the repo root on a Mac:

```bash
brew install xcodegen
xcodegen generate
open Trendy.xcodeproj
```

This creates:

- App target **Trendy** (sources from `App/`)
- Unit test target **TrendyTests** (sources from `Tests/TrendyTests`)
- Shared scheme **Trendy** that runs unit tests

Regenerate after adding/removing source folders so the project stays in sync with the tree.

### Verify

- [ ] Build succeeds for iPhone simulator
- [ ] Four tabs appear (Home, Decode, Explore, You)
- [ ] Home shows mock heat feed; Explore filters by world
- [ ] Unit tests (`⌘U`) pass

## Manual create (fallback)

If you cannot use XcodeGen:

1. Open Xcode → **File → New → Project…**
2. Choose **App** (iOS).
3. Product Name: `Trendy`
4. Interface: **SwiftUI** · Language: **Swift** · Storage: None
5. Include Tests: **yes** (Unit Tests).
6. Save the project **inside** this repo root (so `Trendy.xcodeproj` sits next to `App/`, `docs/`, etc.).
7. Delete Xcode’s default `ContentView.swift` / `TrendyApp.swift` if they conflict.
8. **File → Add Files to "Trendy"…** → select `App/` → **Create groups** → add to the Trendy target.
9. Add `Tests/TrendyTests/` to the unit test target.
10. Set bundle ID `com.bluenightlightpup.trendy`, deployment iOS 17.0.

Ensure these are in the app target:

- `App/TrendyApp.swift` (`@main`)
- `App/ContentView.swift`
- `App/Navigation/*`
- `App/Features/**`
- `App/DesignSystem/*`
- `App/Services/*`
- `App/Models/*`
- `App/Resources/*` (folder reference or group)

## Scheme & settings

- Shared scheme **Trendy** (Debug/Release).
- Display name: Trendy
- Orientations: phone portrait primary (landscape optional later).
- Keep secrets out of the project: use local gitignored `.xcconfig` or scheme env for API keys (`api-client-design`).

## SPM

No required packages in Phase 1. When adding networking helpers, prefer File → Add Package Dependencies and record rationale via `architecture-decision` if non-obvious.

## Git

`project.yml` is the source of truth for project layout. Prefer committing a generated `Trendy.xcodeproj` once it is stable on a Mac; until then, regenerate locally with XcodeGen. Root `.gitignore` already covers `xcuserdata`, `DerivedData`, etc.
