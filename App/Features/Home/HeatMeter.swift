import SwiftUI

/// Signature cool → volt → hot track with a marker for trend velocity.
struct HeatMeter: View {
    /// Normalized momentum `0...1`.
    var score: Double
    var accessibilityLabel: String?

    private var clamped: Double { min(max(score, 0), 1) }

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(TrendyColors.heatTrack)

                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                TrendyColors.heatCool,
                                TrendyColors.heatVolt,
                                TrendyColors.heatHot
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .opacity(0.85)

                Circle()
                    .fill(TrendyColors.textPrimary)
                    .frame(width: height * 0.9, height: height * 0.9)
                    .shadow(color: .black.opacity(0.4), radius: 2, y: 1)
                    .offset(x: max(0, (width - height) * clamped))
            }
        }
        .frame(height: 10)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel ?? "Heat \(HeatLevel.from(score: clamped).rawValue)")
        .accessibilityValue(String(format: "%.0f percent", clamped * 100))
    }
}

#Preview {
    VStack(spacing: 16) {
        HeatMeter(score: 0.15)
        HeatMeter(score: 0.5)
        HeatMeter(score: 0.95)
    }
    .padding()
    .background(TrendyColors.inkBg)
}
