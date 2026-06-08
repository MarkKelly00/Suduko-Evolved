#!/usr/bin/env node
/**
 * Generate high-fidelity World 2 (Astral Nexus) landmark VFX sprites via xAI
 * Grok Imagine, to replace the basic procedural Skia shapes with premium art.
 *
 * Each sprite is generated on a PURE BLACK background, then post-processed to
 * bake a luminance→alpha channel (near-black → fully transparent, glow →
 * opaque). The resulting transparent PNG composites cleanly over the cosmic
 * starfield with normal alpha blending — each map layer is its OWN Skia
 * canvas, so cross-canvas additive blending isn't available; baking the alpha
 * into the asset is what makes the sprite cohesive with the map (no black box).
 *
 * Usage:
 *   XAI_API_KEY=xai-... node scripts/generate-world2-vfx.mjs
 *   ... --id astral_core      generate one
 *   ... --skip-existing       skip sprites already on disk
 *   ... --reprocess           re-bake alpha on the on-disk PNGs (no API calls)
 *   ... --dry-run             print prompts only
 *
 * API: POST https://api.x.ai/v1/images/generations
 *   model=grok-imagine-image-quality, aspect_ratio=1:1, resolution=2k,
 *   response_format=b64_json → decoded → sharp resize 512×512 + value→alpha →
 *   assets/map/world2/<id>.png
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets', 'map', 'world2');
const OUT_PX = 512;

/**
 * Resize to OUT_PX and bake a value→alpha channel: each pixel's alpha is its
 * HSV "value" (max of R/G/B), gamma-lifted so the glow stays solid, with
 * near-black forced fully transparent. Turns a glow-on-black render into a
 * transparent glow sprite that drops cleanly onto the starfield.
 */
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

const SHARED = `Generate a single 2k square image: a premium, high-fidelity painterly illustration of ONE glowing cosmic object for a meditative puzzle game's "Astral Nexus" world.

BACKGROUND (CRITICAL): pure solid black #000000 filling the ENTIRE canvas. NO background detail, NO stars, NO nebula, NO ground, NO horizon, NO scenery, NO grid. ONLY the single glowing object on pure black, so it can be additively composited.

COMPOSITION: the object is PERFECTLY CENTERED and occupies ~70% of the canvas with even margins. Luminous and ethereal with soft volumetric glow and bloom, smooth gradients, crisp fine detail, gentle inner light.

PALETTE: violet #9D7BFF, prism blue #7BA7F2, starlight cyan #5EE7C4, warm gold #E0B96A. Deep, premium, cosmic.

HARD CONSTRAINTS: NO text, NO numerals, NO captions, NO watermark, NO logo, NO UI, NO border, NO frame, NO checkerboard, NO transparency pattern. NOT a photo, NOT a 3D render, NOT cartoon, NOT cyberpunk, NO circuit boards. Elegant sacred-geometry concept art.

OBJECT: `;

const TILES = {
  nexus_gate: `A luminous circular portal gateway — two elegant slender curved pillars framing a glowing violet-to-cyan energy vortex, a single brilliant star at the exact center, and faint concentric ripple rings radiating outward. A mystical threshold.`,
  prism_bridge: `A radiant triangular glass prism floating at center; a bright beam of light enters one face and refracts out the other into a clean fan of violet, cyan and gold spectral rays. Crystalline, sharp, luminous.`,
  meridian_orrery: `An ornate celestial orrery — three concentric glowing golden orbital rings tilted at different angles around a bright central sun, with small luminous planet-nodes riding the rings. Intricate clockwork of the heavens, gold with cyan accents, radially balanced.`,
  starfall_archive: `A loose cluster of floating luminous crystalline tablets inscribed with faint glowing constellation glyphs, arranged like a celestial archive, violet and starlight-cyan, with a few soft drifting star-motes between them. Archival, mysterious.`,
  parallax_sanctum: `Layered concentric glowing rings offset in depth like ripples in space, forming a serene parallax tunnel toward a soft bright core. Violet and cyan, symmetric, meditative, sacred.`,
  logic_astrolabe: `An ornate glowing astrolabe — intricate interlocking orbital rings, finely etched arcs and a central reticle, suspended in space. Gold and cyan with violet accents. Precise, scientific, beautiful sacred geometry.`,
  astral_core: `A radiant star-engine core — a brilliant violet-gold orb of pure energy at the center emitting volumetric bloom, encircled by two thin tilted orbital rings carrying small orbiting light-nodes. The climactic, sacred heart of a cosmic machine. Powerful and luminous.`,
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
console.log(`xAI Grok Imagine — World 2 VFX sprites: ${targets.length} (concurrency ${concurrency})`);
console.log(`  output: ${path.relative(repoRoot, outDir)}/ @ ${OUT_PX}px`);

async function generateOne(id) {
  const outPath = path.join(outDir, `${id}.png`);
  if (skipExisting && existsSync(outPath)) {
    console.log(`  ⊘ ${id} — skipped`);
    return { id, skipped: true };
  }
  // Reprocess mode: re-bake alpha on the existing PNG, no API call.
  if (reprocess) {
    if (!existsSync(outPath)) {
      throw new Error(`no existing file to reprocess: ${path.relative(repoRoot, outPath)}`);
    }
    await toGlowPng(outPath, outPath + '.tmp');
    const fs = await import('node:fs');
    fs.renameSync(outPath + '.tmp', outPath);
    console.log(`  ✓ ${id} (alpha re-baked)`);
    return { id };
  }
  const prompt = SHARED + TILES[id];
  if (dryRun) {
    console.log(`  → ${id}\n${prompt.split('\n').map((l) => '      ' + l).join('\n')}`);
    return { id, dryRun: true };
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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image: ${JSON.stringify(json).slice(0, 300)}`);
  await toGlowPng(Buffer.from(b64, 'base64'), outPath);
  console.log(`  ✓ ${id} (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
  return { id };
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
