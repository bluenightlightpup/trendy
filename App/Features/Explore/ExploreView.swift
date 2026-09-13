import SwiftUI

struct ExploreView: View {
    @State private var world: TrendWorld = .tiktok
    private let service: TrendServing = MockTrendService()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("World", selection: $world) {
                    ForEach(TrendWorld.allCases) { w in
                        Text(w.rawValue).tag(w)
                    }
                }
                .pickerStyle(.segmented)
                .padding(16)

                List(service.trends(in: world)) { trend in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(trend.title)
                            .font(TrendyTypography.headline(16))
                            .foregroundStyle(TrendyColors.textPrimary)
                        Text(trend.summary)
                            .font(TrendyTypography.body(13))
                            .foregroundStyle(TrendyColors.textSecondary)
                        HeatMeter(score: trend.heatScore)
                    }
                    .listRowBackground(TrendyColors.inkElevated)
                }
                .scrollContentBackground(.hidden)
            }
            .background(TrendyColors.inkBg.ignoresSafeArea())
            .navigationTitle("Explore")
        }
    }
}

#Preview {
    ExploreView()
}
