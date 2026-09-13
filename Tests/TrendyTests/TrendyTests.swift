import XCTest
@testable import Trendy

final class TrendyTests: XCTestCase {
    func testHeatLevelBands() {
        XCTAssertEqual(HeatLevel.from(score: 0.0), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.33), .cool)
        XCTAssertEqual(HeatLevel.from(score: 0.34), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.66), .volt)
        XCTAssertEqual(HeatLevel.from(score: 0.67), .hot)
        XCTAssertEqual(HeatLevel.from(score: 1.0), .hot)
    }

    func testMockServiceSortsByMomentumDescending() {
        let service = MockTrendService()
        let trends = service.trendsSortedByMomentum()
        let scores = trends.map(\.heatScore)
        XCTAssertEqual(scores, scores.sorted(by: >))
        XCTAssertFalse(trends.isEmpty)
    }

    func testExploreFiltersByWorld() {
        let service = MockTrendService()
        let gaming = service.trends(in: .gaming)
        XCTAssertTrue(gaming.allSatisfy { $0.world == .gaming })
    }
}
