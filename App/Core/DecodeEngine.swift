import Foundation

// Offline port of the PWA decode ladder in web/decode-ai.js.
// Keep the scoring constants and branch order identical so iOS and web answer the same way;
// scripts/swift-linux-check.sh diffs this engine against the JS one on a query list.

enum DecodeBucket: String, Hashable {
    case core, slang, community, abbreve

    /// Tie-break order after score and term length (higher wins).
    var tieOrder: Int {
        switch self {
        case .core: return 4
        case .slang: return 3
        case .community: return 2
        case .abbreve: return 1
        }
    }
}

struct DecodeHit {
    let entry: LexiconEntry
    let match: String
    let bucket: DecodeBucket
}

struct DecodePart: Hashable {
    let title: String
    let body: String
}

enum DecodeSource: String, Hashable {
    case lexicon
    case community
    case trends
    case dictionary = "dictionary+ai"
    case heuristic
    case fallback = "ai-fallback"
    case search = "ai-search"
}

struct DictionaryDefinition: Hashable {
    var part: String?
    var text: String
    var example: String?
}

struct DictionaryResult: Hashable {
    var word: String
    var defs: [DictionaryDefinition]
    var provider: String
}

struct DecodeAnswer {
    var term: String
    var source: DecodeSource
    var parts: [DecodePart]
    var usedDictionary: Bool
    var slangBucket: DecodeBucket?
    var trendID: String?

    /// Honest source label for the answer header (PWA `sourceLabel`).
    var sourceLabel: String {
        var label: String
        switch source {
        case .lexicon: label = "Trendy lexicon"
        case .community: label = "Community lexicon"
        case .trends: label = "Trend radar"
        case .dictionary: label = "Dictionary"
        case .heuristic: label = "Pattern guess"
        case .fallback: label = "Best guess"
        case .search: label = "Trendy"
        }
        if source == .lexicon && slangBucket == .abbreve { label = "Abbreviation list" }
        if usedDictionary && source != .dictionary { label += " + dictionary" }
        return label
    }

    /// Synthesized answers (no lexicon row, no trend card) get a lower-confidence badge.
    var isLowerConfidence: Bool {
        source == .heuristic || source == .fallback || source == .dictionary
    }
}

struct Heuristic: Hashable {
    let short: String
    let explain: String
}

struct ScoreResult {
    var score: Int
    var kind: String?
    var termLen: Int

    static let zero = ScoreResult(score: 0, kind: nil, termLen: 0)
}

struct DecodeEngine {
    let slang: [LexiconEntry]
    let community: [LexiconEntry]
    let abbreve: [LexiconEntry]
    let trends: [Trend]
    let core: [LexiconEntry]

    init(
        slang: [LexiconEntry],
        community: [LexiconEntry] = [],
        abbreve: [LexiconEntry] = [],
        trends: [Trend] = [],
        core: [LexiconEntry] = CoreLexicon.entries
    ) {
        self.slang = slang
        self.community = community
        self.abbreve = abbreve
        self.trends = trends
        self.core = core
    }

    // MARK: - Text normalization

    /// Lowercase; unify/drop apostrophes and quotes (I'd / I’d / id → id); everything that is not
    /// `[a-z0-9+]` becomes a space; collapse whitespace.
    static func normalize(_ input: String) -> String {
        var scalars = String.UnicodeScalarView()
        var pendingSpace = false
        for scalar in input.lowercased().unicodeScalars {
            switch scalar.value {
            case 0x27, 0x2018, 0x2019, 0x201A, 0x201B, // apostrophes → removed
                 0x22, 0x201C, 0x201D, 0x201E, 0x201F: // double quotes → removed
                continue
            case 0x61...0x7A, 0x30...0x39, 0x2B: // a-z 0-9 +
                if pendingSpace && !scalars.isEmpty { scalars.append(" ") }
                pendingSpace = false
                scalars.append(scalar)
            default:
                pendingSpace = true
            }
        }
        return String(scalars)
    }

    static func tokenize(_ s: String) -> [String] {
        normalize(s).split(whereSeparator: { !isAlnum($0) }).map(String.init)
    }

    private static func isAlnum(_ c: Character) -> Bool {
        guard let a = c.asciiValue else { return false }
        return (a >= 97 && a <= 122) || (a >= 65 && a <= 90) || (a >= 48 && a <= 57)
    }

    static let stopwords: Set<String> = [
        "a", "an", "the", "of", "to", "and", "or", "what", "does", "mean", "meaning",
        "is", "are", "do", "did", "how", "why", "who", "please", "define", "explain",
        "tell", "me", "about", "whats", "for", "in", "on", "with", "from",
    ]

    static func queryTokens(_ q: String) -> [String] {
        tokenize(q).filter { !$0.isEmpty && !stopwords.contains($0) }
    }

    private static let questionPatterns: [String] = [
        "^what\\s+does\\s+(.+?)\\s+mean\\??$",
        "^what(?:'s| is)\\s+(?:the\\s+)?(?:meaning\\s+of\\s+)?(.+?)\\??$",
        "^define\\s+(.+?)\\??$",
        "^explain\\s+(.+?)\\??$",
        "^meaning\\s+of\\s+(.+?)\\??$",
        "^whats\\s+(.+?)\\s+mean\\??$",
        "^who\\s+(?:or\\s+what\\s+)?is\\s+(.+?)\\??$",
        "^decode\\s+(.+?)\\??$",
        "^tell\\s+me\\s+about\\s+(.+?)\\??$",
    ]

    /// Pull the term out of question forms ("what does jk mean?" → "jk").
    static func extractTerm(_ raw: String) -> String {
        // iOS smart punctuation types ’ — treat it like ' so "what’s rizz" matches too.
        let q = raw.replacingOccurrences(of: "\u{2019}", with: "'")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty { return "" }
        for pattern in questionPatterns {
            if let groups = RX.firstMatch(q, pattern, caseInsensitive: true), groups.count > 1,
               let inner = groups[1], !inner.isEmpty {
                return RX.replace(inner.trimmingCharacters(in: .whitespacesAndNewlines),
                                  "^[\\s:.\\-]+|[\\s:.\\-]+$", with: "")
            }
        }
        var out = RX.replace(q, "\\?+$", with: "")
        out = RX.replace(out, "^(hey|hi|please|can you|could you)\\s+", with: "", caseInsensitive: true)
        return out.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func applyAlias(_ raw: String) -> String {
        let n = normalize(raw)
        if n.isEmpty { return n }
        if let hit = CoreLexicon.phraseAliases[n] { return hit }
        if let hit = CoreLexicon.fuzzyAliases[n] { return hit }
        let joined = n.split(separator: " ").map { CoreLexicon.fuzzyAliases[String($0)] ?? String($0) }.joined(separator: " ")
        return CoreLexicon.phraseAliases[joined] ?? joined
    }

    /// `needle` appears in `haystack` bounded by start/end or a non-alphanumeric character.
    static func wordBoundaryIncludes(_ haystack: String, _ needle: String) -> Bool {
        if haystack.isEmpty || needle.isEmpty { return false }
        let h = Array(haystack.lowercased().utf8)
        let n = Array(needle.lowercased().utf8)
        if n.count > h.count { return false }
        func alnum(_ b: UInt8) -> Bool { (b >= 97 && b <= 122) || (b >= 48 && b <= 57) }
        var i = 0
        while i + n.count <= h.count {
            if h[i] == n[0] && Array(h[i..<(i + n.count)]) == n {
                let beforeOK = i == 0 || !alnum(h[i - 1])
                let afterIdx = i + n.count
                let afterOK = afterIdx == h.count || !alnum(h[afterIdx])
                if beforeOK && afterOK { return true }
            }
            i += 1
        }
        return false
    }

    // MARK: - Lexicon scoring

    static func isAbbrevEntry(_ entry: LexiconEntry, bucket: DecodeBucket?) -> Bool {
        if bucket == .abbreve { return true }
        return (entry.source ?? "").lowercased() == "abbreve" || entry.kind == "abbreviation"
    }

    static func rankBonus(_ entry: LexiconEntry, bucket: DecodeBucket) -> Int {
        if bucket == .core { return 4000 }
        let src = (entry.source ?? "").lowercased()
        let conf = (entry.confidence ?? "").lowercased()
        if src == "core" { return 4000 }
        if src == "curated" || conf == "high" { return 3000 }
        if bucket == .slang && src.isEmpty { return 2500 }
        if src == "community" || bucket == .community { return 2000 }
        if src == "abbreve" || bucket == .abbreve { return 0 }
        return 500
    }

    private static let ambiguousTokens: Set<String> = [
        "nah", "id", "win", "the", "way", "and", "for", "you", "are", "so", "its", "it",
        "a", "an", "me", "my", "we", "he", "she", "they", "him", "her", "them", "let", "cook",
    ]

    static func scoreTerm(_ term: String, fullQuery: String, tokens: [String]) -> ScoreResult {
        let t = normalize(term)
        if t.isEmpty { return .zero }
        let tLen = t.count
        let tTokens = tokenize(t)
        let qMulti = tokens.count >= 2
        let tMulti = tTokens.count >= 2
        let coverBonus = tMulti ? tTokens.count * 20000 + tLen * 25 : tLen * 5

        // Ultra-short abbrevs (na, w, l, ib…) only on exact query / exact token.
        if tLen <= 2 {
            if t == fullQuery {
                return ScoreResult(score: 100000 + coverBonus, kind: "exact", termLen: tLen)
            }
            if !qMulti && tokens.count == 1 && tokens[0] == t {
                return ScoreResult(score: 80000 + coverBonus, kind: "exact-token", termLen: tLen)
            }
            return .zero
        }

        if t == fullQuery {
            return ScoreResult(score: 100000 + coverBonus, kind: "exact", termLen: tLen)
        }

        // Contiguous phrase inside the query (prefer longest).
        if tMulti && tLen >= 5 && wordBoundaryIncludes(fullQuery, t) {
            return ScoreResult(score: 95000 + coverBonus, kind: "phrase-in-query", termLen: tLen)
        }

        if !tTokens.isEmpty && tTokens.allSatisfy({ tokens.contains($0) }) {
            let base = tMulti ? 90000 : (qMulti ? 35000 : 75000)
            return ScoreResult(score: base + coverBonus, kind: "token-set", termLen: tLen)
        }

        if tokens.contains(t) {
            let base = (qMulti && !tMulti) ? 25000 : 80000
            return ScoreResult(score: base + coverBonus, kind: "exact-token", termLen: tLen)
        }

        if tLen >= 3 && wordBoundaryIncludes(fullQuery, t) {
            let base = tMulti ? 70000 : (qMulti ? 30000 : 50000)
            return ScoreResult(score: base + coverBonus, kind: "word-in-query", termLen: tLen)
        }

        // Query is a distinctive whole word inside a longer term (skibidi ⊂ skibidi toilet).
        if tLen >= 3 && fullQuery.count >= 3 && wordBoundaryIncludes(t, fullQuery) {
            let longestTok = tTokens.reduce("") { $0.count >= $1.count ? $0 : $1 }
            if tMulti && (fullQuery.count < 5 || ambiguousTokens.contains(fullQuery)) {
                // Require a more specific query for multi-word lexicon rows.
            } else if fullQuery == tTokens.first || fullQuery == longestTok || tokens.first == tTokens.first {
                return ScoreResult(score: 40000 + coverBonus, kind: "query-in-term", termLen: tLen)
            }
        }

        if tMulti && tokens.count >= 2 {
            let matched = tTokens.filter { tokens.contains($0) }
            if matched.count >= max(2, tTokens.count - 1) && matched.joined(separator: " ").count >= 5 {
                return ScoreResult(score: 60000 + matched.count * 15000 + tLen, kind: "fuzzy-phrase", termLen: tLen)
            }
        }

        if tLen >= 3 && fullQuery.count >= 3 {
            if tMulti && tokens.count == 1 && fullQuery.count < 5 {
                return .zero
            }
            if wordBoundaryIncludes(fullQuery, t) || wordBoundaryIncludes(t, fullQuery) {
                return ScoreResult(score: 12000 + coverBonus, kind: "partial", termLen: tLen)
            }
            if tLen >= 4 && fullQuery.contains(t) {
                return ScoreResult(score: 1000 + tLen * 10, kind: "substring", termLen: tLen)
            }
        }
        return .zero
    }

    static func scoreEntry(_ entry: LexiconEntry, fullQuery: String, tokens: [String]) -> ScoreResult {
        var best = ScoreResult.zero
        for term in entry.terms {
            let got = scoreTerm(term, fullQuery: fullQuery, tokens: tokens)
            if got.score > best.score || (got.score == best.score && got.termLen > best.termLen) {
                best = got
            }
        }
        return best
    }

    private struct Candidate {
        let entry: LexiconEntry
        let score: Int
        let termLen: Int
        let kind: String?
        let bucket: DecodeBucket
        let order: Int
    }

    func findSlangEntry(_ term: String) -> DecodeHit? {
        let q = Self.normalize(Self.applyAlias(term))
        if q.isEmpty { return nil }
        let tokens = Self.queryTokens(q)
        var candidates: [Candidate] = []

        for entry in core {
            let got = Self.scoreEntry(entry, fullQuery: q, tokens: tokens)
            if got.score > 0 {
                candidates.append(Candidate(entry: entry, score: got.score + Self.rankBonus(entry, bucket: .core),
                                            termLen: got.termLen, kind: got.kind, bucket: .core, order: candidates.count))
            }
        }

        let lists: [(DecodeBucket, [LexiconEntry])] = [(.slang, slang), (.community, community), (.abbreve, abbreve)]
        for (bucket, list) in lists {
            for entry in list {
                let got = Self.scoreEntry(entry, fullQuery: q, tokens: tokens)
                if got.score <= 0 { continue }
                // Abbreviation rows (so, was, y, uk, kiss, ok…) only answer an exact query; they must
                // never hijack ordinary words inside a phrase ("i was so tired").
                let abbrevRow = bucket == .abbreve || (entry.source ?? "").lowercased() == "abbreve"
                if abbrevRow && got.kind != "exact" { continue }
                candidates.append(Candidate(entry: entry, score: got.score + Self.rankBonus(entry, bucket: bucket),
                                            termLen: got.termLen, kind: got.kind, bucket: bucket, order: candidates.count))
            }
        }

        guard !candidates.isEmpty else { return nil }
        let top = candidates.min { a, b in
            if a.score != b.score { return a.score > b.score }
            if a.termLen != b.termLen { return a.termLen > b.termLen }
            if a.bucket.tieOrder != b.bucket.tieOrder { return a.bucket.tieOrder > b.bucket.tieOrder }
            return a.order < b.order
        }!
        return DecodeHit(entry: top.entry, match: top.kind ?? "partial", bucket: top.bucket)
    }

    /// Abbreviation rows: exact full-query match only.
    func findExactAbbrev(_ term: String) -> LexiconEntry? {
        let q = Self.normalize(term)
        if q.isEmpty { return nil }
        return abbreve.first { entry in entry.terms.contains { Self.normalize($0) == q } }
    }

    // MARK: - Trends

    func findTrend(_ term: String) -> Trend? {
        let q = Self.normalize(Self.applyAlias(term))
        if q.isEmpty { return nil }
        let tokens = Self.queryTokens(q)
        if let exact = trends.first(where: { Self.normalize($0.title) == q }) { return exact }
        // Only an exact tag match for the full query — never "slang" tag hitchhiking.
        if let tagHit = trends.first(where: { $0.tags.map(Self.normalize).contains(q) }),
           Self.normalize(tagHit.title).count >= 2 {
            return tagHit
        }

        var best: Trend?
        var bestScore = 0
        for trend in trends {
            let title = Self.normalize(trend.title)
            if title.isEmpty { continue }
            // Single-letter trends (W / L) only when the whole query is that letter.
            if title.count <= 1 && title != q { continue }
            // Two-char titles need exact token equality, not a prefix of "win".
            if title.count <= 2 && title != q && !tokens.contains(title) { continue }

            var score = 0
            let titleTokens = Self.queryTokens(title)
            if title == q {
                score = 100000 + title.count
            } else if tokens.contains(title) && title.count >= 2 {
                score = (tokens.count == 1 ? 80000 : 20000) + title.count
            } else if title.count >= 3 && titleTokens.count >= 2
                        && titleTokens.allSatisfy({ tokens.contains($0) && $0.count >= 3 }) {
                score = 80000 + title.count
            } else if title.count >= 3 && Self.wordBoundaryIncludes(q, title) {
                score = 50000 + title.count
            } else if q.count >= 3 && title.count >= 3 && Self.wordBoundaryIncludes(title, q) {
                let longestTok = titleTokens.reduce("") { $0.count >= $1.count ? $0 : $1 }
                if q == titleTokens.first || q == longestTok { score = 40000 + title.count }
            }
            let tags = trend.tags.map(Self.normalize).filter { $0.count >= 3 && $0 != "slang" && $0 != "sports" }
            if tags.contains(where: { $0 == q || (tokens.count == 1 && tokens[0] == $0) }) {
                score = max(score, 70000 + q.count)
            }
            if score > bestScore {
                bestScore = score
                best = trend
            }
        }
        return best
    }

    // MARK: - Fallbacks

    static func heuristics(_ term: String) -> [Heuristic] {
        let q = normalize(term)
        var tips: [Heuristic] = []
        if RX.matches(q, "^\\d{1,4}$") || RX.matches(q, "^six\\s*seven$") {
            tips.append(Heuristic(
                short: "Likely a number meme / brainrot chant",
                explain: "Short numbers often go viral as TikTok sounds or hallway jokes. They may not have one dictionary meaning — shared bit + gesture/sound is the context."
            ))
        }
        if RX.matches(q, "core$|pilled$|maxxing$", caseInsensitive: true) {
            tips.append(Heuristic(
                short: "Internet suffix pattern (-core / -pilled / -maxxing)",
                explain: "The ending signals aesthetic, worldview, or optimization culture; the stem is the niche."
            ))
        }
        if RX.matches(q, "^[a-z]{2,5}$") {
            tips.append(Heuristic(
                short: "Could be chat abbreviation or casual slang",
                explain: "Short lowercase tokens are often texting shorthand or casual address. Context (who said it, which app) changes the read."
            ))
        }
        return tips
    }

    /// Single dictionary word for a query, or "" for phrases (no first-word lookups).
    static func dictionaryWord(_ term: String) -> String {
        let toks = tokenize(term)
        guard toks.count == 1, let w = toks.first, w.count <= 40 else { return "" }
        return w
    }

    // MARK: - Answer

    static func whoSaysPart(_ age: String?) -> DecodePart? {
        guard let band = AgeBand(raw: age) else { return nil }
        return DecodePart(title: "Who says this", body: band.rawValue + " — " + band.gloss)
    }

    static func meaningTitle(_ hit: DecodeHit?) -> String {
        guard let hit else { return "Meaning" }
        if hit.bucket == .community { return "Community meaning" }
        if isAbbrevEntry(hit.entry, bucket: hit.bucket) { return "Texting abbreviation" }
        return "Slang meaning"
    }

    private static func dictSummary(_ dict: DictionaryResult?, skip: String?) -> [DictionaryDefinition] {
        var seen = Set<String>()
        if let skip, !skip.isEmpty { seen.insert(normalize(skip)) }
        var out: [DictionaryDefinition] = []
        for d in dict?.defs ?? [] {
            let key = normalize(d.text)
            if key.isEmpty || seen.contains(key) { continue }
            seen.insert(key)
            out.append(d)
        }
        return out
    }

    private static func defsLine(_ defs: [DictionaryDefinition]) -> String {
        defs.prefix(2).map { "(\(($0.part ?? "").isEmpty ? "def" : $0.part!)) \($0.text)" }.joined(separator: " ")
    }

    static func heatRadarBody(_ trend: Trend) -> String {
        let life = (trend.lifecycleRaw ?? "").isEmpty ? "active" : trend.lifecycleRaw!
        let pct = Int((min(1, max(0, trend.heatScore)) * 100).rounded())
        let raw = "\u{201C}\(trend.title)\u{201D} is \(life) at heat \(pct). \(trend.originStory)"
        return raw.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func synthesize(term: String, dict: DictionaryResult?, heuristics: [Heuristic], newHere: Bool) -> [DecodePart] {
        var parts: [DecodePart] = []
        if let dict, !dict.defs.isEmpty {
            parts.append(DecodePart(title: "Meaning", body: defsLine(dict.defs)))
            parts.append(DecodePart(
                title: "How people use it casually",
                body: "In chats and social apps, \u{201C}\(term)\u{201D} can lean informal, ironic, or meme-y even when it also has a straight dictionary sense. If you saw it in a text or TikTok, the casual reading is usually the one that matters."
            ))
        } else if let first = heuristics.first {
            parts.append(DecodePart(title: "Best read", body: first.short))
            parts.append(DecodePart(title: "Why", body: first.explain))
        } else {
            parts.append(DecodePart(
                title: "Working meaning",
                body: "I don\u{2019}t have a curated slang card for \u{201C}\(term)\u{201D} yet, so here\u{2019}s an honest best guess: treat it as a word/phrase whose meaning depends on the room it showed up in (friends, TikTok, game chat, school)."
            ))
            parts.append(DecodePart(
                title: "Practical decode",
                body: "Ask what came right before it, or paste the whole sentence next time. Meanwhile: if it looks like an abbreviation, try expanding each letter; if it looks like a nickname/address word (bro/dude energy), it\u{2019}s probably casual address or reaction\u{2014}not a secret code."
            ))
        }
        if newHere {
            parts.append(DecodePart(
                title: "New here tip",
                body: "You\u{2019}re not behind for asking. Language moves weekly \u{2014} decoding is the skill."
            ))
        }
        parts.append(DecodePart(
            title: "Confidence",
            body: dict != nil ? "Medium\u{2013}high (dictionary-backed)." : "Lower (synthesized until Radar/lexicon catches it)."
        ))
        return parts
    }

    /// Term the dictionary would be asked about for this raw query ("" = no lookup).
    func dictionaryLookupWord(for raw: String) -> String {
        let term = Self.extractTerm(raw)
        let resolved = term.isEmpty ? raw.trimmingCharacters(in: .whitespacesAndNewlines) : term
        return Self.dictionaryWord(Self.applyAlias(resolved))
    }

    /// Full offline decode. Pass a `dictionary` result to merge single-word dictionary senses.
    func decode(_ raw: String, newHere: Bool, dictionary: DictionaryResult? = nil) -> DecodeAnswer {
        let extracted = Self.extractTerm(raw)
        let term = extracted.isEmpty ? raw.trimmingCharacters(in: .whitespacesAndNewlines) : extracted
        let searchTerm = Self.applyAlias(term)
        let slangHit = findSlangEntry(searchTerm)
        let trend = findTrend(searchTerm)
        let heuristics = Self.heuristics(searchTerm)
        // Phrases never borrow the first word's dictionary senses ("nah id win" ≠ "nah").
        let dict = Self.dictionaryWord(searchTerm).isEmpty ? nil : dictionary
        let alsoAbbrev = (slangHit != nil && slangHit?.bucket != .abbreve) ? findExactAbbrev(searchTerm) : nil

        var parts: [DecodePart] = []
        var source: DecodeSource = .search
        var dictShown = false

        if let hit = slangHit {
            source = hit.bucket == .community ? .community : .lexicon
            let e = hit.entry
            parts.append(DecodePart(title: Self.meaningTitle(hit), body: e.short))
            if !e.origin.isEmpty { parts.append(DecodePart(title: "Where it comes from", body: e.origin)) }
            if let who = Self.whoSaysPart(e.age) { parts.append(who) }
            if !e.explain.isEmpty { parts.append(DecodePart(title: "In plain words", body: e.explain)) }
            if let also = alsoAbbrev, !also.short.isEmpty, Self.normalize(also.short) != Self.normalize(e.short) {
                parts.append(DecodePart(
                    title: "Also short for",
                    body: "\(term.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()) = \(also.short) (texting abbreviation)."
                ))
            }
            let defs = Self.dictSummary(dict, skip: e.short)
            if !defs.isEmpty {
                dictShown = true
                parts.append(DecodePart(title: "Other senses", body: Self.defsLine(defs)))
            }
        }

        if let trend {
            if slangHit == nil {
                source = .trends
                parts.append(DecodePart(title: "Meaning", body: trend.summary))
                if let who = Self.whoSaysPart(trend.age) { parts.append(who) }
            } else if Self.whoSaysPart(slangHit?.entry.age) == nil, let who = Self.whoSaysPart(trend.age) {
                parts.append(who)
            }
            parts.append(DecodePart(title: "On the heat radar", body: Self.heatRadarBody(trend)))
        }

        if slangHit == nil && trend == nil {
            parts.append(contentsOf: Self.synthesize(term: term, dict: dict, heuristics: heuristics, newHere: newHere))
            source = dict != nil ? .dictionary : (heuristics.isEmpty ? .fallback : .heuristic)
        } else if dict != nil && newHere && !dictShown {
            let defs = Self.dictSummary(dict, skip: trend?.summary)
            if let first = defs.first {
                dictShown = true
                parts.append(DecodePart(title: "Also in the dictionary", body: first.text))
            }
        }

        return DecodeAnswer(
            term: term,
            source: source,
            parts: parts,
            usedDictionary: dictShown || source == .dictionary,
            slangBucket: slangHit?.bucket,
            trendID: trend?.id
        )
    }
}
