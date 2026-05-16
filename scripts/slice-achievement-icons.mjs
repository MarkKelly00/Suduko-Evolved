#!/usr/bin/env node
/**
 * Slice the Grok Imagine achievement-icon grid into per-id PNGs.
 *
 * Usage:
 *   node scripts/slice-achievement-icons.mjs [--in /path/to/grid.png]
 *
 * Default input: ~/Downloads/sudokuevolved-achievements-grid.png
 *
 * Reads the layout from scripts/achievement-icon-grid.json (cols, rows,
 * tilePx source size, outputPx final size, row-major id list). Crops each
 * tile, downsizes to outputPx, writes to assets/achievements/<id>.png.
 *
 * The script is idempotent: re-running overwrites the 20 tiles
 * deterministically from the same manifest + grid.
 */

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const inputPath = arg(
  '--in',
  path.join(homedir(), 'Downloads', 'sudokuevolved-achievements-grid.png'),
);
const manifestPath = path.join(repoRoot, 'scripts', 'achievement-icon-grid.json');
const outDir = path.join(repoRoot, 'assets', 'achievements');

async function main() {
  if (!existsSync(inputPath)) {
    console.error(`✗ input PNG not found: ${inputPath}`);
    console.error(
      '  Generate the grid first via Grok Imagine using the prompt in the plan,',
    );
    console.error('  then re-run with --in /path/to/your/grid.png');
    process.exit(1);
  }
  if (!existsSync(manifestPath)) {
    console.error(`✗ manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const { cols, rows, outputPx, ids } = manifest;

  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    console.error('✗ manifest must declare integer cols + rows');
    process.exit(1);
  }
  if (!Array.isArray(ids) || ids.length !== cols * rows) {
    console.error(
      `✗ manifest.ids has ${ids?.length ?? 0} entries; expected ${cols * rows}`,
    );
    process.exit(1);
  }

  // Compute tile dimensions from the actual image rather than asserting
  // against the manifest's nominal `tilePx`. Grok Imagine often returns
  // grids at non-spec resolutions (e.g. 960×960 instead of 2048×2560),
  // and as long as the canvas divides evenly into cols × rows the
  // arithmetic still works — sharp resizes each cropped tile to the
  // square `outputPx` regardless of the source tile's aspect ratio.
  const meta = await sharp(inputPath).metadata();
  if (!meta.width || !meta.height) {
    console.error('✗ could not read image dimensions');
    process.exit(1);
  }
  const tileWidth = Math.floor(meta.width / cols);
  const tileHeight = Math.floor(meta.height / rows);
  if (tileWidth < 32 || tileHeight < 32) {
    console.error(
      `✗ computed tile size ${tileWidth}×${tileHeight} is too small to be a real grid`,
    );
    process.exit(1);
  }
  if (meta.width !== tileWidth * cols || meta.height !== tileHeight * rows) {
    console.warn(
      `⚠ image ${meta.width}×${meta.height} does not divide evenly into ` +
        `${cols}×${rows} tiles. Using ${tileWidth}×${tileHeight} per tile; ` +
        `up to ${meta.width - tileWidth * cols} px on the right and ` +
        `${meta.height - tileHeight * rows} px at the bottom will be ignored.`,
    );
  }
  console.log(
    `→ source ${meta.width}×${meta.height}, slicing ${cols}×${rows} ` +
      `tiles at ${tileWidth}×${tileHeight}, output ${outputPx}×${outputPx}`,
  );

  mkdirSync(outDir, { recursive: true });

  let wrote = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const idx = row * cols + col;
      const id = ids[idx];
      const left = col * tileWidth;
      const top = row * tileHeight;
      const outPath = path.join(outDir, `${id}.png`);
      // Each call re-opens the source so sharp doesn't accumulate state
      // across iterations (the .extract() pipeline mutates the instance).
      await sharp(inputPath)
        .extract({ left, top, width: tileWidth, height: tileHeight })
        .resize(outputPx, outputPx)
        .png({ compressionLevel: 9 })
        .toFile(outPath);
      wrote += 1;
    }
  }

  console.log(`✓ Wrote ${wrote} tiles to ${path.relative(repoRoot, outDir)}/`);
}

main().catch((err) => {
  console.error('✗ slicer failed:', err);
  process.exit(1);
});
