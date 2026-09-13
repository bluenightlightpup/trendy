import SwiftUI

/// Placeholder Decode chat — Phase 1 UI shell; Claude wiring is Phase 2.
struct DecodeView: View {
    @State private var draft: String = ""
    @State private var messages: [DecodeMessage] = [
        DecodeMessage(
            role: .assistant,
            text: "Ask me any slang, meme, or abbreviation — I'll explain what it means and where it came from. No judgment."
        )
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(messages) { message in
                            DecodeBubble(message: message)
                        }
                    }
                    .padding(16)
                }

                HStack(spacing: 8) {
                    TextField("Decode a term…", text: $draft)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(TrendyColors.inkElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .foregroundStyle(TrendyColors.textPrimary)

                    Button("Send") {
                        sendMock()
                    }
                    .font(TrendyTypography.mono(12))
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(16)
                .background(TrendyColors.inkElevated)
            }
            .background(TrendyColors.inkBg.ignoresSafeArea())
            .navigationTitle("Decode")
        }
    }

    private func sendMock() {
        let term = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !term.isEmpty else { return }
        messages.append(DecodeMessage(role: .user, text: term))
        draft = ""
        messages.append(
            DecodeMessage(
                role: .assistant,
                text: "Mock reply for “\(term)”: live Claude explanations arrive in Phase 2. Meanwhile — you're not late; you're catching up."
            )
        )
    }
}

struct DecodeMessage: Identifiable {
    enum Role { case user, assistant }
    let id = UUID()
    let role: Role
    let text: String
}

struct DecodeBubble: View {
    let message: DecodeMessage

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            Text(message.text)
                .font(TrendyTypography.body(15))
                .foregroundStyle(TrendyColors.textPrimary)
                .padding(12)
                .background(
                    message.role == .user
                        ? TrendyColors.heatHot.opacity(0.25)
                        : TrendyColors.inkElevated
                )
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            if message.role == .assistant { Spacer(minLength: 40) }
        }
    }
}

#Preview {
    DecodeView()
}
