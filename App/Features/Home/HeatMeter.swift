import SwiftUI

/// Cool → volt → hot track with a marker dot and the 0–100 score (PWA `heatMeterHtml`).
struct HeatMeter: View {
    /// Normalized heat `0...1`.
    var score: Double

    private var clamped: Double { min(max(score.isFinite ? score : 0, 0), 1) }
    private var percent: Int { Int((clamped * 100).rounded()) }

    var body: some View {
        HStack(spacing: 10) {
            GeometryReader { geo in
                let dot: CGFloat = 14
                let travel = max(0, geo.size.width - dot)
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(TrendyColors.heatTrack)
                        .frame(height: 8)
                    Capsule()
                        .fill(TrendyColors.heatGradient)
                        .opacity(0.85)
                        .frame(height: 8)
                    Circle()
                        .fill(TrendyColors.textPrimary)
                        .frame(width: dot, height: dot)
                        .overlay(Circle().stroke(TrendyColors.inkBg, lineWidth: 2))
                        .shadow(color: TrendyColors.textPrimary.opacity(0.35), radius: 2)
                        .offset(x: travel * CGFloat(clamped))
                }
                .frame(height: geo.size.height)
            }
            .frame(height: 16)

            Text("\(percent)")
                .font(TrendyTypography.mono(.caption))
                .foregroundStyle(TrendyColors.textPrimary)
                .frame(minWidth: 28, alignment: .trailing)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Heat score")
        .accessibilityValue("\(percent) out of 100")
    }
}

#Preview {
    VStack(spacing: 16) {
        HeatMeter(score: 0.15)
        HeatMeter(score: 0.5)
        HeatMeter(score: 0.97)
    }
    .padding()
    .background(TrendyColors.inkBg)
}
