import Foundation

/// Cultural world used by Explore filters and interest toggles.
enum TrendWorld: String, CaseIterable, Identifiable, Codable, Hashable {
    case tiktok = "TikTok"
    case internetCulture = "Internet culture"
    case abbreviations = "Abbreviations"
    case gaming = "Gaming"

    var id: String { rawValue }
}

/// Discrete heat band along cool → volt → hot.
enum HeatLevel: String, Codable, Hashable {
    case cool
    case volt
    case hot

    var displayLabel: String { rawValue.uppercased() }

    /// Map a normalized momentum score `0...1` into a band.
    /// Boundaries: cool `< 0.34`, volt `< 0.67`, else hot.
    static func from(score: Double) -> HeatLevel {
        switch min(max(score, 0), 1) {
        case ..<0.34: return .cool
        case ..<0.67: return .volt
        default: return .hot
        }
    }
}

/// Where a trend sits in its cultural arc (independent of heat band).
enum TrendLifecycle: String, Codable, Hashable, CaseIterable {
    case rising
    case peaking
    case cooling

    var displayLabel: String { rawValue.capitalized }
}

struct Trend: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var title: String
    var summary: String
    var originStory: String
    var world: TrendWorld
    /// Normalized momentum `0...1` for HeatMeter.
    var heatScore: Double
    var lifecycle: TrendLifecycle
    var tags: [String]

    var heatLevel: HeatLevel { HeatLevel.from(score: heatScore) }
}
