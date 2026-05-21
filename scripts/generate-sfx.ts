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
  // ─── UI taps + micro-feedback (0.5–0.7s) ───────────────────────────
  // v2 direction (build 30): "tactile + satisfying" — Candy-Crush-
  // influenced but not arcade. Each repeated tap should feel like a
  // small dopamine hit while reading as premium. v1 was too calm and
  // got annoying on high-frequency keys (especially `note`).
  {
    key: 'tap',
    durationSeconds: 0.5,
    prompt:
      'Soft synth pop with a faint resonant ping, tactile click, brief and rewarding, like a refined bubble pop crossed with a premium keyboard tap',
  },
  {
    key: 'selectCell',
    durationSeconds: 0.5,
    prompt:
      'Crisp soft glass click with a brief melodic ping, tactile and satisfying, like a high-end iOS keyboard tap combined with a soft mallet hit',
  },
  {
    key: 'note',
    durationSeconds: 0.5,
    prompt:
      'Soft tactile click with a tiny musical ping, playful but refined, like dropping a small gem onto a glass surface — satisfying enough to repeat hundreds of times without becoming annoying',
  },
  {
    key: 'erase',
    durationSeconds: 0.5,
    prompt:
      'Quick soft brush stroke with a faint reverse swoosh, gentle and tactile, like a soft eraser sweep on premium paper, brief and warm',
  },
  {
    key: 'place',
    durationSeconds: 0.7,
    prompt:
      'Confident soft synth pluck with warm wooden resonance and a brief glass shimmer tail, deeply satisfying placement sound, premium and rewarding',
  },
  {
    key: 'mistake',
    durationSeconds: 0.6,
    prompt:
      'Soft muted bonk with a tasteful low buzz, playful but clearly wrong, brief and not harsh, like a friendly correction tone — never aggressive',
  },
  {
    key: 'buttonPrimary',
    durationSeconds: 0.5,
    prompt:
      'Premium gold-tone synth pluck with a warm tactile click and brief resonance, refined and satisfying like a high-end haptic confirmation',
  },
  {
    key: 'buttonSecondary',
    durationSeconds: 0.5,
    prompt:
      'Soft tactile UI click with a tiny glass undertone, brief and neutral, like a refined keyboard space-bar press',
  },

  // ─── Completion stings (0.8–1.0s) ──────────────────────────────────
  {
    key: 'rowComplete',
    durationSeconds: 0.8,
    prompt:
      'Bright playful arpeggio rising left-to-right, five quick chimes with sparkle tail, rewarding and joyful — premium candy-game cascade with polish',
  },
  {
    key: 'columnComplete',
    durationSeconds: 0.8,
    prompt:
      'Bright playful arpeggio descending across five quick chimes with sparkle, tonally mirrors row-complete, rewarding and tactile',
  },
  {
    key: 'boxComplete',
    durationSeconds: 1.0,
    prompt:
      'Warm bell cluster with a satisfying low thud, three chimes blooming with bass swell, premium dopamine-hit completion sting',
  },
  {
    key: 'numberSetComplete',
    durationSeconds: 0.9,
    prompt:
      'Sparkling ascending run resolving on a bright bell, magical and rewarding, like collecting a gem cluster in a premium puzzle game',
  },

  // ─── Cinematic moments (1.2–2.0s) ──────────────────────────────────
  // `combo` and `puzzleComplete` left at v1 prompts — user explicitly
  // liked them. These two are skipped by the regen list in the plan;
  // only retouched if needed.
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
      'Gentle magical unlock with sparkle cascade and warm bass swell, playful but elevated, like opening a new chapter in a premium adventure',
  },
  {
    key: 'chestOpen',
    durationSeconds: 1.2,
    prompt:
      'Soft wooden creak open with warm golden shimmer and gentle bell, treasure-reveal that\'s tasteful but exciting, premium with a hint of magic',
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
