"""
Generate App Store iPhone 6.7" marketing screenshots from raw device captures.

Pipeline (per screenshot):
  1.  Read raw JPG from ~/Downloads/Sudoku-Evolved-Screenshots.zip
  2.  Build a 1290×2796 canvas with a navy radial gradient + faint Logic
      Garden grid texture + warm gold halo behind the phone
  3.  Render the brand caption block at the top (eyebrow + gold serif headline)
  4.  Composite the source screenshot into a CSS-style iPhone bezel
      (mirrors web/src/components/ui/PhoneMockup.tsx visual language)
  5.  Save as PNG to assets/app-store-screenshots/<NN-slug>.png

Output is App-Store-ready: 1290×2796 PNG, sRGB, no alpha. Apple's iPhone 6.7"
slot. Filenames are numbered for deterministic gallery ordering.

Usage:
  cd /Users/markkelly/PersonalProjects/SudokuEvolved
  python3 scripts/generate-app-store-screenshots.py
"""

from __future__ import annotations

import io
import math
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─── Paths ──────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = Path.home() / 'Downloads' / 'Sudoku-Evolved-Screenshots.zip'
OUT_DIR = ROOT / 'assets' / 'app-store-screenshots'

# ─── Apple spec ─────────────────────────────────────────────────────────────
CANVAS_W, CANVAS_H = 1290, 2796  # iPhone 6.7" slot

# ─── Brand tokens (mirror src/theme/colors.ts) ──────────────────────────────
NAVY = (11, 18, 32)            # #0B1220
NAVY_DEEP = (5, 9, 18)         # #050912
NAVY_GRADIENT_TOP = (14, 22, 40)  # #0E1628
GOLD = (224, 185, 106)         # #E0B96A
GOLD_GLOW = (245, 213, 138)    # #F5D58A
GOLD_DIM = (156, 126, 64)      # #9C7E40
TEXT = (236, 239, 247)         # #ECEFF7
TEXT_MUTED = (136, 146, 171)   # #8892AB

# ─── Fonts (macOS system) ───────────────────────────────────────────────────
GEORGIA_BOLD = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
HELVETICA_BOLD = '/System/Library/Fonts/Helvetica.ttc'

# ─── Per-screen content ─────────────────────────────────────────────────────
SCREENSHOTS = [
    # (zip filename slug, output slug, marketing caption)
    ('Main-Menu',          'main-menu',          'Pure logic. Cinematic feel.'),
    ('Saga-Map',           'saga-map',           'Where reason blooms.'),
    ('Time-Trial',         'time-trial',         'Race the clock.'),
    ('Leaderboard',        'leaderboard',        'Cleanest solve wins.'),
    ('Profile',            'profile',            'Stars, crowns, and your saga.'),
    ('Leaderboard-Global', 'leaderboard-global', 'Climb the global board.'),
    ('Login',              'login',              'Sign in. Climb the board.'),
]


# ─── Helpers ────────────────────────────────────────────────────────────────

def build_backdrop() -> Image.Image:
    """Navy radial gradient + faint Logic Garden grid + warm gold halo."""
    canvas = Image.new('RGB', (CANVAS_W, CANVAS_H), NAVY_DEEP)
    px = canvas.load()
    cx, cy = CANVAS_W / 2, CANVAS_H / 2 - 200  # halo slightly above center
    max_d = math.hypot(CANVAS_W, CANVAS_H) / 2

    for y in range(CANVAS_H):
        for x in range(CANVAS_W):
            d = math.hypot(x - cx, y - cy) / max_d
            d = min(1.0, max(0.0, d))
            # Lerp center NAVY_GRADIENT_TOP -> edges NAVY_DEEP
            r = round(NAVY_GRADIENT_TOP[0] * (1 - d) + NAVY_DEEP[0] * d)
            g = round(NAVY_GRADIENT_TOP[1] * (1 - d) + NAVY_DEEP[1] * d)
            b = round(NAVY_GRADIENT_TOP[2] * (1 - d) + NAVY_DEEP[2] * d)
            px[x, y] = (r, g, b)

    # Faint grid lines at 3% opacity in muted gold (mirrors website's logic-grid-bg)
    grid = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = 90  # px between grid lines
    grid_alpha = 14
    for x in range(0, CANVAS_W + 1, step):
        gd.line([(x, 0), (x, CANVAS_H)], fill=(*GOLD_DIM, grid_alpha), width=1)
    for y in range(0, CANVAS_H + 1, step):
        gd.line([(0, y), (CANVAS_W, y)], fill=(*GOLD_DIM, grid_alpha), width=1)
    canvas.paste(grid, (0, 0), grid)

    # Warm halo behind where the phone will sit
    halo = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    halo_cx, halo_cy = CANVAS_W // 2, 1700
    halo_r = 700
    # Soft circle drawn then blurred
    hd.ellipse(
        (halo_cx - halo_r, halo_cy - halo_r, halo_cx + halo_r, halo_cy + halo_r),
        fill=(*GOLD_GLOW, 22),
    )
    halo = halo.filter(ImageFilter.GaussianBlur(radius=140))
    canvas.paste(halo, (0, 0), halo)

    return canvas


def draw_caption(canvas: Image.Image, headline: str) -> None:
    """Top section: eyebrow ('SUDOKU EVOLVED') + gold serif headline.

    Visual proportions match the website hero — small uppercase muted eyebrow
    with letter-spacing, then a large Georgia bold headline in accent gold
    with a soft glow underlay (mimics the website's text-shadow).
    """
    draw = ImageDraw.Draw(canvas)

    # Eyebrow: uppercase, letter-spaced, muted
    eyebrow_text = 'SUDOKU EVOLVED'
    eyebrow_size = 38
    eyebrow_font = ImageFont.truetype(HELVETICA_BOLD, eyebrow_size)
    # Approx letter-spacing 12px between glyphs
    spaced = ' '.join(list(eyebrow_text))
    bbox = draw.textbbox((0, 0), spaced, font=eyebrow_font)
    tw = bbox[2] - bbox[0]
    eyebrow_y = 240
    draw.text(
        ((CANVAS_W - tw) / 2 - bbox[0], eyebrow_y),
        spaced,
        font=eyebrow_font,
        fill=TEXT_MUTED,
    )

    # Headline: gold Georgia bold, with glow
    headline_size = 84
    headline_font = ImageFont.truetype(GEORGIA_BOLD, headline_size)
    bbox = draw.textbbox((0, 0), headline, font=headline_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    headline_y = eyebrow_y + 90
    headline_x = (CANVAS_W - tw) / 2 - bbox[0]

    # Glow layer: render gold-glow text on a transparent canvas, blur it,
    # composite under the crisp headline
    glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.text((headline_x, headline_y), headline, font=headline_font, fill=(*GOLD_GLOW, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=14))
    canvas.paste(glow, (0, 0), glow)

    # Crisp headline on top
    draw.text((headline_x, headline_y), headline, font=headline_font, fill=GOLD)


def build_phone(source: Image.Image, target_h: int = 2080) -> Image.Image:
    """Compose the source screenshot inside an iPhone bezel.

    Mirrors web/src/components/ui/PhoneMockup.tsx:
      - Outer bezel: navy gradient, large rounded corners
      - 25px inner padding (the bezel "frame")
      - Inner screen: navy fill, smaller rounded corners
      - Source screenshot composited into the screen viewport (cropped to fit)
      - Dynamic island pill at top
      - Gold edge sheen overlay
      - Soft drop shadow underneath

    Source aspect (1320:2558 = 0.516) is preserved by sizing target_h and
    deriving width.
    """
    # Phone outer dimensions — derived from target_h and source aspect ratio
    src_aspect = source.width / source.height
    bezel_pad = 22
    phone_h = target_h
    inner_h = phone_h - 2 * bezel_pad
    inner_w = round(inner_h * src_aspect)
    phone_w = inner_w + 2 * bezel_pad

    outer_radius = 130
    inner_radius = 110

    # ── 1. Drop shadow (blurred dark ellipse below the phone) ──────────────
    shadow_pad = 80
    shadow = Image.new('RGBA', (phone_w + 2 * shadow_pad, phone_h + 2 * shadow_pad), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (shadow_pad, shadow_pad, shadow_pad + phone_w, shadow_pad + phone_h),
        radius=outer_radius,
        fill=(0, 0, 0, 180),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=50))

    # ── 2. Bezel: navy gradient with rounded corners ───────────────────────
    bezel = Image.new('RGBA', (phone_w, phone_h), (0, 0, 0, 0))
    bezel_grad_strip = Image.new('RGB', (1, phone_h))
    # Top #1a2440 -> middle #0f1727 -> bottom #080d18 (matches PhoneMockup)
    top, mid, bot = (26, 36, 64), (15, 23, 39), (8, 13, 24)
    for y in range(phone_h):
        t = y / max(1, phone_h - 1)
        if t < 0.5:
            tt = t * 2
            r = round(top[0] * (1 - tt) + mid[0] * tt)
            g = round(top[1] * (1 - tt) + mid[1] * tt)
            b = round(top[2] * (1 - tt) + mid[2] * tt)
        else:
            tt = (t - 0.5) * 2
            r = round(mid[0] * (1 - tt) + bot[0] * tt)
            g = round(mid[1] * (1 - tt) + bot[1] * tt)
            b = round(mid[2] * (1 - tt) + bot[2] * tt)
        bezel_grad_strip.putpixel((0, y), (r, g, b))
    bezel_fill = bezel_grad_strip.resize((phone_w, phone_h)).convert('RGBA')

    bezel_mask = Image.new('L', (phone_w, phone_h), 0)
    bm_draw = ImageDraw.Draw(bezel_mask)
    bm_draw.rounded_rectangle((0, 0, phone_w - 1, phone_h - 1), radius=outer_radius, fill=255)
    bezel.paste(bezel_fill, (0, 0), bezel_mask)

    # Hairline border on bezel (rgba(255,255,255,0.08))
    bd = ImageDraw.Draw(bezel)
    bd.rounded_rectangle(
        (0, 0, phone_w - 1, phone_h - 1),
        radius=outer_radius,
        outline=(255, 255, 255, 20),
        width=2,
    )

    # ── 3. Inner screen with the source screenshot ─────────────────────────
    screen = Image.new('RGB', (inner_w, inner_h), NAVY)
    # Crop source to match the inner screen aspect, then resize
    src_target_w = inner_w
    src_target_h = round(src_target_w / src_aspect)
    if src_target_h < inner_h:
        # source narrower-than-needed: scale up by height
        src_target_h = inner_h
        src_target_w = round(src_target_h * src_aspect)
    src_resized = source.resize((src_target_w, src_target_h), Image.LANCZOS)
    # Center-crop into the inner screen rect
    cx = (src_target_w - inner_w) // 2
    cy = (src_target_h - inner_h) // 2
    src_cropped = src_resized.crop((cx, cy, cx + inner_w, cy + inner_h))
    screen.paste(src_cropped, (0, 0))

    # Round inner-screen corners via mask
    screen_rgba = screen.convert('RGBA')
    screen_mask = Image.new('L', (inner_w, inner_h), 0)
    sm = ImageDraw.Draw(screen_mask)
    sm.rounded_rectangle((0, 0, inner_w - 1, inner_h - 1), radius=inner_radius, fill=255)
    screen_clipped = Image.new('RGBA', (inner_w, inner_h), (0, 0, 0, 0))
    screen_clipped.paste(screen_rgba, (0, 0), screen_mask)

    bezel.paste(screen_clipped, (bezel_pad, bezel_pad), screen_clipped)

    # ── 4. Dynamic Island pill — black, centered at top of inner screen ──
    di_w = round(inner_w * 0.27)
    di_h = round(di_w * 0.265)
    di_x = (phone_w - di_w) // 2
    di_y = bezel_pad + 32
    di_draw = ImageDraw.Draw(bezel)
    di_draw.rounded_rectangle(
        (di_x, di_y, di_x + di_w, di_y + di_h),
        radius=di_h // 2,
        fill=(0, 0, 0, 255),
    )

    # ── 5. Gold edge sheen (top-left highlight, bottom-right rim) ──────────
    sheen = Image.new('RGBA', (phone_w, phone_h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    sd.rounded_rectangle((0, 0, phone_w - 1, phone_h - 1), radius=outer_radius,
                         outline=(*GOLD_GLOW, 35), width=3)
    bezel.paste(sheen, (0, 0), sheen)

    # ── 6. Compose shadow + phone ──────────────────────────────────────────
    out = Image.new('RGBA', shadow.size, (0, 0, 0, 0))
    out.paste(shadow, (0, 0), shadow)
    out.paste(bezel, (shadow_pad, shadow_pad), bezel)
    return out


def render_screenshot(zip_obj: zipfile.ZipFile, slug: str, caption: str, idx: int) -> Path:
    src_data = zip_obj.read(f'Sudoku-Evolved-{slug}.jpg')
    source = Image.open(io.BytesIO(src_data)).convert('RGB')

    canvas = build_backdrop()
    draw_caption(canvas, caption)

    phone = build_phone(source, target_h=2030)
    px = (CANVAS_W - phone.width) // 2
    py = 720
    canvas.paste(phone.convert('RGBA'), (px, py), phone)

    out_slug = slug.lower().replace('--', '-')
    out_path = OUT_DIR / f'{idx:02d}-{out_slug}.png'
    canvas.save(out_path, format='PNG', optimize=True)
    return out_path


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not ZIP_PATH.exists():
        raise SystemExit(f'Zip not found: {ZIP_PATH}')

    print(f'Reading source from: {ZIP_PATH}')
    print(f'Writing outputs to:  {OUT_DIR}')
    print()

    with zipfile.ZipFile(ZIP_PATH) as z:
        for i, (zip_slug, _, caption) in enumerate(SCREENSHOTS, start=1):
            out = render_screenshot(z, zip_slug, caption, i)
            print(f'  [{i}/{len(SCREENSHOTS)}] {zip_slug:22s} -> {out.name}')

    print()
    print(f'✓ Generated {len(SCREENSHOTS)} App Store screenshots at 1290×2796.')


if __name__ == '__main__':
    main()
