# SFX Asset Drop-in

This folder is the runtime location for Sudoku Evolved sound effects.
The audio service (`src/services/audio/audioService.ts`) lazy-loads each
clip via Expo Audio, but keys without a registered asset are no-ops — so
the app stays silent until you drop in the MP3s and register them.

## How to add a sound

1. Drop a short `.mp3` (recommended) or `.wav` clip in this folder, e.g.
   `place.mp3`. Keep clips under ~200ms for responsive micro-feedback,
   under ~1.5s for completion stings.
2. Open `src/services/audio/sfxRegistry.ts` and add the asset to
   `SFX_ASSETS`:

   ```ts
   export const SFX_ASSETS: Partial<Record<SfxKey, number>> = {
     place: require('@/../assets/sfx/place.mp3'),
     rowComplete: require('@/../assets/sfx/row-complete.mp3'),
     // ...
   };
   ```

3. Restart Metro (or save the file — fast refresh re-runs `preloadSfx()`).
   The audio service rebuilds players idempotently.

## Required keys

The app calls these keys (see `SfxKey` for the full list):

| Key                  | When it plays                          |
| -------------------- | -------------------------------------- |
| `tap`                | Generic UI tap                         |
| `selectCell`         | Player selects a board cell            |
| `place`              | A correct value is placed              |
| `note`               | A candidate note is added              |
| `erase`              | A cell is cleared                      |
| `mistake`            | A wrong value is placed                |
| `rowComplete`        | Row solved correctly                   |
| `columnComplete`     | Column solved correctly                |
| `boxComplete`        | 3×3 box solved correctly               |
| `numberSetComplete`  | Last instance of digit X placed        |
| `combo`              | ≥2 completion events from one move     |
| `puzzleComplete`     | Full puzzle solved                     |
| `mapUnlock`          | Saga-map node unlocks                  |
| `chestOpen`          | (future) Reward open                   |
| `buttonPrimary`      | Primary button pressed                 |
| `buttonSecondary`    | Secondary/ghost button pressed         |

Per-key default volumes are tuned in `audioService.ts`'s `DEFAULT_VOLUMES`.
Adjust there if your source clips need rebalancing.

## Tone direction (for designers)

- **Calm, premium, deep navy** — match the Logic Garden color palette.
- Avoid cartoon "boings", arcade "blips", or 8-bit beeps.
- Completion stings should feel like soft chimes, harp plucks, or
  glass tones — not victory fanfares.
- The Logic Bloom (`puzzleComplete`) is the only "moment" sound: a brief
  shimmer + soft sub-bass thud is ideal.
