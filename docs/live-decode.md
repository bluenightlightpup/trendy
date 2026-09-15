# Live Decode (model-on-miss)

**Goal:** stop endless slang-pack downloads. Keep the Decode ladder, and only call a live model when local sources miss.

## Ladder (unchanged priority)

1. Curated / core lexicon (`slang.json` + core abbrevs in `decode-ai.js`)
2. Radar / trends heat
3. Wiktionary / free dictionary API
4. **Live model only on miss** (optional LAN proxy)
5. Heuristic synthesizer last (never blank)

Curated / core hits (**nah I'd win**, **alpha**, **bro**, …) never trigger a live call.

## Why a local proxy (not browser keys)

Putting `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` in the PWA would:

- Leak the key to anyone who opens DevTools / shares the device
- Hit CORS blocks from provider APIs

Instead the **PC** runs a tiny stdlib proxy. The phone PWA stores only the proxy URL in `localStorage` (`liveDecodeUrl`).

**Security:** trusted LAN / personal use only. Do **not** expose the proxy to the public internet without auth. Never commit keys (`.env` is gitignored). The proxy logs provider + term length only — not full prompts with secrets.

## Windows — run the proxy

From a PowerShell or cmd in the repo root (`C:\path\to\trendy\`):

```bat
set OPENAI_API_KEY=sk-...
python cli/trendy.py serve
```

Or Anthropic:

```bat
set ANTHROPIC_API_KEY=sk-ant-...
python cli/trendy.py serve --port 8787
```

Optional aliases / overrides:

- `TRENDY_OPENAI_API_KEY` / `TRENDY_ANTHROPIC_API_KEY` (preferred if you want Trendy-specific keys)
- `TRENDY_OPENAI_BASE_URL` (OpenAI-compatible endpoints)
- `TRENDY_OPENAI_MODEL` (default `gpt-4o-mini`)
- `TRENDY_ANTHROPIC_MODEL` (default `claude-3-5-haiku-latest`)

Bind is `0.0.0.0:8787` by default so the phone can reach `http://<pc-lan-ip>:8787`.

Also:

```bat
python cli/trendy.py decode "some niche phrase" --live
```

## Phone PWA — set the endpoint

1. Serve the PWA as usual (`npx serve web -l 4173` or `python -m http.server 4173 --directory web`).
2. On the phone (same Wi‑Fi), open `http://192.168.x.x:4173`.
3. **You** tab → **Live Decode (optional)** → paste `http://<pc-lan-ip>:8787` → **Save**.

Endpoints:

- `GET /health` → `{ "ok": true }`
- `POST /v1/decode` body `{ "term": "...", "newHere": true }` → `{ "meaning", "explain", "origin", "confidence", "provider" }`
- `POST /v1/suggest` body `{ "term", "meaning", "origin?", "clientId" }` → community consensus (see [`community-lexicon.md`](community-lexicon.md))
- `GET /v1/suggestions/stats?term=` → counts / cluster size

If no key is set, `/v1/decode` returns **503** with a clear JSON error. The PWA times out at ~8s and falls back to the synthesizer (never blank).

## Miss detection (PWA)

Live is called only when **all** of:

- A Live Decode URL is saved, and
- There is **no** strong slang hit from **core** / **curated slang** lexicon, and
- The assembled answer would be weak: abbreve-only, trends-only, dictionary+AI, heuristic, or ai-fallback

On success, the bubble is labeled **Live AI**; trend heat (if any) is still shown.

## Without endpoint / key

Decode behaves exactly as before (lexicon → dict → synthesizer). Never blank.
