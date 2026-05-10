# Game Center setup — Apple Developer + App Store Connect

Manual configuration steps that ship the in-app Game Center
implementation. The code side is fully wired in (Phases 1–4 of the
integration plan). The remaining work is registering each leaderboard
and achievement in Apple's portals so submissions actually land
somewhere when the device sends them.

None of these steps are automatable — App Store Connect requires
manual entry per leaderboard and per achievement, including localized
copy and an artwork upload.

> Bundle ID is locked to `com.sudokuevolved.app`. Apple Team ID is
> `B4H49GDQ8Q`. If either of those changes, every leaderboard /
> achievement ID needs to be re-created from scratch — they're scoped
> per-app at Apple's side.

---

## 1. Apple Developer Portal

### 1.1 Confirm the App ID has Game Center capability

1. Visit <https://developer.apple.com/account/resources/identifiers/list>.
2. Open the App ID for `com.sudokuevolved.app`.
3. Under **Capabilities**, ensure **Game Center** is checked.
4. Save.

> If Game Center wasn't already on (it usually is by default), the
> next EAS build will need a fresh provisioning profile —
> `eas credentials --platform ios` will pull a refreshed one
> automatically on the next build.

The matching `com.apple.developer.game-center` entitlement is added to
the iOS build automatically by `plugins/with-game-center.js` — no
manual edit of any `.entitlements` file is needed.

---

## 2. App Store Connect — Game Center service

App Store Connect → **My Apps** → Sudoku Evolved → **Services** →
**Game Center**. The Game Center toggle should already be on (per the
recent screenshot showing "Game Center checked, Multiplayer
Compatibility v1.0").

### 2.1 Add the 6 leaderboards

For each row below, add via App Store Connect → **Leaderboards** →
**+**, fill the fields, and save. The IDs **must match exactly** —
they're the strings hardcoded in
[`src/services/gameCenter/gameCenterIds.ts`](../src/services/gameCenter/gameCenterIds.ts)
and submitted from
[`src/game/leaderboards/leaderboardSubmissions.ts`](../src/game/leaderboards/leaderboardSubmissions.ts).

| Reference Name        | ID                                                              | Sort         | Score Format                  |
| --------------------- | --------------------------------------------------------------- | ------------ | ----------------------------- |
| 3-Minute Sprint Score | `com.sudokuevolved.leaderboard.sprint_3min_score`               | High to Low  | Integer                       |
| Fastest Sprint Clear  | `com.sudokuevolved.leaderboard.sprint_fastest_clear`            | Low to High  | Elapsed Time — To Hundredths  |
| Duel Wins             | `com.sudokuevolved.leaderboard.duel_wins`                       | High to Low  | Integer                       |
| Best Duel Score       | `com.sudokuevolved.leaderboard.duel_best_score`                 | High to Low  | Integer                       |
| Logic Garden Stars    | `com.sudokuevolved.leaderboard.logic_garden_stars`              | High to Low  | Integer (max 90)              |
| Logic Garden Crowns   | `com.sudokuevolved.leaderboard.logic_garden_crowns`             | High to Low  | Integer (max 30)              |

For each leaderboard add the localizations:
- **Default language**: English (U.S.)
- **Title**: same as the Reference Name (or shorter — the leaderboard
  list cap is small)
- **Image**: 1024×1024 RGB sRGB PNG. Reuse the app icon as a
  placeholder if needed; replace later.

> ⚠️ **Sort order is permanent.** Once a leaderboard is created with
> `High to Low`, it can't be flipped to `Low to High` later — you'd
> have to deprecate the ID and create a new one. Triple-check before
> saving.

### 2.2 Add the 20 achievements

App Store Connect → **Achievements** → **+**. Same exact-match rule
on IDs. Total point sum **must equal 800**
(`src/services/gameCenter/gameCenterIds.ts` enforces this in
`ACHIEVEMENT_POINTS` and the test in
`__tests__/services/gameCenter/achievementRules.test.ts` will fail if
the sum drifts).

| Reference Name           | ID                                                           | Points |
| ------------------------ | ------------------------------------------------------------ | -----: |
| First Bloom              | `com.sudokuevolved.achievement.first_bloom`                  |     10 |
| Perfect Bloom            | `com.sudokuevolved.achievement.perfect_bloom`                |     20 |
| Seed Grove Complete      | `com.sudokuevolved.achievement.seed_grove_complete`          |     25 |
| Moonvine Stream Complete | `com.sudokuevolved.achievement.moonvine_stream_complete`     |     25 |
| Oracle Bloom Complete    | `com.sudokuevolved.achievement.oracle_bloom_complete`        |     50 |
| Logic Garden Complete    | `com.sudokuevolved.achievement.logic_garden_complete`        |     75 |
| Star Collector           | `com.sudokuevolved.achievement.star_collector`               |     25 |
| Star Harmony             | `com.sudokuevolved.achievement.star_harmony`                 |     50 |
| Perfect Constellation    | `com.sudokuevolved.achievement.perfect_constellation`        |    100 |
| Crowned Logic            | `com.sudokuevolved.achievement.crowned_logic`                |     50 |
| Crown Garden             | `com.sudokuevolved.achievement.crown_garden`                 |    100 |
| Lightning Solve          | `com.sudokuevolved.achievement.lightning_solve`              |     25 |
| Perfect Sprint           | `com.sudokuevolved.achievement.perfect_sprint`               |     50 |
| First Duel               | `com.sudokuevolved.achievement.first_duel`                   |     10 |
| Logic Rival              | `com.sudokuevolved.achievement.logic_rival`                  |     25 |
| Perfect Rivalry          | `com.sudokuevolved.achievement.perfect_rivalry`              |     50 |
| Friendly Challenge       | `com.sudokuevolved.achievement.friendly_challenge`           |     25 |
| Perfect Harmony          | `com.sudokuevolved.achievement.perfect_harmony`              |     50 |
| No Hints Needed          | `com.sudokuevolved.achievement.no_hints_needed`              |     25 |
| Take a Breath            | `com.sudokuevolved.achievement.take_a_breath`                |     10 |
| **Total**                |                                                              |  **800** |

For each achievement set:
- **Hidden / visible**: Visible (default). The Logic Garden /
  Perfect Bloom milestones are more interesting unlocked.
- **Achievable more than once**: No (default). Apple's UI says
  "Achievable Once" — leave that.
- **Default localization**: English (U.S.) — Title + Description.
- **Image**: 512×512 + 1024×1024@2x retina, RGB sRGB PNG. Generic
  placeholder is fine for v1; ship custom artwork later.

### 2.3 Suggested copy

Achievement copy intentionally references in-game language so the
unlock notifications feel branded. Adjust to fit Apple's character
limits.

| Title                  | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| First Bloom            | Clear your first level in Logic Garden.                        |
| Perfect Bloom          | Solve a level cleanly enough to earn a crown.                  |
| Seed Grove Complete    | Clear every level in the Seed Grove biome.                     |
| Moonvine Stream Complete | Clear every level in the Moonvine Stream biome.              |
| Oracle Bloom Complete  | Clear every level in the Oracle Bloom Temple biome.            |
| Logic Garden Complete  | Clear all 30 levels of Logic Garden.                           |
| Star Collector         | Earn 30 stars in Logic Garden.                                 |
| Star Harmony           | Earn 60 stars in Logic Garden.                                 |
| Perfect Constellation  | Earn all 90 stars in Logic Garden.                             |
| Crowned Logic          | Earn 10 crowns.                                                |
| Crown Garden           | Earn all 30 crowns.                                            |
| Lightning Solve        | Clear a 3-Minute Sprint puzzle.                                |
| Perfect Sprint         | Clear a Sprint with no mistakes and no hints.                  |
| First Duel             | Finish your first online duel.                                 |
| Logic Rival            | Win your first online duel.                                    |
| Perfect Rivalry        | Win a duel with a crown / perfect solve.                       |
| Friendly Challenge     | Send a challenge to a friend.                                  |
| Perfect Harmony        | Complete three or more regions in a single placement.          |
| No Hints Needed        | Clear any level without using hints.                           |
| Take a Breath          | Pause mid-puzzle and finish the level when you return.         |

---

## 3. EAS / iOS provisioning

The `com.apple.developer.game-center` entitlement is set by
[`plugins/with-game-center.js`](../plugins/with-game-center.js) on
prebuild. EAS Build picks this up automatically.

If a build ever fails with **"Provisioning profile doesn't include the
Game Center entitlement"**:

```bash
# refresh credentials so EAS pulls a fresh profile that includes
# the Game Center capability
eas credentials --platform ios

# rebuild
eas build --platform ios --profile production --auto-submit --non-interactive
```

The first build that ships this integration is **build 8**. Build 7
and earlier have no GC entitlement — submitting a score from those
builds is a no-op (the JS layer's availability guard short-circuits).

---

## 4. Device test pass

Run after the first EAS build with the entitlement lands in
TestFlight.

**Pre-requisites:**
- Real iOS device (Simulator's GameKit is unreliable).
- Device signed into a Game Center account
  (Settings → Game Center).

**Test flow:**

1. Install build 8 from TestFlight, launch the app.
2. **Opt-out path:** check that no system sign-in sheet appears at
   launch. Existing Supabase leaderboards still load on the
   Leaderboard screen. Saga Map, Time Trial, and online duels work
   identically to build 7.
3. **Opt-in path:** Settings → toggle **Connect to Game Center** on.
   - System sign-in sheet should appear.
   - Sign in.
   - Status row in Settings flips to "Connected to Game Center".
4. Complete level 1 → expect an iOS-native "First Bloom" notification
   banner. Open Settings → Show achievements → confirm First Bloom
   shows as unlocked.
5. Earn first crown → expect "Perfect Bloom".
6. Complete a Sprint → score appears in Game Center under
   `SPRINT_3MIN_SCORE`. If you cleared the puzzle, time also lands
   on `SPRINT_FASTEST_CLEAR`.
7. Win an online duel → expect "First Duel" + "Logic Rival" banners.
   Score lands on `DUEL_BEST_SCORE`. Cumulative wins increment on
   `DUEL_WINS`.
8. Tap **Show leaderboards** in Settings → native Game Center
   modal opens. Tap close.
9. Toggle Connect off → submissions stop. Native Game Center modal
   buttons in Settings disable. No errors.
10. Airplane Mode + complete a level → submission queued (you can
    inspect via dev tools — the queue persists in MMKV under
    `gameCenter.pendingQueue`). Restore network → next foreground or
    next successful submit drains the queue.
11. Sign-in cancellation: toggle Connect on, dismiss the sheet.
    Status flips to "Sign in dismissed — try again on next launch."
    Apple won't let us re-present until the next app launch.

If any step fails, the JS-side `__DEV__` console will log specifics
(`[gameCenterService] ...`). Production logs are silent by design.

---

## 5. Reference

- **In-app code:** [`src/services/gameCenter/`](../src/services/gameCenter/)
- **Native bridge:** [`modules/expo-game-center/ios/SudokuGameCenterModule.swift`](../modules/expo-game-center/ios/SudokuGameCenterModule.swift)
- **Config plugin:** [`plugins/with-game-center.js`](../plugins/with-game-center.js)
- **Achievement rules:** [`src/game/achievements/achievementRules.ts`](../src/game/achievements/achievementRules.ts)
- **Leaderboard submitters:** [`src/game/leaderboards/leaderboardSubmissions.ts`](../src/game/leaderboards/leaderboardSubmissions.ts)
- **Apple docs:** <https://developer.apple.com/documentation/gamekit/initializing-and-configuring-game-center>
