import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("web/decode-ai.js", "utf8");
function grab(name, open, close) {
  const i = src.indexOf(`const ${name} =`);
  let j = src.indexOf(open, i), depth = 0, k = j;
  for (; k < src.length; k++) { if (src[k] === open) depth++; else if (src[k] === close) { depth--; if (depth === 0) break; } }
  return eval("(" + src.slice(j, k + 1) + ")");
}
const CORE = grab("CORE_ABBREVS", "{", "}");
const PHRASE = grab("PHRASE_ALIASES", "{", "}");
const FUZZY = grab("FUZZY_ALIASES", "{", "}");
const slangKeys = new Set(["bro", "bruh", "dude", "fam", "alpha", "sigma", "beta", "skibidi", "sus"]);
const q = (s) => JSON.stringify(s).replace(/\\u([0-9a-f]{4})/g, "\\u{$1}");
let out = `import Foundation

// GENERATED from web/decode-ai.js (CORE_ABBREVS, PHRASE_ALIASES, FUZZY_ALIASES) by
// scripts/gen-core-lexicon.mjs. Edit the PWA source and regenerate so iOS and web stay in sync.

enum CoreLexicon {
    /// Built-in rows checked before the bundled JSON lexicons (order matters for ties).
    static let entries: [LexiconEntry] = [
`;
for (const [key, e] of Object.entries(CORE)) {
  const kind = e.kind || (slangKeys.has(key) ? "slang" : "abbreviation");
  out += `        LexiconEntry(
            terms: [${e.terms.map(q).join(", ")}],
            short: ${q(e.short)},
            explain: ${q(e.explain || "")},
            origin: ${q(e.origin || "")},
            age: ${e.age ? q(e.age) : "nil"},
            source: ${e.source ? q(e.source) : "nil"},
            confidence: ${e.confidence ? q(e.confidence) : "nil"},
            kind: ${q(kind)}
        ),
`;
}
out += `    ]

    static let phraseAliases: [String: String] = [
${Object.entries(PHRASE).map(([k, v]) => `        ${q(k)}: ${q(v)},`).join("\n")}
    ]

    static let fuzzyAliases: [String: String] = [
${Object.entries(FUZZY).map(([k, v]) => `        ${q(k)}: ${q(v)},`).join("\n")}
    ]
}
`;
writeFileSync("App/Core/CoreLexicon.swift", out);
console.log("core entries:", Object.keys(CORE).length);
