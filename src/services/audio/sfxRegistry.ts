/**
 * SFX registry — keys to (eventually) audio asset paths. Phase 3 ships no
 * actual asset files yet; the registry is a typed enumeration so screens can
 * reference sound effects by stable name now and Phase 4 can wire real audio
 * without a refactor.
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
 * Map keys → asset modules. Empty for Phase 3; Phase 4 will populate with
 * `require('@/assets/sfx/place.mp3')` etc.
 */
export const SFX_ASSETS: Partial<Record<SfxKey, number>> = {};
