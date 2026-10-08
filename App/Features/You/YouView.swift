import SwiftUI

/// You: saved trends, world interests, digest cadence, New here mode, dictionary toggle, about.
struct YouView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var saved: SavedTrendsStore
    @EnvironmentObject private var prefs: PreferencesStore
    @State private var confirmClear = false

    var body: some View {
        let savedTrends = saved.savedTrends(in: model.data.trends)
        NavigationStack {
            Form {
                Section {
                    if savedTrends.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Nothing saved yet")
                                .font(TrendyTypography.headline(.subheadline))
                                .foregroundStyle(TrendyColors.textPrimary)
                            Text(prefs.newHere
                                 ? "Tap the heart on any trend when you want to keep it. No rush \u{2014} culture will still be there."
                                 : "Save trends from Home or Explore to collect them here.")
                                .font(TrendyTypography.body(.footnote))
                                .foregroundStyle(TrendyColors.textSecondary)
                        }
                        .padding(.vertical, 4)
                        .listRowBackground(TrendyColors.inkElevated)
                    } else {
                        ForEach(savedTrends) { trend in
                            NavigationLink(value: TrendRoute(id: trend.id)) {
                                HStack {
                                    Text(trend.displayTitle)
                                        .foregroundStyle(TrendyColors.textPrimary)
                                    Spacer(minLength: 8)
                                    if !trend.world.isEmpty { WorldPill(world: trend.world) }
                                }
                            }
                            .listRowBackground(TrendyColors.inkElevated)
                        }
                        .onDelete { offsets in
                            let ids = offsets.map { savedTrends[$0].id }
                            for id in ids {
                                saved.remove(id)
                            }
                        }
                        Button("Clear saved trends", role: .destructive) {
                            confirmClear = true
                        }
                        .listRowBackground(TrendyColors.inkElevated)
                    }
                } header: {
                    Text("Saved trends")
                } footer: {
                    Text("Bookmarks you keep for later \u{2014} on this device only.")
                }

                Section {
                    Toggle("Word of the day on Home", isOn: $prefs.showWordOfTheDay)
                        .tint(TrendyColors.heatCool)
                        .listRowBackground(TrendyColors.inkElevated)
                } header: {
                    Text("Daily word")
                } footer: {
                    Text("A new slang word every day, picked offline \u{2014} the same word in the web app and on the website.")
                }

                Section {
                    ForEach(TrendWorld.allCases) { world in
                        Toggle(world.rawValue, isOn: Binding(
                            get: { prefs.isEnabled(world) },
                            set: { prefs.setEnabled(world, $0) }
                        ))
                        .tint(TrendyColors.heatCool)
                        .listRowBackground(TrendyColors.inkElevated)
                    }
                } header: {
                    Text("Worlds")
                } footer: {
                    Text("Home shows trends from the worlds you enable. Explore always shows every world.")
                }

                Section {
                    Picker("Digest", selection: $prefs.digest) {
                        ForEach(TrendRanking.DigestFrequency.allCases) { freq in
                            Text(freq.label).tag(freq)
                        }
                    }
                    .listRowBackground(TrendyColors.inkElevated)
                } header: {
                    Text("Digest")
                } footer: {
                    Text("A short digest sits at the top of Home and refreshes on this cadence. Off hides it. No notifications are sent.")
                }

                Section {
                    Toggle("Extra explanation", isOn: $prefs.newHere)
                        .tint(TrendyColors.heatCool)
                        .listRowBackground(TrendyColors.inkElevated)
                } header: {
                    Text("New here mode")
                } footer: {
                    Text("Decode adds softer framing and a New here tip, and empty screens explain a bit more.")
                }

                Section {
                    Toggle("Dictionary lookups", isOn: $prefs.dictionaryLookups)
                        .tint(TrendyColors.heatCool)
                        .listRowBackground(TrendyColors.inkElevated)
                } header: {
                    Text("Decode")
                } footer: {
                    Text("For single words, Decode can also ask the free public dictionary at dictionaryapi.dev for other senses. Only the word is sent \u{2014} no account, no identifiers. Turn off to keep Decode fully offline.")
                }

                Section {
                    LabeledContent("Version", value: Self.versionString)
                        .listRowBackground(TrendyColors.inkElevated)
                    LabeledContent("Catalog", value: "\(model.data.trends.count) trends \u{00B7} \(model.data.slang.count + model.data.abbreve.count) lexicon rows")
                        .listRowBackground(TrendyColors.inkElevated)
                    Link(destination: AppLinks.privacyPolicy) {
                        Label("Privacy policy", systemImage: "hand.raised")
                    }
                    .listRowBackground(TrendyColors.inkElevated)
                    Link(destination: AppLinks.support) {
                        Label("Support & feedback", systemImage: "questionmark.bubble")
                    }
                    .listRowBackground(TrendyColors.inkElevated)
                    NavigationLink {
                        CreditsView()
                    } label: {
                        Label("Credits & licenses", systemImage: "doc.text")
                    }
                    .listRowBackground(TrendyColors.inkElevated)
                } header: {
                    Text("About")
                } footer: {
                    Text("Trendy stores your preferences and saved trends on this device only. It has no accounts, ads, analytics or tracking.")
                }
            }
            .scrollContentBackground(.hidden)
            .trendyScreenBackground()
            .navigationTitle("You")
            .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
            .navigationDestination(for: TrendRoute.self) { route in
                TrendDetailView(trendID: route.id)
            }
            .confirmationDialog("Clear all saved trends?", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Clear saved trends", role: .destructive) {
                    saved.replaceAll([])
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    static var versionString: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = info?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}

/// Attribution for bundled data (Abbreve is Apache-2.0; Trendy is MIT).
struct CreditsView: View {
    private func bundledText(_ name: String, ext: String? = nil) -> String {
        guard let url = Bundle.main.url(forResource: name, withExtension: ext),
              let text = try? String(contentsOf: url, encoding: .utf8) else { return "" }
        return text
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Trendy is open source under the MIT license. Copyright \u{00A9} 2026 bluenightlightpup.")
                    .foregroundStyle(TrendyColors.textPrimary)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Abbreviation list")
                        .font(TrendyTypography.headline(.headline))
                        .foregroundStyle(TrendyColors.textPrimary)
                    Text("Texting abbreviations are derived from Abbreve by Njong Emy and contributors, licensed under the Apache License 2.0. Trendy normalized the entries and masks profanity in the app.")
                        .foregroundStyle(TrendyColors.textSecondary)
                    Link("github.com/Njong392/Abbreve", destination: AppLinks.abbreve)
                        .foregroundStyle(TrendyColors.heatCool)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Dictionary")
                        .font(TrendyTypography.headline(.headline))
                        .foregroundStyle(TrendyColors.textPrimary)
                    Text("When Dictionary lookups is on, extra single-word senses come from the Free Dictionary API (dictionaryapi.dev), which serves Wiktionary content licensed CC BY-SA.")
                        .foregroundStyle(TrendyColors.textSecondary)
                }

                let notice = bundledText("NOTICE")
                if !notice.isEmpty {
                    licenseBlock(title: "NOTICE", text: notice)
                }
                let license = bundledText("ABBREVE-LICENSE")
                if !license.isEmpty {
                    licenseBlock(title: "Apache License 2.0 (Abbreve)", text: license)
                }
            }
            .font(TrendyTypography.body(.subheadline))
            .padding(16)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .trendyScreenBackground()
        .navigationTitle("Credits")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func licenseBlock(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(TrendyTypography.headline(.headline))
                .foregroundStyle(TrendyColors.textPrimary)
            Text(text)
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(TrendyColors.textSecondary)
                .textSelection(.enabled)
        }
    }
}
