import Foundation

/// Small NSRegularExpression helpers (Foundation-only so they run on Linux too).
enum RX {
    private static let cacheLock = NSLock()
    private static var cache: [String: NSRegularExpression] = [:]

    static func regex(_ pattern: String, caseInsensitive: Bool = false) -> NSRegularExpression? {
        let key = (caseInsensitive ? "i:" : "s:") + pattern
        cacheLock.lock()
        defer { cacheLock.unlock() }
        if let hit = cache[key] { return hit }
        let options: NSRegularExpression.Options = caseInsensitive ? [.caseInsensitive] : []
        guard let made = try? NSRegularExpression(pattern: pattern, options: options) else { return nil }
        cache[key] = made
        return made
    }

    /// Replace every match with an NSRegularExpression template (`$1` etc.).
    static func replace(_ text: String, _ pattern: String, with template: String, caseInsensitive: Bool = false) -> String {
        guard let re = regex(pattern, caseInsensitive: caseInsensitive) else { return text }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        return re.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: template)
    }

    /// Replace every match using a closure that receives the capture groups (index 0 = whole match;
    /// groups that did not participate are `nil`).
    static func replace(
        _ text: String,
        _ pattern: String,
        caseInsensitive: Bool = false,
        using transform: ([String?]) -> String
    ) -> String {
        guard let re = regex(pattern, caseInsensitive: caseInsensitive) else { return text }
        let ns = text as NSString
        let matches = re.matches(in: text, options: [], range: NSRange(location: 0, length: ns.length))
        guard !matches.isEmpty else { return text }
        var out = ""
        var cursor = 0
        for m in matches {
            out += ns.substring(with: NSRange(location: cursor, length: m.range.location - cursor))
            var groups: [String?] = []
            for i in 0..<m.numberOfRanges {
                let r = m.range(at: i)
                groups.append(r.location == NSNotFound ? nil : ns.substring(with: r))
            }
            out += transform(groups)
            cursor = m.range.location + m.range.length
        }
        out += ns.substring(from: cursor)
        return out
    }

    /// Capture groups of the first match (index 0 = whole match), or nil when nothing matches.
    static func firstMatch(_ text: String, _ pattern: String, caseInsensitive: Bool = false) -> [String?]? {
        guard let re = regex(pattern, caseInsensitive: caseInsensitive) else { return nil }
        let ns = text as NSString
        guard let m = re.firstMatch(in: text, options: [], range: NSRange(location: 0, length: ns.length)) else {
            return nil
        }
        var groups: [String?] = []
        for i in 0..<m.numberOfRanges {
            let r = m.range(at: i)
            groups.append(r.location == NSNotFound ? nil : ns.substring(with: r))
        }
        return groups
    }

    static func matches(_ text: String, _ pattern: String, caseInsensitive: Bool = false) -> Bool {
        firstMatch(text, pattern, caseInsensitive: caseInsensitive) != nil
    }
}

/// Port of the PWA's `stripHtml`: dictionary HTML → clean sentence (no <style>/<script>,
/// no leaked CSS, no invisible characters, tidy spacing).
enum TextCleaner {
    private static let namedEntities: [String: String] = [
        "nbsp": " ", "amp": "&", "quot": "\"", "apos": "'", "lt": "<", "gt": ">",
        "ndash": "\u{2013}", "mdash": "\u{2014}", "hellip": "\u{2026}",
        "lsquo": "\u{2018}", "rsquo": "\u{2019}", "ldquo": "\u{201C}", "rdquo": "\u{201D}",
    ]

    static func decodeEntities(_ s: String) -> String {
        RX.replace(s, "&(#x[0-9a-f]+|#\\d+|[a-z]+);", caseInsensitive: true) { groups in
            let whole = groups[0] ?? ""
            guard let code = groups[1], let first = code.first else { return whole }
            if first == "#" {
                let body = code.dropFirst()
                let value: UInt32?
                if body.first == "x" || body.first == "X" {
                    value = UInt32(body.dropFirst(), radix: 16)
                } else {
                    value = UInt32(body, radix: 10)
                }
                if let v = value, v > 0, v < 0x110000, let scalar = Unicode.Scalar(v) {
                    return String(Character(scalar))
                }
                return " "
            }
            return namedEntities[code.lowercased()] ?? whole
        }
    }

    static func stripHtml(_ input: String) -> String {
        var out = input
        out = RX.replace(out, "<(style|script)\\b[^>]*>[\\s\\S]*?</\\1\\s*>", with: " ", caseInsensitive: true)
        out = RX.replace(out, "<!--[\\s\\S]*?-->", with: " ")
        out = RX.replace(out, "<[^>]+>", with: " ")
        out = decodeEntities(out)
        // Bidi marks, zero-width chars, soft hyphen, BOM.
        out = String(String.UnicodeScalarView(out.unicodeScalars.filter { scalar in
            let v = scalar.value
            if v == 0x00AD || v == 0xFEFF { return false }
            if (0x200B...0x200F).contains(v) || (0x202A...0x202E).contains(v) || (0x2060...0x2064).contains(v) {
                return false
            }
            return true
        }))
        out = out.replacingOccurrences(of: "\u{00A0}", with: " ")
        // Leaked stylesheet rules, e.g. ".mw-parser-output .defdate{font-size:smaller}".
        out = RX.replace(out, "(?:^|\\s)[.#@][\\w\\-.#:>\\s,]*\\{[^{}]*\\}", with: " ")
        out = RX.replace(out, "\\s+", with: " ")
        out = RX.replace(out, "\\s+(['\u{2019}]s\\b)", with: "$1")
        out = RX.replace(out, "\\s+([,.;:!?)\\]])", with: "$1")
        out = RX.replace(out, "([(\\[])\\s+", with: "$1")
        out = RX.replace(out, "([.!?])(?:\\s*\\.)+", with: "$1")
        out = RX.replace(out, "\\s+\\+\\s+", with: " + ")
        return out.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
