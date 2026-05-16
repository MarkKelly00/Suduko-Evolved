#!/usr/bin/env node
/**
 * Produce 1024×1024 versions of the in-app achievement icons for upload
 * to App Store Connect's Game Center achievement configuration.
 *
 * App Store Connect rejects icons that aren't exactly 512×512 or
 * 1024×1024 pixels. The in-app PNGs at assets/achievements/ are 256×256
 * (optimized for RN rendering at 96 px in the gallery), so we upscale
 * to 1024 via sharp's lanczos3 kernel and write to a separate folder.
 *
 * The in-app 256 PNGs are NOT modified — this is a one-way export.
 *
 * Usage:
 *   node scripts/prepare-game-center-icons.mjs
 *   node scripts/prepare-game-center-icons.mjs --size 512   # if preferred
 *   node scripts/prepare-game-center-icons.mjs --id first_bloom
 *
 * Output: assets/game-center-achievements/<id>.png at the chosen size.
 */

import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { listIds } from './achievement-icon-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'assets', 'achievements');
const outDir = path.join(repoRoot, 'assets', 'game-center-achievements');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const onlyId = arg('--id', null);
const size = parseInt(arg('--size', '1024'), 10);

if (size !== 512 && size !== 1024) {
  console.error('✗ --size must be 512 or 1024 (App Store Connect requirement).');
  process.exit(1);
}

const allIds = listIds();
const targets = onlyId ? [onlyId] : allIds;
if (onlyId && !allIds.includes(onlyId)) {
  console.error(`✗ Unknown id "${onlyId}". Available: ${allIds.join(', ')}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

console.log(`Preparing ${targets.length} Game Center icon${targets.length === 1 ? '' : 's'} at ${size}×${size}`);
console.log(`  source : ${path.relative(repoRoot, srcDir)}/`);
console.log(`  output : ${path.relative(repoRoot, outDir)}/`);

let failed = 0;
for (const id of targets) {
  const inPath = path.join(srcDir, `${id}.png`);
  const outPath = path.join(outDir, `${id}.png`);
  if (!existsSync(inPath)) {
    console.warn(`  ⚠ ${id} — source PNG missing at ${path.relative(repoRoot, inPath)}, skipping`);
    failed += 1;
    continue;
  }
  try {
    await sharp(inPath)
      // lanczos3 is sharp's default for both up- and down-sizing — explicit
      // here so the kernel choice is documented in the pipeline.
      .resize(size, size, { kernel: 'lanczos3', fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`  ✓ ${id}`);
  } catch (err) {
    console.error(`  ✗ ${id}: ${err.message}`);
    failed += 1;
  }
}

console.log('');
console.log(
  `Done — ${targets.length - failed}/${targets.length} written to ` +
    `${path.relative(repoRoot, outDir)}/`,
);
console.log(
  '\nUpload these to App Store Connect → Game Center → Achievements → ' +
    'Add Achievement Localization → Image (1024 × 1024 recommended).',
);
if (failed > 0) process.exit(1);
