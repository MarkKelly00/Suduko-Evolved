// Sudoku Evolved — submit-challenge-attempt (Phase 8 placeholder)
//
// Future scope:
//   * Verify caller is challenger or opponent.
//   * Verify the challenge isn't expired.
//   * Insert challenge_attempts row.
//   * Trigger recomputes winner_id once both attempts are present.
//
// MVP path goes directly through PostgREST + the `resolve_challenge_on_attempt`
// trigger defined in db/004_views.sql.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(() =>
  new Response(
    JSON.stringify({ error: 'submit-challenge-attempt is not implemented yet' }),
    {
      status: 501,
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
      },
    },
  ),
);
