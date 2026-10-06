import SwiftUI

/// Feed card: title + lifecycle pill, summary, world/age/tags, heat meter, save heart.
/// The card body is a NavigationLink to the detail; the heart sits on top as a sibling so a tap
/// on it never also opens the card.
struct TrendCard: View {
    let trend: Trend

    var body: some View {
        NavigationLink(value: TrendRoute(id: trend.id)) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(trend.displayTitle)
                        .font(TrendyTypography.headline(.title3))
                        .foregroundStyle(TrendyColors.textPrimary)
                        .multilineTextAlignment(.leading)
                        .accessibilityAddTraits(.isHeader)
                    Spacer(minLength: 8)
                    LifecyclePill(lifecycle: trend.lifecycle)
                }

                if !trend.summary.isEmpty {
                    Text(trend.summary)
                        .font(TrendyTypography.body(.subheadline))
                        .foregroundStyle(TrendyColors.textSecondary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                }

                TrendMetaRow(trend: trend)

                HeatMeter(score: trend.heatScore)
                    .padding(.trailing, 44) // room for the heart
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(TrendyColors.inkElevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.inkBorder, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(trend.displayTitle), \(trend.lifecycle.displayLabel), heat \(trend.heatPercent). \(trend.summary)")
        .accessibilityHint("Opens the origin story")
        .overlay(alignment: .bottomTrailing) {
            SaveButton(trend: trend)
                .padding(.trailing, 6)
                .padding(.bottom, 4)
        }
    }
}

/// Navigation value for a trend detail push.
struct TrendRoute: Hashable {
    let id: String
}
