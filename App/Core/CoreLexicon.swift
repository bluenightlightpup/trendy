import Foundation

// GENERATED from web/decode-ai.js (CORE_ABBREVS, PHRASE_ALIASES, FUZZY_ALIASES) by
// scripts/gen-core-lexicon.mjs. Edit the PWA source and regenerate so iOS and web stay in sync.

enum CoreLexicon {
    /// Built-in rows checked before the bundled JSON lexicons (order matters for ties).
    static let entries: [LexiconEntry] = [
        LexiconEntry(
            terms: ["jk", "j/k", "j.k.", "just kidding"],
            short: "Just kidding.",
            explain: "Used after a joke or to soften a serious-sounding line.",
            origin: "Texting/IM shorthand from the 1990s chat-room era (AIM, MSN, SMS); also written j/k. Still the standard “I’m joking” tag.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["idk"],
            short: "I don’t know.",
            explain: "You don’t have the answer right now.",
            origin: "Texting shorthand that spread with SMS and instant messaging in the late 1990s–2000s; now everyday across ages.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["brb"],
            short: "Be right back.",
            explain: "Stepping away briefly.",
            origin: "Early chat-room and instant-messenger shorthand (IRC, AIM) for stepping away from the keyboard.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["ttyl"],
            short: "Talk to you later.",
            explain: "Friendly pause/sign-off.",
            origin: "Instant-messenger era sign-off (AIM/MSN, 2000s) that carried over to texting.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["lol"],
            short: "Laughing out loud (often a soft chuckle).",
            explain: "Frequently acknowledgment, not literal loud laughing.",
            origin: "One of the oldest internet acronyms (1980s–90s Usenet/BBS chat). Over time it softened into a tone marker rather than real laughter.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["omg"],
            short: "Oh my god.",
            explain: "Surprise or emphasis.",
            origin: "Spoken-English exclamation long before texting; the acronym boomed with SMS and chat. Added to the Oxford English Dictionary in 2011.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["smh"],
            short: "Shaking my head.",
            explain: "Disappointment or disbelief.",
            origin: "Forum and early social-media shorthand (2000s); popular on Twitter for reacting to news or bad takes.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["tbh"],
            short: "To be honest.",
            explain: "Flags a frank opinion.",
            origin: "Texting/forum shorthand; got a second life around 2013 with the Instagram “tbh” compliment-post trend.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["ngl"],
            short: "Not gonna lie.",
            explain: "Honesty marker before a take.",
            origin: "Gen Z texting and social-media shorthand; common in captions and replies since the late 2010s.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["fr", "fr fr"],
            short: "For real.",
            explain: "Agreement or emphasis.",
            origin: "From AAVE “for real”; spread through social media and became a standard Gen Z agreement tag (“fr fr” = very for real).",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["nvm"],
            short: "Never mind.",
            explain: "Cancel what you just said.",
            origin: "Instant-messenger and texting shorthand for “never mind”.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["wyd"],
            short: "What (are) you doing?",
            explain: "Casual check-in.",
            origin: "Texting shorthand (“what you doing?”); common late-night check-in on SMS and Snapchat.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["hmu"],
            short: "Hit me up.",
            explain: "Message me later.",
            origin: "Texting/social shorthand from the 2000s (MySpace and SMS era): “contact me”.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["gtg", "g2g"],
            short: "Got to go.",
            explain: "Leaving the chat.",
            origin: "Instant-messenger and gaming-chat sign-off (“got to go”); g2g is the same thing.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["afk"],
            short: "Away from keyboard.",
            explain: "Not at the device.",
            origin: "Gaming and chat-room shorthand (MUDs, IRC, MMOs) for being away from the keyboard.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["sus"],
            short: "Suspicious.",
            explain: "Something feels shady.",
            origin: "Short for suspicious/suspect (older slang); exploded in 2020 with the game Among Us.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["fyi"],
            short: "For your information.",
            explain: "Heads-up.",
            origin: "Office/business abbreviation from memos, long before the internet; carried into email and texting.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["btw"],
            short: "By the way.",
            explain: "Side note.",
            origin: "Early internet and email shorthand (1990s) that became universal in texting.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["asap"],
            short: "As soon as possible.",
            explain: "Urgency.",
            origin: "Military/business abbreviation that predates the internet by decades; still used in speech (“A-sap”).",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["idc"],
            short: "I don’t care.",
            explain: "Dismissive or boundary — tone varies.",
            origin: "Texting shorthand (“I don’t care”); tone ranges from relaxed to blunt depending on context.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["rn"],
            short: "Right now.",
            explain: "Currently.",
            origin: "Texting shorthand (“right now”); popular in captions and replies since the 2010s.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["ofc"],
            short: "Of course.",
            explain: "Agreement / obviously.",
            origin: "Texting and gaming-chat shorthand (“of course”).",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["ikr"],
            short: "I know, right?",
            explain: "Strong agreement.",
            origin: "Instant-messenger and texting shorthand (“I know, right?”) from the 2000s.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["lmk"],
            short: "Let me know.",
            explain: "Ask for an update.",
            origin: "Texting/email shorthand (“let me know”), common in both casual and work chats.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["np"],
            short: "No problem.",
            explain: "It’s fine / you’re welcome.",
            origin: "Gaming and chat shorthand (“no problem”); the classic reply to “ty”.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["ty", "thx", "tysm"],
            short: "Thank you / thanks.",
            explain: "Gratitude shorthand.",
            origin: "Chat and gaming shorthand for “thank you”; thx and tysm (“thank you so much”) are variants.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["yw"],
            short: "You’re welcome.",
            explain: "Reply to thanks.",
            origin: "Chat shorthand reply to “ty” (“you’re welcome”).",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["omw"],
            short: "On my way.",
            explain: "En route.",
            origin: "Texting shorthand (“on my way”); common enough that phones autocomplete it.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["irl"],
            short: "In real life.",
            explain: "Offline / not online.",
            origin: "Early internet shorthand (Usenet/chat) contrasting online life with “in real life”.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["tldr", "tl;dr"],
            short: "Too long; didn’t read — summary follows.",
            explain: "Prefaces a short version.",
            origin: "Forum culture (Something Awful, then Reddit, 2000s): “too long; didn’t read” — now also used to introduce your own summary.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["imo", "imho"],
            short: "In my (humble) opinion.",
            explain: "Personal take marker.",
            origin: "Forum and email shorthand from the 1990s; imho adds “humble” (often ironically).",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["ong"],
            short: "On God — I swear / for real.",
            explain: "Emphasis of seriousness.",
            origin: "AAVE-rooted “on God” (I swear); spread through Twitter, TikTok and rap lyrics in the late 2010s.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["fs"],
            short: "For sure.",
            explain: "Agreement.",
            origin: "Texting shorthand (“for sure”), popular with Gen Z.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["dw"],
            short: "Don’t worry.",
            explain: "Reassurance.",
            origin: "Texting shorthand (“don’t worry”), common in UK/Commonwealth and gaming chats.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["pls", "plz"],
            short: "Please.",
            explain: "Softener.",
            origin: "Texting shorthand for “please”; plz is the older chat-room spelling.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "abbreviation"
        ),
        LexiconEntry(
            terms: ["bro", "bros", "brother"],
            short: "Casual address for a guy/friend — like “dude.”",
            explain: "Usually means buddy/friend, not always a literal brother. Tone can be warm, ironic, or annoyed. Related: bruh, dude, man.",
            origin: "Short for brother; everyday casual English + internet.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["bruh"],
            short: "Like “bro,” often for surprise, disbelief, or secondhand embarrassment.",
            explain: "As much a reaction (“bruh…”) as an address.",
            origin: "Phonetic casual bro; meme reaction.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["dude"],
            short: "Casual address for a person; also a “wow” reaction.",
            explain: "Daily informal English for a person; greeting, emphasis, or disbelief.",
            origin: "Older American slang still in heavy use.",
            age: "Mixed",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["fam"],
            short: "Close friends / chosen family.",
            explain: "Your people — not only blood relatives.",
            origin: "AAVE/youth slang → broad use.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["alpha", "alpha male", "alpha energy"],
            short: "In TikTok/internet slang: top-dog / “best” / dominant vibe — not mainly the Greek letter.",
            explain: "Online “alpha” usually means confident, high-status, in-charge energy (sometimes ironic). The Greek-letter / software meanings exist, but TikTok almost always means the slang status vibe.",
            origin: "Pop-psych hierarchy metaphors → TikTok shorthand.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["sigma", "sigma male"],
            short: "Meme “lone wolf” cool-outsider archetype (cousin of alpha memes).",
            explain: "TikTok personality meme: independent, quiet-confident. Often half-joke.",
            origin: "Online personality memes; TikTok/Reels.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["beta"],
            short: "Meme opposite of “alpha” — portrayed as less dominant (often rude/joke), not “beta software.”",
            explain: "In slang fights/memes, “beta” dunks on someone as passive. Separate from app beta testing.",
            origin: "Same meme family as alpha.",
            age: "Gen Z",
            source: nil,
            confidence: nil,
            kind: "slang"
        ),
        LexiconEntry(
            terms: ["skibidi", "skibidi toilet", "skibidi toilets", "skibiti", "skibiti toilet", "skibiti toilets", "skibity", "skibity toilet", "skibidy", "skibidy toilet", "skibiddi", "skibidi toillet", "skibidi tiolet"],
            short: "YouTube/TikTok horror-comedy series by DaFuq!?Boom! with heads in toilets; kids also chant “skibidi” as brainrot noise.",
            explain: "Skibidi Toilet is a surreal animated series by DaFuq!?Boom! (Alexey Gerasimov): singing human heads in toilets fight camera-headed people (Cameramen) and other hardware-headed factions. On playgrounds and the FYP, “skibidi” is often just a nonsense chant — participation, not a secret code. Asking what it means is normal; the joke is how little dictionary sense it has.",
            origin: "YouTube series by DaFuq!?Boom!, 2023–; exploded on TikTok and in Gen Alpha schoolyard/brainrot culture.",
            age: "Gen Alpha",
            source: "core",
            confidence: "high",
            kind: "slang"
        ),
    ]

    static let phraseAliases: [String: String] = [
        "skibiti toilet": "skibidi toilet",
        "skibiti toilets": "skibidi toilet",
        "skibidi toilets": "skibidi toilet",
        "skibidi toillet": "skibidi toilet",
        "skibidi tiolet": "skibidi toilet",
        "skibity toilet": "skibidi toilet",
        "skibidy toilet": "skibidi toilet",
        "skibidi tolet": "skibidi toilet",
        "skibiti toillet": "skibidi toilet",
        "skibidi toilet meme": "skibidi toilet",
        "skibiti toilet meme": "skibidi toilet",
        "looks maxxing": "looksmaxxing",
        "fanum taxx": "fanum tax",
        "only in ohio": "ohio",
        "sigma male": "sigma",
        "sigma grindset": "sigma",
        "nah id win": "nah id win",
        "nah i would win": "nah id win",
        "gojo nah id win": "nah id win",
        "gojo id win": "nah id win",
        "id win": "id win",
        "we re so back": "we are so back",
        "were so back": "we are so back",
        "we so back": "we are so back",
        "its so over": "its so over",
        "it is so over": "its so over",
        "living rent free": "living rent free",
        "lives rent free": "living rent free",
        "l ratio": "l + ratio",
        "l+ratio": "l + ratio",
        "ratio l": "l + ratio",
        "and i oop": "and i oop",
        "sksksk and i oop": "and i oop",
        "no thoughts head empty": "no thoughts head empty",
        "head empty no thoughts": "no thoughts head empty",
        "understood the assignement": "understood the assignment",
        "mother is mothering": "mother is mothering",
        "its giving": "its giving",
        "it is giving": "its giving",
        "this is fine dog": "this is fine",
        "this is fine meme": "this is fine",
        "they dont know": "they dont know",
        "let that boy cook": "let him cook",
        "who let him cook": "let him cook",
    ]

    static let fuzzyAliases: [String: String] = [
        "skibiti": "skibidi",
        "skibity": "skibidi",
        "skibidy": "skibidi",
        "skibiddi": "skibidi",
        "skibidii": "skibidi",
        "gyat": "gyatt",
        "gyattt": "gyatt",
        "looksmaxing": "looksmaxxing",
        "looks-maxxing": "looksmaxxing",
        "mewin": "mewing",
        "moggin": "mogging",
        "fanumtax": "fanum tax",
        "skibidi-toilet": "skibidi toilet",
    ]
}
