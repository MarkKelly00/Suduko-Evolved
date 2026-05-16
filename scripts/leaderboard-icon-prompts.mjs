/**
 * Per-leaderboard Grok Imagine prompts.
 *
 * Mirror of `achievement-icon-prompts.mjs` for the 6 Game Center
 * leaderboards declared in `src/services/gameCenter/gameCenterIds.ts`.
 * Each prompt is self-contained (no shared context across API calls) so
 * the chrome + tier rules are inlined into every leaderboard's prompt
 * via the same `shared(tier)` helper.
 *
 * Tier color choices match the achievement set so the Game Center modal
 * feels like one product:
 *   - Sprint 3-Minute Score  → silver (cool, time-bounded)
 *   - Fastest Sprint Clear   → gold (best-time, premium)
 *   - Duel Wins              → gold (accumulated victories)
 *   - Best Duel Score        → obsidian (apex / record-best)
 *   - Logic Garden Stars     → silver (matches Star Collector achievement)
 *   - Logic Garden Crowns    → gold (matches Crowned Logic achievement)
 *
 * Visual constraint: the central glyph occupies 60–65% of canvas with
 * 17–20% margin on all sides so it survives App Store Connect's
 * circular crop in the Game Center modal.
 */

const TIERS = {
  silver: {
    primary: '#C8D4D6',
    shadow: '#7B8A8E',
    highlight: '#E8EEEF',
    haloHex: '#5EE7C4',
    haloOpacity: 18,
  },
  gold: {
    primary: '#E0B96A',
    shadow: '#9C7E40',
    highlight: '#F5D58A',
    haloHex: '#E0B96A',
    haloOpacity: 26,
  },
  obsidian: {
    primary: '#E0B96A',
    shadow: '#3A2A0E',
    highlight: '#F5D58A',
    haloHex: '#58F2B6',
    haloOpacity: 14,
  },
};

const TILE_BG = '#121A2A';

function shared(tier) {
  const t = TIERS[tier];
  return `Generate a single 1024x1024 square image for a premium iOS Sudoku puzzle app called "Sudoku Evolved" with a meditative botanical "Logic Garden" theme. This is one Game Center LEADERBOARD icon — visually cohesive with the same app's achievement icon set (botanical, painted, dark navy with tier-colored glow).

BACKGROUND: a perfectly flat solid dark navy color ${TILE_BG} filling the ENTIRE canvas edge-to-edge. The whole image is one uniform navy plate. NO rounded corners. NO border. NO frame. NO inner shadow. NO tile chrome. NO sudoku-grid corner marks. NO watermarks.

HALO: a soft radial halo in ${t.haloHex} at ${t.haloOpacity}% opacity, centered behind the glyph, extending to ~70% of canvas width, fading smoothly to the navy background. Atmospheric, never harsh.

POSITIONING (CRITICAL — ENFORCE THIS): the central glyph occupies EXACTLY 60-65% of the canvas. PERFECTLY CENTERED both horizontally and vertically. EQUAL margins of approximately 17-20% on all four sides. The geometric center of the glyph MUST sit at the geometric center of the canvas. This icon will be displayed in a CIRCULAR CROP by Game Center, so the glyph must read cleanly when the corners are clipped to a circle.

GLYPH STYLE: luminous painted illustration. Soft specular highlights along the top, gentle ambient shadow at the bottom, smooth color gradients. A subtle inner glow matching the halo color. NO hard outlines on the glyph — definition comes from light and shadow. NOT brushed metal, NOT 3D render, NOT cartoon, NOT cyberpunk.

GLYPH COLOR: ${t.primary} as the base, ${t.shadow} as the shadow, ${t.highlight} as the highlight. The glyph is rendered in these colors only.

HARD CONSTRAINTS:
- NO text or captions anywhere in the image (the ONLY allowed text is short numerals explicitly listed in the glyph spec below, like "3:00").
- NO scenery, no environment, no characters outside the glyph itself.
- NO fantasy-RPG iconography — no swords (except botanical sword-stems with lotus-bud hilts where explicitly described), no dragons, no skulls, no hooded figures, no scythes, no occult symbols.
- NO snakes, no anvils, no hammers, no gears, no industrial machinery.
- NO cyberpunk, no circuit boards, no holograms.
- The glyph must have a strong silhouette — recognizable from outline alone at 64x64 px after downscaling.

REFERENCE AESTHETIC: Apple Watch fitness rings × Studio Ghibli botanical illustration × Headspace meditation app icons. Premium, dark-elegant, meditative, mathematical beauty.

CENTRAL GLYPH (this is what the leaderboard represents):
`;
}

const LEADERBOARDS = {
  sprint_3min_score: {
    tier: 'silver',
    glyph: `A clean stylized analog clock face viewed straight-on, with the numerals "3:00" displayed prominently in the center of the dial in a darker silver tone. The clock face is a perfect circle with subtle minute markers around the edge. A small upward-pointing chevron arrow (↑) floats just above the clock face, suggesting "score rises." Symbolizes the 3-Minute Sprint high-score leaderboard.`,
  },

  sprint_fastest_clear: {
    tier: 'gold',
    glyph: `An elegant hourglass viewed straight-on, with sand actively flowing through the narrow middle (motion implied — the sand stream is visible as a thin diagonal line). The hourglass frame is slender and ornate. Two delicate vines curl up the outer sides of the hourglass frame, each with a small leaf. Symbolizes the fastest Sprint completion time leaderboard.`,
  },

  duel_wins: {
    tier: 'gold',
    glyph: `Two stylized sword-stems crossed in an X formation. CRITICAL: these are NOT metal weapons — each "sword" is a slender BOTANICAL PLANT STEM with a closed lotus bud as the hilt. The "blades" are smooth slender plant stems. A partial laurel wreath rises from below, framing the bottom half of the crossed stems (not enclosing them fully — open at the top). Symbolizes accumulated duel victories.`,
  },

  duel_best_score: {
    tier: 'obsidian',
    glyph: `A large ornate three-point crown viewed straight-on, with fine filigree detail. Directly beneath the crown, centered, a single faceted diamond/jewel shape (kite/lozenge silhouette, four facets visible) glows with inner light. The crown floats just above the jewel. Symbolizes the all-time best single-duel score — the apex leaderboard.`,
  },

  logic_garden_stars: {
    tier: 'silver',
    glyph: `Seven five-point stars arranged in an upward-rising arc — like a rainbow pattern with stars instead of color bands. The arc rises from lower-left to upper-right and back down to lower-right, with the tallest star at the apex. Each star is slightly different in size (the central apex star is largest). Symbolizes accumulated stars across the campaign.`,
  },

  logic_garden_crowns: {
    tier: 'gold',
    glyph: `A single ornate three-point crown viewed straight-on, filigreed and detailed, floating above a horizontal row of THREE small five-petal blooms (the blooms form a slim botanical band beneath the crown, suggesting accumulated crowns earned across the garden). The crown is the focal element; the blooms are smaller decorative supporting elements. Symbolizes total campaign crowns earned.`,
  },
};

export function getPrompt(id) {
  const lb = LEADERBOARDS[id];
  if (!lb) throw new Error(`No prompt defined for "${id}"`);
  return shared(lb.tier) + lb.glyph;
}

export function listIds() {
  return Object.keys(LEADERBOARDS);
}

export function tierOf(id) {
  return LEADERBOARDS[id]?.tier ?? null;
}
