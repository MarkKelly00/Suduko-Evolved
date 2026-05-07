// Sudoku Evolved — submit-level-score (Phase 8 placeholder)
//
// Future scope:
//   * Verify the user from the JWT in the Authorization header.
//   * Look up the level by levelId; re-derive the puzzle from puzzleSeed.
//   * Replay the moveCount/time and reject scores that are impossible.
//   * UPSERT into level_scores with a canonical row.
//   * Update profile aggregates server-side.
//
// MVP simply rejects with 501 — the client writes directly via PostgREST
// with RLS protecting writes by user_id.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(() =>
  new Response(
    JSON.stringify({ error: 'submit-level-score is not implemented yet' }),
    {
      status: 501,
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
      },
    },
  ),
);
