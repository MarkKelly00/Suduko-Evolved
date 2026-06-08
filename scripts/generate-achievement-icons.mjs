#!/usr/bin/env node
/**
 * Generate achievement icon PNGs by calling xAI Grok Imagine's image API
 * once per achievement. One request → one PNG, no slicing.
 *
 * Usage:
 *   XAI_API_KEY=xai-... node scripts/generate-achievement-icons.mjs
 *
 * Options:
 *   --id <short_id>     Generate only one tile (e.g. --id first_bloom)
 *   --skip-existing     Skip tiles whose PNG already exists
 *   --concurrency <n>   Number of parallel requests (default 4)
 *   --dry-run           Print the prompt for each tile without calling the API
 *
 * The xAI key is read from XAI_API_KEY env var. Never write the key to disk.
 *
 * API: POST https://api.x.ai/v1/images/generations
 *   model=grok-imagine-image-quality, aspect_ratio=1:1, resolution=2k,
 *   response_format=b64_json
 *
 * The base64 image is decoded and resized to 256×256 via sharp before
 * writing to assets/achievements/<id>.png with compressionLevel 9.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { getPrompt, listIds, tierOf } from './achievement-icon-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets', 'achievements');
// App Store Connect masters — 1024×1024 sRGB PNG, uploaded per achievement.
const masterDir = path.join(repoRoot, 'assets', 'game-center-achievements');

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

if (!apiKey && !dryRun) {
  console.error('✗ XAI_API_KEY environment variable not set.');
  console.error('  Run with: XAI_API_KEY=xai-... node scripts/generate-achievement-icons.mjs');
  process.exit(1);
}

const allIds = listIds();
const targets = onlyId ? [onlyId] : allIds;
if (onlyId && !allIds.includes(onlyId)) {
  console.error(`✗ Unknown id "${onlyId}". Available: ${allIds.join(', ')}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(masterDir, { recursive: true });

console.log(`xAI Grok Imagine — generating ${targets.length} achievement icon${targets.length === 1 ? '' : 's'}`);
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
    console.log(`  → ${id} [${tier}] — dry-run`);
    console.log(`    prompt (${prompt.length} chars):\n${prompt.split('\n').map((l) => '      ' + l).join('\n')}`);
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
  // In-app gallery icon (256²) + App Store Connect master (1024²), from the
  // same source render so the two never drift.
  await sharp(buf)
    .resize(256, 256, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  await sharp(buf)
    .resize(1024, 1024, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(masterDir, `${id}.png`));

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
