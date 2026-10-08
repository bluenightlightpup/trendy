import SwiftUI

/// Navigation value for a Word of the Day detail (`date` is a local `YYYY-MM-DD`).
struct WordRoute: Hashable {
    let date: String
}

/// Home's top card: today's word, meaning, example, age/lifecycle chips, a peek at yesterday's
/// word and a ShareLink. The body opens the detail.
struct WordOfTheDayCard: View {
    let card: WordOfTheDay.Card
    var yesterday: (date: String, term: String)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            NavigationLink(value: WordRoute(date: card.date)) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Label("Word of the day", systemImage: "sparkles")
                            .font(TrendyTypography.mono(.caption))
                            .textCase(.uppercase)
                            .foregroundStyle(TrendyColors.heatVolt)
                        Spacer(minLength: 8)
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(TrendyColors.textFaint)
                    }
                    Text(card.term)
                        .font(TrendyTypography.headline(.largeTitle))
                        .foregroundStyle(TrendyColors.textPrimary)
                        .multilineTextAlignment(.leading)
                        .accessibilityAddTraits(.isHeader)
                    Text(card.meaning)
                        .font(TrendyTypography.body(.subheadline))
                        .foregroundStyle(TrendyColors.textSecondary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    if let example = card.example {
                        Text(WordOfTheDay.quoteExample(example))
                            .font(TrendyTypography.body(.footnote).italic())
                            .foregroundStyle(TrendyColors.textPrimary.opacity(0.85))
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    FlowLayout(spacing: 6, lineSpacing: 6) {
                        if let band = card.ageBand { AgeChip(band: band) }
                        if let trend = card.trend { LifecyclePill(lifecycle: trend.lifecycle) }
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the full word of the day")

            HStack(spacing: 12) {
                if let yesterday {
                    NavigationLink(value: WordRoute(date: yesterday.date)) {
                        HStack(spacing: 0) {
                            Text("Yesterday: ")
                                .foregroundStyle(TrendyColors.textSecondary)
                            Text(yesterday.term)
                                .foregroundStyle(TrendyColors.heatCool)
                        }
                    }
                    .font(TrendyTypography.mono(.caption))
                    .buttonStyle(.plain)
                    .accessibilityLabel("Yesterday's word: \(yesterday.term)")
                }
                Spacer(minLength: 8)
                ShareLink(item: card.shareText) {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(TrendyTypography.mono(.caption).weight(.semibold))
                        .foregroundStyle(TrendyColors.heatHot)
                }
                .accessibilityLabel("Share today's word, \(card.term)")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [TrendyColors.heatVolt.opacity(0.12), TrendyColors.heatCool.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.heatVolt.opacity(0.3), lineWidth: 1))
    }
}

/// Full Word of the Day: meaning, explanation, example, origin, who says it, trend heat, share.
struct WordOfTheDayDetailView: View {
    @EnvironmentObject private var model: AppModel
    let date: String

    var body: some View {
        Group {
            if let card = model.wordCard(on: date) {
                content(card)
            } else {
                EmptyStateView(title: "No word for this day", message: "The word list didn\u{2019}t load. Try again after an app update.", systemImage: "sparkles")
                    .padding(16)
                    .frame(maxHeight: .infinity, alignment: .top)
            }
        }
        .trendyScreenBackground()
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
    }

    private func content(_ card: WordOfTheDay.Card) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(card.date == WordOfTheDay.localDateString() ? "Word of the day" : "Word of the day \u{00B7} \(card.date)")
                    .font(TrendyTypography.mono(.caption))
                    .textCase(.uppercase)
                    .foregroundStyle(TrendyColors.heatVolt)
                Text(card.term)
                    .font(TrendyTypography.headline(.largeTitle))
                    .foregroundStyle(TrendyColors.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Text(card.meaning)
                    .font(TrendyTypography.body(.title3))
                    .foregroundStyle(TrendyColors.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)

                ShareLink(item: card.shareText) {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .foregroundStyle(TrendyColors.heatHot)
                        .background(TrendyColors.heatHot.opacity(0.12), in: Capsule())
                        .overlay(Capsule().stroke(TrendyColors.heatHot.opacity(0.5), lineWidth: 1))
                }

                if !card.explain.isEmpty { section("In plain words", card.explain) }
                if let example = card.example { section("Example", WordOfTheDay.quoteExample(example)) }
                if !card.origin.isEmpty { section("Where it comes from", card.origin) }
                if let who = card.whoSaysThis { section("Who says this", who) }

                if let trend = card.trend {
                    NavigationLink(value: TrendRoute(id: trend.id)) {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Also a trend: \(trend.displayTitle)")
                                    .font(TrendyTypography.headline(.subheadline))
                                    .foregroundStyle(TrendyColors.textPrimary)
                                Spacer(minLength: 8)
                                LifecyclePill(lifecycle: trend.lifecycle)
                            }
                            HeatMeter(score: trend.heatScore)
                        }
                        .padding(16)
                        .background(TrendyColors.inkElevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.inkBorder, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }

                NavigationLink {
                    WordDecodeView(term: card.term)
                } label: {
                    Label("Decode more", systemImage: "sparkle.magnifyingglass")
                        .font(TrendyTypography.body(.subheadline).weight(.semibold))
                        .foregroundStyle(TrendyColors.heatCool)
                }
            }
            .padding(16)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(TrendyTypography.mono(.caption))
                .textCase(.uppercase)
                .foregroundStyle(TrendyColors.heatCool)
            Text(body)
                .font(TrendyTypography.body())
                .foregroundStyle(TrendyColors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// "Decode more": the full offline Decode answer for the word (lexicon only, no network).
struct WordDecodeView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var prefs: PreferencesStore
    let term: String

    var body: some View {
        let answer = model.engine.decode(term, newHere: prefs.newHere)
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(term)
                    .font(TrendyTypography.headline(.title2))
                    .foregroundStyle(TrendyColors.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                ForEach(answer.parts, id: \.self) { part in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(part.title)
                            .font(TrendyTypography.mono(.caption))
                            .textCase(.uppercase)
                            .foregroundStyle(TrendyColors.heatCool)
                        Text(part.body)
                            .font(TrendyTypography.body())
                            .foregroundStyle(TrendyColors.textPrimary)
                            .fixedSize(horizontal: false, vertical: true)
                            .textSelection(.enabled)
                    }
                }
                Text("Ask about any other word in the Decode tab.")
                    .font(TrendyTypography.body(.footnote))
                    .foregroundStyle(TrendyColors.textSecondary)
            }
            .padding(16)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .trendyScreenBackground()
        .navigationTitle("Decode")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
    }
}
