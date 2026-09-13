import SwiftUI

struct HomeView: View {
    private let service: TrendServing = MockTrendService()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(service.trendsSortedByMomentum()) { trend in
                        NavigationLink(value: trend) {
                            TrendCard(trend: trend)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .background(TrendyColors.inkBg.ignoresSafeArea())
            .navigationTitle("Home")
            .navigationDestination(for: Trend.self) { trend in
                OriginStoryView(trend: trend)
            }
        }
    }
}

struct TrendCard: View {
    let trend: Trend

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(trend.title)
                    .font(TrendyTypography.headline(18))
                    .foregroundStyle(TrendyColors.textPrimary)
                Spacer()
                Text(trend.world.rawValue.uppercased())
                    .font(TrendyTypography.mono(10))
                    .foregroundStyle(TrendyColors.textSecondary)
            }

            Text(trend.summary)
                .font(TrendyTypography.body(14))
                .foregroundStyle(TrendyColors.textSecondary)
                .lineLimit(2)

            HeatMeter(score: trend.heatScore)

            Text(trend.heatLevel.rawValue.uppercased())
                .font(TrendyTypography.mono(11))
                .foregroundStyle(TrendyColors.heatColor(for: trend.heatLevel))
        }
        .padding(16)
        .background(TrendyColors.inkElevated)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(TrendyColors.inkBorder, lineWidth: 1)
        )
    }
}

struct OriginStoryView: View {
    let trend: Trend

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HeatMeter(score: trend.heatScore)
                Text(trend.originStory)
                    .font(TrendyTypography.body(16))
                    .foregroundStyle(TrendyColors.textPrimary)
                Text(trend.tags.map { "#\($0)" }.joined(separator: " "))
                    .font(TrendyTypography.mono(12))
                    .foregroundStyle(TrendyColors.textSecondary)
            }
            .padding(16)
        }
        .background(TrendyColors.inkBg.ignoresSafeArea())
        .navigationTitle(trend.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    HomeView()
}
