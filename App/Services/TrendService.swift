import Foundation

/// Phase 1 mock provider. Replace with network client in Phase 2 (`api-client-design`).
protocol TrendServing {
    func trendsSortedByMomentum() -> [Trend]
    func trends(in world: TrendWorld) -> [Trend]
}

struct MockTrendService: TrendServing {
    private let store: [Trend]

    init(store: [Trend] = MockTrendService.samples) {
        self.store = store
    }

    func trendsSortedByMomentum() -> [Trend] {
        store.sorted { $0.heatScore > $1.heatScore }
    }

    func trends(in world: TrendWorld) -> [Trend] {
        store.filter { $0.world == world }.sorted { $0.heatScore > $1.heatScore }
    }

    /// Offline-first Phase 1 catalog — ~12 trends across all worlds and lifecycles.
    static let samples: [Trend] = [
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111101")!,
            title: "rizz",
            summary: "Charisma / flirting game — still circulating hard.",
            originStory: "Popularized from streamer slang; crossed into mainstream TikTok and group chats. Judgment-free tip: context matters more than using it ironically.",
            world: .tiktok,
            heatScore: 0.92,
            lifecycle: .peaking,
            tags: ["slang", "gen-z"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111102")!,
            title: "NPC streaming",
            summary: "Creators perform scripted loops like game NPCs.",
            originStory: "Grew from live TikTok bits where creators repeat catchphrases for gifts — meme of algorithmic performance.",
            world: .internetCulture,
            heatScore: 0.71,
            lifecycle: .peaking,
            tags: ["meme", "live"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111103")!,
            title: "iykyk",
            summary: "If you know, you know.",
            originStory: "Abbreviation for insider context — Explore + New here mode expand the joke instead of assuming you already get it.",
            world: .abbreviations,
            heatScore: 0.55,
            lifecycle: .cooling,
            tags: ["abbrev"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111104")!,
            title: "skill issue",
            summary: "Playful roast: the problem is your skill, not the game.",
            originStory: "Gaming chat staple that spilled into general internet culture as a light jab.",
            world: .gaming,
            heatScore: 0.64,
            lifecycle: .peaking,
            tags: ["gaming", "slang"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111105")!,
            title: "corecore",
            summary: "Edit style stacking emotional clips with little explanation.",
            originStory: "TikTok / edit-community response to '-core' aesthetics — more vibe collage than manifesto.",
            world: .tiktok,
            heatScore: 0.38,
            lifecycle: .cooling,
            tags: ["edit", "aesthetic"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111106")!,
            title: "aura farming",
            summary: "Doing something cool on purpose to collect social points.",
            originStory: "Gaming/stream slang for stacking intangible 'aura' — now used whenever someone flexes quietly for the clip.",
            world: .tiktok,
            heatScore: 0.88,
            lifecycle: .rising,
            tags: ["slang", "flex"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111107")!,
            title: "brainrot",
            summary: "Content so absurd it feels like it rewires your brain.",
            originStory: "Internet-culture label for hyper-online meme loops; often self-aware rather than an insult.",
            world: .internetCulture,
            heatScore: 0.81,
            lifecycle: .peaking,
            tags: ["meme", "gen-z"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111108")!,
            title: "ate (and left no crumbs)",
            summary: "Did something exceptionally well.",
            originStory: "Praise slang that crossed from Black internet vernacular into broader TikTok compliments. Use it sincerely.",
            world: .tiktok,
            heatScore: 0.48,
            lifecycle: .cooling,
            tags: ["slang", "praise"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111109")!,
            title: "smh",
            summary: "Shaking my head — mild disbelief.",
            originStory: "Classic text abbreviation that never fully left group chats; still useful when tone needs a sigh, not a paragraph.",
            world: .abbreviations,
            heatScore: 0.22,
            lifecycle: .cooling,
            tags: ["abbrev", "classic"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-11111111110a")!,
            title: "diff",
            summary: "Short for 'difference' — usually 'your team/skill was the diff.'",
            originStory: "Competitive gaming shorthand for what decided the match; spilled into casual roast culture.",
            world: .gaming,
            heatScore: 0.59,
            lifecycle: .rising,
            tags: ["gaming", "abbrev"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-11111111110b")!,
            title: "touch grass",
            summary: "Go outside / log off for a bit.",
            originStory: "Internet-culture nudge (sometimes harsh, often joking) that someone is too online. Trendy keeps the tone light.",
            world: .internetCulture,
            heatScore: 0.41,
            lifecycle: .cooling,
            tags: ["meme", "advice"]
        ),
        Trend(
            id: UUID(uuidString: "11111111-1111-1111-1111-11111111110c")!,
            title: "gg",
            summary: "Good game — sportsmanship closer, or sarcastic 'we're done.'",
            originStory: "Gaming staple after matches; now appears in chats whenever something wraps — earnest or ironic.",
            world: .gaming,
            heatScore: 0.33,
            lifecycle: .rising,
            tags: ["gaming", "abbrev"]
        )
    ]
}
