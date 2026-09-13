# Xcode setup — Trendy

Follow workbench skill **`ios-xcode-setup`**. This scaffold ships **Swift sources under `App/`** without a fragile checked-in `.pbxproj`. Create the Xcode project locally (or in CI macOS) with the steps below.

## Prerequisites

- Xcode 15+ (SwiftUI lifecycle)
- Deployment target **iOS 17.0**
- Bundle ID suggestion: `com.bluenightlightpup.trendy` (adjust as needed)

## Create the project

1. Open Xcode → **File → New → Project…**
2. Choose **App** (iOS).
3. Product Name: `Trendy`
4. Interface: **SwiftUI** · Language: **Swift** · Storage: None
5. Include Tests: **yes** (Unit Tests). UI Tests optional but recommended.
6. Save the project **inside** this repo root (so `Trendy.xcodeproj` sits next to `App/`, `docs/`, etc.), **or** save as repo root and replace the generated single-file app with the `App/` tree.

## Replace generated sources with this tree

1. Delete Xcode’s default `ContentView.swift` / `TrendyApp.swift` if they conflict.
2. In the Project Navigator: **File → Add Files to "Trendy"…**
3. Select the `App/` folder → **Create groups** → add to the Trendy target.
4. Ensure these are in the app target:
   - `App/TrendyApp.swift` (`@main`)
   - `App/ContentView.swift`
   - `App/Navigation/*`
   - `App/Features/**`
   - `App/DesignSystem/*`
   - `App/Services/*`
   - `App/Models/*`
   - `App/Resources/*` (folder reference or group)
5. Add `Tests/TrendyTests/` to the unit test target.

## Scheme & settings

- Shared scheme **Trendy** (Debug/Release).
- Display name: Trendy
- Orientations: phone portrait primary (landscape optional later).
- Keep secrets out of the project: use local gitignored `.xcconfig` or scheme env for API keys (`api-client-design`).

## Verify

- [ ] Build succeeds for iPhone simulator
- [ ] Four tabs appear (Home, Decode, Explore, You)
- [ ] Unit test target runs (even if placeholder)

## SPM

No required packages in Phase 1. When adding networking helpers, prefer File → Add Package Dependencies and record rationale via `architecture-decision` if non-obvious.

## Git

Prefer committing `Trendy.xcodeproj` once stable. Until then, this doc + `App/` sources are enough for another machine to recreate the project. Extend root `.gitignore` for `xcuserdata`, `DerivedData`, etc. (already seeded).
