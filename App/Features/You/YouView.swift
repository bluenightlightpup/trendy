import SwiftUI

enum DigestFrequency: String, CaseIterable, Identifiable {
    case daily = "Daily"
    case twiceWeekly = "Twice a week"
    case weekly = "Weekly"

    var id: String { rawValue }
}

/// Preferences shell — persistence wired in Phase 2 (T0012).
struct YouView: View {
    @State private var interests: Set<TrendWorld> = Set(TrendWorld.allCases)
    @State private var digest: DigestFrequency = .daily
    @State private var newHereMode = true

    var body: some View {
        NavigationStack {
            Form {
                Section("Interests") {
                    ForEach(TrendWorld.allCases) { world in
                        Toggle(world.rawValue, isOn: binding(for: world))
                    }
                }

                Section("Digest") {
                    Picker("Frequency", selection: $digest) {
                        ForEach(DigestFrequency.allCases) { freq in
                            Text(freq.rawValue).tag(freq)
                        }
                    }
                }

                Section {
                    Toggle("New here mode", isOn: $newHereMode)
                } footer: {
                    Text("Spells out inside jokes and adds context instead of assuming you already get it.")
                }
            }
            .scrollContentBackground(.hidden)
            .background(TrendyColors.inkBg.ignoresSafeArea())
            .navigationTitle("You")
        }
    }

    private func binding(for world: TrendWorld) -> Binding<Bool> {
        Binding(
            get: { interests.contains(world) },
            set: { on in
                if on { interests.insert(world) } else { interests.remove(world) }
            }
        )
    }
}

#Preview {
    YouView()
}
