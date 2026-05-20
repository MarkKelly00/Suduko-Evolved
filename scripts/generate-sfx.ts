/**
 * generate-sfx.ts
 *
 * Generates all 16 game SFX via ElevenLabs text-to-sound-effects API
 * and writes them to `assets/sfx/<key>.mp3`. Idempotent — existing
 * files are skipped unless `--regenerate <key>[,<key>...]` is passed.
 *
 * Usage:
 *   npm run sfx                            # generate any missing keys
 *   npm run sfx:regen place,combo          # force-regenerate those 2
 *   npm run sfx:regen ALL                  # force-regenerate every key
 *
 * Requires `ELEVENLABS_API_KEY` in env (or .env at project root).
 *
 * The tonal direction across every prompt: calm / premium / cinematic /
 * glass + harp + soft bell. NO arcade beeps. The motion language of
 * the app (`cinematic 600ms`, `hero 900ms`, `easing.premium`) sets the
 * vocabulary — sounds should feel like UI-design objects, not toys.
 */

import 'dotenv/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve script dir (project-root agnostic). __dirname isn't defined
// in ESM/tsx-compiled context, so derive it from import.meta.url.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SfxPrompt {
  /** Must match a key in `src/services/audio/sfxRegistry.ts`. */
  key: string;
  /** Seconds (ElevenLabs accepts 0.5–22; values <0.5 round up). */
  durationSeconds: number;
  /** The textToSoundEffects `text` argument. */
  prompt: string;
}

const SFX_PROMPTS: SfxPrompt[] = [
  // ─── UI taps & micro-feedback (0.15–0.4s) ──────────────────────────
  {
    key: 'tap',
    durationSeconds: 0.5,
    prompt:
      'Soft refined UI tap, faint glass tick, very short, no reverb, calm and premium',
  },
  {
    key: 'selectCell',
    durationSeconds: 0.5,
    prompt:
      'Single muted glass highlight tick, warm and refined, very short, soft mid-high tone',
  },
  {
    key: 'note',
    durationSeconds: 0.5,
    prompt:
      'Light pencil-on-paper texture, soft warm tick, brief and gentle, no music',
  },
  {
    key: 'erase',
    durationSeconds: 0.5,
    prompt:
      'Soft brush sweep on paper, gentle reversed swoosh, brief and muted',
  },
  {
    key: 'place',
    durationSeconds: 0.6,
    prompt:
      'Confident soft wooden marimba pluck with subtle glass shimmer tail, warm placement, premium calm feel',
  },
  {
    key: 'mistake',
    durationSeconds: 0.6,
    prompt:
      'Subtle dissonant low buzz with muted thud, brief tasteful error tone, premium not harsh, no klaxon',
  },
  {
    key: 'buttonPrimary',
    durationSeconds: 0.5,
    prompt:
      'Premium gold-tone UI tap with subtle warm resonance, refined and short',
  },
  {
    key: 'buttonSecondary',
    durationSeconds: 0.5,
    prompt: 'Soft muted UI click, neutral and brief, no resonance',
  },

  // ─── Completion stings (0.6–1.0s) ──────────────────────────────────
  {
    key: 'rowComplete',
    durationSeconds: 0.8,
    prompt:
      'Soft warm harp arpeggio rising left-to-right across five notes, gentle glass shimmer tail',
  },
  {
    key: 'columnComplete',
    durationSeconds: 0.8,
    prompt:
      'Soft warm harp arpeggio descending across five notes, gentle chime tail',
  },
  {
    key: 'boxComplete',
    durationSeconds: 1.0,
    prompt:
      'Warm soft bell cluster, three chimes with gentle bass swell, calm but confident',
  },
  {
    key: 'numberSetComplete',
    durationSeconds: 0.9,
    prompt:
      'Soft glass marimba ascending run resolving on a sparkle, magical and refined',
  },

  // ─── Cinematic moments (1.0–1.8s) ──────────────────────────────────
  {
    key: 'combo',
    durationSeconds: 1.2,
    prompt:
      'Layered chimes cascading and building, warm harp glissando with soft pad swell, celebratory but cinematic, not arcade',
  },
  {
    key: 'puzzleComplete',
    durationSeconds: 2.0,
    prompt:
      'Cinematic puzzle-solved sting: soft warm pad opens, golden bell bloom in the middle, gentle sub-bass thud, distant reverb tail. Triumphant, premium, restrained, like a luxury logic-game victory cue',
  },
  {
    key: 'mapUnlock',
    durationSeconds: 1.4,
    prompt:
      'Gentle magical unlock: soft chime cascade with subtle high sparkle and warm low swell, calm and confident',
  },
  {
    key: 'chestOpen',
    durationSeconds: 1.2,
    prompt:
      'Soft wooden creak open, warm golden shimmer with gentle bell, refined and tasteful',
  },
];

async function main(): Promise<void> {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY — set it in .env or your shell.');
    process.exit(1);
  }

  const elevenlabs = new ElevenLabsClient();
  const outDir = resolve(__dirname, '..', 'assets', 'sfx');
  await mkdir(outDir, { recursive: true });

  const regen = parseRegenerateFlag(process.argv);
  const regenAll = regen?.has('ALL') === true;

  let generated = 0;
  let skipped = 0;

  for (const p of SFX_PROMPTS) {
    const path = resolve(outDir, `${p.key}.mp3`);
    const shouldRegen = regenAll || regen?.has(p.key) === true;
    if (!shouldRegen) {
      try {
        await access(path);
        console.log(`  skip ${p.key} (exists)`);
        skipped++;
        continue;
      } catch {
        /* not present — proceed to generate */
      }
    }

    console.log(`  generating ${p.key} (${p.durationSeconds}s)…`);
    try {
      // SDK call. textToSoundEffects.convert returns a readable stream of
      // MP3 bytes on Node. We collect into a Buffer and write to disk.
      const stream = await elevenlabs.textToSoundEffects.convert({
        text: p.prompt,
        modelId: 'eleven_text_to_sound_v2',
        durationSeconds: p.durationSeconds,
        // 0.0–1.0. Lower keeps it musical/abstract; higher is more literal.
        // 0.3 lets the model take artistic license with our prompts (we
        // want "warm glass chime", not a literal recording of glass).
        promptInfluence: 0.3,
      });

      const chunks: Uint8Array[] = [];
      for await (const c of stream as AsyncIterable<Uint8Array>) {
        chunks.push(c);
      }
      const buffer = Buffer.concat(chunks);
      await writeFile(path, buffer);
      const kb = (buffer.length / 1024).toFixed(1);
      console.log(`  wrote ${p.key}.mp3 (${kb} KB)`);
      generated++;
    } catch (err) {
      console.error(`  failed ${p.key}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('');
  console.log(`Summary: ${generated} generated, ${skipped} skipped`);
  console.log('Next: wire `SFX_ASSETS` in src/services/audio/sfxRegistry.ts');
}

function parseRegenerateFlag(argv: string[]): Set<string> | null {
  const i = argv.indexOf('--regenerate');
  if (i < 0) return null;
  const raw = argv[i + 1] ?? '';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
