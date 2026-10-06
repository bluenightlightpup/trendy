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

Instead **your own computer** runs a tiny stdlib proxy. The PWA stores only the proxy URL (`liveDecodeUrl`) and, if you set one, the proxy token (`liveDecodeToken`) in `localStorage`.

## Security model

- **Loopback by default.** `trendy serve` binds `127.0.0.1:8787`, so only the same computer can reach it.
- **LAN needs a token.** `--host 0.0.0.0` (or any non-loopback address) is refused unless `TRENDY_PROXY_TOKEN` (or `--token`) is set. Clients must send `Authorization: Bearer <token>` (or `X-Trendy-Token`). Tokens are compared in constant time.
- **Restricted CORS.** Browser requests are allowed only from localhost, private-LAN IPs and `*.local` origins, plus anything you add with `--allow-origin` / `TRENDY_PROXY_ORIGINS` (comma-separated). Other origins get 403.
- **Small inputs.** Terms are capped at 120 characters.
- `GET /health` is open and reports whether auth is on. It never returns secrets.
- For personal or trusted-LAN use only. Don't port-forward it to the internet. Never commit keys (`.env` is gitignored). The proxy logs provider and term length only.

## Run the proxy

macOS / Linux:

```bash
export OPENAI_API_KEY=sk-...                 # or ANTHROPIC_API_KEY=sk-ant-...
trendy serve                                 # same computer only: http://127.0.0.1:8787

export TRENDY_PROXY_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
trendy serve --host 0.0.0.0 --port 8787      # reachable from your phone on the LAN
```

Windows (PowerShell, from a checkout such as `C:\path\to\trendy\`):

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:TRENDY_PROXY_TOKEN = "pick-a-long-random-secret"
py cli\trendy.py serve --host 0.0.0.0
```

(Not installed? Replace `trendy` with `python3 cli/trendy.py`.)

Optional aliases / overrides:

- `TRENDY_OPENAI_API_KEY` / `TRENDY_ANTHROPIC_API_KEY` (preferred if you want Trendy-specific keys)
- `TRENDY_OPENAI_BASE_URL` (OpenAI-compatible endpoints)
- `TRENDY_OPENAI_MODEL` (default `gpt-4o-mini`)
- `TRENDY_ANTHROPIC_MODEL` (default `claude-3-5-haiku-latest`)

One-off from the terminal (no proxy):

```bash
trendy decode "some niche phrase" --live
```

## Phone PWA — set the endpoint

1. Serve the PWA as usual (`npx serve web -l 4173` or `python -m http.server 4173 --directory web`).
2. On the phone (same Wi‑Fi), open `http://192.168.x.x:4173`.
3. **You** tab → **Live Decode (optional)** → enter `http://<computer-lan-ip>:8787` and the access token → **Save**.

Endpoints (POST endpoints require the token when one is configured):

- `GET /health` → `{ "ok": true, … }` (open; reports the auth mode)
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
