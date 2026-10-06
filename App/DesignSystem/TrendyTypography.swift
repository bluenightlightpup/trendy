import SwiftUI

/// System fonts with text styles so everything scales with Dynamic Type.
/// Intended faces (Space Grotesk / JetBrains Mono) can replace these later.
enum TrendyTypography {
    static func headline(_ style: Font.TextStyle = .title3) -> Font {
        .system(style, design: .rounded).weight(.bold)
    }

    static func body(_ style: Font.TextStyle = .body) -> Font {
        .system(style)
    }

    static func mono(_ style: Font.TextStyle = .caption) -> Font {
        .system(style, design: .monospaced).weight(.medium)
    }
}
