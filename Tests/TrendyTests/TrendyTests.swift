import XCTest
@testable import Trendy

final class TrendyTests: XCTestCase {
    private let now = TrendRanking.parseISO("2026-10-01T00:00:00Z")!

    func testHeatLevelBands() {
        XCTAssertEqual(HeatLevel.from(score: 0.0), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.339999), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.34), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.669999), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.67), .hot)
        XCTAssertEqual(HeatLevel.from(score: 1.5), .hot)
        XCTAssertEqual(HeatLevel.from(score: -0.5), .cool)
    }

    func testLifecycleWeightsMatchThePWA() {
        XCTAssertEqual(TrendLifecycle(raw: "rising").homeWeight, 1.2)
        XCTAssertEqual(TrendLifecycle(raw: "Peaking").homeWeight, 1.0)
        XCTAssertEqual(TrendLifecycle(raw: "cooling").homeWeight, 0.55)
        XCTAssertEqual(TrendLifecycle(raw: "fading").homeWeight, 0.32)
        XCTAssertEqual(TrendLifecycle(raw: "dormant").homeWeight, 0.18)
        XCTAssertEqual(TrendLifecycle(raw: "stable").displayLabel, "Steady")
        XCTAssertEqual(TrendLifecycle(raw: nil), .active)
        XCTAssertEqual(TrendLifecycle(raw: "mystery").homeWeight, 0.7)
    }

    func testHomeRelevanceFavoursFreshOverMuseumHeat() {
        let rising = Trend(id: "a", title: "a", heatScore: 0.5, lifecycle: "rising")
        let cooling = Trend(id: "b", title: "b", heatScore: 0.8, lifecycle: "cooling")
        let oldPeak = Trend(id: "c", title: "c", heatScore: 0.95, lifecycle: "cooling", peakedAt: "2023-01-01")
        XCTAssertEqual(TrendRanking.homeRelevance(rising, now: now), 0.6, accuracy: 1e-9)
        XCTAssertEqual(TrendRanking.homeRelevance(cooling, now: now), 0.44, accuracy: 1e-9)
        let order = TrendRanking.sortedForHome([oldPeak, cooling, rising], now: now).map(\.id)
        XCTAssertEqual(order, ["a", "b", "c"])
        XCTAssertGreaterThanOrEqual(TrendRanking.recencyFactor(oldPeak, now: now), 0.12)
    }

    func testDisplayTagsHideInternalTagsAndDedupe() {
        let trend = Trend(
            id: "trend-67", title: "67 (six seven)", world: "TikTok", age: "Gen Alpha",
            tags: ["brainrot", "gen-alpha", "tiktok", "slang", "67", "six seven", "6 7", "seed", "radar", "Brainrot", "hallway"]
        )
        XCTAssertEqual(trend.displayTags, ["brainrot", "hallway"])
        XCTAssertEqual(TrendRanking.displayTitle("alpha"), "Alpha")
        XCTAssertEqual(TrendRanking.displayTitle("BRB"), "BRB")
        XCTAssertEqual(trend.ageBand, .genAlpha)
    }

    func testTolerantDecodingDropsBadRowsAndDefaultsOptionals() throws {
        let json = """
        [
          {"id": "x", "title": "Minimal"},
          {"title": "No id", "heatScore": 0.4, "lifecycle": "rising", "tags": ["ok", 5]},
          {"id": "bad"},
          "not an object",
          {"id": "y", "title": "Full", "summary": "s", "originStory": "o", "world": "Gaming",
           "heatScore": 0.9, "lifecycle": "peaking", "age": "Gen Z", "tags": [], "lastSeenAt": "2026-09-01"}
        ]
        """
        let trends = try JSONDecoder().decode(LossyArray<Trend>.self, from: Data(json.utf8)).values
        XCTAssertEqual(trends.map(\.title), ["Minimal", "No id", "Full"])
        XCTAssertEqual(trends[0].lifecycle, .active)
        XCTAssertNil(trends[0].ageBand)
        XCTAssertEqual(trends[1].id, "trend-no-id")
        XCTAssertEqual(trends[1].tags, ["ok"])
        XCTAssertEqual(trends[2].worldKind, .gaming)

        let lexicon = try JSONDecoder().decode(LexiconFile.self, from: Data(#"{"entries":[{"terms":["abc"],"short":"A"},{"short":"no terms"}]}"#.utf8))
        XCTAssertEqual(lexicon.entries.count, 1)
        XCTAssertEqual(lexicon.entries[0].origin, "")
        XCTAssertEqual(try JSONDecoder().decode(LexiconFile.self, from: Data("{}".utf8)).entries.count, 0)
    }

    func testExploreFiltersAndNoMatches() {
        let trends = TestData.shared.trends
        let gaming = TrendRanking.explore(trends, world: .gaming, query: "")
        XCTAssertFalse(gaming.isEmpty)
        XCTAssertTrue(gaming.allSatisfy { $0.world == "Gaming" })
        XCTAssertEqual(gaming.map(\.clampedHeat), gaming.map(\.clampedHeat).sorted(by: >))
        XCTAssertTrue(TrendRanking.explore(trends, world: nil, query: "zzqqxx-no-such-trend").isEmpty)
        XCTAssertFalse(TrendRanking.explore(trends, world: nil, query: "RIZZ").isEmpty)
    }

    func testHomeFeedRespectsDisabledWorlds() {
        let trends = TestData.shared.trends
        let feed = TrendRanking.homeFeed(trends, disabledWorlds: ["TikTok"], now: now)
        XCTAssertFalse(feed.contains { $0.world == "TikTok" })
        XCTAssertFalse(feed.isEmpty)
        let ids = Set(trends.prefix(3).map(\.id))
        XCTAssertEqual(Set(TrendRanking.homeFeed(trends, disabledWorlds: [], savedOnly: ids, now: now).map(\.id)), ids)
    }

    func testDigestSizeAndOff() {
        let ranked = TrendRanking.sortedForHome(TestData.shared.trends, now: now)
        XCTAssertTrue(TrendRanking.digest(from: ranked, frequency: .off, now: now).isEmpty)
        let weekly = TrendRanking.digest(from: ranked, frequency: .weekly, now: now)
        XCTAssertEqual(weekly.count, 5)
        XCTAssertEqual(Set(weekly.map(\.id)).count, 5)
        XCTAssertEqual(Array(weekly.prefix(2)).map(\.id), Array(ranked.prefix(2)).map(\.id))
    }

    func testContentSafetyMasksProfanityButKeepsMeaning() {
        XCTAssertEqual(ContentSafety.mask("What The Fuck"), "What The F***")
        XCTAssertEqual(ContentSafety.mask("Laughing My Ass Off"), "Laughing My A** Off")
        XCTAssertEqual(ContentSafety.mask("Bullshit"), "Bulls***")
        XCTAssertEqual(ContentSafety.mask("Let's Fucking Go"), "Let's F***ing Go")
        XCTAssertEqual(ContentSafety.mask("a classic class assignment"), "a classic class assignment")

        let pattern = "\\b(fuck|shit|bitch|cunt)"
        for entry in TestData.shared.slang + TestData.shared.abbreve + TestData.shared.community {
            for text in [entry.short, entry.explain, entry.origin] {
                XCTAssertNil(text.range(of: pattern, options: [.regularExpression, .caseInsensitive]), "\(entry.terms): \(text)")
            }
        }
        XCTAssertTrue(TestData.decode("wtf").allText.contains("F***"))
        XCTAssertFalse(TestData.decode("gn").allText.localizedCaseInsensitiveContains("naked"))
    }
}
