# Trendy: App Store Connect listing (v1.0)

Copy these values into App Store Connect. The character limits are Apple's, and every value below has been counted.

## App information

| Field | Value |
| --- | --- |
| Name (≤30) | **Trendy** (6). If App Store Connect says the name is taken, use **Trendy: Slang Decoder** (21). |
| Subtitle (≤30) | **Decode slang, memes & trends** (28) |
| Bundle ID | `com.bluenightlightpup.trendy`. Change `TRENDY_BUNDLE_ID` in `project.yml` if you register a different one. |
| SKU | `trendy-ios-001` (internal only, any unique string works) |
| Primary language | English (U.S.) |
| Primary category | **Reference** |
| Secondary category | **Entertainment** (optional. With it, the app may get a separate Korea GRAC rating. Leave it out if that becomes a hassle.) |
| Content rights | "Contains third-party content: **Yes**". The abbreviation list is derived from Abbreve (Apache-2.0, credited in-app under You → Credits & licenses). Optional dictionary senses come from the Free Dictionary API (Wiktionary content, CC BY-SA, credited in-app). |
| Price | Free, no in-app purchases |
| Copyright | `2026 bluenightlightpup` |
| Privacy Policy URL | `https://bluenightlightpup.github.io/trendy/privacy.html` (see "Hosting" below) |
| Support URL | `https://bluenightlightpup.github.io/trendy/support.html` (see "Hosting" below) |
| Marketing URL | optional, leave blank |

### Hosting the privacy and support pages

The App Store needs **public** privacy-policy and support URLs. Both pages are part of the project website in `site/` (`site/privacy.html`, `site/support.html`), which `.github/workflows/pages.yml` publishes to GitHub Pages together with the web app at `/app/`. To turn it on: make the repo public (it is MIT-licensed; GitHub Pages on a **private** repo needs a paid plan) and set GitHub → Settings → Pages → *Source* to **GitHub Actions**, then re-run the `pages` workflow. If the URLs change (for example a custom domain), update `AppLinks` in `App/Services/AppModel.swift` too, because the app links to both pages from You → About.

Until Pages is turned on both URLs return 404. **Enable Pages before you submit.** App Review opens these links.

## Version 1.0 page

### Promotional text (≤170, can be changed without review)

```
What does “67” mean? Is “nah, I’d win” a threat? Trendy decodes slang, texting abbreviations and meme trends in plain words. Offline, judgment-free, no account.
```
(160 characters)

### Description (≤4000)

```
Ever read a text and had no idea what it meant? Trendy decodes slang, texting abbreviations and meme trends in plain, judgment-free words, so you can keep up without feeling lost.

DECODE ANYTHING
Type a word, phrase or abbreviation (“67”, “nah I’d win”, “alpha”, “ngl”, “W”) and get:
• Meaning: what it actually means, in plain words
• Where it comes from: the meme, show, game or corner of the internet behind it
• Who says this: which ages use it, from Gen Alpha to Millennials
Every answer is labeled, such as Slang meaning, Texting abbreviation or Pattern guess, so you know how confident it is. Decode works offline from a curated lexicon of hundreds of terms.

TREND FEED
Home ranks what’s moving by heat and lifecycle, so rising trends show up first and fading ones drift down. Each card shows a heat meter, whether the trend is rising, peaking, cooling or fading, which ages it’s popular with, and the origin story behind it.

EXPLORE BY WORLD
Browse Gaming, Dating, Sports, Money, Music & fandom, School, Work & tech, Internet culture and more, or search by name or tag.

MAKE IT YOURS
• Save trends with a tap and find them again under You
• Choose which worlds appear on Home
• Pick a digest cadence: daily, weekly, monthly or off
• New here mode adds gentle extra context if this is all new to you

PRIVATE BY DESIGN
No account. No ads. No tracking. No data collected. Your saves and settings stay on your iPhone. An optional dictionary lookup for single words sends only that word to a free public dictionary, and you can switch it off.

Great for parents decoding the family group chat, teachers, writers, and anyone who just saw “it’s giving” and needs answers.

Trendy explains some adult slang so you can understand it. Definitions are plain and non-graphic, and swear words are masked.
```

### Keywords (≤100, comma-separated, no spaces after commas)

```
slang,meaning,dictionary,gen z,gen alpha,abbreviations,acronyms,texting,memes,brainrot,rizz,parents
```
(99 characters. The keywords leave out "trendy" because the name is already indexed, and leave out other apps' trademarks such as TikTok, per guideline 2.3.7.)

### What's New

Not shown for 1.0. For later versions, use something like: `Fresh trends and new slang added. Decode is smarter about phrases.`

### Screenshots

iPhone only. Upload **6.9" iPhone** portrait screenshots (1320 × 2868 or 1290 × 2796). Smaller sizes are scaled from those. Take 3–6 from the iPhone 17 Pro Max simulator (⌘S in Simulator saves a PNG):
1. Home feed with the digest card and a rising trend
2. Trend detail showing the origin story
3. Decode answering "nah id win"
4. Decode answering "67" (Meaning / Where it comes from / Who says this)
5. Explore with a world chip selected
6. You tab (worlds and digest)

Keep the screenshots free of masked-profanity entries.

## App Privacy ("nutrition label")

- **Data collection:** select **"No, we do not collect data from this app."** The label then shows **Data Not Collected**.
- Why this is accurate: the app has no accounts, analytics, ads, crash SDKs or developer servers. Saves and settings live in on-device UserDefaults. Apple defines "collect" as transmitting data off the device in a way that lets you or partners access it beyond real-time servicing. The optional single-word dictionary request goes straight to a third-party public API, with no identifiers, only to service that request, and the developer never receives it. The privacy policy discloses it. If you want zero network traffic by default, change the default of `dictionaryLookups` to `false` in `App/Services/PreferencesStore.swift`.
- **Tracking:** No (`NSPrivacyTracking` = false in `App/Resources/PrivacyInfo.xcprivacy`).

## Age rating questionnaire (2025+ questionnaire)

The expected result is **13+**. The rating is driven by infrequent alcohol/drug references and mild suggestive themes. That suits the audience (teens and the parents decoding them).

| Section | Question | Answer | Why |
| --- | --- | --- | --- |
| In-app controls | Parental controls | No | |
| | Age assurance | No | |
| Capabilities | Unrestricted web access | **No** | There is no in-app browser. The privacy, support and credits links open Safari. |
| | User-generated content | **No** | Community suggestions are not submitted from the app. Nothing user-written is shown to others. |
| | Messaging and chat | **No** | Decode is a deterministic offline lexicon lookup, not chat with people or an AI model. |
| | Social media | No | |
| | Advertising | No | |
| Mature themes | Profanity or crude humor | **Infrequent** | Definitions of common acronyms (WTF, STFU, LMAO…) with the swear word masked ("F***"). |
| | Horror / fear themes | None | |
| | Alcohol, tobacco, or drug use or references | **Infrequent** | e.g. "BYOB" (bring your own beer), "copium", "bad trip" in the abbreviation list. |
| Medical or wellness | Medical or treatment information | None | |
| | Health or wellness topics | None | Trends like mewing/looksmaxxing are described as trends, not advice. |
| Sexuality or nudity | Mature or suggestive themes | **Infrequent** | Non-graphic definitions of dating slang (situationship, sneaky link, FWB, DTF, gyatt). |
| | Sexual content or nudity | None | No depictions. Text definitions are non-graphic. |
| | Graphic sexual content and nudity | None | |
| Violence | Cartoon or fantasy violence | None | |
| | Realistic violence | None | |
| | Prolonged graphic or sadistic realistic violence | None | |
| | Guns or other weapons | None | |
| Chance-based activities | Gambling / simulated gambling | None | |
| | Contests | None | |
| | Loot boxes | No | |
| Kids | Made for Kids | **No** | |

To get **9+** instead, remove or rewrite the alcohol/drug entries in `web/data/abbreve.json` (BYOB, etc.) and set "Mature or suggestive themes" to None after trimming dating-slang entries. That is not recommended, because those are exactly the terms parents look up. See `docs/app-store/content-review.md` for the full content review.

## App Review information

- Sign-in required: **No**
- Contact: your name, phone and email (App Review only, never shown publicly)
- Notes:

```
Trendy is a reference app that explains slang, texting abbreviations and meme trends in plain, judgment-free language. No account or login is needed and there are no in-app purchases.

All content (trend catalog and slang lexicon) is bundled in the app and works offline. The Decode tab answers from this on-device lexicon; it is a deterministic lookup, not a chatbot or AI model. For single-word queries only, Decode can optionally fetch extra dictionary senses from the public Free Dictionary API (api.dictionaryapi.dev). Only the searched word is sent, with no identifiers. Users can switch this off under You > Decode > Dictionary lookups.

There is no user-generated content, no messaging between users, no ads, no analytics and no tracking. Some entries explain crude or adult slang (for example common texting acronyms) so parents can understand them; swear words are masked (e.g. "F***") and definitions are non-graphic.

Things to try:
- Decode: "what does 67 mean?", "nah id win", "alpha", "W"
- Home: tap a card for its origin story, tap the heart to save it
- Explore: tap a world chip or search "rizz"
- You: toggle worlds, change the digest cadence, view saved trends
```

## Export compliance

`ITSAppUsesNonExemptEncryption` = `NO` is set in `Config/Info.plist`. The app uses only Apple's system HTTPS (exempt), so App Store Connect won't ask about encryption on each build.
