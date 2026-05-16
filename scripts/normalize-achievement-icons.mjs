#!/usr/bin/env node
/**
 * Post-process the sliced achievement-icon PNGs to remove the cream
 * gutters that Grok Imagine's grid placed around each tile.
 *
 * Root cause: Grid #2's source PNG has a cream-colored image background
 * around the outside of the 4×5 grid AND between tiles. The original
 * slicer chopped at exact grid lines `(col * 240, row * 192)` starting
 * from (0, 0), so each sliced tile captured some cream gutter — visible
 * in the app as inconsistent top / bottom padding around each glyph.
 *
 * Fix: `sharp.trim()` removes pixels matching the cream background within
 * a brightness threshold, then we resize back to a clean 256×256 PNG with
 * the trimmed content centered on a flat navy canvas (matches the app's
 * surface color so the PNG joins seamlessly with the RN card chrome).
 *
 * Usage:
 *   node scripts/normalize-achievement-icons.mjs
 *   node scripts/normalize-achievement-icons.mjs --id first_bloom
 *
 * Idempotent: a backup of each original is kept under
 * assets/achievements/.normalize-backup/ on first run, and subsequent
 * runs re-normalize from those backups.
 */

import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { listIds } from './achievement-icon-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets', 'achievements');
const backupDir = path.join(outDir, '.normalize-backup');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const onlyId = arg('--id', null);
const finalSize = parseInt(arg('--size', '256'), 10);
// Cream background color from Grid #2 (~ rgb(227, 219, 200), brightness ~219).
// Threshold 40 removes anything within 40 of cream — leaves the dark navy
// tile + glyph + halo intact, since the brightest non-glyph navy is ~31 and
// the dimmest halo is ~50.
const cream = { r: 227, g: 219, b: 200 };
const threshold = parseInt(arg('--threshold', '40'), 10);
// Navy fill used when padding the trimmed tile back to a square canvas.
// Matches colors.surface in the app.
const navy = { r: 0x12, g: 0x1a, b: 0x2a, alpha: 1 };

const allIds = listIds();
const targets = onlyId ? [onlyId] : allIds;
if (onlyId && !allIds.includes(onlyId)) {
  console.error(`✗ Unknown id "${onlyId}". Available: ${allIds.join(', ')}`);
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });

console.log(`Normalizing ${targets.length} achievement icon${targets.length === 1 ? '' : 's'}`);
console.log(`  trim threshold: ${threshold} (against cream rgb(${cream.r},${cream.g},${cream.b}))`);
console.log(`  output size   : ${finalSize}×${finalSize}`);

async function normalizeOne(id) {
  const livePath = path.join(outDir, `${id}.png`);
  const backupPath = path.join(backupDir, `${id}.png`);
  if (!existsSync(livePath) && !existsSync(backupPath)) {
    console.warn(`  ⚠ ${id} — source PNG missing, skipping`);
    return;
  }
  // First run: snapshot the live PNG so re-runs are idempotent.
  if (!existsSync(backupPath)) {
    copyFileSync(livePath, backupPath);
  }
  // Always re-normalize from the backup, so re-runs don't compound errors
  // (e.g. trimming an already-trimmed PNG that has trace cream pixels left).
  const srcPath = backupPath;

  // Step 1: trim cream borders. Returns whatever dark-navy content remains.
  const trimmed = await sharp(srcPath)
    .trim({ background: cream, threshold })
    .toBuffer({ resolveWithObject: true });
  const trimMeta = trimmed.info;

  // Step 2: scale the trimmed content to fit within the final canvas
  // preserving aspect ratio, then composite centered on a flat navy
  // canvas. `fit: 'contain'` with navy background prevents glyph crops.
  await sharp({
    create: {
      width: finalSize,
      height: finalSize,
      channels: 4,
      background: navy,
    },
  })
    .composite([
      {
        input: await sharp(trimmed.data)
          .resize(finalSize, finalSize, { fit: 'contain', background: navy })
          .png({ compressionLevel: 9 })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(livePath);

  console.log(
    `  ✓ ${id} — trimmed to ${trimMeta.width}×${trimMeta.height}, ` +
      `composited on ${finalSize}×${finalSize} navy canvas`,
  );
}

let failed = 0;
for (const id of targets) {
  try {
    await normalizeOne(id);
  } catch (err) {
    console.error(`  ✗ ${id}: ${err.message}`);
    failed += 1;
  }
}

console.log('');
console.log(
  `Done — ${targets.length - failed}/${targets.length} normalized. ` +
    `Originals at ${path.relative(repoRoot, backupDir)}/`,
);
if (failed > 0) process.exit(1);
