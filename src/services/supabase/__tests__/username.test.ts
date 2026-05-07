import {
  describeUsernameError,
  normalizeUsername,
  validateUsername,
} from '../utils/username';

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  Foo  ')).toBe('foo');
    expect(normalizeUsername('USERname')).toBe('username');
  });

  it('NFKC normalizes when available', () => {
    // Half-width and full-width digits should fold together.
    const fullwidth = '１２３'; // １２３
    expect(normalizeUsername(fullwidth)).toBe('123');
  });
});

describe('validateUsername', () => {
  it('accepts standard usernames', () => {
    expect(validateUsername('foo_bar')).toEqual({ valid: true });
    expect(validateUsername('player_1')).toEqual({ valid: true });
    expect(validateUsername('abc')).toEqual({ valid: true });
    expect(validateUsername('a'.repeat(20))).toEqual({ valid: true });
  });

  it('rejects too short', () => {
    expect(validateUsername('ab')).toEqual({ valid: false, reason: 'too_short' });
  });

  it('rejects too long', () => {
    expect(validateUsername('a'.repeat(21))).toEqual({ valid: false, reason: 'too_long' });
  });

  it('rejects bad characters', () => {
    expect(validateUsername('Foo')).toEqual({ valid: false, reason: 'invalid_chars' });
    expect(validateUsername('foo bar')).toEqual({ valid: false, reason: 'invalid_chars' });
    expect(validateUsername('foo.bar')).toEqual({ valid: false, reason: 'invalid_chars' });
    expect(validateUsername('foo-bar')).toEqual({ valid: false, reason: 'invalid_chars' });
  });
});

describe('describeUsernameError', () => {
  it('returns human strings', () => {
    expect(describeUsernameError('too_short')).toContain('3');
    expect(describeUsernameError('too_long')).toContain('20');
    expect(describeUsernameError('invalid_chars')).toContain('underscores');
    expect(describeUsernameError(undefined)).toBe('');
  });
});
