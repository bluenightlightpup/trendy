import Foundation
@testable import Trendy

/// Loads the bundled catalog. In the iOS test host this is the app bundle; the Linux check script
/// (scripts/swift-linux-check.sh) points TRENDY_DATA_DIR at web/data instead.
enum TestData {
    static let shared: TrendyData = {
        if let dir = ProcessInfo.processInfo.environment["TRENDY_DATA_DIR"], !dir.isEmpty {
            return TrendyData.load(directory: URL(fileURLWithPath: dir))
        }
        let bundles = [Bundle.main] + Bundle.allBundles
        let bundle = bundles.first { $0.url(forResource: "trends", withExtension: "json") != nil } ?? .main
        return TrendyData.load(bundle: bundle)
    }()

    static let engine: DecodeEngine = shared.makeEngine()

    static func decode(_ query: String, newHere: Bool = false, dictionary: DictionaryResult? = nil) -> DecodeAnswer {
        engine.decode(query, newHere: newHere, dictionary: dictionary)
    }
}

extension DecodeAnswer {
    func part(_ title: String) -> DecodePart? {
        parts.first { $0.title == title }
    }

    var allText: String {
        parts.map { "\($0.title) \($0.body)" }.joined(separator: "\n")
    }
}
