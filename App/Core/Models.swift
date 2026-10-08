import Foundation

// Foundation-only models. Everything in App/Core must compile without SwiftUI/Combine
// (scripts/swift-linux-check.sh builds and tests this folder on Linux).

/// Cultural world used by Explore filters and You interest toggles (same list as the PWA).
enum TrendWorld: String, CaseIterable, Identifiable, Codable, Hashable {
    case tiktok = "TikTok"
    case internetCulture = "Internet culture"
    case abbreviations = "Abbreviations"
    case gaming = "Gaming"
    case dating = "Dating"
    case schoolCampus = "School / campus"
    case sports = "Sports"
    case musicFandom = "Music / fandom"
    case workTech = "Work / tech"
    case money = "Money"

    var id: String { rawValue }
}

/// Discrete heat band along cool → volt → hot.
enum HeatLevel: String, Codable, Hashable {
    case cool
    case volt
    case hot

    var displayLabel: String { rawValue.uppercased() }

    /// Map a normalized score `0...1` into a band. Cool `< 0.34`, volt `< 0.67`, else hot.
    static func from(score: Double) -> HeatLevel {
        switch min(max(score, 0), 1) {
        case ..<0.34: return .cool
        case ..<0.67: return .volt
        default: return .hot
        }
    }
}

/// Where a trend sits in its cultural arc. Unknown or missing values read as `.active`.
enum TrendLifecycle: String, CaseIterable, Hashable {
    case rising
    case peaking
    case stable
    case cooling
    case fading
    case dormant
    case active

    init(raw: String?) {
        let key = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        self = TrendLifecycle(rawValue: key) ?? .active
    }

    var displayLabel: String {
        switch self {
        case .rising: return "Rising"
        case .peaking: return "Peaking"
        case .stable: return "Steady"
        case .cooling: return "Cooling"
        case .fading: return "Fading"
        case .dormant: return "Dormant"
        case .active: return "Active"
        }
    }

    /// Home freshness multiplier (PWA `HOME_LIFECYCLE_WEIGHT`, default 0.7).
    var homeWeight: Double {
        switch self {
        case .rising: return 1.2
        case .peaking: return 1.0
        case .cooling: return 0.55
        case .fading: return 0.32
        case .dormant: return 0.18
        case .stable, .active: return 0.7
        }
    }
}

/// Rough audience band. Not a census.
enum AgeBand: String, CaseIterable, Hashable {
    case genAlpha = "Gen Alpha"
    case genZ = "Gen Z"
    case millennial = "Millennial"
    case genXPlus = "Gen X+"
    case mixed = "Mixed"

    init?(raw: String?) {
        let needle = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !needle.isEmpty,
              let hit = AgeBand.allCases.first(where: { $0.rawValue.lowercased() == needle }) else {
            return nil
        }
        self = hit
    }

    /// One-line gloss used by Decode's "Who says this".
    var gloss: String {
        switch self {
        case .genAlpha: return "mostly kids/tweens right now"
        case .genZ: return "mostly teens and early twenties"
        case .millennial: return "mostly late twenties through early forties"
        case .genXPlus: return "mostly forties and older"
        case .mixed: return "used across generations"
        }
    }
}

/// A trend card from `trends.json`. Decoding tolerates missing/odd optional fields;
/// only `title` is required (rows without one are dropped by `LossyArray`).
struct Trend: Identifiable, Hashable, Decodable {
    var id: String
    var title: String
    var summary: String
    var originStory: String
    var world: String
    var heatScore: Double
    var lifecycleRaw: String?
    var age: String?
    var tags: [String]
    var lastSeenAt: String?
    var peakedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, summary, originStory, world, heatScore, lifecycle, age, tags, lastSeenAt, peakedAt
    }

    init(
        id: String,
        title: String,
        summary: String = "",
        originStory: String = "",
        world: String = "",
        heatScore: Double = 0,
        lifecycle: String? = nil,
        age: String? = nil,
        tags: [String] = [],
        lastSeenAt: String? = nil,
        peakedAt: String? = nil
    ) {
        self.id = id
        self.title = title
        self.summary = summary
        self.originStory = originStory
        self.world = world
        self.heatScore = heatScore
        self.lifecycleRaw = lifecycle
        self.age = age
        self.tags = tags
        self.lastSeenAt = lastSeenAt
        self.peakedAt = peakedAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let title = ((try? c.decodeIfPresent(String.self, forKey: .title)) ?? nil)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !title.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .title, in: c, debugDescription: "Trend without title")
        }
        self.title = title
        let rawId = ((try? c.decodeIfPresent(String.self, forKey: .id)) ?? nil)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        self.id = rawId.isEmpty ? "trend-" + DecodeEngine.normalize(title).replacingOccurrences(of: " ", with: "-") : rawId
        self.summary = ((try? c.decodeIfPresent(String.self, forKey: .summary)) ?? nil) ?? ""
        self.originStory = ((try? c.decodeIfPresent(String.self, forKey: .originStory)) ?? nil) ?? ""
        self.world = ((try? c.decodeIfPresent(String.self, forKey: .world)) ?? nil) ?? ""
        self.heatScore = ((try? c.decodeIfPresent(Double.self, forKey: .heatScore)) ?? nil) ?? 0
        self.lifecycleRaw = (try? c.decodeIfPresent(String.self, forKey: .lifecycle)) ?? nil
        self.age = (try? c.decodeIfPresent(String.self, forKey: .age)) ?? nil
        self.tags = ((try? c.decodeIfPresent(LossyArray<String>.self, forKey: .tags)) ?? nil)?.values ?? []
        self.lastSeenAt = (try? c.decodeIfPresent(String.self, forKey: .lastSeenAt)) ?? nil
        self.peakedAt = (try? c.decodeIfPresent(String.self, forKey: .peakedAt)) ?? nil
    }

    var lifecycle: TrendLifecycle { TrendLifecycle(raw: lifecycleRaw) }
    var clampedHeat: Double { min(1, max(0, heatScore.isFinite ? heatScore : 0)) }
    /// 0–100, rounded like the PWA (`Math.round`).
    var heatPercent: Int { Int((clampedHeat * 100).rounded()) }
    var heatLevel: HeatLevel { HeatLevel.from(score: clampedHeat) }
    var ageBand: AgeBand? { AgeBand(raw: age) }
    var worldKind: TrendWorld? { TrendWorld(rawValue: world) }
    var displayTitle: String { TrendRanking.displayTitle(title) }
    var displayTags: [String] { TrendRanking.displayTags(for: self) }
}

/// One lexicon row (`slang.json`, `abbreve.json`, `community-slang.json`, or built-in core).
struct LexiconEntry: Hashable, Decodable {
    var terms: [String]
    var short: String
    var explain: String
    var origin: String
    var age: String?
    var worlds: [String]
    var source: String?
    var confidence: String?
    /// "slang" or "abbreviation" (set on built-in core rows).
    var kind: String?
    /// Word of the Day: `false` opts a row out; `mature: true` also keeps it out (see WordOfTheDay).
    var wotd: Bool?
    var mature: Bool?
    /// Example sentence for the Word of the Day card (`example` is accepted too).
    var wotdExample: String?
    var example: String?
    /// Set by Trend Radar on unverified candidates.
    var radarSource: String?

    enum CodingKeys: String, CodingKey {
        case terms, short, explain, origin, age, worlds, source, confidence, kind
        case wotd, mature, wotdExample, example, radarSource
    }

    init(
        terms: [String],
        short: String,
        explain: String = "",
        origin: String = "",
        age: String? = nil,
        worlds: [String] = [],
        source: String? = nil,
        confidence: String? = nil,
        kind: String? = nil,
        wotd: Bool? = nil,
        mature: Bool? = nil,
        wotdExample: String? = nil,
        example: String? = nil,
        radarSource: String? = nil
    ) {
        self.terms = terms
        self.short = short
        self.explain = explain
        self.origin = origin
        self.age = age
        self.worlds = worlds
        self.source = source
        self.confidence = confidence
        self.kind = kind
        self.wotd = wotd
        self.mature = mature
        self.wotdExample = wotdExample
        self.example = example
        self.radarSource = radarSource
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        var terms = ((try? c.decodeIfPresent(LossyArray<String>.self, forKey: .terms)) ?? nil)?.values ?? []
        if terms.isEmpty, let single = (try? c.decodeIfPresent(String.self, forKey: .terms)) ?? nil {
            terms = [single]
        }
        terms = terms.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard !terms.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .terms, in: c, debugDescription: "Lexicon row without terms")
        }
        self.terms = terms
        self.short = ((try? c.decodeIfPresent(String.self, forKey: .short)) ?? nil) ?? ""
        self.explain = ((try? c.decodeIfPresent(String.self, forKey: .explain)) ?? nil) ?? ""
        self.origin = ((try? c.decodeIfPresent(String.self, forKey: .origin)) ?? nil) ?? ""
        self.age = (try? c.decodeIfPresent(String.self, forKey: .age)) ?? nil
        self.worlds = ((try? c.decodeIfPresent(LossyArray<String>.self, forKey: .worlds)) ?? nil)?.values ?? []
        self.source = (try? c.decodeIfPresent(String.self, forKey: .source)) ?? nil
        self.confidence = (try? c.decodeIfPresent(String.self, forKey: .confidence)) ?? nil
        self.kind = (try? c.decodeIfPresent(String.self, forKey: .kind)) ?? nil
        self.wotd = (try? c.decodeIfPresent(Bool.self, forKey: .wotd)) ?? nil
        self.mature = (try? c.decodeIfPresent(Bool.self, forKey: .mature)) ?? nil
        self.wotdExample = (try? c.decodeIfPresent(String.self, forKey: .wotdExample)) ?? nil
        self.example = (try? c.decodeIfPresent(String.self, forKey: .example)) ?? nil
        self.radarSource = (try? c.decodeIfPresent(String.self, forKey: .radarSource)) ?? nil
    }

    var ageBand: AgeBand? { AgeBand(raw: age) }
}

/// `{ "entries": [...] }` wrapper. Missing `entries` decodes as empty.
struct LexiconFile: Decodable {
    var entries: [LexiconEntry]

    enum CodingKeys: String, CodingKey { case entries }

    init(entries: [LexiconEntry] = []) {
        self.entries = entries
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.entries = ((try? c.decodeIfPresent(LossyArray<LexiconEntry>.self, forKey: .entries)) ?? nil)?.values ?? []
    }
}

/// Decodes an array, silently dropping elements that fail to decode.
struct LossyArray<Element: Decodable>: Decodable {
    var values: [Element]

    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        var out: [Element] = []
        while !container.isAtEnd {
            if let value = try? container.decode(Element.self) {
                out.append(value)
            } else if (try? container.decode(AnyJSONValue.self)) == nil {
                break // cannot advance past this element; stop instead of looping forever
            }
        }
        self.values = out
    }
}

/// Accepts (and discards) any JSON value so `LossyArray` can skip bad elements.
struct AnyJSONValue: Decodable {
    private struct AnyKey: CodingKey {
        var stringValue: String
        var intValue: Int?
        init?(stringValue: String) { self.stringValue = stringValue; self.intValue = nil }
        init?(intValue: Int) { self.stringValue = String(intValue); self.intValue = intValue }
    }

    init(from decoder: Decoder) throws {
        if var list = try? decoder.unkeyedContainer() {
            while !list.isAtEnd {
                _ = try list.decode(AnyJSONValue.self)
            }
            return
        }
        if let object = try? decoder.container(keyedBy: AnyKey.self) {
            for key in object.allKeys {
                _ = try object.decode(AnyJSONValue.self, forKey: key)
            }
            return
        }
        _ = try decoder.singleValueContainer()
    }
}
