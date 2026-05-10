/**
 * Offline retry queue for Game Center submissions.
 *
 * Game Center submissions are best-effort — they can fail because the
 * player isn't authenticated, the network is down, the app is moving to
 * background mid-flight, or any number of GameKit-specific transient
 * conditions. Rather than dropping those submissions on the floor we
 * stash them locally and replay on the next viable opportunity:
 *
 *   - app launches → drainQueue() during initialize()
 *   - the user successfully signs in → drainQueue() after auth
 *   - any successful submit → drainQueue() opportunistically
 *
 * Persistence: same MMKV-backed `getStorage()` everything else uses.
 *
 * Bounds — to keep this from being a memory leak in pathological cases:
 *   - max queue length: 200 entries (enqueue rejects beyond)
 *   - max retries per entry: 5 (drained-and-failed-out moves to dead
 *     letter so we can inspect in dev; lossy in prod)
 *   - max age: 30 days (entries older than this drop on next drain)
 *
 * Pure JS — no native module touches. Phase 1 ships this file fully
 * functional even though no producer is enqueueing yet.
 */

import { getStorage } from '@/services/persistence/storage';
import type {
  AchievementSubmission,
  LeaderboardSubmission,
  QueueEntry,
} from './gameCenterTypes';

const QUEUE_KEY = 'gameCenter.pendingQueue';
const MAX_QUEUE_LENGTH = 200;
const MAX_RETRIES = 5;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function readQueue(): QueueEntry[] {
  return getStorage().get<QueueEntry[]>(QUEUE_KEY, []);
}

function writeQueue(entries: QueueEntry[]): void {
  getStorage().set<QueueEntry[]>(QUEUE_KEY, entries);
}

/**
 * Best-effort UUID. We can't use crypto.randomUUID() reliably in RN
 * Hermes without a polyfill, so this combines `Date.now()` with a
 * Math.random() suffix — collision probability is astronomical for our
 * workload (at most a few enqueues/sec per user).
 */
function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function enqueueScore(payload: LeaderboardSubmission): void {
  const queue = readQueue();
  if (queue.length >= MAX_QUEUE_LENGTH) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[gameCenterQueue] queue full — dropping score submission',
        payload,
      );
    }
    return;
  }
  queue.push({
    id: makeId(),
    kind: 'score',
    enqueuedAt: Date.now(),
    retryCount: 0,
    lastAttemptAt: 0,
    payload,
  });
  writeQueue(queue);
}

export function enqueueAchievement(payload: AchievementSubmission): void {
  const queue = readQueue();
  if (queue.length >= MAX_QUEUE_LENGTH) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[gameCenterQueue] queue full — dropping achievement submission',
        payload,
      );
    }
    return;
  }
  queue.push({
    id: makeId(),
    kind: 'achievement',
    enqueuedAt: Date.now(),
    retryCount: 0,
    lastAttemptAt: 0,
    payload,
  });
  writeQueue(queue);
}

export function getQueueSnapshot(): QueueEntry[] {
  return readQueue();
}

export function clearQueue(): void {
  writeQueue([]);
}

/**
 * Drop expired or retry-exhausted entries. Returns the surviving queue
 * AFTER persisting the cleanup. Called by drainQueue() before iterating,
 * but exposed publicly so tests can verify the bounds in isolation.
 */
export function pruneQueue(now: number = Date.now()): QueueEntry[] {
  const queue = readQueue();
  const survivors = queue.filter((entry) => {
    if (now - entry.enqueuedAt > MAX_AGE_MS) return false;
    if (entry.retryCount >= MAX_RETRIES) return false;
    return true;
  });
  if (survivors.length !== queue.length) {
    writeQueue(survivors);
  }
  return survivors;
}

export interface DrainSubmitter {
  submitScore(submission: LeaderboardSubmission): Promise<boolean>;
  reportAchievement(submission: AchievementSubmission): Promise<boolean>;
}

export interface DrainResult {
  attempted: number;
  delivered: number;
  remaining: number;
}

/**
 * Walk the queue, attempting each entry exactly once. The submitter is
 * injected (rather than imported from the service) so tests can mock
 * it without monkey-patching imports. Successful entries are removed;
 * failures bump retryCount + lastAttemptAt and stay in the queue.
 */
export async function drainQueue(
  submitter: DrainSubmitter,
  now: number = Date.now(),
): Promise<DrainResult> {
  const queue = pruneQueue(now);
  if (queue.length === 0) {
    return { attempted: 0, delivered: 0, remaining: 0 };
  }
  let delivered = 0;
  const next: QueueEntry[] = [];
  for (const entry of queue) {
    let ok = false;
    try {
      ok =
        entry.kind === 'score'
          ? await submitter.submitScore(entry.payload)
          : await submitter.reportAchievement(entry.payload);
    } catch (err) {
      ok = false;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[gameCenterQueue] drain submitter threw:', err);
      }
    }
    if (ok) {
      delivered += 1;
      // Successful — drop from queue (don't push to next).
    } else {
      next.push({
        ...entry,
        retryCount: entry.retryCount + 1,
        lastAttemptAt: now,
      });
    }
  }
  writeQueue(next);
  return {
    attempted: queue.length,
    delivered,
    remaining: next.length,
  };
}
