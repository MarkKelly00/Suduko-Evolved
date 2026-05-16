#!/usr/bin/env node
/**
 * Downscale the 1024×1024 leaderboard PNGs in
 * assets/game-center-leaderboards/ to 256×256 in assets/leaderboards/.
 *
 * Mirrors `assets/achievements/` (the 256 in-app achievement set) so the
 * README + future in-app surfaces can reference a single small leaderboard
 * asset folder. Lanczos3 downscale preserves the painted illustration
 * style at the target size.
 *
 * Usage:
 *   node scripts/derive-leaderboard-256.mjs
 */

import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'assets', 'game-center-leaderboards');
const outDir = path.join(repoRoot, 'assets', 'leaderboards');

mkdirSync(outDir, { recursive: true });

const pngs = readdirSync(srcDir).filter((f) => f.endsWith('.png'));
console.log(`Deriving ${pngs.length} leaderboard icons at 256×256`);
console.log(`  source : ${path.relative(repoRoot, srcDir)}/`);
console.log(`  output : ${path.relative(repoRoot, outDir)}/`);

for (const f of pngs) {
  await sharp(path.join(srcDir, f))
    .resize(256, 256, { kernel: 'lanczos3', fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, f));
  console.log(`  ✓ ${f}`);
}

console.log(`\nDone — ${pngs.length} written to ${path.relative(repoRoot, outDir)}/`);
