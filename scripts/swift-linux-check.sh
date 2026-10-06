#!/usr/bin/env bash
# Linux sanity checks for the iOS app (no Xcode needed):
#   1. `swiftc -parse` every Swift file under App/ and Tests/ (syntax only; SwiftUI is not type-checked).
#   2. Build App/Core (Foundation-only: models, decode engine, ranking, content safety) as a SwiftPM
#      module and run the platform-neutral XCTests against web/data.
#   3. Parity: decode a query list with the Swift engine and the PWA engine (web/decode-ai.js) and diff.
# Needs a Swift 5.9+ toolchain on PATH (https://www.swift.org/install/linux/) and node for step 3.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/trendy-swift-check"
rm -rf "$WORK"
mkdir -p "$WORK/Sources/Trendy" "$WORK/Sources/probe" "$WORK/Tests/TrendyTests"

echo "==> swiftc -parse (syntax)"
find "$ROOT/App" "$ROOT/Tests" -name '*.swift' -print0 | xargs -0 -n1 swiftc -parse

for f in "$ROOT"/App/Core/*.swift; do ln -s "$f" "$WORK/Sources/Trendy/"; done
for f in TestSupport.swift DecodeTests.swift TrendyTests.swift; do
  ln -s "$ROOT/Tests/TrendyTests/$f" "$WORK/Tests/TrendyTests/$f"
done

cat > "$WORK/Package.swift" <<'SWIFT'
// swift-tools-version:5.9
import PackageDescription
let package = Package(
    name: "TrendyCore",
    targets: [
        .target(name: "Trendy", path: "Sources/Trendy", swiftSettings: [.unsafeFlags(["-swift-version", "5"])]),
        .executableTarget(name: "probe", dependencies: ["Trendy"], path: "Sources/probe"),
        .testTarget(name: "TrendyTests", dependencies: ["Trendy"], path: "Tests/TrendyTests"),
    ]
)
SWIFT

cat > "$WORK/Sources/probe/main.swift" <<'SWIFT'
import Foundation
@testable import Trendy
let env = ProcessInfo.processInfo.environment
let data = TrendyData.load(directory: URL(fileURLWithPath: env["TRENDY_DATA_DIR"]!), sanitize: false)
let engine = data.makeEngine()
let queries = (try? String(contentsOfFile: env["QUERIES"]!, encoding: .utf8))?.split(separator: "\n").map(String.init) ?? []
for q in queries where !q.isEmpty {
    let a = engine.decode(q, newHere: false)
    print("=== \(q) | source=\(a.source.rawValue) bucket=\(a.slangBucket?.rawValue ?? "null") label=\(a.sourceLabel)")
    for p in a.parts { print("  [\(p.title)] \(p.body)") }
}
SWIFT

cd "$WORK"
export TRENDY_DATA_DIR="$ROOT/web/data"
echo "==> swift test (App/Core + platform-neutral tests)"
swift test 2>&1 | tail -n 25

if command -v node >/dev/null; then
  echo "==> decode parity vs web/decode-ai.js"
  QUERIES="$WORK/queries.txt"
  python3 - "$ROOT" "$QUERIES" <<'PY'
import json, sys
root, out = sys.argv[1], sys.argv[2]
qs = set()
for f in ("slang", "abbreve"):
    for e in json.load(open(f"{root}/web/data/{f}.json"))["entries"]:
        qs.update(e.get("terms", []))
for t in json.load(open(f"{root}/web/data/trends.json")):
    qs.add(t["title"]); qs.update(t.get("tags", []))
qs.update(["67", "nah id win", "nah I'd win", "Nah, I\u2019d win!", "alpha", "na", "W", "L", "win",
           "i was so tired", "ok so", "y tho bro", "what does rizz mean?", "define skill issue",
           "xqzzyflorb", "abcd", "jawmaxxing", "1234", "s/o", "he took an L", "that's a W"])
open(out, "w").write("\n".join(sorted(q for q in qs if q.strip() and "\n" not in q)))
PY
  cat > "$WORK/probe.mjs" <<'JS'
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
const root = process.argv[2];
runInThisContext(readFileSync(`${root}/web/decode-ai.js`, "utf8"));
globalThis.fetch = async () => { throw new Error("offline"); };
const AI = globalThis.TrendyDecodeAI;
const L = (f) => JSON.parse(readFileSync(`${root}/web/data/${f}`, "utf8"));
const ctx = { slang: L("slang.json"), abbreve: L("abbreve.json"), trends: L("trends.json"), community: L("community-slang.json"), newHere: false };
for (const q of readFileSync(process.argv[3], "utf8").split("\n").filter(Boolean)) {
  const a = await AI.decodeQuery(q, ctx);
  console.log(`=== ${q} | source=${a.source} bucket=${a.slangBucket} label=${AI.sourceLabel(a)}`);
  for (const p of a.parts) console.log(`  [${p.title}] ${p.body}`);
}
JS
  node "$WORK/probe.mjs" "$ROOT" "$QUERIES" > "$WORK/js.out"
  QUERIES="$QUERIES" swift run -c debug probe > "$WORK/swift.out" 2>/dev/null
  if diff -u "$WORK/js.out" "$WORK/swift.out" > "$WORK/parity.diff"; then
    echo "parity OK ($(grep -c '^===' "$WORK/js.out") queries)"
  else
    echo "parity DIFF (see $WORK/parity.diff):"; head -n 40 "$WORK/parity.diff"; exit 1
  fi
fi
