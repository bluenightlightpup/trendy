import Foundation
import Combine

/// You-tab preferences, persisted in UserDefaults on this device only.
@MainActor
final class PreferencesStore: ObservableObject {
    enum Keys {
        static let disabledWorlds = "trendy.you.disabledWorlds.v1"
        static let digest = "trendy.you.digest.v1"
        static let newHere = "trendy.you.newHere.v1"
        static let dictionaryLookups = "trendy.you.dictionaryLookups.v1"
    }

    /// Worlds switched off under You (stored as raw world names; unknown worlds stay visible).
    @Published var disabledWorlds: Set<String> {
        didSet { defaults.set(Array(disabledWorlds).sorted(), forKey: Keys.disabledWorlds) }
    }

    @Published var digest: TrendRanking.DigestFrequency {
        didSet { defaults.set(digest.rawValue, forKey: Keys.digest) }
    }

    /// Softer framing and extra explanation (PWA "New here mode"). Default on.
    @Published var newHere: Bool {
        didSet { defaults.set(newHere, forKey: Keys.newHere) }
    }

    /// Optional public dictionary lookup for single words. Default on; off = fully offline.
    @Published var dictionaryLookups: Bool {
        didSet { defaults.set(dictionaryLookups, forKey: Keys.dictionaryLookups) }
    }

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.disabledWorlds = Set(defaults.stringArray(forKey: Keys.disabledWorlds) ?? [])
        self.digest = TrendRanking.DigestFrequency(rawValue: defaults.string(forKey: Keys.digest) ?? "") ?? .weekly
        self.newHere = defaults.object(forKey: Keys.newHere) as? Bool ?? true
        self.dictionaryLookups = defaults.object(forKey: Keys.dictionaryLookups) as? Bool ?? true
    }

    func isEnabled(_ world: TrendWorld) -> Bool {
        !disabledWorlds.contains(world.rawValue)
    }

    func setEnabled(_ world: TrendWorld, _ enabled: Bool) {
        if enabled {
            disabledWorlds.remove(world.rawValue)
        } else {
            disabledWorlds.insert(world.rawValue)
        }
    }
}
