/**
 * SFX registry — keys to audio asset paths. All 16 entries are now
 * wired to MP3s generated via ElevenLabs text-to-sound-effects
 * (see `scripts/generate-sfx.ts` for the prompts + workflow). The
 * `require()` calls hand the asset to Expo's static asset resolver
 * at build time, returning a numeric module id that `expo-audio`'s
 * `createAudioPlayer(source)` consumes directly.
 *
 * To regenerate any sound:
 *   npm run sfx:regen <key>          # one sound
 *   npm run sfx:regen ALL            # all 16
 *
 * Per-key volumes live in `audioService.ts` (`DEFAULT_VOLUMES`).
 */

export type SfxKey =
  | 'tap'
  | 'selectCell'
  | 'place'
  | 'note'
  | 'erase'
  | 'mistake'
  | 'rowComplete'
  | 'columnComplete'
  | 'boxComplete'
  | 'numberSetComplete'
  | 'combo'
  | 'puzzleComplete'
  | 'mapUnlock'
  | 'chestOpen'
  | 'buttonPrimary'
  | 'buttonSecondary';

/**
 * Map keys → asset modules. Picked up by `preloadSfx()` in audioService.ts.
 *
 * Paths are relative (`../../../assets/...`) NOT aliased (`@/...`) because
 * the `@/` tsconfig alias points to `src/*`, while `assets/` lives at the
 * project root. Mirrors the pattern used by `achievementAssets.ts`. Using
 * the alias makes Metro fail to resolve the MP3 at bundle time (silently
 * passes TS type-check since .mp3 isn't a TS file).
 */
export const SFX_ASSETS: Partial<Record<SfxKey, number>> = {
  // UI taps + micro-feedback
  tap: require('../../../assets/sfx/tap.mp3'),
  selectCell: require('../../../assets/sfx/selectCell.mp3'),
  note: require('../../../assets/sfx/note.mp3'),
  erase: require('../../../assets/sfx/erase.mp3'),
  place: require('../../../assets/sfx/place.mp3'),
  mistake: require('../../../assets/sfx/mistake.mp3'),
  buttonPrimary: require('../../../assets/sfx/buttonPrimary.mp3'),
  buttonSecondary: require('../../../assets/sfx/buttonSecondary.mp3'),
  // Completion stings
  rowComplete: require('../../../assets/sfx/rowComplete.mp3'),
  columnComplete: require('../../../assets/sfx/columnComplete.mp3'),
  boxComplete: require('../../../assets/sfx/boxComplete.mp3'),
  numberSetComplete: require('../../../assets/sfx/numberSetComplete.mp3'),
  // Cinematic moments
  combo: require('../../../assets/sfx/combo.mp3'),
  puzzleComplete: require('../../../assets/sfx/puzzleComplete.mp3'),
  mapUnlock: require('../../../assets/sfx/mapUnlock.mp3'),
  chestOpen: require('../../../assets/sfx/chestOpen.mp3'),
};
