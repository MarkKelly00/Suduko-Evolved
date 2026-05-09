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
    eyebrow_y = 200
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


def _diagonal_sheen(width: int, height: int) -> Image.Image:
    """Diagonal gold edge sheen — port of the website's PhoneMockup overlay.

    Website CSS (web/src/components/ui/PhoneMockup.tsx):
      background: linear-gradient(135deg,
        rgba(245,213,138,0.18) 0%, transparent 30%,
        transparent 70%, rgba(245,213,138,0.08) 100%);
      mask-image: linear-gradient(135deg,
        black 0%, transparent 30%, transparent 70%, black 100%);

    Rendered as a low-res RGBA layer (1/8 scale) and upsampled — fast
    enough for a one-shot script and the gradient is smooth so the
    upscale is visually lossless.
    """
    sw, sh = max(8, width // 8), max(8, height // 8)
    layer = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    px = layer.load()
    for y in range(sh):
        for x in range(sw):
            t = (x / max(1, sw - 1) + y / max(1, sh - 1)) / 2
            if t <= 0.3:
                mask_alpha = 1.0 - (t / 0.3)
            elif t >= 0.7:
                mask_alpha = (t - 0.7) / 0.3
            else:
                mask_alpha = 0.0
            if t <= 0.3:
                color_alpha = 0.18 * (1.0 - t / 0.3)
            elif t >= 0.7:
                color_alpha = 0.08 * ((t - 0.7) / 0.3)
            else:
                color_alpha = 0.0
            final_alpha = round(mask_alpha * color_alpha * 255)
            if final_alpha > 0:
                px[x, y] = (*GOLD_GLOW, final_alpha)
    return layer.resize((width, height), Image.BICUBIC)


def build_phone(source: Image.Image, target_h: int = 2150) -> Image.Image:
    """Compose the source screenshot inside an iPhone bezel.

    Visual port of web/src/components/ui/PhoneMockup.tsx — the goal is for
    these App Store screenshots to feel of-a-piece with the website's hero:
      - Outer aspect tracks the SOURCE aspect (preserves content; the
        website uses a fixed 9:19.5 because its content is synthetic SVG)
      - Outer radius matches the website's 15% proportion (rounded-[3rem]
        on a 320px-wide phone = 48px = 15%) — at our ~1100px phone width
        that's ~165px
      - Inner radius is the website's 12% proportion adjusted slightly
        smaller (8%) so back-arrow chevrons that sit ~40-100px from the
        corner stay visible; on a real device iOS' display-corner masking
        would clip the same area.
      - 3-stop bezel gradient #1a2440 → #0f1727 → #080d18 (verbatim)
      - Inset top-edge highlight + dark inner stroke (mirrors the website's
        shadow-[inset_0_1px_0_rgba(255,255,255,0.08),
                inset_0_0_0_2px_rgba(0,0,0,0.4)])
      - Diagonal gold edge sheen via _diagonal_sheen()
      - Soft drop shadow
      - NO fake dynamic island — overlaying one would cover real screen
        content (Main Menu's XP pill renders in the safe area beside the
        OS DI cutout)
    """
    src_aspect = source.width / source.height
    phone_h = target_h
    # Padding tracks website's 10/320 = 3.1% of width
    inner_h_estimate = phone_h * 0.94
    inner_w_estimate = round(inner_h_estimate * src_aspect)
    bezel_pad = max(24, round(inner_w_estimate * 0.031))
    inner_h = phone_h - 2 * bezel_pad
    inner_w = round(inner_h * src_aspect)
    phone_w = inner_w + 2 * bezel_pad

    outer_radius = round(phone_w * 0.15)   # ~165px on ~1100px phone
    inner_radius = round(phone_w * 0.08)   # ~88px — clear of back arrows

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

    # Hairline border on bezel (matches `border border-[rgba(255,255,255,0.08)]`)
    bd = ImageDraw.Draw(bezel)
    bd.rounded_rectangle(
        (0, 0, phone_w - 1, phone_h - 1),
        radius=outer_radius,
        outline=(255, 255, 255, 20),
        width=2,
    )

    # Inset top-edge highlight strip (the website's
    # `inset 0 1px 0 rgba(255,255,255,0.08)` shadow). Drawn as a thin
    # rounded rectangle just inside the bezel edge.
    bd.rounded_rectangle(
        (3, 3, phone_w - 4, phone_h - 4),
        radius=outer_radius - 3,
        outline=(255, 255, 255, 22),
        width=1,
    )

    # Inset dark inner stroke (the website's `inset 0 0 0 2px rgba(0,0,0,0.4)`).
    # Sits just inside the bezel padding to suggest the screen well's depth.
    bd.rounded_rectangle(
        (bezel_pad - 3, bezel_pad - 3,
         phone_w - bezel_pad + 2, phone_h - bezel_pad + 2),
        radius=inner_radius + 3,
        outline=(0, 0, 0, 110),
        width=3,
    )

    # ── 3. Inner screen with the source screenshot ─────────────────────────
    # Resize source EXACTLY to the inner viewport (no cropping — preserves
    # back arrows, XP pills, etc.).
    src_resized = source.resize((inner_w, inner_h), Image.LANCZOS).convert('RGBA')
    screen_mask = Image.new('L', (inner_w, inner_h), 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle(
        (0, 0, inner_w - 1, inner_h - 1), radius=inner_radius, fill=255,
    )
    bezel.paste(src_resized, (bezel_pad, bezel_pad), screen_mask)

    # ── 4. Diagonal gold edge sheen ────────────────────────────────────────
    # Port of PhoneMockup's gradient + mask-image overlay (see _diagonal_sheen).
    sheen = _diagonal_sheen(phone_w, phone_h)
    # Clip the sheen to the bezel's rounded shape so it doesn't bleed outside
    sheen_clipped = Image.new('RGBA', (phone_w, phone_h), (0, 0, 0, 0))
    sheen_clipped.paste(sheen, (0, 0), bezel_mask)
    bezel = Image.alpha_composite(bezel, sheen_clipped)

    # ── 5. Compose shadow + phone ──────────────────────────────────────────
    out = Image.new('RGBA', shadow.size, (0, 0, 0, 0))
    out.paste(shadow, (0, 0), shadow)
    out.paste(bezel, (shadow_pad, shadow_pad), bezel)
    return out


def render_screenshot(zip_obj: zipfile.ZipFile, slug: str, caption: str, idx: int) -> Path:
    src_data = zip_obj.read(f'Sudoku-Evolved-{slug}.jpg')
    source = Image.open(io.BytesIO(src_data)).convert('RGB')

    canvas = build_backdrop()
    draw_caption(canvas, caption)

    # Phone target_h: tuned so the bottom of the bezel sits ~80-100px above
    # the canvas bottom edge. py=560 puts the top of the phone ~200px below
    # the headline baseline (tighter than the previous 720 → 720-560 = 160px
    # less white space between caption and phone, per user feedback).
    phone = build_phone(source, target_h=2120)
    px = (CANVAS_W - phone.width) // 2
    py = 560
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
