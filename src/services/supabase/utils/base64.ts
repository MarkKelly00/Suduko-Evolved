/**
 * Tiny base64 → Uint8Array decoder. RN's Hermes engine ships a global
 * `atob` that handles this correctly; we have a manual fallback for any
 * environment that doesn't.
 *
 * We don't take a dependency on `base64-arraybuffer` or `buffer` — both
 * pull in browser polyfills we don't otherwise need.
 */

export function decode(base64: string): Uint8Array {
  // Strip data: URL prefix if present (some pickers return data URIs).
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
  const binary =
    typeof globalThis.atob === 'function'
      ? globalThis.atob(cleaned)
      : decodeFallback(cleaned);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeFallback(input: string): string {
  const padded = input.replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < padded.length; i += 1) {
    const idx = ALPHABET.indexOf(padded[i]!);
    if (idx === -1) continue; // skip whitespace etc.
    bits += idx.toString(2).padStart(6, '0');
  }
  let out = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
  }
  return out;
}
