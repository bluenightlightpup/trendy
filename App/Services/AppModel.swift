import Foundation
import Combine

/// Bundled catalog + decode engine, loaded once at launch (fully offline).
@MainActor
final class AppModel: ObservableObject {
    let data: TrendyData
    let engine: DecodeEngine
    /// Word of the Day pool, built once (same algorithm as the PWA, website and CLI).
    let wotdPool: [LexiconEntry]

    init(data: TrendyData = TrendyData.load()) {
        self.data = data
        self.engine = data.makeEngine()
        self.wotdPool = WordOfTheDay.buildPool(data.slang)
    }

    func wordOfTheDay(on date: String) -> WordOfTheDay.Word? {
        data.wordOfTheDay(on: date, pool: wotdPool)
    }

    func wordCard(on date: String) -> WordOfTheDay.Card? {
        wordOfTheDay(on: date).map { WordOfTheDay.card(for: $0, trends: data.trends) }
    }
}

/// Public links shown in the app. Update `privacyPolicy` / `support` if hosting moves.
enum AppLinks {
    static let privacyPolicy = URL(string: "https://bluenightlightpup.github.io/trendy/privacy.html")!
    static let support = URL(string: "https://bluenightlightpup.github.io/trendy/support.html")!
    static let abbreve = URL(string: "https://github.com/Njong392/Abbreve")!
}
