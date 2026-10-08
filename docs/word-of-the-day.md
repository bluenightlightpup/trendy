# Word of the day

Every day Trendy shows one curated slang word with what it means, a fuller explanation, where it comes from, who says it, an example sentence, and its lifecycle and heat when the word is also a trend.

The word is the same on every surface for a given **local calendar date**. It works offline and needs no server: each client computes it from the bundled lexicon.

| Surface | Where | Implementation |
|---------|-------|----------------|
| PWA | Card on top of Home → detail view (Share, Save, Yesterday, Decode more). Toggle: You → Daily word | [`web/wotd.js`](../web/wotd.js), [`web/app.js`](../web/app.js) |
| Website | "Word of the day" section under the hero, computed in the browser from `app/data/slang.json` | `web/wotd.js` (served as `app/wotd.js`), [`site/site.js`](../site/site.js) |
| CLI | `trendy word [--date YYYY-MM-DD] [--json]` (alias `trendy wotd`) | [`cli/wotd.py`](../cli/wotd.py), [`cli/trendy.py`](../cli/trendy.py) |
| MCP | Read-only tool `word_of_the_day` with optional `date` | [`cli/mcp_server.py`](../cli/mcp_server.py) |
| iOS | Card on top of Home → detail view with ShareLink. Toggle: You → Daily word | [`App/Core/WordOfTheDay.swift`](../App/Core/WordOfTheDay.swift), [`App/Features/Home/WordOfTheDayCard.swift`](../App/Features/Home/WordOfTheDayCard.swift) |

## Algorithm

The JavaScript, Python and Swift versions must stay identical. [`Tests/Fixtures/wotd-golden.json`](../Tests/Fixtures/wotd-golden.json) holds the expected pool, dates → words, seeds, permutations and override cases. `web/tests/wotd.test.mjs`, `cli/test_wotd.py` and `Tests/TrendyTests/WordOfTheDayTests.swift` all check against it. Regenerate it with `python3 scripts/gen-wotd-golden.py` **only** when the pool changes on purpose (for example, new lexicon entries).

1. **Pool.** These are the entries in `web/data/slang.json` that meet all of the following:
   - they have at least one term, a non-empty `short` (meaning) and a non-empty `origin`
   - their `source` is not `abbreve` (texting abbreviations), their `confidence` is not `low`, and they have no `radarSource` (Radar candidates)
   - they are not opted out with `"wotd": false` or `"mature": true`
   - they are suitable for a 13+ audience. Entries are dropped if the term is `dtf`, `nnn`, `edging` or `fwb`, if a whole word from the unsafe list (sexual, drugs/alcohol, slurs, profanity) appears in the terms, `short`, `explain`, `origin`, `wotdExample` or `example`, or if the text has already been masked (`f***`) by iOS `ContentSafety`.
2. **Order.** The pool is stable-sorted by key: the first term, lowercased, with curly apostrophes straightened and whitespace collapsed. Keys are compared by Unicode code point, and ties keep file order.
3. **Day index.** `days = localDate − 2026-01-01` (whole days), `N = pool size`, `cycle = floor(days / N)` and `slot = days mod N`. Dates before the epoch work too (negative cycles).
4. **Shuffle per cycle.** `seed = (20260101 XOR imul(cycle, 0x9E3779B1)) as uint32`. A mulberry32 generator drives Fisher–Yates: for `i = N−1 … 1`, `j = next() mod (i+1)`, then swap. If `N > 2` and `perm[0]` equals the previous cycle's last word, `perm[0]` and `perm[1]` are swapped, so no word repeats across the boundary.
5. **Word.** The word is `order[perm[slot]]`. Every eligible word appears exactly once per cycle.
6. **Overrides.** [`web/data/word-of-the-day.json`](../web/data/word-of-the-day.json) can pin a date: `{"overrides": {"2026-12-25": "W"}}`. An override is used only if the term matches a term in the pool (after normalisation). Otherwise the date falls back to the normal pick.
7. **Display.** The headline is the matched term, and a lone letter is uppercased (`w` → `W`). The example is `wotdExample`, or `example` if that is missing. "Who says this" comes from the age band. The trend link is the hottest trend in `trends.json` whose title (or the title before a parenthesis) matches one of the entry's terms.

## Curating

- Add `"wotdExample": "…"` to an entry to give it a natural, classroom-safe example sentence. It is shown wherever the word of the day appears.
- Add `"wotd": false` to keep an entry out of the rotation without removing it from Decode. Words opted out today include `deadass`, `copium`, `beta`, `alpha`, `mewing`, `mogging`, `looksmaxxing`, `based` and `glazing`.
- Adding or removing pool entries reshuffles future dates (N changes). Past dates may also change, which is acceptable for a daily word. If you need a fixed word on a date, use overrides. Run `python3 scripts/gen-wotd-golden.py` after deliberate lexicon changes and commit the updated fixture.

## Privacy

Nothing leaves the device. The website section fetches only the same-origin `app/data/*.json`. Share uses the system share sheet, or copies the text to the clipboard when there is no share sheet. Saved words stay in `localStorage` (`trendy.savedWords.v1`) in the PWA.
