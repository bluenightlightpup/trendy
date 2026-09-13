# Architecture — Trendy

**Min iOS:** 17.0  
**UI:** SwiftUI, phone-first  
**Process skills:** `architecture-decision`, `ios-xcode-setup`, `api-client-design`, `ios-swiftui-feature`

## High-level

```
┌─────────────────────────────────────────────┐
│                 TrendyApp                    │
│              ContentView / Tabs              │
├──────────┬──────────┬──────────┬────────────┤
│  Home    │ Decode   │ Explore  │    You     │
│  Feature │ Feature  │ Feature  │  Feature   │
├──────────┴──────────┴──────────┴────────────┤
│           DesignSystem (tokens, HeatMeter)   │
├─────────────────────────────────────────────┤
│  Services (TrendService, DecodeClient, …)    │
├─────────────────────────────────────────────┤
│  Models (Trend, HeatLevel, World, Prefs)     │
└─────────────────────────────────────────────┘
```

## Folder conventions (`App/`)

| Path | Responsibility |
|------|----------------|
| `TrendyApp.swift` | `@main` entry |
| `ContentView.swift` | Root host |
| `Navigation/` | Tab shell / routing |
| `Features/Home/` | Feed, cards, heat, origin detail |
| `Features/Decode/` | Chat UI + view model |
| `Features/Explore/` | Worlds browser |
| `Features/You/` | Preferences, New here mode |
| `DesignSystem/` | Colors, typography, shared controls |
| `Services/` | Networking, persistence, mock providers |
| `Models/` | Codable / domain types |
| `Resources/` | Assets, localization (later) |

## Boundaries

- **Features** own UI + feature state; depend on Models + Services + DesignSystem.
- **Services** own I/O (HTTP, Keychain/UserDefaults). No SwiftUI imports.
- **Decode** talks to Claude through a dedicated client — never hardcode keys.
- **Heat** is a domain concept (`HeatLevel` / score) rendered by `HeatMeter`; colors come from design tokens.

## Data (v1 sketch)

- **Phase 1:** in-memory mock trends.
- **Phase 2:** remote trend feed + Claude Messages API (or gateway); preferences local.
- **Phase 3:** saved/followed IDs persisted (local first; sync optional later).

## Navigation

Four tabs — Home, Decode, Explore, You. Home card → push/sheet origin story. Decode is chat-first (no nested tabs).

## Testing

- Unit: Models heat mapping, preference encoding, client request building.
- UI: tab smoke + Home card presence (Phase 3 emphasis).
- See workbench `ios-testing`.

## Open ADRs (to file when decided)

- Trend data source (curated CMS vs scraped aggregators vs partner APIs).
- Claude access path (direct vs backend proxy — prefer proxy for key safety in production).
