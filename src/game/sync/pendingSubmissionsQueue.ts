/**
 * MMKV-backed retry queue for cloud score submissions. The hot path
 * (post-puzzle Results screen) doesn't await the cloud — it enqueues if
 * offline / failing and we drain the queue on app foreground + network
 * recovery + sign-in.
 *
 * Items are immutable inserts (no UPSERT semantics needed): the worst-case
 * outcome of a duplicate is an extra row in level_scores, and the
 * best-per-(user, level) view collapses duplicates by score.
 */

import { STORAGE_KEYS } from '@/services/persistence/schema';
import { getStorage } from '@/services/persistence/storage';
import {
  submitLevelScore,
  submitTimeTrialScore,
  type LevelScoreSubmission,
  type TimeTrialScoreSubmission,
} from '@/services/supabase/scoreSubmissionService';

type PendingItem =
  | { type: 'level'; payload: LevelScoreSubmission; attemptCount: number; firstAttemptAt: number }
  | { type: 'time-trial'; payload: TimeTrialScoreSubmission; attemptCount: number; firstAttemptAt: number };

const MAX_ATTEMPTS = 5;

function loadPending(): PendingItem[] {
  return getStorage().get<PendingItem[]>(STORAGE_KEYS.pendingSubmissions, []);
}
function savePending(items: PendingItem[]): void {
  getStorage().set(STORAGE_KEYS.pendingSubmissions, items);
}
function loadDeadLetter(): PendingItem[] {
  return getStorage().get<PendingItem[]>(STORAGE_KEYS.deadLetterSubmissions, []);
}
function saveDeadLetter(items: PendingItem[]): void {
  getStorage().set(STORAGE_KEYS.deadLetterSubmissions, items);
}

export function enqueueLevelScore(payload: LevelScoreSubmission): void {
  const items = loadPending();
  items.push({ type: 'level', payload, attemptCount: 0, firstAttemptAt: Date.now() });
  savePending(items);
}

export function enqueueTimeTrialScore(payload: TimeTrialScoreSubmission): void {
  const items = loadPending();
  items.push({ type: 'time-trial', payload, attemptCount: 0, firstAttemptAt: Date.now() });
  savePending(items);
}

let draining = false;

/**
 * Attempt to submit every queued score. Items that fail get their attempt
 * count bumped; items past MAX_ATTEMPTS move to the dead-letter list (they
 * stop blocking the queue and surface in dev for diagnosis).
 *
 * Safe to call concurrently — a guard ensures only one drain runs at once.
 */
export async function drainPendingSubmissions(): Promise<{ drained: number; failed: number }> {
  if (draining) return { drained: 0, failed: 0 };
  draining = true;
  try {
    let items = loadPending();
    if (items.length === 0) return { drained: 0, failed: 0 };
    const remaining: PendingItem[] = [];
    const dead: PendingItem[] = [];
    let drained = 0;
    let failed = 0;
    for (const item of items) {
      try {
        if (item.type === 'level') {
          await submitLevelScore(item.payload);
        } else {
          await submitTimeTrialScore(item.payload);
        }
        drained++;
      } catch {
        const next: PendingItem = { ...item, attemptCount: item.attemptCount + 1 };
        if (next.attemptCount >= MAX_ATTEMPTS) dead.push(next);
        else remaining.push(next);
        failed++;
      }
    }
    items = remaining;
    savePending(items);
    if (dead.length > 0) {
      saveDeadLetter([...loadDeadLetter(), ...dead]);
    }
    return { drained, failed };
  } finally {
    draining = false;
  }
}

export function getPendingCount(): number {
  return loadPending().length;
}

export function getDeadLetterCount(): number {
  return loadDeadLetter().length;
}
