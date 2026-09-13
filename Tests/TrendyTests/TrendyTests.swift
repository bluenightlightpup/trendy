import XCTest
@testable import Trendy

final class TrendyTests: XCTestCase {
    func testHeatLevelBands() {
        XCTAssertEqual(HeatLevel.from(score: 0.0), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.33), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.339999), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.34), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.66), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.669999), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.67), .hot)
        XCTAssertEqual(HeatLevel.from(score: 1.0), .hot)
    }

    func testHeatLevelClampsOutOfRangeScores() {
        XCTAssertEqual(HeatLevel.from(score: -0.5), .cool)
        XCTAssertEqual(HeatLevel.from(score: 1.5), .hot)
    }

    func testTrendsSortedByMomentumDescending() {
        let service = MockTrendService()
        let trends = service.trendsSortedByMomentum()
        let scores = trends.map(\.heatScore)
        XCTAssertEqual(scores, scores.sorted(by: >))
        XCTAssertFalse(trends.isEmpty)
        XCTAssertGreaterThanOrEqual(trends.count, 10)
    }

    func testSampleCatalogCoversAllWorldsAndLifecycles() {
        let samples = MockTrendService.samples
        for world in TrendWorld.allCases {
            XCTAssertTrue(
                samples.contains { $0.world == world },
                "Missing sample for world \(world.rawValue)"
            )
        }
        for lifecycle in TrendLifecycle.allCases {
            XCTAssertTrue(
                samples.contains { $0.lifecycle == lifecycle },
                "Missing sample for lifecycle \(lifecycle.rawValue)"
            )
        }
    }

    func testLifecyclePresenceOnSamples() {
        let samples = MockTrendService.samples
        XCTAssertFalse(samples.isEmpty)
        for trend in samples {
            XCTAssertTrue(TrendLifecycle.allCases.contains(trend.lifecycle))
            XCTAssertFalse(trend.title.isEmpty)
            XCTAssertGreaterThanOrEqual(trend.heatScore, 0)
            XCTAssertLessThanOrEqual(trend.heatScore, 1)
        }
    }

    func testExploreFiltersByWorld() {
        let service = MockTrendService()
        for world in TrendWorld.allCases {
            let filtered = service.trends(in: world)
            XCTAssertFalse(filtered.isEmpty, "Expected mock trends for \(world.rawValue)")
            XCTAssertTrue(filtered.allSatisfy { $0.world == world })
            let scores = filtered.map(\.heatScore)
            XCTAssertEqual(scores, scores.sorted(by: >))
        }
    }

    func testTrendHashableForNavigation() {
        let a = MockTrendService.samples[0]
        let b = MockTrendService.samples[0]
        XCTAssertEqual(a, b)
        XCTAssertEqual(a.hashValue, b.hashValue)
        var set: Set<Trend> = []
        set.insert(a)
        XCTAssertTrue(set.contains(b))
    }
}
