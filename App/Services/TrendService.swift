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

    static let samples: [Trend] = [
        Trend(
            id: UUID(),
            title: "rizz",
            summary: "Charisma / flirting game — still circulating hard.",
            originStory: "Popularized from streamer slang; crossed into mainstream TikTok and group chats. Judgment-free tip: context matters more than using it ironically.",
            world: .tiktok,
            heatScore: 0.92,
            tags: ["slang", "gen-z"]
        ),
        Trend(
            id: UUID(),
            title: "NPC streaming",
            summary: "Creators perform scripted loops like game NPCs.",
            originStory: "Grew from live TikTok bits where creators repeat catchphrases for gifts — meme of algorithmic performance.",
            world: .internetCulture,
            heatScore: 0.71,
            tags: ["meme", "live"]
        ),
        Trend(
            id: UUID(),
            title: "iykyk",
            summary: "If you know, you know.",
            originStory: "Abbreviation for insider context — Explore + New here mode expand the joke instead of assuming you already get it.",
            world: .abbreviations,
            heatScore: 0.55,
            tags: ["abbrev"]
        ),
        Trend(
            id: UUID(),
            title: "skill issue",
            summary: "Playful roast: the problem is your skill, not the game.",
            originStory: "Gaming chat staple that spilled into general internet culture as a light jab.",
            world: .gaming,
            heatScore: 0.64,
            tags: ["gaming", "slang"]
        ),
        Trend(
            id: UUID(),
            title: "corecore",
            summary: "Edit style stacking emotional clips with little explanation.",
            originStory: "TikTok / edit-community response to '-core' aesthetics — more vibe collage than manifesto.",
            world: .tiktok,
            heatScore: 0.38,
            tags: ["edit", "aesthetic"]
        )
    ]
}
