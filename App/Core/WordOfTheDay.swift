import Foundation

/// Word of the Day: one curated, 13+-safe slang word per local calendar date.
///
/// Deterministic and offline. The same algorithm lives in `web/wotd.js` (PWA + website) and
/// `cli/wotd.py` (CLI + MCP); `Tests/Fixtures/wotd-golden.json` holds golden vectors that all three
/// test suites must match. Spec: `docs/word-of-the-day.md`.
///
/// - pool:  slang entries with a meaning + origin, not Abbreve rows, not Radar candidates, not opted
///          out (`wotd: false` / `mature: true`) and clean for a 13+ audience
/// - order: pool stable-sorted by key (first term, lowercased, Unicode code-point order)
/// - days = date − 2026-01-01; cycle = floor(days / N); slot = days mod N
/// - perm:  Fisher–Yates over 0..<N with mulberry32(seed(cycle)); if perm[0] is the previous cycle's
///          last word, swap perm[0] and perm[1]
/// - word = order[perm[slot]]; an override (date → term) wins when the term is in the pool.
enum WordOfTheDay {
    static let epoch = "2026-01-01"
    static let seedBase: UInt32 = 20_260_101
    static let appURL = URL(string: "https://bluenightlightpup.github.io/trendy/app/")!

    /// Whole-word topics kept off a 13+ general-audience daily word (keep in step with web/wotd.js).
    static let unsafeWords: [String] = [
        "sex", "sexual", "sexually", "sexy", "hookup", "hookups", "hook-up", "nsfw", "porn", "nude", "nudes",
        "naked", "horny", "orgasm", "kink", "kinky", "fetish", "onlyfans", "drug", "drugs", "weed", "cannabis",
        "marijuana", "stoned", "drunk", "alcohol", "booze", "beer", "vape", "vaping", "cocaine", "opium",
        "slur", "slurs", "fuck", "fucking", "shit", "bitch", "cunt", "dick", "piss", "asshole", "goddamn",
        "wtf", "stfu", "lmfao",
    ]
    /// Rows `ContentSafety` rewrites for sexual meanings.
    static let blockedTerms: Set<String> = ["dtf", "nnn", "edging", "fwb"]

    private static let unsafeRegex = try? NSRegularExpression(
        pattern: "(^|[^a-z0-9])(" + unsafeWords.joined(separator: "|") + ")($|[^a-z0-9])"
    )
    /// Text masked by `ContentSafety` ("f***") counts as unsafe, so sanitized data picks the same pool.
    private static let maskedRegex = try? NSRegularExpression(pattern: "[a-z]\\*\\*")

    struct Word: Hashable {
        let date: String
        let term: String
        let entry: LexiconEntry
        let isOverride: Bool
        let cycle: Int?
        let slot: Int?
        let index: Int
        let poolSize: Int
    }

    // MARK: Pool

    static func normalizeTerm(_ s: String) -> String {
        let straight = s.lowercased()
            .replacingOccurrences(of: "\u{2018}", with: "'")
            .replacingOccurrences(of: "\u{2019}", with: "'")
            .replacingOccurrences(of: "\u{02BC}", with: "'")
        return straight.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }

    private static func hasMatch(_ regex: NSRegularExpression?, _ text: String) -> Bool {
        guard let regex else { return false }
        return regex.firstMatch(in: text, options: [], range: NSRange(text.startIndex..., in: text)) != nil
    }

    static func isSafe(_ entry: LexiconEntry) -> Bool {
        if entry.terms.contains(where: { blockedTerms.contains(normalizeTerm($0)) }) { return false }
        let text = (entry.terms + [entry.short, entry.explain, entry.origin, entry.wotdExample ?? "", entry.example ?? ""])
            .joined(separator: " \n ")
            .lowercased()
        return !hasMatch(unsafeRegex, text) && !hasMatch(maskedRegex, text)
    }

    static func isEligible(_ entry: LexiconEntry) -> Bool {
        guard !entry.terms.isEmpty else { return false }
        let blank: (String) -> Bool = { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        if blank(entry.short) || blank(entry.origin) { return false }
        if (entry.source ?? "").lowercased() == "abbreve" { return false }
        if (entry.confidence ?? "").lowercased() == "low" || !(entry.radarSource ?? "").isEmpty { return false }
        if entry.wotd == false || entry.mature == true { return false }
        return isSafe(entry)
    }

    /// Lexicographic Unicode scalar comparison (same as JS code points and Python `str`).
    static func codePointLess(_ a: String, _ b: String) -> Bool {
        let x = Array(a.unicodeScalars), y = Array(b.unicodeScalars)
        for i in 0..<min(x.count, y.count) where x[i].value != y[i].value {
            return x[i].value < y[i].value
        }
        return x.count < y.count
    }

    /// Eligible entries, sorted by key; ties keep file order.
    static func buildPool(_ slang: [LexiconEntry]) -> [LexiconEntry] {
        let rows = slang.enumerated()
            .filter { isEligible($0.element) }
            .map { (key: normalizeTerm($0.element.terms[0]), index: $0.offset, entry: $0.element) }
        return rows.sorted { a, b in
            if a.key != b.key { return codePointLess(a.key, b.key) }
            return a.index < b.index
        }.map(\.entry)
    }

    // MARK: Dates (proleptic Gregorian civil dates, no time zones involved)

    static func daysFromCivil(year: Int, month: Int, day: Int) -> Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let mp = (month + 9) % 12
        let doy = (153 * mp + 2) / 5 + day - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }

    static func civilFromDays(_ days: Int) -> (year: Int, month: Int, day: Int) {
        let z = days + 719_468
        let era = (z >= 0 ? z : z - 146_096) / 146_097
        let doe = z - era * 146_097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let day = doy - (153 * mp + 2) / 5 + 1
        let month = mp < 10 ? mp + 3 : mp - 9
        return (yoe + era * 400 + (month <= 2 ? 1 : 0), month, day)
    }

    /// Strict `YYYY-MM-DD` → days since 1970-01-01, or nil for anything else (incl. 2026-02-30).
    static func dayNumber(_ date: String) -> Int? {
        let parts = date.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
              parts.allSatisfy({ $0.allSatisfy { ch in ch >= "0" && ch <= "9" } }),
              let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2]),
              (1...12).contains(m), (1...31).contains(d) else { return nil }
        let n = daysFromCivil(year: y, month: m, day: d)
        let back = civilFromDays(n)
        return back.year == y && back.month == m && back.day == d ? n : nil
    }

    static func isValidDate(_ date: String) -> Bool { dayNumber(date) != nil }

    static func format(dayNumber n: Int) -> String {
        let c = civilFromDays(n)
        return String(format: "%04d-%02d-%02d", c.year, c.month, c.day)
    }

    static func addDays(_ date: String, _ n: Int) -> String? {
        dayNumber(date).map { format(dayNumber: $0 + n) }
    }

    static func daysSinceEpoch(_ date: String) -> Int? {
        guard let n = dayNumber(date), let e = dayNumber(epoch) else { return nil }
        return n - e
    }

    /// The viewer's local calendar date (Gregorian, current time zone) as `YYYY-MM-DD`.
    static func localDateString(_ now: Date = Date(), timeZone: TimeZone = .current) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let c = cal.dateComponents([.year, .month, .day], from: now)
        return String(format: "%04d-%02d-%02d", c.year ?? 1970, c.month ?? 1, c.day ?? 1)
    }

    // MARK: Selection

    /// mulberry32 → UInt32 stream.
    struct Mulberry32 {
        var state: UInt32
        mutating func next() -> UInt32 {
            state = state &+ 0x6D2B_79F5
            var t = state
            t = (t ^ (t >> 15)) &* (t | 1)
            t = t ^ (t &+ ((t ^ (t >> 7)) &* (t | 61)))
            return t ^ (t >> 14)
        }
    }

    static func cycleSeed(_ cycle: Int) -> UInt32 {
        seedBase ^ (UInt32(truncatingIfNeeded: cycle) &* 0x9E37_79B1)
    }

    private static func shuffled(_ n: Int, _ cycle: Int) -> [Int] {
        var perm = Array(0..<n)
        var rng = Mulberry32(state: cycleSeed(cycle))
        var i = n - 1
        while i > 0 {
            let j = Int(rng.next() % UInt32(i + 1))
            perm.swapAt(i, j)
            i -= 1
        }
        return perm
    }

    /// Permutation of pool indexes for one cycle (no back-to-back repeat at the cycle boundary).
    static func cycleOrder(_ n: Int, _ cycle: Int) -> [Int] {
        var perm = shuffled(n, cycle)
        if n > 2 {
            let prevLast = shuffled(n, cycle - 1)[n - 1]
            if perm[0] == prevLast {
                perm[0] = perm[1]
                perm[1] = prevLast
            }
        }
        return perm
    }

    static func pickIndex(_ n: Int, _ date: String) -> (cycle: Int, slot: Int, index: Int)? {
        guard n > 0, let days = daysSinceEpoch(date) else { return nil }
        let cycle = days >= 0 ? days / n : -((-days + n - 1) / n)
        let slot = days - cycle * n
        return (cycle, slot, cycleOrder(n, cycle)[slot])
    }

    /// Wraps an example in curly quotes unless it already opens with a quote (some do).
    static func quoteExample(_ text: String) -> String {
        let s = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let first = s.first else { return "" }
        if first == "\"" || first == "\u{201C}" || first == "\u{2018}" || first == "'" { return s }
        return "\u{201C}" + s + "\u{201D}"
    }

    /// A lone lowercase letter is shown uppercased ("w" → "W").
    static func displayTerm(_ term: String) -> String {
        let t = term.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.unicodeScalars.count == 1, let s = t.unicodeScalars.first, (0x61...0x7A).contains(s.value) {
            return t.uppercased()
        }
        return t
    }

    /// Word for `date` from a prebuilt pool. Returns nil for an empty pool or an invalid date.
    static func word(pool: [LexiconEntry], date: String, overrides: [String: String] = [:]) -> Word? {
        guard !pool.isEmpty, isValidDate(date) else { return nil }
        if let wanted = overrides[date] {
            let needle = normalizeTerm(wanted)
            for (i, entry) in pool.enumerated() {
                if let hit = entry.terms.first(where: { normalizeTerm($0) == needle }) {
                    return Word(date: date, term: displayTerm(hit), entry: entry, isOverride: true,
                                cycle: nil, slot: nil, index: i, poolSize: pool.count)
                }
            }
        }
        guard let p = pickIndex(pool.count, date) else { return nil }
        let entry = pool[p.index]
        return Word(date: date, term: displayTerm(entry.terms[0]), entry: entry, isOverride: false,
                    cycle: p.cycle, slot: p.slot, index: p.index, poolSize: pool.count)
    }

    // MARK: Overrides (web/data/word-of-the-day.json)

    static func parseOverrides(_ data: Data?) -> [String: String] {
        guard let data,
              let object = try? JSONSerialization.jsonObject(with: data),
              let root = object as? [String: Any] else { return [:] }
        let raw = (root["overrides"] as? [String: Any]) ?? root
        var out: [String: String] = [:]
        for (key, value) in raw {
            if let term = value as? String, isValidDate(key),
               !term.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                out[key] = term
            }
        }
        return out
    }

    static func loadOverrides(bundle: Bundle = .main, directory: URL? = nil) -> [String: String] {
        let url = directory.map { $0.appendingPathComponent("word-of-the-day.json") }
            ?? bundle.url(forResource: "word-of-the-day", withExtension: "json")
        return parseOverrides(url.flatMap { try? Data(contentsOf: $0) })
    }

    // MARK: Card content

    private static func looseKey(_ s: String) -> String {
        var out = String.UnicodeScalarView()
        var pendingSpace = false
        for scalar in s.lowercased().unicodeScalars {
            switch scalar.value {
            case 0x27, 0x2018, 0x2019:
                continue
            case 0x61...0x7A, 0x30...0x39:
                if pendingSpace && !out.isEmpty { out.append(" ") }
                pendingSpace = false
                out.append(scalar)
            default:
                pendingSpace = true
            }
        }
        return String(out)
    }

    /// Hottest trend whose title (or the part before " (") matches one of the entry's terms.
    static func matchTrend(_ entry: LexiconEntry, trends: [Trend]) -> Trend? {
        let keys = Set(entry.terms.map(looseKey).filter { !$0.isEmpty })
        var best: Trend?
        for t in trends {
            let head = t.title.split(separator: "(", maxSplits: 1, omittingEmptySubsequences: false).first.map(String.init) ?? t.title
            guard keys.contains(looseKey(t.title)) || keys.contains(looseKey(head)) else { continue }
            if best == nil || t.clampedHeat > best!.clampedHeat { best = t }
        }
        return best
    }

    struct Card: Hashable {
        let date: String
        let term: String
        let meaning: String
        let explain: String
        let example: String?
        let origin: String
        let ageBand: AgeBand?
        let worlds: [String]
        let trend: Trend?
        let isOverride: Bool

        /// "Gen Z — mostly teens and early twenties"
        var whoSaysThis: String? { ageBand.map { "\($0.rawValue) \u{2014} \($0.gloss)" } }

        /// "Trendy word of the day: rizz — Charisma… https://bluenightlightpup.github.io/trendy/app/"
        var shareText: String {
            var m = meaning.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
            if m.count > 140 {
                m = String(m.prefix(139)).trimmingCharacters(in: .whitespaces) + "\u{2026}"
            }
            return "Trendy word of the day: \(term) \u{2014} \(m) \(WordOfTheDay.appURL.absoluteString)"
        }
    }

    static func card(for word: Word, trends: [Trend]) -> Card {
        let e = word.entry
        let trimmed: (String?) -> String? = { s in
            let t = (s ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            return t.isEmpty ? nil : t
        }
        return Card(
            date: word.date,
            term: word.term,
            meaning: e.short.trimmingCharacters(in: .whitespacesAndNewlines),
            explain: e.explain.trimmingCharacters(in: .whitespacesAndNewlines),
            example: trimmed(e.wotdExample) ?? trimmed(e.example),
            origin: e.origin.trimmingCharacters(in: .whitespacesAndNewlines),
            ageBand: e.ageBand,
            worlds: e.worlds,
            trend: matchTrend(e, trends: trends),
            isOverride: word.isOverride
        )
    }
}

extension TrendyData {
    /// Word of the Day for a local date (default: today), using bundled overrides.
    func wordOfTheDay(on date: String = WordOfTheDay.localDateString(), pool: [LexiconEntry]? = nil) -> WordOfTheDay.Word? {
        WordOfTheDay.word(pool: pool ?? WordOfTheDay.buildPool(slang), date: date, overrides: wotdOverrides)
    }
}
