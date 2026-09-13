# PRD — Trendy

**Status:** Phase 0 scaffold  
**Owner:** bluenightlightpup  
**Platform:** iOS / SwiftUI (phone-first)  
**License:** MIT

## Problem

Trends, memes, and slang move fast across TikTok, gaming, and internet culture. Staying current often means hours of screentime across many apps. People who are catching up — including older users — feel FOMO and miss context (origins, abbreviations, inside jokes).

## Vision

Trendy is an AI assistant that keeps you culturally current **without** massive screentime: explain what something means and where it came from, surface what’s heating up, and organize trends in one place — judgment-free.

## Goals

1. Reduce FOMO by summarizing momentum and context, not endless feeds.
2. Decode slang / memes / abbreviations with clear, respectful explanations (Claude).
3. Organize trends by “world” so users don’t hop between apps.
4. Personalize interests and digest cadence; support a **New here mode** that spells out inside jokes.
5. Encode velocity visually via a **heat meter** (cool → volt → hot).

## Non-goals (near term)

- Full social network / creator profiles as the core product.
- Replacing TikTok or other feed apps with infinite scroll entertainment.
- Desktop-first or multi-platform parity in Phases 0–2.

## Audience

- Anyone who wants cultural awareness without 10+ hours of screentime.
- People late to trends who still want to feel included.
- Older users who want younger-generation slang and context.

## Core tabs / features

| Surface | Behavior |
|---------|----------|
| **Home** | Feed sorted by momentum; heat meter on each card; tap → origin story |
| **Decode** | Chat: type slang/meme/abbreviation → Claude explains meaning + origin, judgment-free |
| **Explore** | Browse by world: TikTok, internet culture, abbreviations, gaming |
| **You** | Interest toggles, digest frequency, New here mode |
| **Later** | Save / follow trends |

## Design principles

- **Signal identity:** deep ink background; hot pink / acid-lime / cyan as a *temperature* scale for velocity, not decoration.
- **Type vibe:** Space Grotesk (headlines) + JetBrains Mono (heat scores, tags); system fallbacks OK initially.
- **Respect:** never shame the user for not knowing a term.

## Success signals (qualitative v1)

- User can identify a trend’s heat and open an origin story in < 2 taps.
- Decode returns a usable explanation for common slang without judgmental tone.
- User can filter Explore by at least one world and adjust You interests.

## Constraints

- Phone-first iOS 17+.
- Secrets never in repo; Claude API via secure client (`api-client-design`).
- Workbench skills/agents for process; this repo holds app + product docs only.

## References

- Owner idea extracts: `docs/ideas/`
- Phases: `docs/phased-implementation.md`
- Tickets: `docs/backlog.md`
