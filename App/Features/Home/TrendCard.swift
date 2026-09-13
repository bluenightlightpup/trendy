import SwiftUI

struct TrendCard: View {
    let trend: Trend

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(trend.title)
                    .font(TrendyTypography.headline(18))
                    .foregroundStyle(TrendyColors.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 8)
                WorldChip(world: trend.world)
            }

            Text(trend.summary)
                .font(TrendyTypography.body(14))
                .foregroundStyle(TrendyColors.textSecondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            HeatMeter(
                score: trend.heatScore,
                accessibilityLabel: "Heat \(trend.heatLevel.displayLabel), \(trend.lifecycle.displayLabel)"
            )

            HStack(spacing: 8) {
                Text(trend.heatLevel.displayLabel)
                    .font(TrendyTypography.mono(11))
                    .foregroundStyle(TrendyColors.heatColor(for: trend.heatLevel))
                LifecycleChip(lifecycle: trend.lifecycle)
                Spacer(minLength: 0)
            }
        }
        .padding(16)
        .background(TrendyColors.inkElevated)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(TrendyColors.inkBorder, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(trend.title), \(trend.world.rawValue), \(trend.heatLevel.displayLabel), \(trend.lifecycle.displayLabel). \(trend.summary)"
        )
        .accessibilityHint("Opens origin story")
    }
}

struct WorldChip: View {
    let world: TrendWorld

    var body: some View {
        Text(world.rawValue.uppercased())
            .font(TrendyTypography.mono(10))
            .foregroundStyle(TrendyColors.textSecondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(TrendyColors.inkBorder.opacity(0.55))
            .clipShape(Capsule())
            .accessibilityLabel("World \(world.rawValue)")
    }
}

struct LifecycleChip: View {
    let lifecycle: TrendLifecycle

    var body: some View {
        Text(lifecycle.displayLabel.uppercased())
            .font(TrendyTypography.mono(10))
            .foregroundStyle(lifecycleForeground)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(lifecycleForeground.opacity(0.15))
            .clipShape(Capsule())
            .accessibilityLabel("Lifecycle \(lifecycle.displayLabel)")
    }

    private var lifecycleForeground: Color {
        switch lifecycle {
        case .rising: return TrendyColors.heatVolt
        case .peaking: return TrendyColors.heatHot
        case .cooling: return TrendyColors.heatCool
        }
    }
}

#Preview {
    TrendCard(trend: MockTrendService.samples[0])
        .padding()
        .background(TrendyColors.inkBg)
}
