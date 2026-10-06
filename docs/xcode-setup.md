# Xcode setup: Trendy iOS

The app's Swift sources live in `App/`, and **XcodeGen** `project.yml` generates `Trendy.xcodeproj`, so nothing is hand-wired. The generated project is gitignored. `project.yml` is the source of truth.

## Prerequisites

- **Xcode 26+**. App Store uploads require the iOS 26 SDK. The deployment target is **iOS 17.0**.
- `brew install xcodegen`
- No Swift packages or third-party dependencies

## Generate

```bash
xcodegen generate
open Trendy.xcodeproj
```

This creates:

- **Trendy**, the iPhone app (portrait, dark appearance). Its sources are `App/`. Its resources are the four `web/data/*.json` files, `web/data/ABBREVE-LICENSE`, `NOTICE`, `App/Resources/Assets.xcassets` (AppIcon, AccentColor, LaunchBackground) and `App/Resources/PrivacyInfo.xcprivacy`. Its Info.plist is `Config/Info.plist`.
- **TrendyTests**, the unit tests in `Tests/TrendyTests` (decode ladder, ranking, tolerant JSON, content safety, stores)
- **Trendy**, a shared scheme that runs the tests with code coverage

Run `xcodegen generate` again after adding or removing files.

## Configuration (`project.yml` → `settings.base`)

| Setting | Default | Notes |
| --- | --- | --- |
| `TRENDY_BUNDLE_ID` | `com.bluenightlightpup.trendy` | The tests use `$(TRENDY_BUNDLE_ID).tests` |
| `DEVELOPMENT_TEAM` | `""` | Set this to your Team ID. Signing is Automatic. |
| `MARKETING_VERSION` | `1.0` | The user-visible version |
| `CURRENT_PROJECT_VERSION` | `1` | Bump it for every upload |
| `SWIFT_VERSION` | `5.0` | Swift 5 language mode (builds fine with the Xcode 26 compiler) |
| `IPHONEOS_DEPLOYMENT_TARGET` | `17.0` | |

## Source layout

```
App/
  TrendyApp.swift, ContentView.swift    app entry, environment objects
  Core/          Foundation-only: Models, DecodeEngine, CoreLexicon (generated), TrendRanking,
                 ContentSafety, TrendyData (bundle loader), DictionaryClient, TextTools
  DesignSystem/  colors (PWA palette), typography, shared components
  Features/      Home (feed, card, detail, heat meter), Explore, Decode, You
  Navigation/    RootTabView
  Services/      AppModel, PreferencesStore, SavedTrendsStore (UserDefaults)
  Resources/     Assets.xcassets, PrivacyInfo.xcprivacy
Config/Info.plist
Tests/TrendyTests/
```

`App/Core` contains no SwiftUI. It compiles and tests on Linux as well:

```bash
scripts/swift-linux-check.sh   # swiftc -parse on all files, build and test Core, and decode parity vs web/decode-ai.js
```

## Keeping parity with the PWA

- **Data** is read directly from `web/data/` at build time, with no copies.
- **CORE_ABBREVS / phrase aliases** are generated from `web/decode-ai.js`. Run `node scripts/gen-core-lexicon.mjs` from the repo root after changing them, then run the check script.
- **Decode logic** is a line-by-line port of `web/decode-ai.js`. When you change the JS ladder, mirror the change in `App/Core/DecodeEngine.swift`. The check script's parity step diffs both engines over about 1,000 queries.
- **Ranking** (`TrendRanking.swift`) mirrors `homeRelevanceScore` and the lifecycle weights in `web/app.js`.

## App icon

`App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` is a single 1024 px opaque PNG, and Xcode derives the other sizes. To regenerate it: `python3 scripts/make_app_icon.py` (needs Pillow).

## Release

See `docs/app-store/release-checklist.md` and `docs/testflight.md`.
