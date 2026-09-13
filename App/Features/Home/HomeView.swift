import SwiftUI

struct HomeView: View {
    @State private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.state {
                case .loading:
                    loadingState
                case .empty:
                    emptyState
                case .loaded(let trends):
                    feed(trends)
                }
            }
            .background(TrendyColors.inkBg.ignoresSafeArea())
            .navigationTitle("Home")
            .navigationDestination(for: Trend.self) { trend in
                OriginStoryView(trend: trend)
            }
            .task {
                if case .loading = viewModel.state {
                    await viewModel.load()
                }
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(TrendyColors.heatHot)
            Text("Scanning signals…")
                .font(TrendyTypography.mono(12))
                .foregroundStyle(TrendyColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading trends")
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Nothing heating up", systemImage: "flame")
        } description: {
            Text("Pull to refresh — mock signals will show up offline.")
                .font(TrendyTypography.body(14))
        }
        .foregroundStyle(TrendyColors.textSecondary)
        .refreshable {
            await viewModel.load()
        }
    }

    private func feed(_ trends: [Trend]) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                Text("What’s heating up")
                    .font(TrendyTypography.mono(12))
                    .foregroundStyle(TrendyColors.textSecondary)
                    .padding(.horizontal, 4)
                    .accessibilityAddTraits(.isHeader)

                ForEach(trends) { trend in
                    NavigationLink(value: trend) {
                        TrendCard(trend: trend)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
        .refreshable {
            await viewModel.load()
        }
    }
}

#Preview {
    HomeView()
}
