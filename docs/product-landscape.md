# Phase 5 — Product landscape & novelty (slang / culture translators)

Status: **OPEN** — research + positioning phase (not build)

## Goal

Map competitors (e.g. Urban Dictionary and Gen Z translators), name Trendy’s differentiation, and explore **novel uses** beyond “look up a word.”

## Landscape snapshot (2025–2026)

| Player | What they are | Strengths | Gaps vs Trendy’s intent |
|--------|----------------|-----------|-------------------------|
| **Urban Dictionary** | Crowdsourced glossary | Huge catalog, cultural icon | Messy/NSFW entries, slow on Gen Alpha brainrot, lookup not “what’s hot now,” weak judgment-free UX for parents/older users |
| **Slangora** | Large modern slang dictionary | Volume, audio, editor review, learner modes | Dictionary-first, not momentum/heat feed; not Radar-trained continuous “what’s peaking” |
| **Wordyex** | Gen Z web dictionary + translator + aesthetic tools | Fast web UX, viral index framing | More toolkit/gimmick adjacent; less product story around FOMO + New here mode |
| **Musely Slang Translator** | AI bi-directional slang ↔ English | Full sentences, many varieties, speed | Translator widget; not a trends home with lifecycle/heat; less “origin story” product |
| **GenZ Slang Translator apps** (iOS/Play) | Mobile decode + quizzes/crosswords | App Store presence, games, daily phrases | Often static packs; weaker continuous multi-platform Radar; quiz ≠ cultural inclusion |
| **ChatGPT / Claude general chat** | General LLMs | Flexible explanations | No curated heat feed, no lifecycle, no Save/You prefs, knowledge lag / inconsistency, not specialized FOMO product |

### Positioning hypothesis for Trendy

**Not another Urban Dictionary clone.** Trendy is:

1. **Momentum-first** — heat meter + rising/peaking/cooling (what’s *happening*, not only definitions)
2. **Judgment-free Decode** — New here mode for parents, older users, late adopters
3. **One home for worlds** — TikTok / internet / abbrev / gaming without app-hopping
4. **Radar-trained** — continuous ingest ambition (24/7), not a frozen glossary dump
5. **AI-native ops path** (optional Phase 4) — CLI/MCP for agents, not just a consumer lookup site

## Competitive questions to answer this phase

- [ ] Which 5–8 competitors matter most for our ICP (FOMO avoiders + catching-up / older users)?
- [ ] Feature matrix: lookup, AI chat, feed, quizzes, offline, safety filters, origins, personalization
- [ ] Where Urban Dictionary still wins (brand, SEO, volume) — and what we refuse to copy (toxicity, joke definitions as default)
- [ ] Pricing / distribution: free PWA vs App Store vs web SEO
- [ ] Legal: can we cite/link UD, or only independent Radar + LLM explain?

## Novelty — new ways Trendy could be used

### A. Relationship & family “translator mode”
- Parents / grandparents paste a teen text thread → Decode returns plain-language + “safe to ignore vs reply” hints  
- Couple mode: decode partner’s meme replies without killing the vibe

### B. Classroom / workplace cultural fluency (filtered)
- Teacher or manager “New here” pack: school-safe slang only  
- ESL / international students: register labels (playful vs rude)

### C. Content creator copilots
- Before posting: “will this sound cheugy / late?” heat check  
- Trend brief for thumbnails/scripts: peaking terms this week in a niche world

### D. Live social moments
- Watch-party overlay: decode chat slang during streams  
- Party / icebreaker: “guess the heat” of a term with friends

### E. Mental health / FOMO framing (careful, ethical)
- Digest that *reduces* scroll time: “you’re caught up on 5 signals — stop here”  
- Explicit anti-doomscroll design (timeboxed Home)

### F. Accessibility & inclusion
- Voice Decode for on-the-go  
- High-contrast / plain-language always-on for cognitive load

### G. Agent / product workflows (ties to Phase 4)
- Workbench agents pull `get_trends` while writing Gen Z marketing copy  
- CI bot fails a PR if campaign copy uses cooling slang as if it’s peaking

### H. Games & retention loops
- Daily “67 or skill issue?” quiz without becoming only a quiz app  
- Streak for Decode lookups that actually got used IRL (self-report)

### I. Local / subculture Radars
- City-specific meme packs, fandom worlds (K-pop, sports, campus) as Explore layers

### J. “Time machine”
- Show when a term rose/peaked/cooled — nostalgia + “you’re not late, it’s cooling”

## Recommended next artifacts

1. One-page feature matrix spreadsheet or markdown table (fill during review)
2. 3 novelty bets ranked by effort vs differentiation (pick 1 to prototype after P3 or in parallel on PWA)
3. Explicit **non-goals** list (e.g. not NSFW dump, not English→brainrot joke generator as primary)

## Exit criteria

- [ ] Landscape doc reviewed by owner
- [ ] Top 3 differentiators locked in PRD addendum
- [ ] At least 2 novelty concepts chosen for backlog tickets
- [ ] Decision: any competitor API/partnership worth pursuing? (usually no for UD)
