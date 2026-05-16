/**
 * Per-achievement Grok Imagine prompts.
 *
 * Each call to xAI's image generation API is independent — no shared context
 * across requests — so the prompt for every tile needs to include the
 * full visual spec. The TEMPLATE function below composes the shared chrome
 * + tier colour rules with each tile's specific glyph description.
 *
 * Edit the per-tile `glyph` strings in TILES to refine an individual icon
 * without touching the shared chrome. The `tier` field drives the colour
 * palette via TIERS.
 *
 * Key decision: the generated PNG contains ONLY the flat navy background
 * + glyph + halo. NO tile chrome (no rounded corners, no sudoku corner
 * marks, no inner shadow). The RN gallery card provides those, so double-
 * chrome is avoided and the PNG fills the card edge-to-edge.
 */

const TIERS = {
  bronze: {
    primary: '#A85B2A',
    shadow: '#8A4A22',
    highlight: '#D89A6A',
    haloHex: '#A85B2A',
    haloOpacity: 22,
  },
  silver: {
    // Moonvine platinum — cool, slight cyan undertone via the halo
    primary: '#C8D4D6',
    shadow: '#7B8A8E',
    highlight: '#E8EEEF',
    haloHex: '#5EE7C4',
    haloOpacity: 18,
  },
  gold: {
    // Brand-gold — the dominant brand colour (#E0B96A)
    primary: '#E0B96A',
    shadow: '#9C7E40',
    highlight: '#F5D58A',
    haloHex: '#E0B96A',
    haloOpacity: 26,
  },
  obsidian: {
    // Apex tier: glowing brand-gold inlay + bloom-green inner halo
    primary: '#E0B96A',
    shadow: '#3A2A0E',
    highlight: '#F5D58A',
    haloHex: '#58F2B6',
    haloOpacity: 14,
  },
};

const TILE_BG = '#121A2A'; // matches colors.surface in the app

function shared(tier) {
  const t = TIERS[tier];
  return `Generate a single 1024x1024 square image for a premium iOS Sudoku puzzle app called "Sudoku Evolved" with a meditative botanical "Logic Garden" theme. This is one achievement icon in a set of 20.

BACKGROUND: a perfectly flat solid dark navy color ${TILE_BG} filling the ENTIRE canvas edge-to-edge. The whole image is one uniform navy plate. NO rounded corners. NO border. NO frame. NO inner shadow. NO tile chrome of any kind. NO sudoku-grid corner marks. NO watermarks.

HALO: a soft radial halo in ${t.haloHex} at ${t.haloOpacity}% opacity, centered behind the glyph, extending to ~70% of canvas width, fading smoothly to the navy background. Atmospheric, never harsh.

POSITIONING (CRITICAL — ENFORCE THIS): the central glyph occupies EXACTLY 60-65% of the canvas. PERFECTLY CENTERED both horizontally and vertically. EQUAL margins of approximately 17-20% on all four sides (top, bottom, left, right). The geometric center of the glyph MUST sit at the geometric center of the canvas. Do not place the glyph above or below center.

GLYPH STYLE: luminous painted illustration. Soft specular highlights along the top, gentle ambient shadow at the bottom, smooth color gradients. A subtle inner glow matching the halo color. NO hard outlines on the glyph — definition comes from light and shadow. NOT brushed metal, NOT 3D render, NOT cartoon, NOT cyberpunk.

GLYPH COLOR: ${t.primary} as the base, ${t.shadow} as the shadow, ${t.highlight} as the highlight. The glyph is rendered in these colors only.

HARD CONSTRAINTS:
- NO text or captions anywhere in the image (the ONLY allowed text is short numerals explicitly listed in the glyph spec below, like "30", "60", "0/0").
- NO scenery, no environment, no characters outside the glyph itself.
- NO fantasy-RPG iconography — no swords (except botanical sword-stems with lotus-bud hilts where explicitly described), no dragons, no skulls, no hooded figures, no scythes, no occult symbols, no rune circles.
- NO snakes, no anvils, no hammers, no gears, no industrial machinery.
- NO cyberpunk, no circuit boards, no holograms.
- The glyph must have a strong silhouette — recognizable from outline alone at 64x64 px after downscaling.

REFERENCE AESTHETIC: Apple Watch fitness rings × Studio Ghibli botanical illustration × Headspace meditation app icons. Premium, dark-elegant, meditative, mathematical beauty.

CENTRAL GLYPH (this is what the icon represents):
`;
}

const TILES = {
  first_bloom: {
    tier: 'bronze',
    glyph: `A single closed lotus flower bud, upright, viewed from the side, just beginning to crack open at the very top — a tiny sliver of inner petal visible at the apex. Two small leaves curve out from the base of the bud. A short stem visible below. The bud is the only subject. Symbolizes the moment a player clears their first level.`,
  },

  perfect_bloom: {
    tier: 'bronze',
    glyph: `A fully-open lotus flower with 5-7 visible petals, viewed from above or at a slight elevated angle. A small simple three-point filigree crown floats gracefully just above the center of the bloom (about 10-15% of canvas height above the flower's center). The crown is the only metallic element above the bloom. Symbolizes earning a crown / perfect solve.`,
  },

  seed_grove_complete: {
    tier: 'silver',
    glyph: `Three young saplings of slightly different heights rising vertically from a thin horizontal soil line at the bottom of the central area. The middle sapling is the tallest. Each sapling has 2-3 pairs of small simple leaves. The three saplings stand side-by-side. The soil line is a single thin horizontal stroke. Symbolizes clearing the first biome.`,
  },

  moonvine_stream_complete: {
    tier: 'silver',
    glyph: `A waxing crescent moon (curve opening to the right) with two slender vines curling around it — one vine wraps around the outer (left) curve, another threads through the inner (right) curve. Three small five-petal flowers bloom along the vines. The crescent moon is the focal element, vines and flowers are secondary. Symbolizes the Moonvine Stream biome.`,
  },

  oracle_bloom_complete: {
    tier: 'gold',
    glyph: `A grand stylized sunflower viewed straight-on: a central round textured core with exactly 12 long thin tapered petals radiating outward like sunbeams, symmetrically spaced around the core. A smaller inner ring of decoration at the center. Symmetric, radial sunburst geometry. Symbolizes the Oracle Bloom Temple biome.`,
  },

  logic_garden_complete: {
    tier: 'gold',
    glyph: `A laurel wreath — two curved leafy branches meeting at the bottom, with leaves pointing inward and upward — surrounds a small 3x3 sudoku grid at the center. The grid has 9 cells in a 3x3 arrangement, each cell containing a tiny dot suggesting "filled." The laurel frames the grid; the grid is the focus inside. Symbolizes clearing all 30 levels of the Logic Garden.`,
  },

  star_collector: {
    tier: 'silver',
    glyph: `Three five-point stars arranged in a gentle upward-pointing arc. The largest star sits at the top center, two smaller stars flank below-left and below-right. The largest star has the numerals "30" inset cleanly in its center in a darker silver tone — bold, readable, sans-serif. Symbolizes earning 30 stars in the Logic Garden.`,
  },

  star_harmony: {
    tier: 'gold',
    glyph: `Six five-point stars arranged in a hexagonal pattern — three stars across the top, three across the bottom, forming a hexagon shape. At the exact geometric center of the hexagon, the numerals "60" appear in brand gold, bold and readable sans-serif. Symbolizes earning 60 stars.`,
  },

  perfect_constellation: {
    tier: 'obsidian',
    glyph: `Nine five-point stars arranged in a PERFECT 3x3 lattice — exactly 3 rows of exactly 3 stars each, forming a sudoku-grid constellation. The center star (position 5) is slightly larger than the others. Below the lattice, the numerals "90" appear in glowing brand gold, bold sans-serif. The stars glow against the deep navy background. Symbolizes earning all 90 stars — apex achievement.`,
  },

  crowned_logic: {
    tier: 'gold',
    glyph: `A small three-point crown floats above a 3x3 sudoku grid (9 cells arranged in 3 rows of 3 columns). One of the cells in the grid contains the numerals "10" in brand gold, readable. The crown sits centered above the grid, both elements aligned vertically. Symbolizes earning 10 crowns.`,
  },

  crown_garden: {
    tier: 'obsidian',
    glyph: `A large ornate three-point crown viewed straight-on, with fine filigree. Across the bottom third of the canvas, beneath the crown, a horizontal row of exactly five small five-petal blooms forms a botanical band. The crown's central jewel displays the numerals "30" in dark contrast against the glowing gold. Symbolizes earning all 30 crowns — apex achievement.`,
  },

  perfect_harmony: {
    tier: 'gold',
    glyph: `EXACTLY THREE identical circular bloom-rings overlapping in a perfect trefoil pattern — three circles arranged like a Venn diagram, with each circle being a stylized flower ring (petals around a central core). The three circles overlap in the center. CRITICAL: exactly THREE rings, not four, not a cluster. Symbolizes completing 3 sudoku regions in a single placement.`,
  },

  lightning_solve: {
    tier: 'silver',
    glyph: `A clean zigzag lightning bolt striking downward through a 3x3 sudoku grid silhouette (outline only, no fills). The bolt enters at the top of the grid and exits at the bottom. The lightning is the focal element, rendered in moonvine-platinum silver. The grid is a fainter background outline. Symbolizes clearing a 3-minute Sprint.`,
  },

  perfect_sprint: {
    tier: 'gold',
    glyph: `A clean zigzag lightning bolt striking downward through a 3x3 sudoku grid silhouette (same composition as lightning_solve but in brand gold). The numerals "0/0" appear in the bottom-right area of the canvas in brand gold, readable. The "0/0" means zero mistakes, zero hints. Symbolizes a perfect Sprint clear.`,
  },

  first_duel: {
    tier: 'bronze',
    glyph: `Two stylized sword-stems crossed in an X formation. CRITICAL: these are NOT metal weapons. Each "sword" is a slender BOTANICAL PLANT STEM with a closed lotus bud as the hilt (where the handle would be on a real sword). The "blades" are smooth slender plant stems, each with a single leaf along the length. Botanical, not martial. Symbolizes a first online duel.`,
  },

  logic_rival: {
    tier: 'silver',
    glyph: `A laurel wreath (two curved leafy branches meeting at the bottom, leaves pointing inward and upward) with a bold simple checkmark (✓) at its center. The checkmark is clean, graphic, easy to read. Symbolizes winning a first duel.`,
  },

  perfect_rivalry: {
    tier: 'gold',
    glyph: `A three-point crown floats above two crossed sword-stems with lotus-bud hilts (matching the design of first_duel — botanical plant-stem swords with lotus buds at the hilts, NOT metal weapons). The crown sits above the X-crossing point of the stems. All three elements rendered in brand gold. Symbolizes winning a duel with a crown.`,
  },

  friendly_challenge: {
    tier: 'silver',
    glyph: `Two identical circular petal-rings — each ring is a stylized flower with exactly 6-8 petals arranged around a central core. The two rings are INTERLOCKED like wedding bands or chain links, intersecting each other. Each ring is a flat circle of petals. Friendly, intertwined, romantic. Symbolizes challenging a friend.`,
  },

  no_hints_needed: {
    tier: 'silver',
    glyph: `A clean 3x3 sudoku grid silhouette (outline only, 9 cells in 3 rows of 3). At the top-right corner of the grid, a small lightbulb glyph appears with a diagonal "no" line crossing through it (the universal "no" or "prohibited" symbol). The crossed-out lightbulb means "no hints used." Symbolizes clearing without hints.`,
  },

  take_a_breath: {
    tier: 'bronze',
    glyph: `A single curved lanceolate leaf (willow-leaf shape, slim and pointed at both ends) floating diagonally across the center of the canvas. Behind the leaf, a soft pause-symbol — two short vertical bars side by side. A subtle radial calm-halo emanates from the pause symbol. Meditative, zen. Symbolizes pausing and returning to finish a level.`,
  },
};

export function getPrompt(id) {
  const tile = TILES[id];
  if (!tile) throw new Error(`No prompt defined for "${id}"`);
  return shared(tile.tier) + tile.glyph;
}

export function listIds() {
  return Object.keys(TILES);
}

export function tierOf(id) {
  return TILES[id]?.tier ?? null;
}
