# TestFlight: Trendy iOS

This path needs a **Mac running Xcode 26+ and an Apple Developer account**. The Linux/agent box cannot compile SwiftUI, archive or upload.
For the full step-by-step release (signing, App Store Connect record, screenshots, submission), follow
[`docs/app-store/release-checklist.md`](app-store/release-checklist.md). This page covers just the TestFlight loop.

## Status (v1.0, October 2026)

The native app is feature-complete and at parity with the PWA, with no live proxy and no community submissions. It has **not been compiled in Xcode yet**. The first build on a Mac may need small SwiftUI fixes. The `App/Core` engine and its tests do compile and pass on Linux via `scripts/swift-linux-check.sh`.

| Area | iOS |
| --- | --- |
| Data | Bundled `web/data/{trends,slang,abbreve,community-slang}.json` snapshot, fully offline |
| Home | PWA ranking (heat × lifecycle weight × recency), heat meter, lifecycle pill, age chip, clean tags, digest card, detail with origin story, Save |
| Explore | World chips, search, "No matches" |
| Decode | Offline port of the `web/decode-ai.js` ladder (lexicon + CORE_ABBREVS, phrase-first, never blank). Optional single-word dictionaryapi.dev lookup that fails quietly. No API keys, no proxy. |
| You | World toggles, digest cadence, New here, Dictionary lookups toggle, saved list, credits/licenses, privacy/support links |
| Privacy | `PrivacyInfo.xcprivacy` (UserDefaults CA92.1, no tracking, no collection). `ITSAppUsesNonExemptEncryption = NO`. |

## Build and upload

1. `brew install xcodegen && xcodegen generate && open Trendy.xcodeproj`
2. Set `DEVELOPMENT_TEAM` in `project.yml` (blank by default) and regenerate.
3. Press ⌘U (tests), then ⌘R (smoke test in the simulator).
4. Bump `CURRENT_PROJECT_VERSION` in `project.yml` for every upload. It starts at 1, with `MARKETING_VERSION` 1.0.
5. Choose **Any iOS Device (arm64)** → **Product → Archive** → Organizer → **Validate**, then **Distribute App → App Store Connect → Upload**.
6. Wait for processing. Export compliance is answered automatically by the Info.plist key.

## Internal testing

- [ ] App Store Connect → TestFlight → Internal Testing → add testers and enable the build
- [ ] Install via the TestFlight app and run the smoke script below
- [ ] Saves, world toggles, digest, New here and Dictionary lookups survive a force-quit and relaunch

## External beta (optional)

- [ ] Beta App Review notes: reuse the review notes in `docs/app-store/app-store-listing.md`
- [ ] "What to Test": Decode phrases, saving trends, world toggles

## Smoke script (device)

1. Cold launch: dark launch screen, then four tabs (Home, Explore, Decode, You)
2. Home: rising/hot cards first, digest card on top, tap a card for its origin story, ♥ saves, *Saved* chip filters
3. Explore: world chips filter; searching "zzzz" shows **No matches**
4. Decode: `67`, `nah id win`, `alpha`, `na`, `W`, `i was so tired`, `jk`, nonsense. Every query gets a labeled answer and none is ever blank. Repeat in Airplane Mode.
5. You: toggle worlds (Home updates), Digest Off (the digest disappears), New here, saved list swipe-to-delete
6. Relaunch: everything above persists

## Known limits

| Item | Note |
| --- | --- |
| Data freshness | Ships the `web/data` snapshot from build time. The radar bot's daily updates reach iOS only with a new build. |
| Live Decode proxy | Not in iOS 1.0 (offline ladder only), to keep App Review simple |
| Community Suggest | Not in iOS 1.0 (no user-generated content) |
| iPad | Not supported in 1.0 (`TARGETED_DEVICE_FAMILY = 1`) |
| Notifications | None. The digest is an in-app card. |

## References

- `docs/app-store/release-checklist.md`: full release steps
- `docs/app-store/app-store-listing.md`: listing text, age rating, review notes
- `docs/app-store/privacy-policy.md` / `docs/privacy.html`: privacy policy
- `docs/xcode-setup.md`: project layout and XcodeGen
