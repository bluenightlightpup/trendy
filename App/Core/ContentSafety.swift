import Foundation

/// Keeps bundled definitions accurate but non-graphic for the App Store age rating.
///
/// The shared data in `web/data/` is refreshed daily by the Radar bot and includes the open
/// Abbreve list, which spells out profanity ("WTF" = "What The F…"). The iOS app masks swear
/// words at load time and rewrites a handful of rows whose alternate senses are sexual or
/// derogatory. Terms stay searchable: a parent can still look up "dtf" and get a plain answer.
enum ContentSafety {
    /// (pattern, stem group index). Group 1 = optional prefix, group 2 = stem, group 3 = optional suffix.
    private static let rules: [String] = [
        "\\b(mother)?(fuck)(ing|in|ed|er|ers|s)?\\b",
        "\\b(bull|horse)?(shit)(s|ty|ting|ted)?\\b",
        "\\b()(ass)(hole|holes|es)?\\b",
        "\\b()(piss)(ed|es|ing)?\\b",
        "\\b()(bitch)(es|y|ing)?\\b",
        "\\b()(cunt)(s)?\\b",
        "\\b()(dick)(s|head|heads)?\\b",
    ]

    /// Mask profanity, keeping the first letter: "What The Fuck" → "What The F***".
    static func mask(_ text: String) -> String {
        guard !text.isEmpty else { return text }
        var out = text
        for rule in rules {
            out = RX.replace(out, rule, caseInsensitive: true) { groups in
                let prefix = groups.count > 1 ? (groups[1] ?? "") : ""
                let stem = groups.count > 2 ? (groups[2] ?? "") : ""
                let suffix = groups.count > 3 ? (groups[3] ?? "") : ""
                guard let first = stem.first else { return groups[0] ?? "" }
                return prefix + String(first) + String(repeating: "*", count: max(0, stem.count - 1)) + suffix
            }
        }
        return out
    }

    /// Hand-written replacements keyed by the normalized first term of an Abbreve/slang row.
    /// Only `short`/`explain` are replaced; terms, origin and age stay as shipped.
    static let overrides: [String: (short: String, explain: String)] = [
        "dtf": (
            short: "Down To F*** \u{2014} blunt shorthand for being open to a casual hookup.",
            explain: "An explicit acronym used on dating apps and in crude jokes. Not a kid-friendly term."
        ),
        "nnn": (
            short: "No Nut November \u{2014} a crude internet \u{201C}abstinence challenge\u{201D} meme for November.",
            explain: "Joke challenge that resurfaces every November. The name uses crude slang, so it isn\u{2019}t a kid-friendly term."
        ),
        "bbl": (
            short: "Be Back Later",
            explain: "Be Back Later. Also short for a cosmetic surgery procedure in celebrity and beauty talk."
        ),
        "gn": (
            short: "Good Night",
            explain: "Good Night \u{2014} a sign-off before bed."
        ),
        "yt": (
            short: "YouTube",
            explain: "Usually means YouTube. In some slang it is also a label for a white person, which can come across as dismissive."
        ),
        "edging": (
            short: "Online it\u{2019}s a joke about holding off right before a payoff \u{2014} but the word comes from a sexual meaning, so it isn\u{2019}t a kid-safe term.",
            explain: "On TikTok people say they\u{2019}re \u{201C}edging\u{201D} a reveal, a win, or a reply when they keep stretching the wait on purpose. The word\u{2019}s original meaning is sexual, which is why the meme reads as innuendo \u{2014} worth knowing if a kid says it. Teens using it most likely mean the delay joke and know it sounds a bit rude."
        ),
        "fwb": (
            short: "Friends With Benefits",
            explain: "Friends who are casually physically involved without dating each other."
        ),
    ]

    static func sanitize(_ entry: LexiconEntry) -> LexiconEntry {
        var e = entry
        let key = DecodeEngine.normalize(entry.terms.first ?? "")
        if let o = overrides[key] {
            e.short = o.short
            e.explain = o.explain
        }
        e.short = mask(e.short)
        e.explain = mask(e.explain)
        e.origin = mask(e.origin)
        return e
    }

    static func sanitize(_ trend: Trend) -> Trend {
        var t = trend
        t.summary = mask(t.summary)
        t.originStory = mask(t.originStory)
        return t
    }

    static func sanitize(_ dict: DictionaryResult) -> DictionaryResult {
        var d = dict
        d.defs = dict.defs.map { def in
            var x = def
            x.text = mask(def.text)
            x.example = def.example.map(mask)
            return x
        }
        return d
    }
}
