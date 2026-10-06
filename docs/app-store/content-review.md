# Content review for the App Store age rating

Reviewed on October 5, 2026. The data is `web/data/trends.json` (150), `slang.json` (119), `abbreve.json` (370), `community-slang.json` (0) and the `CORE_ABBREVS` in `decode-ai.js` (43).

## What could raise the rating

| Area | Examples in the data | How the iOS app handles it |
| --- | --- | --- |
| Profanity | Abbreve expansions such as WTF, STFU, LMFAO, "Don't F*** Kill Me" | `App/Core/ContentSafety.swift` masks swear words when data loads (`What The F***`, `A**`). The terms are still searchable, so a parent can look up "wtf" and get an answer. |
| Sexual / suggestive | DTF, NNN, FWB, edging, gyatt, sneaky link, situationship | Plain, non-graphic definitions. DTF, NNN, FWB and edging get hand-written overrides that say what the term means and flag it as not kid-friendly. Alternate sexual senses of BBL/GN were dropped. |
| Derogatory | "yt" alternate sense | Override: "Usually means YouTube…", with the slur sense explained neutrally. |
| Alcohol / drugs | BYOB (beer), BT (bad trip), copium | Left as-is. These references are mild and infrequent, and they put the app at **13+**. |
| Violence / death words | "kill it", "dead 💀", "over my dead body", "it's so over" | Figurative slang only, with nothing depicted. Answer **None** for violence. |
| Horror | Skibidi Toilet description | A one-line description of a meme series with no imagery. Answer None. |
| Medical / wellness | mewing, looksmaxxing | Described as trends ("evidence is contested"). No advice is given. Answer None. |

There is no imagery, video, audio, user-generated content, chat or web browsing anywhere in the app. All content is text definitions.

## Recommendation

Accept **13+**. Answer the questionnaire as in `app-store-listing.md`: profanity Infrequent, alcohol/drug references Infrequent, mature/suggestive themes Infrequent, everything else None or No.

## Keeping it this way

The Radar bot updates `web/data/` daily, but the iOS app ships only the snapshot it was built with. Before each App Store build:

1. Run `scripts/swift-linux-check.sh`. Its content-safety test fails if any unmasked profanity gets through.
2. Skim new `slang.json` rows for sexual or drug content. Add an override to `ContentSafety.overrides` when a definition needs softening.
3. If new rows add frequent or graphic content, revisit the age rating answers.
