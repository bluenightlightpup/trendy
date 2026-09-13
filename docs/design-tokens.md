# Design tokens — Trendy (“signal” identity)

Fonts may use **system fallbacks** initially; document intended faces for when custom fonts ship.

## Color — surfaces

| Token | Role | Hex (starter) |
|-------|------|----------------|
| `ink.bg` | App background (deep ink) | `#0B0D12` |
| `ink.elevated` | Cards / sheets | `#141824` |
| `ink.border` | Subtle separators | `#232836` |
| `ink.text.primary` | Primary text | `#F4F6FB` |
| `ink.text.secondary` | Secondary / meta | `#9AA3B5` |

## Color — heat temperature scale

Used by the **heat meter** to encode trend velocity (not mere decoration).

| Token | Meaning | Hex (starter) |
|-------|---------|----------------|
| `heat.cool` | Cooling / low momentum | `#2DE2E6` (cyan) |
| `heat.volt` | Rising / mid | `#C8F135` (acid-lime) |
| `heat.hot` | Peaking / high | `#FF2D95` (hot pink) |
| `heat.track` | Meter track | `#2A3142` |

Mapping guidance: normalize a momentum score `0…1` → cool → volt → hot gradient along the track; marker dot at current position.

## Typography

| Role | Intended face | Fallback |
|------|---------------|----------|
| Display / punchy headlines | Space Grotesk | `.system(design: .rounded)` or SF Pro Rounded |
| Body | Space Grotesk / SF Pro | `.body` system |
| Data (heat scores, tags, mono meta) | JetBrains Mono | `.system(.caption, design: .monospaced)` |

## Spacing & radius (starter)

| Token | Value |
|-------|-------|
| `space.xs` | 4 |
| `space.sm` | 8 |
| `space.md` | 16 |
| `space.lg` | 24 |
| `radius.card` | 16 |
| `radius.pill` | 999 |

## Motion

- Heat marker: short ease-in-out when score updates.
- Prefer reduced-motion: static marker, no gradient shimmer.

## Implementation

Swift stubs: `App/DesignSystem/` (`TrendyColors`, `TrendyTypography`) and `Features/Home/HeatMeter.swift`. Keep hex sources of truth here until an asset catalog ships.
