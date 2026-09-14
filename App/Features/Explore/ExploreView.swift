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
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(TrendWorld.allCases) { w in
                            Button {
                                world = w
                            } label: {
                                Text(shortLabel(for: w))
                                    .font(TrendyTypography.mono(11))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(
                                        Capsule()
                                            .fill(world == w ? TrendyColors.heatCool : TrendyColors.inkElevated)
                                    )
                                    .foregroundStyle(world == w ? TrendyColors.inkBg : TrendyColors.textSecondary)
                                    .overlay(
                                        Capsule()
                                            .stroke(TrendyColors.inkBorder, lineWidth: world == w ? 0 : 1)
                                    )
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Filter Explore by \(w.rawValue)")
                            .accessibilityAddTraits(world == w ? .isSelected : [])
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
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
            Text("Try another niche — Dating, campus, sports, music, Money, and more. Mock catalog is offline-first and still growing.")
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
        case .dating: return "Dating"
        case .schoolCampus: return "Campus"
        case .sports: return "Sports"
        case .musicFandom: return "Music"
        case .workTech: return "Work"
        case .money: return "Money"
        }
    }
}

#Preview {
    ExploreView()
}
