import SwiftUI

/// One chat turn in Decode.
struct DecodeMessage: Identifiable {
    enum Role { case user, bot }

    let id: UUID
    let role: Role
    var text: String
    var answer: DecodeAnswer?
    var isLookingUp = false

    init(id: UUID = UUID(), role: Role, text: String, answer: DecodeAnswer? = nil, isLookingUp: Bool = false) {
        self.id = id
        self.role = role
        self.text = text
        self.answer = answer
        self.isLookingUp = isLookingUp
    }
}

@MainActor
final class DecodeViewModel: ObservableObject {
    @Published private(set) var messages: [DecodeMessage] = []

    static let maxQueryLength = 160

    /// Answer instantly from the offline lexicon, then (optionally) merge single-word dictionary
    /// senses when the public lookup returns. Failures keep the offline answer.
    func ask(_ raw: String, engine: DecodeEngine, newHere: Bool, useDictionary: Bool) {
        let query = String(raw.trimmingCharacters(in: .whitespacesAndNewlines).prefix(Self.maxQueryLength))
        guard !query.isEmpty else { return }
        messages.append(DecodeMessage(role: .user, text: query))

        let answer = engine.decode(query, newHere: newHere)
        let word = useDictionary ? engine.dictionaryLookupWord(for: query) : ""
        let botID = UUID()
        messages.append(DecodeMessage(id: botID, role: .bot, text: "", answer: answer, isLookingUp: !word.isEmpty))
        guard !word.isEmpty else { return }

        Task { [weak self] in
            let dict = await DictionaryClient.lookup(word)
            guard let self, let index = self.messages.firstIndex(where: { $0.id == botID }) else { return }
            if let dict {
                self.messages[index].answer = engine.decode(query, newHere: newHere, dictionary: dict)
            }
            self.messages[index].isLookingUp = false
        }
    }

    func clear() {
        messages.removeAll()
    }
}

/// Decode: chat-style lookups backed by the offline lexicon ladder (see `DecodeEngine`).
struct DecodeView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var prefs: PreferencesStore
    @StateObject private var viewModel = DecodeViewModel()
    @State private var input = ""
    @FocusState private var inputFocused: Bool

    private let examples = ["what does 67 mean?", "rizz", "nah I\u{2019}d win", "define skill issue", "aura", "W"]

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ScreenHint(text: modeHint)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(examples, id: \.self) { example in
                                    FilterChip(title: example, isSelected: false) {
                                        send(example)
                                    }
                                }
                            }
                            .padding(.vertical, 2)
                        }
                        .accessibilityLabel("Try an example")

                        BotBubble(meta: "Trendy", text: welcome)

                        ForEach(viewModel.messages) { message in
                            Group {
                                switch message.role {
                                case .user:
                                    UserBubble(text: message.text)
                                case .bot:
                                    if let answer = message.answer {
                                        AnswerBubble(answer: answer, isLookingUp: message.isLookingUp)
                                    }
                                }
                            }
                            .id(message.id)
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: 680)
                    .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: viewModel.messages.count) { _, _ in
                    guard let last = viewModel.messages.last else { return }
                    withAnimation(.easeOut(duration: 0.2)) {
                        proxy.scrollTo(last.id, anchor: .top)
                    }
                }
            }
            .safeAreaInset(edge: .bottom) { composer }
            .trendyScreenBackground()
            .navigationTitle("Decode")
            .toolbarBackground(TrendyColors.inkBg, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.clear()
                    } label: {
                        Label("Clear chat", systemImage: "trash")
                    }
                    .disabled(viewModel.messages.isEmpty)
                }
            }
            .navigationDestination(for: TrendRoute.self) { route in
                TrendDetailView(trendID: route.id)
            }
        }
    }

    private var modeHint: String {
        var text = prefs.dictionaryLookups ? "Slang lexicon + dictionary" : "Slang lexicon (offline)"
        if prefs.newHere { text += " \u{00B7} New here on" }
        return text
    }

    private var welcome: String {
        if prefs.newHere {
            return prefs.dictionaryLookups
                ? "Ask what any word means \u{2014} e.g. \u{201C}what does 67 mean?\u{201D} or just type a term. I check Trendy\u{2019}s slang lexicon first, then a dictionary for single words. Judgment-free."
                : "Ask what any word means \u{2014} e.g. \u{201C}what does 67 mean?\u{201D} or just type a term. Everything is answered on this device from Trendy\u{2019}s slang lexicon. Judgment-free."
        }
        return "Ask what any slang word, abbreviation or trend means."
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField("Ask what any word means\u{2026}", text: $input)
                .textFieldStyle(.plain)
                .font(TrendyTypography.body())
                .foregroundStyle(TrendyColors.textPrimary)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
                .focused($inputFocused)
                .onSubmit { send(input) }
                .onChange(of: input) { _, newValue in
                    if newValue.count > DecodeViewModel.maxQueryLength {
                        input = String(newValue.prefix(DecodeViewModel.maxQueryLength))
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(TrendyColors.inkElevated, in: Capsule())
                .overlay(Capsule().stroke(TrendyColors.inkBorder, lineWidth: 1))
                .accessibilityLabel("Ask what any word or trend means")

            Button {
                send(input)
            } label: {
                Text("Ask")
                    .font(.system(.subheadline, design: .rounded).weight(.bold))
                    .foregroundStyle(TrendyColors.inkBg)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(TrendyColors.heatHot, in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .opacity(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
            .accessibilityLabel("Search")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    private func send(_ text: String) {
        let q = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        input = ""
        viewModel.ask(q, engine: model.engine, newHere: prefs.newHere, useDictionary: prefs.dictionaryLookups)
    }
}

struct UserBubble: View {
    let text: String

    var body: some View {
        HStack {
            Spacer(minLength: 40)
            VStack(alignment: .leading, spacing: 4) {
                Text("You")
                    .font(TrendyTypography.mono(.caption2))
                    .textCase(.uppercase)
                    .foregroundStyle(TrendyColors.textSecondary)
                Text(text)
                    .font(TrendyTypography.body())
                    .foregroundStyle(TrendyColors.textPrimary)
                    .textSelection(.enabled)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                LinearGradient(
                    colors: [TrendyColors.heatCool.opacity(0.25), TrendyColors.heatHot.opacity(0.2)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.heatCool.opacity(0.35), lineWidth: 1))
        }
        .accessibilityElement(children: .combine)
    }
}

struct BotBubble: View {
    let meta: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(meta)
                .font(TrendyTypography.mono(.caption2))
                .textCase(.uppercase)
                .foregroundStyle(TrendyColors.textSecondary)
            Text(text)
                .font(TrendyTypography.body())
                .foregroundStyle(TrendyColors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(TrendyColors.inkElevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.inkBorder, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

/// Structured answer: source label, lower-confidence badge, sections, link to the trend card.
struct AnswerBubble: View {
    let answer: DecodeAnswer
    let isLookingUp: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("\(answer.sourceLabel) \u{00B7} \(answer.term)")
                    .font(TrendyTypography.mono(.caption2))
                    .textCase(.uppercase)
                    .foregroundStyle(TrendyColors.textSecondary)
                    .lineLimit(2)
                if answer.isLowerConfidence {
                    Pill(text: "Lower confidence", color: TrendyColors.heatVolt, border: TrendyColors.heatVolt.opacity(0.35), fill: TrendyColors.heatVolt.opacity(0.1))
                }
            }

            ForEach(Array(answer.parts.enumerated()), id: \.offset) { _, part in
                VStack(alignment: .leading, spacing: 4) {
                    Text(part.title)
                        .font(.system(.subheadline, design: .rounded).weight(.bold))
                        .foregroundStyle(part.title == "Who says this" ? TrendyColors.heatCool : TrendyColors.textPrimary)
                    Text(part.body)
                        .font(TrendyTypography.body(.callout))
                        .foregroundStyle(TrendyColors.textPrimary.opacity(0.92))
                        .fixedSize(horizontal: false, vertical: true)
                        .textSelection(.enabled)
                }
                .accessibilityElement(children: .combine)
            }

            if isLookingUp {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text("Checking the dictionary\u{2026}")
                        .font(TrendyTypography.mono(.caption2))
                        .foregroundStyle(TrendyColors.textSecondary)
                }
            }

            if let id = answer.trendID {
                NavigationLink(value: TrendRoute(id: id)) {
                    Label("Open the trend card", systemImage: "flame")
                        .font(.system(.footnote, design: .rounded).weight(.semibold))
                        .foregroundStyle(TrendyColors.heatHot)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(TrendyColors.inkElevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(TrendyColors.inkBorder, lineWidth: 1))
    }
}
