#!/usr/bin/env python3
"""Generate the 1024x1024 iOS App Store icon (RGB, no alpha) with Pillow + numpy.

Design: deep-ink gradient background, a cyan → acid-lime → hot-pink heat ring (the PWA brand mark,
web/icons/icon.svg) with a hot-pink marker dot, and a bold geometric white "T".
Colors come from web/styles.css. Re-run: python3 scripts/make_app_icon.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
SIZE = 1024
SS = 2  # supersample for smooth edges
N = SIZE * SS

INK_BG = np.array([0x0B, 0x0D, 0x12], float)
INK_ELEVATED = np.array([0x1A, 0x1F, 0x2E], float)
TRACK = np.array([0x23, 0x28, 0x36], float)
COOL = np.array([0x2D, 0xE2, 0xE6], float)
VOLT = np.array([0xC8, 0xF1, 0x35], float)
HOT = np.array([0xFF, 0x2D, 0x95], float)
TEXT = (0xF4, 0xF6, 0xFB)


def heat(t):
    """t in [0,1] → cyan → lime → pink."""
    t = np.clip(t, 0, 1)[..., None]
    first = COOL + (VOLT - COOL) * np.clip(t * 2, 0, 1)
    second = VOLT + (HOT - VOLT) * np.clip(t * 2 - 1, 0, 1)
    return np.where(t < 0.5, first, second)


yy, xx = np.mgrid[0:N, 0:N].astype(float)
cx = cy = N / 2

# Background: diagonal ink gradient + soft pink / cyan glows.
diag = (xx + yy) / (2 * N)
img = INK_ELEVATED + (INK_BG - INK_ELEVATED) * diag[..., None]
for gx, gy, color, radius, strength in [
    (0.82, 0.18, HOT, 0.55, 0.22),
    (0.15, 0.88, COOL, 0.55, 0.16),
]:
    d = np.hypot(xx - gx * N, yy - gy * N) / (radius * N)
    w = np.clip(1 - d, 0, 1) ** 2 * strength
    img = img * (1 - w[..., None]) + color * w[..., None]

# Heat ring: track + gradient arc (clockwise from the top), like web/icons/icon.svg.
R = 0.33 * N
W = 0.072 * N
r = np.hypot(xx - cx, yy - cy)
ang = (np.degrees(np.arctan2(xx - cx, -(yy - cy))) + 360) % 360  # 0° at top, clockwise
ring = np.abs(r - R) <= W / 2
img[ring] = img[ring] * 0.35 + TRACK * 0.65

ARC = 300.0
arc = ring & (ang <= ARC)
img[arc] = heat(ang[arc] / ARC)

im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")
draw = ImageDraw.Draw(im)

# Round caps: start cap (cyan) at the top, end cap (pink) with the marker dot.
def polar(deg, radius):
    a = np.radians(deg)
    return cx + radius * np.sin(a), cy - radius * np.cos(a)

sx, sy = polar(0, R)
draw.ellipse([sx - W / 2, sy - W / 2, sx + W / 2, sy + W / 2], fill=tuple(COOL.astype(int)))
ex, ey = polar(ARC, R)
draw.ellipse([ex - W / 2, ey - W / 2, ex + W / 2, ey + W / 2], fill=tuple(HOT.astype(int)))

# Marker dot (white with an ink ring) sitting on the hot end, like the heat meter.
dot = W * 0.95
draw.ellipse([ex - dot / 2 - 0.018 * N, ey - dot / 2 - 0.018 * N, ex + dot / 2 + 0.018 * N, ey + dot / 2 + 0.018 * N], fill=tuple(INK_BG.astype(int)))
draw.ellipse([ex - dot / 2, ey - dot / 2, ex + dot / 2, ey + dot / 2], fill=TEXT)

# Bold geometric "T" (font-independent), with a soft shadow.
bar_w, bar_h = 0.30 * N, 0.075 * N
stem_w, stem_h = 0.095 * N, 0.25 * N
top = cy - 0.155 * N
rad = 0.03 * N
shadow = Image.new("L", (N, N), 0)
sd = ImageDraw.Draw(shadow)
off = 0.012 * N
for d, o in ((sd, off),):
    d.rounded_rectangle([cx - bar_w / 2, top + o, cx + bar_w / 2, top + bar_h + o], radius=rad, fill=150)
    d.rounded_rectangle([cx - stem_w / 2, top + bar_h * 0.5 + o, cx + stem_w / 2, top + bar_h + stem_h + o], radius=rad, fill=150)
shadow = shadow.filter(ImageFilter.GaussianBlur(0.02 * N))
im = Image.composite(Image.new("RGB", (N, N), (0, 0, 0)), im, shadow.point(lambda v: int(v * 0.6)))
draw = ImageDraw.Draw(im)
draw.rounded_rectangle([cx - bar_w / 2, top, cx + bar_w / 2, top + bar_h], radius=rad, fill=TEXT)
draw.rounded_rectangle([cx - stem_w / 2, top + bar_h * 0.5, cx + stem_w / 2, top + bar_h + stem_h], radius=rad, fill=TEXT)

im = im.resize((SIZE, SIZE), Image.LANCZOS).convert("RGB")
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} {im.size} mode={im.mode}")
