/**
 * Format milliseconds as `M:SS` (or `MM:SS` past 10 minutes).
 * Negative or NaN values clamp to 0.
 */
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes < 10 ? `${minutes}` : `${minutes}`;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${mm}:${ss}`;
}

export function formatDuration(seconds: number): string {
  return formatTime(seconds * 1000);
}
