-- Sudoku Evolved — performance: cover the winner_id FK with a partial index.
-- Addresses Supabase performance advisor's `unindexed_foreign_keys` finding
-- on `challenges.winner_id`. Partial because the column is null until the
-- challenge completes.

CREATE INDEX IF NOT EXISTS challenges_winner_id_idx
  ON public.challenges (winner_id)
  WHERE winner_id IS NOT NULL;
