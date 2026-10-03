# Age demographics

Rough “who mainly says this” bands on slang and trends. Not a census and not a moral ranking — a hint so Decode (and Home/Explore cards) can tell a kid-chant from a group chat classic.

## Bands

Use these labels exactly:

| Band | Gloss |
|------|--------|
| **Gen Alpha** | mostly kids/tweens right now |
| **Gen Z** | mostly teens and early twenties |
| **Millennial** | mostly late twenties through early forties |
| **Gen X+** | mostly forties and older |
| **Mixed** | used across generations |

`Mixed` is the right call when a phrase crossed generations (bro, jk, situationship) or when the origin generation and today’s speakers are not the same crowd. Do not tag a dead or fading meme as Gen Alpha just because it is internet-y — use the generation that originated it, or Mixed.

## Where it lives

- `web/data/slang.json` — optional `age` on curated (and a few hand-written) entries. Abbreve rows stay untagged.
- `web/decode-ai.js` `CORE_ABBREVS` — same field on core abbrevs so Decode still has a band when the core table wins the match.
- `web/data/trends.json` — optional `age` on current heat cards. Home/Explore render a small chip when it is set.
- Community suggest (`cli/community_lexicon.py`) accepts an optional `age` if it is one of the five bands. Unknown values are ignored; age is not required to suggest.

## Decode and CLI

When `age` is present, Decode adds a part titled **Who says this** after the meaning and origin (it does not replace them):

`Gen Alpha — mostly kids/tweens right now`

CLI:

```bash
python cli/trendy.py decode 67
# age:     Gen Alpha — mostly kids/tweens right now
```

The line is omitted when the field is missing or not a known band.
