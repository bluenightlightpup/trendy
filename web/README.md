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
npx --yes serve web -l 4173
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
| `data/trends.json` | Mock trends |
| `data/slang.json` | Decode dictionary |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Offline cache |
| `icons/` | SVG icons |

Prefs (worlds, digest, New here) persist in `localStorage` under `trendy.you.prefs.v1`.

Saved / followed trend IDs use `trendy.saved.v1` (see `saved.js`). Hearts on cards and detail toggle without leaving the feed; **You → Saved trends** lists them; Home has an optional **All | Saved** filter.

### Phase 3 (PWA)

- Save/follow + a11y/reduced-motion polish
- Offline cache bumped to `trendy-v5` (precache includes `decode-ai.js` + `saved.js`)
- Node tests: `npm test` (or `node --test tests/*.mjs`) from this folder


## Data refresh (Trend Radar)

`data/trends.json` and `data/slang.json` may be refreshed by the **Trend Radar** ingest (`radar/run_ingest.py` / GitHub Actions cron). Schema for the PWA stays the same (`id/title/summary/...` and `entries[].terms/short/explain/origin`); Radar may add optional fields the UI ignores. See [`../docs/radar.md`](../docs/radar.md).
