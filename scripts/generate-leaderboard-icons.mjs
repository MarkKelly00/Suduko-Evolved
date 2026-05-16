#!/usr/bin/env node
/**
 * Generate leaderboard icon PNGs by calling xAI Grok Imagine's image API
 * once per leaderboard. Output is sized for App Store Connect's Game
 * Center configuration (1024×1024) directly — no upscaling.
 *
 * Mirrors `generate-achievement-icons.mjs`. The xAI 2k response is
 * downsized to 1024×1024 via sharp's lanczos3 kernel (crisp 2× downscale).
 *
 * Usage:
 *   XAI_API_KEY=xai-... node scripts/generate-leaderboard-icons.mjs
 *
 * Options:
 *   --id <short_id>     Generate only one leaderboard
 *   --skip-existing     Skip leaderboards whose PNG already exists
 *   --concurrency <n>   Number of parallel requests (default 4)
 *   --dry-run           Print each prompt without calling the API
 *   --size <px>         Output size (default 1024; 512 also accepted)
 *
 * Output: assets/game-center-leaderboards/<id>.png
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { getPrompt, listIds, tierOf } from './leaderboard-icon-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets', 'game-center-leaderboards');

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function arg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const apiKey = process.env.XAI_API_KEY;
const onlyId = arg('--id', null);
const skipExisting = flag('--skip-existing');
const dryRun = flag('--dry-run');
const concurrency = Math.max(1, Math.min(8, parseInt(arg('--concurrency', '4'), 10) || 4));
const size = parseInt(arg('--size', '1024'), 10);

if (size !== 512 && size !== 1024) {
  console.error('✗ --size must be 512 or 1024 (App Store Connect requirement).');
  process.exit(1);
}

if (!apiKey && !dryRun) {
  console.error('✗ XAI_API_KEY environment variable not set.');
  console.error('  Run with: XAI_API_KEY=xai-... node scripts/generate-leaderboard-icons.mjs');
  process.exit(1);
}

const allIds = listIds();
const targets = onlyId ? [onlyId] : allIds;
if (onlyId && !allIds.includes(onlyId)) {
  console.error(`✗ Unknown id "${onlyId}". Available: ${allIds.join(', ')}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

console.log(`xAI Grok Imagine — generating ${targets.length} leaderboard icon${targets.length === 1 ? '' : 's'} at ${size}×${size}`);
if (dryRun) console.log('(dry-run mode — no API calls will be made)');
console.log(`  concurrency: ${concurrency}`);
console.log(`  output dir : ${path.relative(repoRoot, outDir)}/`);

async function generateOne(id) {
  const outPath = path.join(outDir, `${id}.png`);
  const tier = tierOf(id);
  if (skipExisting && existsSync(outPath)) {
    console.log(`  ⊘ ${id} [${tier}] — skipped (already exists)`);
    return { id, skipped: true };
  }
  const prompt = getPrompt(id);
  if (dryRun) {
    console.log(`  → ${id} [${tier}] — dry-run (${prompt.length} chars)`);
    return { id, dryRun: true };
  }

  const startedAt = Date.now();
  let res;
  try {
    res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-imagine-image-quality',
        prompt,
        n: 1,
        aspect_ratio: '1:1',
        resolution: '2k',
        response_format: 'b64_json',
      }),
    });
  } catch (err) {
    throw new Error(`network error for ${id}: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xAI API error for ${id} (HTTP ${res.status}): ${text.slice(0, 500)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`no image returned for ${id}: ${JSON.stringify(json).slice(0, 500)}`);
  }

  const buf = Buffer.from(b64, 'base64');
  await sharp(buf)
    .resize(size, size, { kernel: 'lanczos3', fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const elapsedMs = Date.now() - startedAt;
  console.log(`  ✓ ${id} [${tier}] (${(elapsedMs / 1000).toFixed(1)}s)`);
  return { id, elapsedMs };
}

async function runPool() {
  const queue = [...targets];
  const results = [];
  const errors = [];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) return;
      try {
        const r = await generateOne(id);
        results.push(r);
      } catch (err) {
        console.error(`  ✗ ${id}: ${err.message}`);
        errors.push({ id, error: err.message });
      }
    }
  });
  await Promise.all(workers);
  return { results, errors };
}

const startedAt = Date.now();
const { results, errors } = await runPool();
const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);

console.log('');
console.log(`Done in ${totalSec}s — ${results.length} generated, ${errors.length} failed`);
if (errors.length > 0) {
  console.log('Failed:');
  for (const e of errors) console.log(`  ${e.id}: ${e.error}`);
  process.exit(1);
}
