# Trendy — Progressive Web App

Phone-usable static PWA mirroring the product tabs: **Home**, **Decode**, **Explore**, **You**. Explore spans many niches (not just TikTok) — catch up without the scroll; see `docs/explore-niches.md`.

Vanilla HTML/CSS/JS — no build step. Needs a tiny static server so `fetch()` can load JSON (and so the service worker can register).

## Run locally

From this folder (`web/`):

```bash
npx --yes serve -l 4173
```

Or from the repo root:

```bash
python3 -m http.server 4173 --directory web    # or: npx --yes serve web -l 4173
```

Then open **http://localhost:4173** on your machine, or on your phone (same Wi‑Fi) use your computer’s LAN IP, e.g. `http://192.168.x.x:4173`.

### Add to Home Screen

- **iOS Safari:** Share → Add to Home Screen  
- **Android Chrome:** Menu → Install app / Add to Home Screen  

Theme color and standalone display come from `manifest.webmanifest`.

### GitHub Pages (later)

Publish the contents of `web/` (or `/docs` copy) as Pages. Keep relative paths (`./`) as they are now.

## Offline

`sw.js` precaches the shell + `data/*.json` + icons. First visit must be online; later loads work offline from cache.

## Files

| Path | Role |
|------|------|
| `index.html` | App shell + tabs |
| `styles.css` | Dark “signal” UI |
| `app.js` | Feed, decode, prefs, save/follow |
| `decode-ai.js` | Never-blank Decode pipeline |
| `saved.js` | Saved-trend localStorage helpers |
| `data/trends.json` | Trend catalog (heat, lifecycle, age band) |
| `data/slang.json` | Curated slang lexicon |
| `data/abbreve.json` | Texting abbreviations (Apache-2.0, from Abbreve; see `../NOTICE`) |
| `data/community-slang.json` | Community consensus lexicon |
| `suggest.js` | Suggest queue + local demo consensus |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Offline cache |
| `icons/` | SVG icons |

Prefs (worlds, digest, New here, optional `liveDecodeUrl` / `liveDecodeToken`) persist in `localStorage` under `trendy.you.prefs.v1`.

**Live Decode (optional):** You tab → enter the proxy URL (`http://<computer-ip>:8787`) and its token. Model keys stay on that computer (`trendy serve --host 0.0.0.0` with `TRENDY_PROXY_TOKEN`). See `docs/live-decode.md`.

**Decode sources:** the on-device lexicon comes first (curated slang → community → abbreviations, with abbreviations only on exact queries). Single words may also be looked up on Wiktionary (existence-checked first, so unknown words fail quietly) or dictionaryapi.dev. The bubble header names the real source.

**Community suggests:** on weak Decode answers, suggest a definition (local queue always; proxy for multi-user). See `docs/community-lexicon.md`.

Saved / followed trend IDs use `trendy.saved.v1` (see `saved.js`). Hearts on cards and detail toggle without leaving the feed; **You → Saved trends** lists them; Home has an optional **All | Saved** filter.

### Phase 3 (PWA)

- Save/follow + a11y/reduced-motion polish
- Offline cache `trendy-v15` (data cache-bust `v=15`)
- Node tests: `npm test` (or `node --test tests/*.mjs`) from this folder


## Data refresh (Trend Radar)

`data/trends.json` and `data/slang.json` may be refreshed by the **Trend Radar** ingest (`radar/run_ingest.py` / GitHub Actions cron). Schema for the PWA stays the same (`id/title/summary/...` and `entries[].terms/short/explain/origin`); Radar may add optional fields the UI ignores. See [`../docs/radar.md`](../docs/radar.md).
