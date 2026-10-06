import Foundation
import Combine

/// Bundled catalog + decode engine, loaded once at launch (fully offline).
@MainActor
final class AppModel: ObservableObject {
    let data: TrendyData
    let engine: DecodeEngine

    init(data: TrendyData = TrendyData.load()) {
        self.data = data
        self.engine = data.makeEngine()
    }
}

/// Public links shown in the app. Update `privacyPolicy` / `support` if hosting moves.
enum AppLinks {
    static let privacyPolicy = URL(string: "https://bluenightlightpup.github.io/trendy/privacy.html")!
    static let support = URL(string: "https://bluenightlightpup.github.io/trendy/support.html")!
    static let abbreve = URL(string: "https://github.com/Njong392/Abbreve")!
}
