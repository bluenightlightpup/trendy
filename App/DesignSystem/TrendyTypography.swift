import SwiftUI

/// Intended: Space Grotesk + JetBrains Mono. System fallbacks until fonts ship.
enum TrendyTypography {
    static func headline(_ size: CGFloat = 24) -> Font {
        // Space Grotesk → rounded system fallback
        .system(size: size, weight: .bold, design: .rounded)
    }

    static func body(_ size: CGFloat = 16) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    static func mono(_ size: CGFloat = 12) -> Font {
        // JetBrains Mono → monospaced system fallback
        .system(size: size, weight: .medium, design: .monospaced)
    }
}
