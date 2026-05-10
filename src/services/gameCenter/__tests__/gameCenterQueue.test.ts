/**
 * Tests for the offline retry queue.
 *
 * Submitter is a Jest mock — the queue is platform-agnostic and
 * doesn't touch the native module. We're testing the FIFO contract,
 * the retry-cap, the age-cap, and the dedupe behaviour.
 */

import {
  clearQueue,
  drainQueue,
  enqueueAchievement,
  enqueueScore,
  getQueueSnapshot,
  pruneQueue,
} from '../gameCenterQueue';
import { GAME_CENTER_ACHIEVEMENTS, GAME_CENTER_LEADERBOARDS } from '../gameCenterIds';
import { InMemoryStorage, setStorage } from '../../persistence/storage';

const SCORE_PAYLOAD = {
  leaderboardId: GAME_CENTER_LEADERBOARDS.SPRINT_3MIN_SCORE,
  value: 6181,
};
const ACH_PAYLOAD = {
  achievementId: GAME_CENTER_ACHIEVEMENTS.FIRST_BLOOM,
  percentComplete: 100,
};

beforeEach(() => {
  setStorage(new InMemoryStorage());
});

describe('enqueue + snapshot', () => {
  it('starts empty', () => {
    expect(getQueueSnapshot()).toEqual([]);
  });

  it('enqueueScore appends a score entry', () => {
    enqueueScore(SCORE_PAYLOAD);
    const snap = getQueueSnapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]!.kind).toBe('score');
    expect(snap[0]!.payload).toEqual(SCORE_PAYLOAD);
    expect(snap[0]!.retryCount).toBe(0);
  });

  it('enqueueAchievement appends an achievement entry', () => {
    enqueueAchievement(ACH_PAYLOAD);
    const snap = getQueueSnapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]!.kind).toBe('achievement');
    expect(snap[0]!.payload).toEqual(ACH_PAYLOAD);
  });

  it('FIFO order across mixed kinds', () => {
    enqueueScore(SCORE_PAYLOAD);
    enqueueAchievement(ACH_PAYLOAD);
    enqueueScore({ ...SCORE_PAYLOAD, value: 7000 });
    const snap = getQueueSnapshot();
    expect(snap.map((e) => e.kind)).toEqual([
      'score',
      'achievement',
      'score',
    ]);
  });

  it('clearQueue empties the queue', () => {
    enqueueScore(SCORE_PAYLOAD);
    enqueueAchievement(ACH_PAYLOAD);
    clearQueue();
    expect(getQueueSnapshot()).toEqual([]);
  });
});

describe('drainQueue', () => {
  it('returns 0/0/0 on empty queue', async () => {
    const out = await drainQueue({
      submitScore: jest.fn().mockResolvedValue(true),
      reportAchievement: jest.fn().mockResolvedValue(true),
    });
    expect(out).toEqual({ attempted: 0, delivered: 0, remaining: 0 });
  });

  it('removes entries on success', async () => {
    enqueueScore(SCORE_PAYLOAD);
    enqueueAchievement(ACH_PAYLOAD);
    const submitter = {
      submitScore: jest.fn().mockResolvedValue(true),
      reportAchievement: jest.fn().mockResolvedValue(true),
    };
    const result = await drainQueue(submitter);
    expect(result).toEqual({ attempted: 2, delivered: 2, remaining: 0 });
    expect(getQueueSnapshot()).toEqual([]);
    expect(submitter.submitScore).toHaveBeenCalledWith(SCORE_PAYLOAD);
    expect(submitter.reportAchievement).toHaveBeenCalledWith(ACH_PAYLOAD);
  });

  it('keeps failures + bumps retryCount', async () => {
    enqueueScore(SCORE_PAYLOAD);
    const submitter = {
      submitScore: jest.fn().mockResolvedValue(false),
      reportAchievement: jest.fn().mockResolvedValue(true),
    };
    const result = await drainQueue(submitter);
    expect(result).toEqual({ attempted: 1, delivered: 0, remaining: 1 });
    const snap = getQueueSnapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]!.retryCount).toBe(1);
    expect(snap[0]!.lastAttemptAt).toBeGreaterThan(0);
  });

  it('thrown errors are treated as failures', async () => {
    enqueueScore(SCORE_PAYLOAD);
    const submitter = {
      submitScore: jest.fn().mockRejectedValue(new Error('net')),
      reportAchievement: jest.fn().mockResolvedValue(true),
    };
    const result = await drainQueue(submitter);
    expect(result.delivered).toBe(0);
    expect(getQueueSnapshot()[0]!.retryCount).toBe(1);
  });

  it('drops entries that have exceeded MAX_RETRIES (5)', async () => {
    // Manually craft a queue entry past the cap by repeated drain.
    enqueueScore(SCORE_PAYLOAD);
    const submitter = {
      submitScore: jest.fn().mockResolvedValue(false),
      reportAchievement: jest.fn().mockResolvedValue(true),
    };
    // 6 drain cycles — 5 ok, 6th should prune.
    for (let i = 0; i < 6; i++) {
      await drainQueue(submitter);
    }
    expect(getQueueSnapshot()).toEqual([]);
  });
});

describe('pruneQueue', () => {
  it('drops entries older than the age cap', () => {
    enqueueScore(SCORE_PAYLOAD);
    const snap = getQueueSnapshot();
    expect(snap).toHaveLength(1);
    // Simulate "now" as 31 days after enqueue.
    const future = snap[0]!.enqueuedAt + 31 * 24 * 60 * 60 * 1000;
    const survivors = pruneQueue(future);
    expect(survivors).toEqual([]);
    expect(getQueueSnapshot()).toEqual([]);
  });

  it('preserves entries within the age cap', () => {
    enqueueScore(SCORE_PAYLOAD);
    const snap = getQueueSnapshot();
    const within = snap[0]!.enqueuedAt + 1 * 24 * 60 * 60 * 1000;
    const survivors = pruneQueue(within);
    expect(survivors).toHaveLength(1);
  });
});
