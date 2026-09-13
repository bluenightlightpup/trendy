import SwiftUI

struct OriginStoryView: View {
    let trend: Trend

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 8) {
                    WorldChip(world: trend.world)
                    LifecycleChip(lifecycle: trend.lifecycle)
                    Spacer(minLength: 0)
                }

                HeatMeter(
                    score: trend.heatScore,
                    accessibilityLabel: "Heat \(trend.heatLevel.displayLabel), \(trend.lifecycle.displayLabel)"
                )

                Text(trend.heatLevel.displayLabel)
                    .font(TrendyTypography.mono(12))
                    .foregroundStyle(TrendyColors.heatColor(for: trend.heatLevel))

                Text(trend.summary)
                    .font(TrendyTypography.headline(16))
                    .foregroundStyle(TrendyColors.textPrimary)

                Text(trend.originStory)
                    .font(TrendyTypography.body(16))
                    .foregroundStyle(TrendyColors.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)

                if !trend.tags.isEmpty {
                    Text(trend.tags.map { "#\($0)" }.joined(separator: " "))
                        .font(TrendyTypography.mono(12))
                        .foregroundStyle(TrendyColors.textSecondary)
                        .accessibilityLabel("Tags: \(trend.tags.joined(separator: ", "))")
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(TrendyColors.inkBg.ignoresSafeArea())
        .navigationTitle(trend.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        OriginStoryView(trend: MockTrendService.samples[0])
    }
}
