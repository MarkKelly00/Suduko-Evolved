#!/usr/bin/env node
/**
 * Generate high-fidelity World 1 (Logic Garden) landmark VFX sprites via xAI
 * Grok Imagine — the botanical counterpart to scripts/generate-world2-vfx.mjs.
 *
 * Same pipeline: each sprite is generated on PURE BLACK, then post-processed to
 * bake a luminance→alpha channel (near-black → transparent, glow → opaque), so
 * the transparent PNG composites cleanly over the Logic Garden map with normal
 * alpha blending.
 *
 * Style: botanical / garden, in the Logic Garden palette (teal, green, gold) —
 * NOT cosmic. Keeps World 1's identity while matching World 2's fidelity.
 *
 * Usage:
 *   XAI_API_KEY=xai-... node scripts/generate-world1-vfx.mjs
 *   ... --id seed_gate        generate one
 *   ... --skip-existing       skip sprites already on disk
 *   ... --reprocess           re-bake alpha on the on-disk PNGs (no API calls)
 *   ... --dry-run             print prompts only
 *
 * API: POST https://api.x.ai/v1/images/generations
 *   model=grok-imagine-image-quality, aspect_ratio=1:1, resolution=2k,
 *   response_format=b64_json → decoded → sharp resize 512×512 + value→alpha →
 *   assets/map/world1/<id>.png
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets', 'map', 'world1');
const OUT_PX = 512;

async function toGlowPng(input, outPath) {
  const { data, info } = await sharp(input)
    .resize(OUT_PX, OUT_PX, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.max(data[i], data[i + 1], data[i + 2]); // HSV value
    data[i + 3] = v <= 10 ? 0 : Math.round(255 * Math.pow(v / 255, 0.7));
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

const SHARED = `Generate a single 2k square image: a premium, high-fidelity painterly illustration of ONE glowing botanical object for a meditative Sudoku puzzle game's "Logic Garden" — a serene night garden of light.

BACKGROUND (CRITICAL): pure solid black #000000 filling the ENTIRE canvas. NO background detail, NO stars, NO sky, NO ground, NO horizon, NO scenery, NO grid. ONLY the single glowing object on pure black, so it can be additively composited.

COMPOSITION: the object is PERFECTLY CENTERED and occupies ~70% of the canvas with even margins. Luminous and ethereal with soft volumetric glow and bloom, smooth gradients, crisp fine detail, gentle inner light, like bioluminescent flora at night.

PALETTE: teal #5EE7C4, garden green #5BD6A8, bright cyan #00E5CC, warm gold #E0B96A and #F5D58A. Calm, premium, organic.

HARD CONSTRAINTS: NO text, NO numerals, NO captions, NO watermark, NO logo, NO UI, NO border, NO frame, NO checkerboard, NO transparency pattern. NOT a photo, NOT a 3D render, NOT cartoon, NOT cyberpunk, NO circuit boards, NO sci-fi. Elegant Studio-Ghibli-meets-sacred-botanical concept art.

OBJECT: `;

const TILES = {
  seed_gate: `A luminous botanical gateway — two slender arching pillars woven from intertwined glowing vines and leaves, meeting in a soft arch, with a single bright sprouting seedling glowing warm-gold at the center of the opening. The threshold of the garden.`,
  glass_sprout_bridge: `A delicate glowing footbridge of translucent glass and crystal arcing gently across, young green sprouts and curling tendrils growing along its rails, soft gold highlights. Fragile, luminous, serene.`,
  crystal_logic_fountain: `A glowing crystalline fountain — concentric rippling rings of teal-cyan light radiating outward from a faceted central crystal, a single luminous droplet rising above the center. Calm, symmetric, teal and gold.`,
  moonvine_crossing: `Two luminous flowering vines crossing in an elegant X, a soft glowing crescent moon behind the crossing point, with a few small five-petal blossoms along the vines. Teal, silver-green and gold, tranquil.`,
  golden_ratio_grove: `A glowing golden Fibonacci spiral formed of curling leaves and vine tendrils, unfurling gracefully from a single bright seed at the center. Elegant botanical sacred geometry, warm gold with green accents.`,
  oracle_bloom: `A radiant sacred flower in full bloom — a many-petaled lotus/sunflower viewed straight-on, glowing teal-and-gold petals radiating symmetrically from a luminous golden core. Oracular, premium, balanced.`,
  logic_garden_temple: `A glowing garden temple — elegant slender columns and a gentle peaked roof entwined with flowering vines and leaves, a blooming flower-crown glowing above the roof, soft teal-green-gold light radiating outward. The grand, sacred culmination of the Logic Garden.`,
};

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const arg = (n, f) => {
  const i = args.indexOf(n);
  return i === -1 ? f : (args[i + 1] ?? f);
};
const apiKey = process.env.XAI_API_KEY;
const onlyId = arg('--id', null);
const skipExisting = flag('--skip-existing');
const reprocess = flag('--reprocess');
const dryRun = flag('--dry-run');
const concurrency = Math.max(1, Math.min(7, parseInt(arg('--concurrency', '4'), 10) || 4));

const allIds = Object.keys(TILES);
const targets = onlyId ? [onlyId] : allIds;
if (onlyId && !allIds.includes(onlyId)) {
  console.error(`✗ Unknown id "${onlyId}". Available: ${allIds.join(', ')}`);
  process.exit(1);
}
if (!apiKey && !dryRun && !reprocess) {
  console.error('✗ XAI_API_KEY not set.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
console.log(`xAI Grok Imagine — World 1 (Logic Garden) VFX sprites: ${targets.length} (concurrency ${concurrency})`);
console.log(`  output: ${path.relative(repoRoot, outDir)}/ @ ${OUT_PX}px`);

async function generateOne(id) {
  const outPath = path.join(outDir, `${id}.png`);
  if (skipExisting && existsSync(outPath)) {
    console.log(`  ⊘ ${id} — skipped`);
    return;
  }
  if (reprocess) {
    if (!existsSync(outPath)) throw new Error(`no existing file: ${path.relative(repoRoot, outPath)}`);
    await toGlowPng(outPath, outPath + '.tmp');
    const fs = await import('node:fs');
    fs.renameSync(outPath + '.tmp', outPath);
    console.log(`  ✓ ${id} (alpha re-baked)`);
    return;
  }
  const prompt = SHARED + TILES[id];
  if (dryRun) {
    console.log(`  → ${id}\n${prompt.split('\n').map((l) => '      ' + l).join('\n')}`);
    return;
  }
  const startedAt = Date.now();
  const res = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'grok-imagine-image-quality',
      prompt,
      n: 1,
      aspect_ratio: '1:1',
      resolution: '2k',
      response_format: 'b64_json',
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image: ${JSON.stringify(json).slice(0, 300)}`);
  await toGlowPng(Buffer.from(b64, 'base64'), outPath);
  console.log(`  ✓ ${id} (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
}

const queue = [...targets];
const errors = [];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const id = queue.shift();
      if (!id) return;
      try {
        await generateOne(id);
      } catch (err) {
        console.error(`  ✗ ${id}: ${err.message}`);
        errors.push(id);
      }
    }
  }),
);
console.log(errors.length ? `Done with ${errors.length} failures: ${errors.join(', ')}` : 'Done — all sprites generated.');
if (errors.length) process.exit(1);
