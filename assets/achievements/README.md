# Achievement icons

20 PNGs at 256 × 256, one per Game Center achievement (short ID, no prefix).

## Re-generating

1. Paste the prompt from `~/.claude/plans/review-the-following-prompt-atomic-lamport.md`
   (the Appendix section) into Grok Imagine. Iterate until the 4×5 grid matches the
   spec (tile alignment, tier colours, glyph correctness, numeric inlays clean).
2. Save the result as `~/Downloads/sudokuevolved-achievements-grid.png` (or anywhere
   convenient — pass the path via `--in`).
3. Install `sharp` once: `npm install`.
4. Run the slicer:
   ```
   node scripts/slice-achievement-icons.mjs --in ~/Downloads/sudokuevolved-achievements-grid.png
   ```
5. Open three random PNGs and confirm the right glyph is in the right cell.
6. Uncomment the matching lines in
   [`src/components/achievements/achievementAssets.ts`](../../src/components/achievements/achievementAssets.ts)
   so `<AchievementGlyph>` switches from the fallback placeholder to the real PNG.

## Mapping

The slicer reads `scripts/achievement-icon-grid.json` for the row-major layout.
The 20 IDs there are short forms (no `com.sudokuevolved.achievement.` prefix) and
must match the keys in `achievementAssets.ts` and the filenames here.
