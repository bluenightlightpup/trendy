import Foundation

/// Home / Explore ordering and reader-facing labels (ports of web/app.js helpers).
enum TrendRanking {
    // MARK: Dates

    private static let isoFull: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static let isoFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoDateOnly: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    static func parseISO(_ iso: String?) -> Date? {
        guard let raw = iso?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else { return nil }
        if let d = isoFull.date(from: raw) { return d }
        if let d = isoFractional.date(from: raw) { return d }
        return isoDateOnly.date(from: String(raw.prefix(10)))
    }

    static func daysSince(_ iso: String?, now: Date) -> Double? {
        guard let date = parseISO(iso) else { return nil }
        return max(0, now.timeIntervalSince(date) / 86_400)
    }

    // MARK: Home relevance

    /// Recency decay from `peakedAt` / `lastSeenAt`. Rising/peaking stay fresh; old peaks fade.
    static func recencyFactor(_ trend: Trend, now: Date = Date()) -> Double {
        let life = trend.lifecycle
        let peakedDays = daysSince(trend.peakedAt, now: now)
        let seenDays = daysSince(trend.lastSeenAt, now: now)
        var factor = 1.0
        if let seen = seenDays, seen > 21 {
            factor *= pow(0.5, (seen - 21) / 180) // soft half-life ~180d after a 3-week grace
        }
        if let peaked = peakedDays, life != .rising, life != .peaking {
            factor *= pow(0.5, peaked / 100) // museum peaks: half-life ~100d
        } else if let peaked = peakedDays, peaked > 150 {
            factor *= pow(0.5, (peaked - 150) / 120)
        }
        return max(0.12, min(1, factor))
    }

    /// homeRelevance = heat × lifecycleWeight × recency.
    static func homeRelevance(_ trend: Trend, now: Date = Date()) -> Double {
        trend.clampedHeat * trend.lifecycle.homeWeight * recencyFactor(trend, now: now)
    }

    static func sortedForHome(_ trends: [Trend], now: Date = Date()) -> [Trend] {
        let scored = trends.enumerated().map { (index: $0.offset, trend: $0.element, score: homeRelevance($0.element, now: now)) }
        return scored.sorted { a, b in
            if a.score != b.score { return a.score > b.score }
            if a.trend.clampedHeat != b.trend.clampedHeat { return a.trend.clampedHeat > b.trend.clampedHeat }
            return a.index < b.index
        }.map(\.trend)
    }

    static func sortedByHeat(_ trends: [Trend]) -> [Trend] {
        trends.enumerated().sorted { a, b in
            if a.element.clampedHeat != b.element.clampedHeat { return a.element.clampedHeat > b.element.clampedHeat }
            return a.offset < b.offset
        }.map(\.element)
    }

    /// Home feed: hide worlds the user switched off (unknown worlds stay visible, like the PWA).
    static func homeFeed(_ trends: [Trend], disabledWorlds: Set<String>, savedOnly: Set<String>? = nil, now: Date = Date()) -> [Trend] {
        var list = trends.filter { !disabledWorlds.contains($0.world) }
        if let saved = savedOnly { list = list.filter { saved.contains($0.id) } }
        return sortedForHome(list, now: now)
    }

    /// Explore: optional world filter + case-insensitive substring search over title/summary/tags/world.
    static func explore(_ trends: [Trend], world: TrendWorld?, query: String) -> [Trend] {
        var list = trends
        if let world { list = list.filter { $0.world == world.rawValue } }
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty {
            list = list.filter { t in
                ([t.title, t.summary] + t.tags + [t.world]).joined(separator: " ").lowercased().contains(q)
            }
        }
        return sortedByHeat(list)
    }

    // MARK: Digest

    enum DigestFrequency: String, CaseIterable, Identifiable {
        case off, daily, weekly, monthly
        var id: String { rawValue }

        var label: String {
            switch self {
            case .off: return "Off"
            case .daily: return "Daily"
            case .weekly: return "Weekly"
            case .monthly: return "Monthly"
            }
        }

        var headline: String {
            switch self {
            case .off: return ""
            case .daily: return "Today\u{2019}s digest"
            case .weekly: return "This week\u{2019}s digest"
            case .monthly: return "This month\u{2019}s digest"
            }
        }

        /// Days per digest period (used to rotate picks).
        var periodDays: Int {
            switch self {
            case .off: return 0
            case .daily: return 1
            case .weekly: return 7
            case .monthly: return 30
            }
        }
    }

    /// Short digest for Home: the two most relevant trends plus three picks from the next tier that
    /// rotate once per digest period, so the digest changes on the cadence the user picked.
    static func digest(from ranked: [Trend], frequency: DigestFrequency, now: Date = Date(), size: Int = 5) -> [Trend] {
        guard frequency != .off, !ranked.isEmpty else { return [] }
        let anchors = Array(ranked.prefix(2))
        let pool = Array(ranked.dropFirst(2).prefix(18))
        guard !pool.isEmpty else { return anchors }
        let period = Int(now.timeIntervalSince1970 / 86_400) / max(1, frequency.periodDays)
        let start = (period * 3) % pool.count
        let count = min(max(0, size - anchors.count), pool.count)
        let picks = (0..<count).map { pool[(start + $0) % pool.count] }
        return anchors + picks
    }

    // MARK: Labels

    /// Pipeline / generic tags that mean nothing to readers.
    static let hiddenTags: Set<String> = [
        "seed", "radar", "rss", "youtube", "wikipedia", "reddit", "mock", "mock-seed",
        "stub", "live", "slang", "abbrev", "meme", "trend",
    ]

    static func tagKey(_ s: String?) -> String {
        String(String.UnicodeScalarView((s ?? "").lowercased().unicodeScalars.filter { sc in
            (sc.value >= 0x61 && sc.value <= 0x7A) || (sc.value >= 0x30 && sc.value <= 0x39)
        }))
    }

    /// Reader-facing chips: hide internal tags, dedupe case/spacing-insensitively and drop
    /// aliases of the title (67 / six seven / 6 7). Max 4.
    static func displayTags(for trend: Trend) -> [String] {
        var seen: Set<String> = [tagKey(trend.world), tagKey(trend.age)]
        let titleKey = tagKey(trend.title)
        var out: [String] = []
        for raw in trend.tags {
            let label = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            let key = tagKey(label)
            if key.isEmpty || seen.contains(key) || hiddenTags.contains(label.lowercased()) { continue }
            if (key.count >= 2 && titleKey.contains(key)) || (titleKey.count >= 3 && key.contains(titleKey)) { continue }
            seen.insert(key)
            out.append(label)
            if out.count >= 4 { break }
        }
        return out
    }

    /// Capitalise the first letter of all-lowercase titles ("alpha" → "Alpha").
    static func displayTitle(_ title: String) -> String {
        guard title == title.lowercased() else { return title }
        guard let idx = title.firstIndex(where: { $0 >= "a" && $0 <= "z" }) else { return title }
        return title.replacingCharacters(in: idx...idx, with: String(title[idx]).uppercased())
    }
}
