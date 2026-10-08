import Foundation

/// Bundled snapshot of `web/data/*.json` (copied into the app bundle by project.yml).
/// The app works fully offline; data refreshes ship with app updates.
struct TrendyData {
    var trends: [Trend]
    var slang: [LexiconEntry]
    var abbreve: [LexiconEntry]
    var community: [LexiconEntry]
    /// Hand-picked Word of the Day dates from `word-of-the-day.json` (date → term).
    var wotdOverrides: [String: String] = [:]

    static let empty = TrendyData(trends: [], slang: [], abbreve: [], community: [])

    enum File: String, CaseIterable {
        case trends = "trends"
        case slang = "slang"
        case abbreve = "abbreve"
        case community = "community-slang"
    }

    /// Load from the app bundle, or from `directory` (tests / Linux checks). Missing or broken files
    /// load as empty lists rather than crashing. `sanitize` applies `ContentSafety` (on in the app).
    static func load(bundle: Bundle = .main, directory: URL? = nil, sanitize: Bool = true) -> TrendyData {
        func data(_ file: File) -> Data? {
            let url: URL?
            if let directory {
                url = directory.appendingPathComponent(file.rawValue + ".json")
            } else {
                url = bundle.url(forResource: file.rawValue, withExtension: "json")
            }
            guard let url else { return nil }
            return try? Data(contentsOf: url)
        }

        let decoder = JSONDecoder()
        var trends: [Trend] = []
        if let raw = data(.trends) {
            if let list = try? decoder.decode(LossyArray<Trend>.self, from: raw) {
                trends = list.values
            } else if let wrapped = try? decoder.decode(TrendsWrapper.self, from: raw) {
                trends = wrapped.trends
            }
        }
        func lexicon(_ file: File) -> [LexiconEntry] {
            guard let raw = data(file), let parsed = try? decoder.decode(LexiconFile.self, from: raw) else { return [] }
            return parsed.entries
        }

        var result = TrendyData(
            trends: dedupe(trends),
            slang: lexicon(.slang),
            abbreve: lexicon(.abbreve),
            community: lexicon(.community)
        )
        result.wotdOverrides = WordOfTheDay.loadOverrides(bundle: bundle, directory: directory)
        if sanitize {
            result.trends = result.trends.map(ContentSafety.sanitize)
            result.slang = result.slang.map(ContentSafety.sanitize)
            result.abbreve = result.abbreve.map(ContentSafety.sanitize)
            result.community = result.community.map(ContentSafety.sanitize)
        }
        return result
    }

    /// Keep the first trend for each id so SwiftUI lists never see duplicate identifiers.
    static func dedupe(_ trends: [Trend]) -> [Trend] {
        var seen = Set<String>()
        return trends.filter { seen.insert($0.id).inserted }
    }

    func trend(id: String) -> Trend? {
        trends.first { $0.id == id }
    }

    func makeEngine() -> DecodeEngine {
        DecodeEngine(slang: slang, community: community, abbreve: abbreve, trends: trends)
    }
}

/// Tolerates a future `{ "trends": [...] }` shape.
private struct TrendsWrapper: Decodable {
    var trends: [Trend]

    enum CodingKeys: String, CodingKey { case trends }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        trends = try c.decode(LossyArray<Trend>.self, forKey: .trends).values
    }
}
