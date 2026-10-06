#!/usr/bin/env python3
"""Link checker for the assembled website (stdlib only).

Crawls every page reachable from BASE and checks each internal link, asset and #fragment, the PWA
manifest (start_url, scope, icons), the service worker PRECACHE list and the data files app.js loads.
External links are listed with their HTTP status but don't fail the run.

  scripts/build-site.sh /tmp/site-preview
  mkdir -p /tmp/pv && ln -sfn /tmp/site-preview /tmp/pv/trendy
  python3 -m http.server 8765 --directory /tmp/pv &
  python3 scripts/check-site-links.py http://127.0.0.1:8765/trendy/
"""
import json, re, sys, urllib.request, urllib.error
from html.parser import HTMLParser
from urllib.parse import urljoin, urldefrag, urlparse

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/trendy/"

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.ids = set(); self.base = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        if tag == "base" and a.get("href"): self.base = a["href"]
        for k in ("href", "src"):
            if a.get(k) and not (tag == "meta"):
                self.links.append((tag, k, a[k]))
        if tag == "meta" and a.get("property") in ("og:image", "og:url"):
            self.links.append((tag, "content", a["content"]))

def fetch(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "trendy-linkcheck"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read() if method == "GET" else b""
    except urllib.error.HTTPError as e:
        return e.code, "", b""
    except Exception as e:
        return f"ERR {type(e).__name__}", "", b""

seen, pages, ids, broken, external = {}, [BASE], {}, [], {}
checked = set()
while pages:
    url = pages.pop()
    if url in ids: continue
    status, ctype, body = fetch(url)
    seen[url] = status
    if status != 200:
        broken.append((url, status, "(page)")); ids[url] = set(); continue
    p = P(); p.feed(body.decode("utf-8", "replace")); ids[url] = p.ids
    for tag, attr, raw in p.links:
        if raw.startswith(("mailto:", "javascript:", "data:")): continue
        absu = urljoin(url, raw)
        noq, frag = urldefrag(absu)
        if not absu.startswith(BASE):
            external.setdefault(noq, set()).add(url.replace(BASE, "/trendy/")); continue
        checked.add((url, raw, noq, frag))
        clean = noq.split("?")[0]
        if (clean.endswith(".html") or clean.endswith("/")) and clean not in ids and clean not in pages:
            pages.append(clean)

for src, raw, target, frag in sorted(checked):
    st = seen.get(target)
    if st is None:
        st, _, _ = fetch(target); seen[target] = st
    if st != 200:
        broken.append((src, st, raw)); continue
    if frag and target in ids and frag not in ids[target]:
        broken.append((src, "missing #" + frag, raw))

# PWA: manifest + service worker precache
app = urljoin(BASE, "app/")
st, _, body = fetch(urljoin(app, "manifest.webmanifest"))
m = json.loads(body)
for item in [m["start_url"], m["scope"]] + [i["src"] for i in m["icons"]]:
    u = urljoin(urljoin(app, "manifest.webmanifest"), item)
    s2, _, _ = fetch(u); seen[u] = s2
    if s2 != 200: broken.append(("manifest", s2, item))
    if not u.startswith(app): broken.append(("manifest", "outside /app/", item))
st, _, body = fetch(urljoin(app, "sw.js"))
pre = re.findall(r'"(\./[^"]*)"', body.decode().split("];")[0])
for item in pre:
    u = urljoin(urljoin(app, "sw.js"), item); s2, _, _ = fetch(u); seen[u] = s2
    if s2 != 200: broken.append(("sw.js PRECACHE", s2, item))
st, _, appjs = fetch(urljoin(app, "app.js"))
bust = re.search(r'const bust = "([^"]+)"', appjs.decode()).group(1)
for item in [f"data/{n}.json?{bust}" for n in ("trends", "slang", "abbreve", "community-slang")]:
    u = urljoin(app, item); s2, _, _ = fetch(u); seen[u] = s2
    if s2 != 200: broken.append(("app.js loadData", s2, item))

internal = [u for u in seen if u.startswith(BASE)]
print(f"Internal URLs checked: {len(internal)} (pages crawled: {len(ids)}, PWA precache entries: {len(pre)})")
print("Broken internal:", "none" if not broken else "")
for b in broken: print("  ", b)
print(f"\nExternal links ({len(external)}):")
for u in sorted(external):
    s3, _, _ = fetch(u, "GET")
    print(f"  {s3}  {u}   <- {', '.join(sorted(external[u]))}")
sys.exit(1 if broken else 0)
