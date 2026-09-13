# Trendy — Progressive Web App

Phone-usable static PWA mirroring the product tabs: **Home**, **Decode**, **Explore**, **You**.

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
| `app.js` | Feed, decode, prefs |
| `data/trends.json` | Mock trends |
| `data/slang.json` | Decode dictionary |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Offline cache |
| `icons/` | SVG icons |

Prefs (worlds, digest, New here) persist in `localStorage` under `trendy.you.prefs.v1`.
