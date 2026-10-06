import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Optional public dictionary lookup (https://dictionaryapi.dev) for single words only.
/// No API key, no cookies, no identifiers: only the searched word is sent. Any failure returns nil
/// so Decode quietly keeps its offline answer.
enum DictionaryClient {
    static let host = "api.dictionaryapi.dev"

    static func url(for word: String) -> URL? {
        let w = DecodeEngine.dictionaryWord(word)
        guard !w.isEmpty else { return nil }
        // dictionaryWord only returns [a-z0-9]+, so no extra escaping is needed.
        return URL(string: "https://\(host)/api/v2/entries/en/\(w)")
    }

    private struct APIEntry: Decodable {
        struct Meaning: Decodable {
            struct Definition: Decodable {
                var definition: String?
                var example: String?
            }
            var partOfSpeech: String?
            var definitions: [Definition]?
        }
        var word: String?
        var meanings: [Meaning]?
    }

    /// Parse a dictionaryapi.dev response body. Returns nil for "No Definitions Found" or junk.
    static func parse(_ data: Data) -> DictionaryResult? {
        guard let entries = try? JSONDecoder().decode([APIEntry].self, from: data), let entry = entries.first else {
            return nil
        }
        var defs: [DictionaryDefinition] = []
        outer: for meaning in entry.meanings ?? [] {
            for d in meaning.definitions ?? [] {
                let text = TextCleaner.stripHtml(d.definition ?? "")
                if !text.isEmpty {
                    let example = d.example.map(TextCleaner.stripHtml)
                    defs.append(DictionaryDefinition(part: meaning.partOfSpeech, text: text, example: example))
                }
                if defs.count >= 4 { break outer }
            }
        }
        guard !defs.isEmpty else { return nil }
        return ContentSafety.sanitize(DictionaryResult(word: entry.word ?? "", defs: defs, provider: "dictionaryapi"))
    }

    #if canImport(Darwin)
    private static let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 5
        config.timeoutIntervalForResource = 8
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.urlCache = nil
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: config)
    }()

    /// Fetch senses for a single word. Never throws; nil on any failure or phrase input.
    static func lookup(_ word: String) async -> DictionaryResult? {
        guard let url = url(for: word) else { return nil }
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            return parse(data)
        } catch {
            return nil
        }
    }
    #endif
}
