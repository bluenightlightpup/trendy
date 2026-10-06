import SwiftUI

/// Signal identity colors — mirrors `web/styles.css` and `docs/design-tokens.md`.
enum TrendyColors {
    static let inkBg = Color(red: 0.043, green: 0.051, blue: 0.071)        // #0B0D12
    static let inkElevated = Color(red: 0.078, green: 0.094, blue: 0.141)   // #141824
    static let inkElevated2 = Color(red: 0.102, green: 0.122, blue: 0.180)  // #1A1F2E
    static let inkBorder = Color(red: 0.137, green: 0.157, blue: 0.212)     // #232836
    static let textPrimary = Color(red: 0.957, green: 0.965, blue: 0.984)   // #F4F6FB
    static let textSecondary = Color(red: 0.604, green: 0.639, blue: 0.710) // #9AA3B5
    static let textFaint = Color(red: 0.420, green: 0.447, blue: 0.502)     // #6B7280

    static let heatCool = Color(red: 0.176, green: 0.886, blue: 0.902)      // #2DE2E6 cyan
    static let heatVolt = Color(red: 0.784, green: 0.945, blue: 0.208)      // #C8F135 acid-lime
    static let heatHot = Color(red: 1.0, green: 0.176, blue: 0.584)         // #FF2D95 hot pink
    static let heatTrack = Color(red: 0.165, green: 0.192, blue: 0.259)     // #2A3142

    static let heatGradient = LinearGradient(
        colors: [heatCool, heatVolt, heatHot],
        startPoint: .leading,
        endPoint: .trailing
    )

    static func heatColor(for level: HeatLevel) -> Color {
        switch level {
        case .cool: return heatCool
        case .volt: return heatVolt
        case .hot: return heatHot
        }
    }

    static func lifecycleColor(_ lifecycle: TrendLifecycle) -> Color {
        switch lifecycle {
        case .rising: return heatCool
        case .peaking: return heatHot
        case .cooling: return textSecondary
        case .stable, .active: return heatVolt
        case .fading, .dormant: return textFaint
        }
    }
}
