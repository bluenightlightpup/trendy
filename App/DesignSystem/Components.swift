import SwiftUI

/// Selectable filter chip (Home All/Saved, Explore worlds).
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(TrendyTypography.mono(.caption))
                .fontWeight(isSelected ? .semibold : .medium)
                .lineLimit(1)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .foregroundStyle(isSelected ? TrendyColors.inkBg : TrendyColors.textSecondary)
                .background(isSelected ? TrendyColors.heatCool : TrendyColors.inkElevated, in: Capsule())
                .overlay(Capsule().stroke(isSelected ? TrendyColors.heatCool : TrendyColors.inkBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

/// Small outlined capsule used for world, age and tag labels.
struct Pill: View {
    let text: String
    var color: Color = TrendyColors.textSecondary
    var border: Color = TrendyColors.inkBorder
    var fill: Color = Color.white.opacity(0.04)
    var uppercase = false

    var body: some View {
        Text(uppercase ? text.uppercased() : text)
            .font(TrendyTypography.mono(.caption2))
            .lineLimit(1)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(fill, in: Capsule())
            .overlay(Capsule().stroke(border, lineWidth: 1))
    }
}

struct LifecyclePill: View {
    let lifecycle: TrendLifecycle

    var body: some View {
        let color = TrendyColors.lifecycleColor(lifecycle)
        Pill(text: lifecycle.displayLabel, color: color, border: color.opacity(0.35), fill: color.opacity(0.12), uppercase: true)
            .accessibilityLabel("Lifecycle: \(lifecycle.displayLabel)")
    }
}

struct WorldPill: View {
    let world: String

    var body: some View {
        Pill(text: world, color: TrendyColors.heatVolt, border: TrendyColors.heatVolt.opacity(0.3))
            .accessibilityLabel("World: \(world)")
    }
}

struct AgeChip: View {
    let band: AgeBand

    var body: some View {
        Pill(text: band.rawValue, color: TrendyColors.heatCool, border: TrendyColors.heatCool.opacity(0.35), fill: TrendyColors.heatCool.opacity(0.1))
            .accessibilityLabel("Mostly used by \(band.rawValue)")
    }
}

/// World pill, age chip and clean tags in a wrapping row.
struct TrendMetaRow: View {
    let trend: Trend

    var body: some View {
        FlowLayout(spacing: 6, lineSpacing: 6) {
            if !trend.world.isEmpty { WorldPill(world: trend.world) }
            if let band = trend.ageBand { AgeChip(band: band) }
            ForEach(trend.displayTags, id: \.self) { tag in
                Pill(text: tag)
            }
        }
    }
}

/// Heart toggle wired to the shared `SavedTrendsStore`.
struct SaveButton: View {
    @EnvironmentObject private var saved: SavedTrendsStore
    let trend: Trend
    var prominent = false

    var body: some View {
        let isSaved = saved.isSaved(trend.id)
        Button {
            saved.toggle(trend.id)
        } label: {
            if prominent {
                Label(isSaved ? "Saved" : "Save", systemImage: isSaved ? "heart.fill" : "heart")
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .foregroundStyle(isSaved ? TrendyColors.inkBg : TrendyColors.heatHot)
                    .background(isSaved ? TrendyColors.heatHot : TrendyColors.heatHot.opacity(0.12), in: Capsule())
                    .overlay(Capsule().stroke(TrendyColors.heatHot.opacity(0.5), lineWidth: 1))
            } else {
                Image(systemName: isSaved ? "heart.fill" : "heart")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(isSaved ? TrendyColors.heatHot : TrendyColors.textSecondary)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isSaved)
        .accessibilityLabel(isSaved ? "Unsave \(trend.displayTitle)" : "Save \(trend.displayTitle)")
        .accessibilityAddTraits(isSaved ? [.isSelected] : [])
    }
}

struct EmptyStateView: View {
    let title: String
    let message: String
    var systemImage: String = "sparkles"

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(TrendyColors.heatCool)
                .accessibilityHidden(true)
            Text(title)
                .font(TrendyTypography.headline(.headline))
                .foregroundStyle(TrendyColors.textPrimary)
            Text(message)
                .font(TrendyTypography.body(.subheadline))
                .foregroundStyle(TrendyColors.textSecondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(TrendyColors.inkElevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.inkBorder, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

/// Muted one-line hint under a screen title ("Sorted by what’s hot now").
struct ScreenHint: View {
    let text: String

    var body: some View {
        Text(text)
            .font(TrendyTypography.mono(.caption))
            .foregroundStyle(TrendyColors.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Simple wrapping layout for chips (iOS 16+ `Layout`).
struct FlowLayout: Layout {
    var spacing: CGFloat = 6
    var lineSpacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0
        var widest: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            let itemWidth = min(size.width, maxWidth)
            if x > 0 && x + itemWidth > maxWidth {
                y += lineHeight + lineSpacing
                x = 0
                lineHeight = 0
            }
            x += itemWidth + spacing
            lineHeight = max(lineHeight, size.height)
            widest = max(widest, x - spacing)
        }
        let width = proposal.width ?? widest
        return CGSize(width: width, height: subviews.isEmpty ? 0 : y + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var lineHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            let itemWidth = min(size.width, bounds.width)
            if x > bounds.minX && x + itemWidth > bounds.maxX {
                y += lineHeight + lineSpacing
                x = bounds.minX
                lineHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(width: itemWidth, height: size.height))
            x += itemWidth + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}

/// Shared screen background.
extension View {
    func trendyScreenBackground() -> some View {
        background(TrendyColors.inkBg.ignoresSafeArea())
    }
}
