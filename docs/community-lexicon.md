# Community lexicon (suggest → consensus)

**Goal:** when Decode doesn’t really know a term, let people suggest a definition. If enough people submit the **same normalized term** with **similar meanings**, graduate it into a community lexicon Decode reads — judgment-free, no shaming.

## When the Suggest UI shows

After a **weak** Decode answer only:

- Sources like `heuristic`, `ai-fallback`, `dictionary+ai`, `trends`, `live-ai`
- Abbreve-only lexicon hits
- Live miss / synthesizer paths

**Not** when curated / core slang (or an existing community hit) already nailed it.

Copy stays inviting: “Suggest a better definition” — never “you got it wrong.”

## Abuse basics

- Reject empty term/meaning
- Min meaning length (12 chars)
- Strip HTML from inputs
- Light same-device rate limit (localStorage cool-down + hourly cap)

## Consensus (boring on purpose)

| Knob | Default |
|------|---------|
| Threshold | **3** similar submissions for the same `termNorm` |
| Term match | Normalize (case, punctuation, apostrophes) like Decode |
| Meaning similarity | Token **Jaccard ≥ 0.45** **OR** one normalized meaning **contains** the other |

Promoted entries look like `slang.json` rows with:

- `source: "community"`
- `confidence`: `medium` (or `high` if the cluster is larger)
- `origin` note: **Community consensus on Trendy**

Rank in Decode: **above abbreve, below curated/core** (`rankBonus` community = 2000).

## Architecture (no API keys in browser)

Same LAN proxy pattern as Live Decode:

1. PWA **always** saves a local copy of the suggestion (`localStorage` queue) so solo testers see their queue.
2. If `liveDecodeUrl` is set, also `POST {proxy}/v1/suggest` with `{ term, meaning, origin?, clientId }`.
3. Proxy (`cli/trendy.py serve` / `cli/live_decode.py` + `cli/community_lexicon.py`):
   - Appends to `radar/out/suggestions.jsonl`
   - Runs consensus; on threshold, upserts `web/data/community-slang.json`
   - Optional `GET /v1/suggestions/stats?term=`
4. PWA `loadData` fetches `data/community-slang.json` (empty file is fine) and merges any on-device demo promotions.
5. **Without proxy:** after 3 similar suggests on the **same device**, local demo promotion can still happen — labeled clearly as on-device demo. Real multi-user needs the proxy.

## Demo on Windows LAN

```bat
cd C:\path\to\trendy
python cli/trendy.py serve
```

Serve the PWA (`npx serve web -l 4173`). On the phone (same Wi‑Fi): You → Live Decode → `http://<pc-lan-ip>:8787`.

Decode a nonsense niche term → **Suggest a better definition** → submit the same meaning from 3 phones (or thrice with different clientIds / clear rate limit for solo). Watch `web/data/community-slang.json` and Decode again — chip **Community lexicon**.

Solo without proxy: submit 3 similar meanings on one phone; toast explains on-device demo consensus.

## Related

- Live Decode proxy: [`live-decode.md`](live-decode.md)
- Backlog: **T0026**
