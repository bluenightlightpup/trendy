# TestFlight checklist — Trendy

Aligned with workbench skill **`ios-app-store-release`**. This is a **Mac + Apple Developer** path; the Linux/agent environment cannot archive or upload.

> **Phase 3 note:** PWA save/follow + polish ships now. Native TestFlight waits for a Mac with Xcode.

## Prerequisites

- [ ] Active **Apple Developer Program** membership (paid)
- [ ] App record created in [App Store Connect](https://appstoreconnect.apple.com)  
      Bundle ID: `com.bluenightlightpup.trendy`
- [ ] Mac with **Xcode 15+**, signing certificates, and provisioning profiles
- [ ] Repo checked out; generate project: `brew install xcodegen && xcodegen generate`

## Build & archive

1. Open `Trendy.xcodeproj` (after XcodeGen).
2. Select a physical device or **Any iOS Device (arm64)** — not a simulator — for Archive.
3. Confirm signing: Team set; automatic signing OK for internal TestFlight.
4. Bump version if needed (`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in `project.yml` or Xcode).
5. **Product → Archive**.
6. Organizer → **Distribute App → App Store Connect → Upload**.
7. Wait for processing in App Store Connect (email / Activity tab).

## TestFlight (internal)

- [ ] Add internal testers (App Store Connect → TestFlight → Internal Testing)
- [ ] Enable the build for the internal group
- [ ] Install via TestFlight on a device; smoke Home / Decode / Explore / You
- [ ] Confirm **New here** and interest toggles persist (when iOS prefs land)
- [ ] Confirm **Save / follow** once native `SavedTrendsStore` UI is wired (PWA already has it)

## External / public beta (optional later)

- [ ] Compliance / export answers complete
- [ ] Beta App Review notes (judgment-free Decode, no UGC posting in v1)
- [ ] Privacy nutrition labels match actual networking (dictionary API / future Claude)

## Known issues / blockers (document before inviting)

| Item | Status |
|------|--------|
| Mac required for archive/upload | Blocker until Mac available |
| iOS Decode Claude client | PWA Decode live; iOS API wiring pending |
| iOS Save/follow UI | Stub `SavedTrendsStore` only; PWA is source of truth for Phase 3 |
| TikTok/IG Radar | Stubs — no unofficial scrapers |
| Secrets | No API keys in repo; use local gitignored config |

## Smoke script (device)

1. Cold launch → four tabs visible  
2. Home heat feed sorts; tap card → origin story  
3. Explore world chips filter  
4. Decode: `jk`, `bro`, nonsense term never blank  
5. You: worlds + digest + New here  
6. (When native save ships) Save toggle survives relaunch  

## References

- `docs/xcode-setup.md` — XcodeGen generate  
- `docs/phased-implementation.md` — Phase 3  
- Workbench: `ios-app-store-release`, `ios-debugging`
