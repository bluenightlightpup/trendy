import SwiftUI

/// Home: Word of the Day card, then the trend feed ranked by homeRelevance (heat × lifecycle
/// weight × recency), filtered to the worlds enabled under You, with an optional digest on top.
struct HomeView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var saved: SavedTrendsStore
    @EnvironmentObject private var prefs: PreferencesStore

    enum Filter: String, CaseIterable, Identifiable {
        case all = "All"
        case saved = "Saved"
        var id: String { rawValue }
    }

    @State private var filter: Filter = .all
    /// Local calendar date for Word of the Day; refreshed when the app becomes active.
    @State private var today = WordOfTheDay.localDateString()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        let ranked = TrendRanking.homeFeed(model.data.trends, disabledWorlds: prefs.disabledWorlds)
        let savedIds = Set(saved.savedIds)
        let items = filter == .saved ? ranked.filter { savedIds.contains($0.id) } : ranked
        let digest = filter == .all ? TrendRanking.digest(from: ranked, frequency: prefs.digest) : []
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    ScreenHint(text: "Signal, not scroll. Sorted by what\u{2019}s hot now.")

                    if prefs.showWordOfTheDay, let card = model.wordCard(on: today) {
                        WordOfTheDayCard(card: card, yesterday: yesterdayWord)
                    }

                    HStack(spacing: 8) {
                        ForEach(Filter.allCases) { option in
                            FilterChip(title: option.rawValue, isSelected: filter == option) {
                                filter = option
                            }
                        }
                    }
                    .accessibilityElement(children: .contain)
                    .accessibilityLabel("Filter Home feed")

                    if !digest.isEmpty {
                        DigestCard(title: prefs.digest.headline, trends: digest)
                    }

                    if items.isEmpty {
                        emptyState
                    } else {
                        if !digest.isEmpty {
                            Text("Everything in your worlds")
                                .font(TrendyTypography.mono(.caption))
                                .textCase(.uppercase)
                                .foregroundStyle(TrendyColors.textSecondary)
                                .padding(.top, 4)
                        }
                        ForEach(items) { trend in
                            TrendCard(trend: trend)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: 680)
                .frame(maxWidth: .infinity)
            }
            .trendyScreenBackground()
            .navigationTitle("Trendy")
            .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
            .navigationDestination(for: TrendRoute.self) { route in
                TrendDetailView(trendID: route.id)
            }
            .navigationDestination(for: WordRoute.self) { route in
                WordOfTheDayDetailView(date: route.date)
            }
            .onAppear { today = WordOfTheDay.localDateString() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { today = WordOfTheDay.localDateString() }
            }
        }
    }

    private var yesterdayWord: (date: String, term: String)? {
        guard let date = WordOfTheDay.addDays(today, -1), let word = model.wordOfTheDay(on: date) else { return nil }
        return (date, word.term)
    }

    @ViewBuilder
    private var emptyState: some View {
        if filter == .saved {
            EmptyStateView(
                title: "No saved trends here",
                message: prefs.newHere
                    ? "When something clicks, tap the heart on a card. Nothing wrong with an empty list \u{2014} you\u{2019}re just browsing."
                    : "Save a trend from Home or Explore, then it shows up here.",
                systemImage: "heart"
            )
        } else {
            EmptyStateView(
                title: "No trends in your worlds",
                message: "Flip on some interests under You, or clear filters.",
                systemImage: "globe"
            )
        }
    }
}

/// Compact digest list: rotates on the cadence picked under You → Digest.
struct DigestCard: View {
    let title: String
    let trends: [Trend]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: "flame.fill")
                .font(TrendyTypography.headline(.headline))
                .foregroundStyle(TrendyColors.heatHot)
            ForEach(Array(trends.enumerated()), id: \.element.id) { index, trend in
                NavigationLink(value: TrendRoute(id: trend.id)) {
                    HStack(spacing: 10) {
                        Text("\(index + 1)")
                            .font(TrendyTypography.mono(.caption))
                            .foregroundStyle(TrendyColors.textSecondary)
                            .frame(width: 18, alignment: .leading)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(trend.displayTitle)
                                .font(TrendyTypography.body(.subheadline).weight(.semibold))
                                .foregroundStyle(TrendyColors.textPrimary)
                            if !trend.summary.isEmpty {
                                Text(trend.summary)
                                    .font(TrendyTypography.body(.caption))
                                    .foregroundStyle(TrendyColors.textSecondary)
                                    .lineLimit(1)
                            }
                        }
                        Spacer(minLength: 8)
                        Text("\(trend.heatPercent)")
                            .font(TrendyTypography.mono(.caption))
                            .foregroundStyle(TrendyColors.heatColor(for: trend.heatLevel))
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(TrendyColors.textFaint)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(index + 1). \(trend.displayTitle), heat \(trend.heatPercent)")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [TrendyColors.heatHot.opacity(0.14), TrendyColors.heatCool.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.heatHot.opacity(0.3), lineWidth: 1))
    }
}
