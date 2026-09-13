import Foundation
import Combine

/// Local save/follow store for trend IDs.
/// Phase 3: stub aligned with PWA `trendy.saved.v1` semantics.
/// Full SwiftUI save UI (card hearts, You list) can wire this on a Mac build.
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

    private func persist() {
        defaults.set(savedIds, forKey: Self.storageKey)
    }

    private static func load(from defaults: UserDefaults) -> [String] {
        (defaults.stringArray(forKey: storageKey) ?? []).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}
