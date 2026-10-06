import XCTest
@testable import Trendy

/// UserDefaults-backed stores (iOS only: they are @MainActor ObservableObjects).
final class StoreTests: XCTestCase {
    private func freshDefaults(_ name: String) -> UserDefaults {
        let suite = "trendy.tests.\(name)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }

    @MainActor
    func testSavedTrendsToggleAndPersist() {
        let defaults = freshDefaults("saved")
        let store = SavedTrendsStore(defaults: defaults)
        XCTAssertTrue(store.toggle("trend-67-six-seven"))
        XCTAssertTrue(store.isSaved("trend-67-six-seven"))
        XCTAssertEqual(SavedTrendsStore(defaults: defaults).savedIds, ["trend-67-six-seven"])
        XCTAssertFalse(store.toggle("trend-67-six-seven"))
        XCTAssertTrue(SavedTrendsStore(defaults: defaults).savedIds.isEmpty)
        XCTAssertFalse(store.toggle("   "))
    }

    @MainActor
    func testSavedTrendsKeepSaveOrderAndSkipUnknownIds() {
        let store = SavedTrendsStore(defaults: freshDefaults("order"))
        let trends = Array(TestData.shared.trends.prefix(3))
        store.replaceAll([trends[2].id, "gone", trends[0].id, trends[2].id])
        XCTAssertEqual(store.savedTrends(in: TestData.shared.trends).map(\.id), [trends[2].id, trends[0].id])
    }

    @MainActor
    func testPreferencesPersist() {
        let defaults = freshDefaults("prefs")
        let prefs = PreferencesStore(defaults: defaults)
        XCTAssertTrue(prefs.newHere)
        XCTAssertEqual(prefs.digest, .weekly)
        XCTAssertTrue(prefs.isEnabled(.gaming))
        prefs.setEnabled(.gaming, false)
        prefs.digest = .daily
        prefs.newHere = false
        prefs.dictionaryLookups = false
        let reloaded = PreferencesStore(defaults: defaults)
        XCTAssertFalse(reloaded.isEnabled(.gaming))
        XCTAssertEqual(reloaded.digest, .daily)
        XCTAssertFalse(reloaded.newHere)
        XCTAssertFalse(reloaded.dictionaryLookups)
    }
}
