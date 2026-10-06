#!/usr/bin/env bash
# Assemble the public website: site/ at the root + the PWA (web/) at /app/.
# Used by .github/workflows/pages.yml; run locally to preview:
#   scripts/build-site.sh /tmp/site-preview
#   mkdir -p /tmp/pv && ln -sfn /tmp/site-preview /tmp/pv/trendy && python3 -m http.server 8000 --directory /tmp/pv
#   open http://localhost:8000/trendy/
set -euo pipefail

out="${1:-_site}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "$out"
mkdir -p "$out"
cp -R "$root/site/." "$out/"
mkdir -p "$out/app"
cp -R "$root/web/." "$out/app/"

# Dev-only files that should not be published with the PWA.
rm -rf "$out/app/tests" "$out/app/node_modules" "$out/app/data/raw" \
       "$out/app/package.json" "$out/app/package-lock.json" "$out/app/README.md"
find "$out" \( -name '.DS_Store' -o -name '*.tmp' \) -delete

echo "Assembled $(find "$out" -type f | wc -l | tr -d ' ') files in $out"
