# Trendy

**Decode slang, texting abbreviations and meme trends, from your terminal or straight from your AI agent.**

Trendy is a small, dependency-free Python CLI and a read-only **MCP server**. It works from one curated lexicon covering Gen Alpha, Gen Z and internet slang plus about 370 texting abbreviations, and a trend catalog with heat scores, lifecycle stages and age bands. It doesn't judge anyone for asking. A phone-friendly **PWA** and a native **iOS app** read the same data.

<!-- mcp-name: io.github.bluenightlightpup/trendy -->

**Website:** [bluenightlightpup.github.io/trendy](https://bluenightlightpup.github.io/trendy/) · web app at [/app/](https://bluenightlightpup.github.io/trendy/app/) (source in [`site/`](site/), published by [`pages.yml`](.github/workflows/pages.yml))

```console
$ trendy decode rizz
rizz  [slang]
short:   Charisma / flirting game — “W rizz” good, “L rizz” bad.
explain: Can be serious compliment or joke. Oxford’s 2023 Word of the Year spotlight cemented it.
origin:  Popularized by Kai Cenat and stream culture; exploded on TikTok; Oxford Word of the Year 2023.
age:     Gen Z — mostly teens and early twenties
```

## Install

You need Python **3.10+** (3.9 also works but is not supported). There are no runtime dependencies.

```bash
# From a clone (recommended while the repo is private)
git clone https://github.com/bluenightlightpup/trendy.git
cd trendy
python3 -m pip install .          # or: pipx install .   /   pip install -e .  (development)

# Without installing (uv)
uvx --from /path/to/trendy trendy decode rizz
uvx --from git+https://github.com/bluenightlightpup/trendy trendy decode rizz   # needs repo access
```

Installing gives you three commands: `trendy`, `trendy-mcp` (the MCP server) and `trendy-cli` (an alias of `trendy`). The lexicon and trend data ship inside the package, so they work from any directory. The package is **not on PyPI yet**; the distribution name will be `trendy-cli`.

Not installing at all? Every command also runs from a checkout: `python3 cli/trendy.py …` or `python3 -m cli …`. On Windows, use `py` or `python` instead of `python3`.

## CLI quickstart

```bash
trendy decode 67                      # slang card: meaning, origin, who says it
trendy decode lgtm --json             # machine-readable; exit code 1 if no match
trendy trends --min-heat 0.7 --limit 10
trendy trends --world TikTok --json
trendy radar status                   # last Trend Radar run (adapters, errors, catalog size)
trendy --version
```

Exit codes: `0` found, `1` no lexicon match (`decode`), `2` usage or runtime error.

## MCP quickstart (Cursor, Claude Desktop, any MCP client)

The server is local stdio only and exposes four **read-only** tools: `decode_term`, `search_slang`, `get_trends`, `radar_status`. It has no write tools and no network access, and it never puts API keys in results. It negotiates MCP protocol versions `2024-11-05` through `2025-11-25`.

**Installed** (`pip install .` / `pipx install .`):

```json
{
  "mcpServers": {
    "trendy": { "command": "trendy", "args": ["mcp"] }
  }
}
```

**From a checkout** (no install). Use an absolute path, so it works no matter which directory the client starts in:

```json
{
  "mcpServers": {
    "trendy": {
      "command": "python3",
      "args": ["/ABSOLUTE/PATH/TO/trendy/cli/trendy.py", "mcp"]
    }
  }
}
```

- macOS/Linux: `python3`. Windows: use `"command": "py"` (or the full path to `python.exe`) and a path like `"C:\\path\\to\\trendy\\cli\\trendy.py"`.
- Output is always UTF-8, including on Windows code pages such as cp1252. If you pipe CLI output in an old PowerShell console, run `[Console]::OutputEncoding = [Text.Encoding]::UTF8` first so emoji and curly quotes render.
- With uv: `{"command": "uvx", "args": ["--from", "/ABSOLUTE/PATH/TO/trendy", "trendy", "mcp"]}`.

There's also a [`server.json`](server.json) for the MCP registry (`io.github.bluenightlightpup/trendy`), prepared but not published. More detail: [`docs/cli-mcp-integration.md`](docs/cli-mcp-integration.md).

## Phone app (PWA)

A static Progressive Web App in [`web/`](web/) has four tabs: Home (what's hot now), Decode (chat-style lookups), Explore (browse by world) and You (filters, saved trends).

```bash
python3 -m http.server 4173 --directory web    # or: npx --yes serve web -l 4173
```

Open it on your phone (same Wi‑Fi) and use Add to Home Screen. Decode checks the on-device lexicon first. For single words it can also look up Wiktionary or a free dictionary API. Details: [`web/README.md`](web/README.md).

<p>
  <img src="docs/images/trendy-home.png" alt="Trendy Home: trend feed sorted by what's hot now" width="300" />
  <img src="docs/images/trendy-decode.png" alt="Trendy Decode: lexicon answer for rizz with origin and age band" width="300" />
</p>

### Optional: Live Decode proxy

When the lexicon has no answer, the PWA can ask a proxy you run yourself. It uses a model API key that stays on that computer.

```bash
export OPENAI_API_KEY=sk-...          # or ANTHROPIC_API_KEY
trendy serve                          # http://127.0.0.1:8787 (this computer only)

# Reach it from your phone on the LAN: a token is required
export TRENDY_PROXY_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
trendy serve --host 0.0.0.0           # then enter URL + token in the PWA's You tab
```

The proxy binds `127.0.0.1` by default. It refuses to listen on a non-loopback address without `TRENDY_PROXY_TOKEN`, checks `Authorization: Bearer <token>`, and only allows CORS from localhost and private-LAN origins (add more with `--allow-origin`). It's meant for personal or trusted-LAN use only. See [`docs/live-decode.md`](docs/live-decode.md) and [`docs/community-lexicon.md`](docs/community-lexicon.md) (suggest → consensus).

## iOS app (native SwiftUI)

[`App/`](App/) holds a native iPhone app (iOS 17+, SwiftUI, no dependencies) that matches the PWA: Home (the same heat × lifecycle × recency ranking, digest card, origin stories, Save), Explore (world chips, search), Decode (an offline port of the `web/decode-ai.js` ladder, with an optional single-word dictionary lookup) and You (worlds, digest, New here, saved list). It bundles the `web/data/` JSON at build time, works offline, has no accounts or API keys, and collects no data.

Building it requires a Mac with Xcode 26+:

```bash
brew install xcodegen
xcodegen generate            # project.yml is the source of truth; Trendy.xcodeproj is gitignored
open Trendy.xcodeproj        # set DEVELOPMENT_TEAM in project.yml first; ⌘U runs TrendyTests
```

The Foundation-only engine in `App/Core` also builds and tests on Linux: `scripts/swift-linux-check.sh` parses every Swift file, runs the Core tests and diffs Decode output against the PWA. Release docs: [`docs/xcode-setup.md`](docs/xcode-setup.md) · [`docs/testflight.md`](docs/testflight.md) · [`docs/app-store/release-checklist.md`](docs/app-store/release-checklist.md) · [`docs/app-store/app-store-listing.md`](docs/app-store/app-store-listing.md) · [privacy policy](docs/app-store/privacy-policy.md).

## Trend Radar (data refresh)

`radar/run_ingest.py` merges public signals into `web/data/trends.json` and `slang.json`. A GitHub Actions job runs it **once a day**.

Current status:

- **Reddit:** wired up, but Reddit currently answers **HTTP 403** to unauthenticated requests from CI runners (and from our test box), so it adds nothing right now. `trendy radar status` shows the error.
- **Seed list (`mock_seed`):** a curated built-in list keeps the catalog populated. Most current "signals" come from here, and `radar status` says so.
- **YouTube / Wikipedia:** disabled. They produced off-topic rows, which were purged.
- **TikTok / Instagram:** stubs. They need official API or partner access; there are no scrapers.

```bash
pip install -r radar/requirements.txt
python3 radar/run_ingest.py
```

Details: [`radar/README.md`](radar/README.md) · [`docs/radar.md`](docs/radar.md).

## Development

```bash
python3 -m unittest discover -s cli -t .          # CLI, MCP, proxy
python3 -m unittest discover -s radar -t . -p "test_*.py"
cd web && node --test tests/*.mjs                 # PWA Decode logic
```

CI (`.github/workflows/validate.yml`) runs all three. It also installs the package and smoke-tests `trendy` and `trendy mcp` from outside the checkout.

Repo layout:

```
cli/        CLI, stdio MCP server, Live Decode proxy (installs as trendy_cli)
web/        PWA + the shared data in web/data/
site/       project website (GitHub Pages; the PWA is published at /app/)
radar/      Trend Radar ingest
App/        native iOS app (SwiftUI; see docs/xcode-setup.md)
Config/     iOS Info.plist
Tests/      iOS unit tests (TrendyTests)
scripts/    icon + lexicon generators, Linux Swift check
docs/       PRD, architecture, ADRs, backlog
```

Planning docs: [`docs/prd.md`](docs/prd.md) · [`docs/architecture.md`](docs/architecture.md) · [`docs/phased-implementation.md`](docs/phased-implementation.md) · [`docs/backlog.md`](docs/backlog.md) · [`docs/adr/0001-cli-mcp.md`](docs/adr/0001-cli-mcp.md) · [`docs/age-demographics.md`](docs/age-demographics.md).

Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md) · Security: [`SECURITY.md`](SECURITY.md).

## License and credits

Trendy is released under the **MIT** license. Copyright (c) 2026 bluenightlightpup. See [`LICENSE`](LICENSE).

The abbreviation list (`web/data/abbreve.json`) is derived from **[Abbreve](https://github.com/Njong392/Abbreve)** by Njong Emy and contributors. It is licensed under **Apache-2.0**: see [`web/data/ABBREVE-LICENSE`](web/data/ABBREVE-LICENSE) and [`NOTICE`](NOTICE) for the changes Trendy made.
