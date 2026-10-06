import XCTest
@testable import Trendy

/// Decode ladder parity with web/decode-ai.js (see web/tests/decode.test.mjs).
final class DecodeTests: XCTestCase {
    func testBundledLexiconsLoad() {
        XCTAssertGreaterThan(TestData.shared.trends.count, 50)
        XCTAssertGreaterThan(TestData.shared.slang.count, 50)
        XCTAssertGreaterThan(TestData.shared.abbreve.count, 100)
    }

    func test67IsGenAlphaSlangWithOriginThenAge() {
        let ans = TestData.decode("what does 67 mean?")
        XCTAssertEqual(DecodeEngine.normalize(ans.term), "67")
        XCTAssertEqual(ans.source, .lexicon)
        XCTAssertEqual(ans.parts.first?.title, "Slang meaning")
        XCTAssertTrue(ans.parts.first?.body.localizedCaseInsensitiveContains("brainrot") ?? false)
        let titles = ans.parts.map(\.title)
        guard let origin = titles.firstIndex(of: "Where it comes from"),
              let who = titles.firstIndex(of: "Who says this") else {
            return XCTFail("67 should have origin and Who says this: \(titles)")
        }
        XCTAssertLessThan(origin, who)
        XCTAssertTrue(ans.part("Who says this")?.body.hasPrefix("Gen Alpha") ?? false)
    }

    func testNahIdWinPunctuationVariantsMatchTheSamePhrase() {
        for q in ["nah id win", "nah I'd win", "Nah, I\u{2019}d win!", "NAH I\u{2019}D WIN"] {
            let ans = TestData.decode(q)
            XCTAssertEqual(ans.source, .lexicon, q)
            XCTAssertEqual(ans.parts.first?.title, "Slang meaning", q)
            XCTAssertTrue(ans.parts.first?.body.contains("I\u{2019}d still win") ?? false, q)
            XCTAssertNil(ans.part("Other senses"), q)
            XCTAssertTrue(ans.part("Who says this")?.body.hasPrefix("Gen Z") ?? false, q)
            XCTAssertEqual(TestData.engine.dictionaryLookupWord(for: q), "", "phrases never hit the dictionary: \(q)")
        }
        XCTAssertEqual(DecodeEngine.normalize("Nah, I\u{2019}d win!"), "nah id win")
    }

    func testAlphaSlangSenseLeadsEvenWithDictionarySenses() {
        let greek = DictionaryResult(
            word: "alpha",
            defs: [DictionaryDefinition(part: "noun", text: "The first letter of the Greek alphabet.")],
            provider: "dictionaryapi"
        )
        let ans = TestData.decode("alpha", dictionary: greek)
        XCTAssertEqual(ans.parts.first?.title, "Slang meaning")
        XCTAssertTrue(ans.parts.first?.body.contains("TikTok/internet slang") ?? false)
        XCTAssertTrue(ans.part("Who says this")?.body.hasPrefix("Gen Z") ?? false)
        XCTAssertTrue(ans.part("Other senses")?.body.contains("Greek alphabet") ?? false)
        XCTAssertEqual(ans.sourceLabel, "Trendy lexicon + dictionary")
    }

    func testNaLeadsWithNahAndListsTheAbbreviation() {
        let ans = TestData.decode("na")
        XCTAssertEqual(ans.source, .lexicon)
        XCTAssertEqual(ans.parts.first?.title, "Slang meaning")
        XCTAssertNotNil(ans.parts.first?.body.range(of: "\\bno\\b", options: [.regularExpression, .caseInsensitive]))
        XCTAssertTrue(ans.part("Also short for")?.body.contains("Not Applicable") ?? false)
        XCTAssertTrue(ans.part("Who says this")?.body.hasPrefix("Mixed") ?? false)
    }

    func testWOnlyMatchesTheWholeQuery() {
        for q in ["W", "w"] {
            let ans = TestData.decode(q)
            XCTAssertEqual(ans.parts.first?.title, "Slang meaning", q)
            XCTAssertTrue(ans.parts.first?.body.localizedCaseInsensitiveContains("win") ?? false, q)
            XCTAssertNotNil(ans.part("Where it comes from"), q)
        }
        // "win" must not be hijacked by the one-letter W card.
        let win = TestData.decode("win")
        XCTAssertFalse(win.allText.contains("A win \u{2014} something good happened"))
        XCTAssertNotEqual(win.trendID.flatMap { TestData.shared.trend(id: $0)?.title }, "W")
    }

    func testAbbreviationRowsNeverHijackWordsInsideAPhrase() {
        let ans = TestData.decode("i was so tired")
        XCTAssertFalse(ans.allText.contains("Wait a Second"))
        XCTAssertFalse(ans.allText.contains("Significant Other"))
        XCTAssertEqual(ans.source, .fallback)
        XCTAssertEqual(ans.sourceLabel, "Best guess")
        XCTAssertTrue(ans.isLowerConfidence)
        XCTAssertFalse(ans.parts.isEmpty)
        // Exact queries still decode the abbreviation.
        XCTAssertTrue(TestData.decode("s/o").parts.first?.body.contains("Shout Out") ?? false)
    }

    func testUltraShortAbbrevsAreExactMatchOnly() {
        XCTAssertTrue(TestData.decode("ib").parts.first?.body.contains("Inspired By") ?? false)
        let nah = TestData.decode("nah")
        XCTAssertFalse(nah.allText.contains("Inspired By"))
        XCTAssertEqual(nah.parts.first?.title, "Slang meaning")
    }

    func testAccurateLabels() {
        XCTAssertEqual(TestData.decode("jk").parts.first?.title, "Texting abbreviation")
        XCTAssertEqual(TestData.decode("bro").parts.first?.title, "Slang meaning")
        XCTAssertEqual(TestData.decode("s/o").parts.first?.title, "Texting abbreviation")
        XCTAssertEqual(TestData.decode("ib").sourceLabel, "Abbreviation list")
    }

    func testNeverBlank() {
        for q in ["xqzzyflorb", "xqzzyflorb-99", "zzzq vvvq", "?"] {
            let ans = TestData.decode(q, newHere: true)
            XCTAssertFalse(ans.parts.isEmpty, q)
            XCTAssertFalse(ans.allText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, q)
        }
        let nonsense = TestData.decode("xqzzyflorb")
        XCTAssertEqual(nonsense.source, .fallback)
        XCTAssertTrue(nonsense.isLowerConfidence)
        XCTAssertEqual(TestData.decode("abcd").source, .heuristic)
        XCTAssertEqual(TestData.decode("abcd").sourceLabel, "Pattern guess")
    }

    func testDictionaryOnlyFallbackIsLabelledHonestly() {
        let dict = DictionaryResult(word: "florbix", defs: [DictionaryDefinition(part: "noun", text: "A made-up test word.")], provider: "dictionaryapi")
        let ans = TestData.decode("florbix", dictionary: dict)
        XCTAssertEqual(ans.source, .dictionary)
        XCTAssertEqual(ans.sourceLabel, "Dictionary")
        XCTAssertTrue(ans.isLowerConfidence)
        XCTAssertEqual(ans.parts.first?.title, "Meaning")
    }

    func testExtractTermQuestionForms() {
        XCTAssertEqual(DecodeEngine.extractTerm("what does jk mean?"), "jk")
        XCTAssertEqual(DecodeEngine.extractTerm("define skill issue"), "skill issue")
        XCTAssertEqual(DecodeEngine.extractTerm("rizz"), "rizz")
        XCTAssertEqual(DecodeEngine.extractTerm("meaning of aura"), "aura")
        XCTAssertEqual(DecodeEngine.extractTerm("what\u{2019}s rizz?"), "rizz")
        XCTAssertEqual(DecodeEngine.applyAlias("skibiti toilet"), "skibidi toilet")
    }

    func testStripHtmlRemovesStyleBlocksAndInvisibleCharacters() {
        let raw = "<style data-mw-deduplicate=\"x\">.mw-parser-output .defdate{font-size:smaller}</style>"
            + "<span>A person <b>\u{2019}s</b> charm <i>.</i> .</span> from it +\u{200E} is\u{200B}&nbsp;fun &amp; more"
        let out = TextCleaner.stripHtml(raw)
        XCTAssertFalse(out.contains("mw-parser-output"))
        XCTAssertFalse(out.contains("{"))
        XCTAssertFalse(out.contains("\u{200B}"))
        XCTAssertTrue(out.contains("person\u{2019}s charm."), out)
        XCTAssertTrue(out.contains("it + is fun & more"), out)
        XCTAssertEqual(TextCleaner.stripHtml(".mw-parser-output .defdate{font-size:smaller} Charm or appeal."), "Charm or appeal.")
    }

    func testDictionaryParserIsQuietOnMisses() {
        let hit = """
        [{"word":"rizz","meanings":[{"partOfSpeech":"noun","definitions":[{"definition":"<b>Romantic</b> appeal or charm."}]}]}]
        """
        let parsed = DictionaryClient.parse(Data(hit.utf8))
        XCTAssertEqual(parsed?.defs.first?.text, "Romantic appeal or charm.")
        XCTAssertEqual(parsed?.defs.first?.part, "noun")
        let miss = #"{"title":"No Definitions Found","message":"Sorry pal","resolution":"Try again"}"#
        XCTAssertNil(DictionaryClient.parse(Data(miss.utf8)))
        XCTAssertNil(DictionaryClient.parse(Data("not json".utf8)))
        XCTAssertNil(DictionaryClient.url(for: "nah id win"))
        XCTAssertEqual(DictionaryClient.url(for: "Rizz")?.absoluteString, "https://api.dictionaryapi.dev/api/v2/entries/en/rizz")
    }
}
