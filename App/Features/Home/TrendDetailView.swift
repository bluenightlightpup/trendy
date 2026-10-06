import SwiftUI

/// Card detail: origin story, heat, meta chips and a prominent Save.
struct TrendDetailView: View {
    @EnvironmentObject private var model: AppModel
    let trendID: String

    var body: some View {
        Group {
            if let trend = model.data.trend(id: trendID) {
                content(trend)
            } else {
                EmptyStateView(title: "Trend not found", message: "It may have dropped out of this version\u{2019}s catalog.", systemImage: "questionmark.circle")
                    .padding(16)
                    .frame(maxHeight: .infinity, alignment: .top)
            }
        }
        .trendyScreenBackground()
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
    }

    private func content(_ trend: Trend) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(trend.displayTitle)
                        .font(TrendyTypography.headline(.largeTitle))
                        .foregroundStyle(TrendyColors.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    Spacer(minLength: 8)
                    LifecyclePill(lifecycle: trend.lifecycle)
                }

                SaveButton(trend: trend, prominent: true)

                if !trend.summary.isEmpty {
                    Text(trend.summary)
                        .font(TrendyTypography.body(.title3))
                        .foregroundStyle(TrendyColors.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                TrendMetaRow(trend: trend)

                HeatMeter(score: trend.heatScore)

                if !trend.originStory.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Origin story")
                            .font(TrendyTypography.mono(.caption))
                            .textCase(.uppercase)
                            .foregroundStyle(TrendyColors.heatCool)
                        Text(trend.originStory)
                            .font(TrendyTypography.body())
                            .foregroundStyle(TrendyColors.textPrimary)
                            .fixedSize(horizontal: false, vertical: true)
                            .textSelection(.enabled)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(TrendyColors.inkElevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.inkBorder, lineWidth: 1))
                }
            }
            .padding(16)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }
}
