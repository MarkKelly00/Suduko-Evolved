import { useEffect, useState } from 'react';

export interface CountdownParts {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  /** "12h 03m" or "03m 12s" — chooses tier based on time left. */
  formatted: string;
}

/** Returns a live countdown to an ISO timestamp. Updates every second. */
export function useCountdown(target: string | number | null | undefined): CountdownParts {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const targetMs = target == null ? null : new Date(target).getTime();
  const totalSeconds = targetMs == null ? 0 : Math.max(0, Math.floor((targetMs - now) / 1000));
  const expired = totalSeconds <= 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted =
    expired
      ? 'Expired'
      : hours > 0
        ? `${hours}h ${pad(minutes)}m`
        : `${pad(minutes)}m ${pad(seconds)}s`;
  return { totalSeconds, hours, minutes, seconds, expired, formatted };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
