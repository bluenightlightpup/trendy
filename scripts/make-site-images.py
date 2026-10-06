#!/usr/bin/env python3
"""Generate website + PWA raster icons and the Open Graph card from the iOS app icon.

Source: App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
Needs Pillow (dev-only; not a runtime dependency):  python3 -m pip install pillow
Run from the repo root:  python3 scripts/make-site-images.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
SITE = ROOT / "site"
WEB_ICONS = ROOT / "web/icons"

BG = (11, 13, 18)
TEXT = (244, 246, 251)
MUTED = (154, 163, 181)
COOL = (45, 226, 230)
VOLT = (200, 241, 53)
HOT = (255, 45, 149)
CARD = (20, 24, 36)
BORDER = (35, 40, 54)

FONT_DIRS = [
    Path("/usr/share/fonts/truetype/sand-box/custom/Open Sauce Sans"),
    Path("/usr/share/fonts/truetype/dejavu"),
]


def font(names: list[str], size: int) -> ImageFont.FreeTypeFont:
    for d in FONT_DIRS:
        for n in names:
            p = d / n
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default(size)


def rounded(img: Image.Image, radius_ratio: float = 0.225) -> Image.Image:
    """iOS-style rounded square with transparent corners (supersampled mask)."""
    size = img.size[0]
    scale = 4
    mask = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1), radius=int(size * scale * radius_ratio), fill=255
    )
    mask = mask.resize((size, size), Image.LANCZOS)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def resized(img: Image.Image, px: int) -> Image.Image:
    return img.resize((px, px), Image.LANCZOS)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print(f"wrote {path.relative_to(ROOT)} {img.size[0]}x{img.size[1]}")


def og_card(icon: Image.Image) -> Image.Image:
    W, H = 1200, 630
    card = Image.new("RGB", (W, H), BG)
    # Soft brand glows (matches the app icon's corner glows).
    glow = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(glow)
    g.ellipse((780, -260, 1380, 340), fill=(70, 18, 52))
    g.ellipse((-220, 360, 380, 960), fill=(14, 60, 66))
    card = Image.blend(card, glow.filter(ImageFilter.GaussianBlur(120)), 0.9)
    d = ImageDraw.Draw(card)
    # Heat bar along the top.
    bar = Image.new("RGB", (W, 10))
    for x in range(W):
        t = x / (W - 1)
        a, b, u = (COOL, VOLT, t * 2) if t < 0.5 else (VOLT, HOT, (t - 0.5) * 2)
        col = tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3))
        ImageDraw.Draw(bar).line([(x, 0), (x, 9)], fill=col)
    card.paste(bar, (0, 0))

    ic = rounded(resized(icon, 300))
    card.paste(ic, (90, 165), ic)

    title = font(["OpenSauceSans-ExtraBold.ttf", "DejaVuSans-Bold.ttf"], 112)
    sub = font(["OpenSauceSans-SemiBold.ttf", "DejaVuSans-Bold.ttf"], 46)
    small = font(["OpenSauceSans-Medium.ttf", "DejaVuSans.ttf"], 30)
    x0 = 450
    d.text((x0, 150), "Trendy", font=title, fill=TEXT)
    d.text((x0, 290), "Decode slang, memes", font=sub, fill=TEXT)
    d.text((x0, 345), "& trends.", font=sub, fill=TEXT)

    # A chip: what does "67" mean?
    chip_text = "what does \u201c67\u201d mean?"
    tw = d.textlength(chip_text, font=small)
    cx, cy = x0, 430
    d.rounded_rectangle((cx, cy, cx + tw + 48, cy + 58), radius=29, fill=CARD, outline=COOL, width=2)
    d.text((cx + 24, cy + 11), chip_text, font=small, fill=COOL)
    d.text((x0, 520), "Web app \u00b7 CLI + MCP for AI agents \u00b7 iOS soon", font=small, fill=MUTED)
    return card


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    rnd = rounded(src)

    # Website
    save_png(resized(src, 180), SITE / "apple-touch-icon.png")  # iOS rounds it itself
    save_png(resized(rnd, 32), SITE / "favicon-32.png")
    resized(rnd, 48).save(SITE / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote site/favicon.ico 16/32/48")
    save_png(resized(rnd, 320), SITE / "images/trendy-icon.png")
    save_png(og_card(src), SITE / "og-image.png")

    # PWA (web/icons): rounded "any" icons + full-bleed maskable (ring sits inside the safe zone)
    save_png(resized(src, 180), WEB_ICONS / "apple-touch-icon.png")
    save_png(resized(rnd, 192), WEB_ICONS / "icon-192.png")
    save_png(resized(rnd, 512), WEB_ICONS / "icon-512.png")
    save_png(resized(src, 512), WEB_ICONS / "icon-maskable-512.png")


if __name__ == "__main__":
    main()
