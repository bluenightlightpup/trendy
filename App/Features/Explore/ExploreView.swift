import SwiftUI

/// Explore: world chips + search over title/summary/tags, sorted by heat.
struct ExploreView: View {
    @EnvironmentObject private var model: AppModel

    /// nil = All worlds.
    @State private var world: TrendWorld?
    @State private var query = ""

    var body: some View {
        let items = TrendRanking.explore(model.data.trends, world: world, query: query)
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    ScreenHint(text: "Every world, one place. Catch up without the scroll.")

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            FilterChip(title: "All", isSelected: world == nil) { world = nil }
                            ForEach(TrendWorld.allCases) { option in
                                FilterChip(title: option.rawValue, isSelected: world == option) {
                                    world = option
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    .accessibilityElement(children: .contain)
                    .accessibilityLabel("Filter by world")

                    if items.isEmpty {
                        emptyState
                    } else {
                        Text("\(items.count) \(items.count == 1 ? "trend" : "trends")")
                            .font(TrendyTypography.mono(.caption))
                            .foregroundStyle(TrendyColors.textSecondary)
                        ForEach(items) { trend in
                            TrendCard(trend: trend)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: 680)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .trendyScreenBackground()
            .navigationTitle("Explore")
            .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Filter by title or tags\u{2026}")
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
            .navigationDestination(for: TrendRoute.self) { route in
                TrendDetailView(trendID: route.id)
            }
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            EmptyStateView(
                title: "No matches",
                message: "Try another word, clear search, or pick a different world chip.",
                systemImage: "magnifyingglass"
            )
        } else {
            EmptyStateView(
                title: "Nothing in this world",
                message: "Try another niche \u{2014} Dating, campus, sports, music, Money, and more.",
                systemImage: "globe"
            )
        }
    }
}
