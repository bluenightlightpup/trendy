import Foundation

/// Cultural world used by Explore filters and interest toggles.
enum TrendWorld: String, CaseIterable, Identifiable, Codable {
    case tiktok = "TikTok"
    case internetCulture = "Internet culture"
    case abbreviations = "Abbreviations"
    case gaming = "Gaming"

    var id: String { rawValue }
}

/// Discrete heat band along cool → volt → hot.
enum HeatLevel: String, Codable {
    case cool
    case volt
    case hot

    /// Map a normalized momentum score `0...1` into a band.
    static func from(score: Double) -> HeatLevel {
        switch min(max(score, 0), 1) {
        case ..<0.34: return .cool
        case ..<0.67: return .volt
        default: return .hot
        }
    }
}

struct Trend: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var summary: String
    var originStory: String
    var world: TrendWorld
    /// Normalized momentum `0...1` for HeatMeter.
    var heatScore: Double
    var tags: [String]

    var heatLevel: HeatLevel { HeatLevel.from(score: heatScore) }
}
