/**
 * Username normalization + validation. Mirrored server-side by the
 * `enforce_username_normalized` trigger in db/001_schema.sql so client and
 * server agree on the canonical form.
 *
 * Rules:
 *   - Lowercase
 *   - NFKC-normalized (collapses confusables in user input)
 *   - 3 to 20 chars
 *   - Charset [a-z0-9_]
 */

const NORMALIZED_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  // String.prototype.normalize is available in Hermes + JSC.
  const nfkc = typeof trimmed.normalize === 'function' ? trimmed.normalize('NFKC') : trimmed;
  return nfkc.toLowerCase();
}

export interface UsernameValidation {
  valid: boolean;
  reason?: 'too_short' | 'too_long' | 'invalid_chars';
}

export function validateUsername(normalized: string): UsernameValidation {
  if (normalized.length < 3) return { valid: false, reason: 'too_short' };
  if (normalized.length > 20) return { valid: false, reason: 'too_long' };
  if (!NORMALIZED_PATTERN.test(normalized)) return { valid: false, reason: 'invalid_chars' };
  return { valid: true };
}

export function describeUsernameError(reason: UsernameValidation['reason']): string {
  switch (reason) {
    case 'too_short':
      return 'At least 3 characters.';
    case 'too_long':
      return 'No more than 20 characters.';
    case 'invalid_chars':
      return 'Lowercase letters, numbers, and underscores only.';
    default:
      return '';
  }
}
