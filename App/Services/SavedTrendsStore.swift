import Foundation
import Combine

/// Local save/follow store for trend IDs (same `trendy.saved.v1` semantics as the PWA).
/// Shared across Home, Explore, detail and You via the environment.
@MainActor
final class SavedTrendsStore: ObservableObject {
    static let storageKey = "trendy.saved.v1"

    @Published private(set) var savedIds: [String]

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.savedIds = Self.load(from: defaults)
    }

    func isSaved(_ id: String) -> Bool {
        let needle = id.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return false }
        return savedIds.contains(needle)
    }

    @discardableResult
    func toggle(_ id: String) -> Bool {
        let needle = id.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return false }
        if let idx = savedIds.firstIndex(of: needle) {
            savedIds.remove(at: idx)
            persist()
            return false
        }
        savedIds.append(needle)
        persist()
        return true
    }

    func remove(_ id: String) {
        guard let idx = savedIds.firstIndex(of: id) else { return }
        savedIds.remove(at: idx)
        persist()
    }

    func replaceAll(_ ids: [String]) {
        var seen = Set<String>()
        savedIds = ids.compactMap { raw in
            let id = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !id.isEmpty, !seen.contains(id) else { return nil }
            seen.insert(id)
            return id
        }
        persist()
    }

    /// Saved trends in the order they were saved, skipping ids no longer in the catalog.
    func savedTrends(in trends: [Trend]) -> [Trend] {
        let byId = Dictionary(trends.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        return savedIds.compactMap { byId[$0] }
    }

    private func persist() {
        defaults.set(savedIds, forKey: Self.storageKey)
    }

    private static func load(from defaults: UserDefaults) -> [String] {
        var seen = Set<String>()
        return (defaults.stringArray(forKey: storageKey) ?? []).compactMap { raw in
            let id = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !id.isEmpty, seen.insert(id).inserted else { return nil }
            return id
        }
    }
}
