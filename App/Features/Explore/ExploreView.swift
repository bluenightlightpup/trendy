import SwiftUI

struct ExploreView: View {
    @State private var world: TrendWorld = .tiktok
    private let service: any TrendServing = MockTrendService()

    private var trends: [Trend] {
        service.trends(in: world)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("World", selection: $world) {
                    ForEach(TrendWorld.allCases) { w in
                        Text(shortLabel(for: w)).tag(w)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .accessibilityLabel("Trend world")

                if trends.isEmpty {
                    emptyWorld
                } else {
                    worldList
                }
            }
            .background(TrendyColors.inkBg.ignoresSafeArea())
            .navigationTitle("Explore")
            .navigationDestination(for: Trend.self) { trend in
                OriginStoryView(trend: trend)
            }
        }
    }

    private var worldList: some View {
        List(trends) { trend in
            NavigationLink(value: trend) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(trend.title)
                            .font(TrendyTypography.headline(16))
                            .foregroundStyle(TrendyColors.textPrimary)
                        Spacer()
                        LifecycleChip(lifecycle: trend.lifecycle)
                    }
                    Text(trend.summary)
                        .font(TrendyTypography.body(13))
                        .foregroundStyle(TrendyColors.textSecondary)
                        .lineLimit(2)
                    HeatMeter(score: trend.heatScore)
                    Text(trend.heatLevel.displayLabel)
                        .font(TrendyTypography.mono(10))
                        .foregroundStyle(TrendyColors.heatColor(for: trend.heatLevel))
                }
                .padding(.vertical, 4)
            }
            .listRowBackground(TrendyColors.inkElevated)
            .listRowSeparatorTint(TrendyColors.inkBorder)
        }
        .scrollContentBackground(.hidden)
        .listStyle(.plain)
    }

    private var emptyWorld: some View {
        ContentUnavailableView {
            Label("No trends in \(world.rawValue)", systemImage: "globe")
        } description: {
            Text("Try another world — mock catalog is offline-first and still growing.")
                .font(TrendyTypography.body(14))
        }
        .foregroundStyle(TrendyColors.textSecondary)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func shortLabel(for world: TrendWorld) -> String {
        switch world {
        case .tiktok: return "TikTok"
        case .internetCulture: return "Internet"
        case .abbreviations: return "Abbrevs"
        case .gaming: return "Gaming"
        }
    }
}

#Preview {
    ExploreView()
}
