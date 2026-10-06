# Release checklist: Trendy iOS 1.0 (owner's MacBook)

Follow these steps top to bottom. Boxes marked ⚠️ have never been done for this project. In particular, the SwiftUI code was written on Linux and has **never been compiled in Xcode**, so set aside time for step 4.

## 0. One-time prerequisites

- [ ] An active **Apple Developer Program** membership. Note your **Team ID** from developer.apple.com → Account → Membership details.
- [ ] **Xcode 26 or later** from the Mac App Store. Since April 28, 2026, App Store Connect only accepts builds made with Xcode 26 and the iOS 26 SDK. The app still targets iOS 17+.
- [ ] Sign in to Xcode → Settings → Accounts with your Apple ID.
- [ ] Homebrew, then `brew install xcodegen` (any 2.40+ release).

## 1. Get the code and generate the project

```bash
git clone https://github.com/bluenightlightpup/trendy.git   # or: cd trendy && git pull --rebase
cd trendy
xcodegen generate          # writes Trendy.xcodeproj (gitignored; regenerate any time)
open Trendy.xcodeproj
```

`project.yml` is the source of truth. Settings you change only in Xcode are lost the next time you run `xcodegen generate`.

## 2. Signing and bundle ID

- [ ] Edit `project.yml` → `settings.base`:
  - `DEVELOPMENT_TEAM: "ABCDE12345"` (your Team ID; it's blank by default)
  - `TRENDY_BUNDLE_ID: com.bluenightlightpup.trendy` (change it if that ID is taken or you prefer another)
- [ ] Run `xcodegen generate` again and reopen the project.
- [ ] Target **Trendy** → Signing & Capabilities: "Automatically manage signing" is on, your team is selected, and there are no red errors. Xcode registers the App ID for you.

## 3. Sanity checks before building

- [ ] Target Trendy → Build Phases → Copy Bundle Resources lists `trends.json`, `slang.json`, `abbreve.json`, `community-slang.json`, `ABBREVE-LICENSE`, `NOTICE`, `Assets.xcassets` and `PrivacyInfo.xcprivacy`.
- [ ] General tab: Display Name **Trendy**, Version **1.0**, Build **1**, iPhone only, Portrait only, iOS 17.0.
- [ ] Assets.xcassets → AppIcon shows the 1024 px icon (dark gradient, heat ring, white "T").
- [ ] Optional: `scripts/swift-linux-check.sh` also runs on macOS (Xcode command-line tools plus Node). It parses every Swift file, builds and tests `App/Core`, and diffs Decode output against the PWA.

## 4. ⚠️ Build, fix, test

- [ ] Choose an **iPhone 17** (or any iOS 17+) simulator and press **⌘B**.
  - Any errors will most likely be in SwiftUI view files (`App/Features/**`, `App/DesignSystem/**`). The `App/Core/` engine already compiles and passes tests on Linux.
  - Typical quick fixes: add a missing `import`, adjust a modifier's argument label, or add an explicit type to a complex expression ("unable to type-check this expression in reasonable time": split the view into smaller `var`s).
- [ ] Press **⌘U** to run TrendyTests: decode tests (67, nah id win, alpha, na, W, i was so tired…), ranking, tolerant decoding, content safety and stores. All should pass.
- [ ] Press **⌘R** and smoke test:
  - Launch shows a dark launch screen, then four tabs: Home, Explore, Decode, You.
  - **Home:** the digest card shows; cards are sorted with rising/hot first; heat meter, lifecycle pill, age chip and clean tags (no "seed"/"radar"); tapping a card opens the origin story; ♥ saves; the *Saved* chip filters.
  - **Explore:** world chips filter; searching "rizz" finds it; "zzzz" shows **No matches**.
  - **Decode:** try `67`, `nah id win`, `Nah I’d win`, `alpha`, `na`, `W`, `i was so tired`, `xqzzy`. You should always get an answer with a label. Turn on Airplane Mode (or turn off You → Dictionary lookups): answers still appear, offline.
  - **You:** toggling a world updates Home; Digest *Off* hides the digest; New here changes the copy; the saved list allows swipe-to-delete; force-quit and relaunch keeps saves and settings; Credits shows the licenses; the Privacy link opens Safari.
  - Dynamic Type at the largest size and a quick VoiceOver pass: nothing is clipped or unlabeled.
- [ ] Optional: install on a real iPhone (plug it in, select it as the run destination, press ⌘R).
- [ ] Commit any fixes (`git pull --rebase` first, because the radar bot pushes daily).

## 5. Public URLs (required before you submit)

- [ ] Enable GitHub Pages: make the repo public (or use a paid plan), then repo → Settings → Pages → Source: **GitHub Actions**, and run the `pages` workflow (`gh workflow run pages.yml`). It publishes `site/` with the web app at `/app/`.
- [ ] Check that these load in a private browser window:
  - https://bluenightlightpup.github.io/trendy/privacy.html
  - https://bluenightlightpup.github.io/trendy/support.html
- [ ] If you host them elsewhere, update `AppLinks` in `App/Services/AppModel.swift` and the URLs in `app-store-listing.md`.

## 6. App Store Connect record

- [ ] appstoreconnect.apple.com → Apps → **+** → New App: platform iOS, name **Trendy** (fallback: *Trendy: Slang Decoder*), language English (U.S.), the bundle ID from step 2, SKU `trendy-ios-001`.
- [ ] **App Information:** subtitle, categories (Reference / Entertainment), content rights (Yes, licensed third-party content), and age rating. Copy all of it from `app-store-listing.md`. The expected age rating is **13+**.
- [ ] **App Privacy:** privacy policy URL, then "Data Not Collected".
- [ ] **Pricing and Availability:** Free, all territories (or your choice).

## 7. Archive and upload

- [ ] Run destination: **Any iOS Device (arm64)**.
- [ ] **Product → Archive**. The Organizer opens when it finishes.
- [ ] Click **Validate App** and fix anything it reports. Common issues: missing team, icon alpha (the icon is opaque RGB, so this shouldn't come up), privacy manifest (already included).
- [ ] Click **Distribute App → App Store Connect → Upload**. Keep automatic signing and "Upload symbols" on.
- [ ] Wait about 5–30 minutes for processing. You'll get an email, and the build appears under TestFlight. Export compliance is answered automatically by `ITSAppUsesNonExemptEncryption = NO`.

## 8. TestFlight

- [ ] TestFlight → Internal Testing → create a group, add yourself and your testers, and enable the build.
- [ ] Install via the TestFlight app on an iPhone and repeat the step 4 smoke test on the device.
- [ ] Optional external testing: needs a short Beta App Review, and you'll reuse the review notes.

## 9. Screenshots and metadata

- [ ] Take **6.9" iPhone** screenshots (1320 × 2868 or 1290 × 2796) from the iPhone 17 Pro Max simulator with ⌘S. See the shot list in `app-store-listing.md`.
- [ ] Version 1.0 page: screenshots, promotional text, description, keywords, support URL, copyright `2026 bluenightlightpup`.
- [ ] App Review Information: sign-in not required, your contact details, and the review notes from `app-store-listing.md`.

## 10. Submit

- [ ] Version page → Build → **+** → select the processed build.
- [ ] Pick a release option: manual release after approval is safest for 1.0.
- [ ] **Add for Review → Submit**. Review usually takes 24–48 hours. Answer any App Review messages in App Store Connect.

## Every later release

1. `git pull --rebase` to pick up fresh `web/data/` from the radar bot. Re-skim it for content (see `content-review.md`).
2. Bump `CURRENT_PROJECT_VERSION` in `project.yml` for **every** upload, and `MARKETING_VERSION` (1.0.1, 1.1, …) for each App Store release.
3. If `CORE_ABBREVS` changed in `web/decode-ai.js`, run `node scripts/gen-core-lexicon.mjs` from the repo root to regenerate `App/Core/CoreLexicon.swift`.
4. Run `xcodegen generate`, test with ⌘U, archive, upload, run TestFlight, and submit with "What's New" text.
