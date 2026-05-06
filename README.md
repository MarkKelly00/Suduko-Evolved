# Sudoku Evolved

iOS-first premium mobile Sudoku game built on React Native + Expo. Pure
Sudoku rules wrapped in a cinematic feel: saga-map progression, completion
VFX, streaks, combos, stars, crowns, and 3-Minute Sprint Time Trials.

This repo is the **production-shaped vertical slice**: scaffold, engine,
campaign, Time Trial sprint, Skia/Reanimated effect layer, drop-in audio
service, and Game Center wiring point. Future polish (real SFX assets,
native Game Center module, Skia upgrade, additional worlds) lands on top
without refactor.

## Quick start

```bash
# Install JS deps
npm install

# Pure-TypeScript test suite (no native build needed)
npm test

# Type-check + lint
npm run typecheck
npm run lint

# Health check on Expo SDK + peer deps
npx expo-doctor
```

## Running on iOS

`react-native-mmkv` (Nitro Modules), `react-native-reanimated` 4 + worklets,
and `@shopify/react-native-skia` are native modules, so the app needs a
prebuild + native build (it will not run in Expo Go).

```bash
# Generate ios/ from app.json (only needed once or after changing native
# plugins/config). Path MUST NOT contain spaces — Expo and Cocoapods
# scripts choke on spaces in paths.
npm run prebuild:ios

# Install pods (after prebuild)
cd ios && pod install && cd ..

# Build and launch on the iOS simulator (or a connected device)
npm run ios
```

Requirements:

- Xcode 15+ (Command Line Tools alone is not enough).
  - If `xcode-select -p` points at `/Library/Developer/CommandLineTools`,
    set `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` for the
    session, or run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
    once.
- CocoaPods (`brew install cocoapods` if missing — Homebrew bundles a
  portable Ruby, so this works even if your system has no `gem`).
- An iOS simulator booted (`xcrun simctl list devices`) or a connected
  device.

> Note: This repo does not commit the `ios/` or `android/` directories —
> they regenerate from `app.json` via `expo prebuild` and stay out of source
> control.

## Architecture

```
src/
  app/                  Root App + navigation
    App.tsx             Hydrates stores, wires gesture handler / reanimated /
                        AppState pause hook, nav theme
    navigation/         Stack navigator + typed route params
  screens/              One file per route
    HomeScreen          Premium home with XP/streak pills + nav buttons
    MapScreen           Saga map ribbon (30 nodes for World 1)
    GameScreen          Campaign play loop, paused scrim, results dispatch
    TimeTrialScreen     Mode menu + best scores per mode
    TimeTrialGameScreen 3-Minute Sprint loop (downward clock + auto end)
    ResultsScreen       Stars/crown/XP, sprint-aware copy + CTAs
    ProfileScreen       XP, stars, crowns, time-trial bests
    SettingsScreen      Sound / haptics / accessibility / reset
  game/
    engine/             Pure-TypeScript Sudoku engine (zero RN imports)
      types.ts          CellValue, Grid, Puzzle, ScoreBreakdown, ...
      rng.ts            Deterministic mulberry32 + FNV-1a hash
      puzzleSeeds.ts    3 hand-verified solution grids + level seeds
      sudokuSolver.ts   Bitmask + MRV backtracking (solve + countSolutions)
      sudokuGenerator.ts Transform chain + cell removal w/ uniqueness check
      moveValidator.ts  Conflict + correctness check
      completionDetector.ts Solution-aware row/col/box/numberSet/puzzle events
      scoring.ts        Score, stars, XP
    state/              Zustand stores (game session, progress, settings)
    content/            Level + world definitions (World 1 = Logic Garden)
    modes/              campaign, timeTrial, dailyPuzzle orchestrators
  components/
    board/              SudokuBoard, SudokuCell, NumberPad, CompletionOverlay
                        (the latter is now an audio/haptics dispatcher only)
    map/                SagaMap (coordinator), LevelNode (Pressable nodes),
                        ParallaxBackdrop / GardenBackground /
                        AnimatedLogicPath / VineDecorations /
                        GardenLandmarks / ParticleField /
                        WorldHeaderEmblem (all Skia-based world layers),
                        mapLayout.ts + mapMath.ts (single source of truth)
    ui/                 GlassCard, PremiumButton, TopBar, ProgressRing, ...
    effects/            EffectsLayer + RowSweep, ColumnBeam, BoxBurst,
                        LogicBloom, ComboText (Reanimated 4 on the UI thread)
  services/
    audio/              audioService + sfxRegistry (expo-audio, drop-in MP3s)
    haptics/            expo-haptics wrapper, ready for native Core Haptics
    persistence/        MMKVStorage (createMMKV factory) + InMemoryStorage +
                        versioned schema with migrations
    social/             gameCenterService (NativeModules.SudokuGameCenter
                        with safe defaults), leaderboardService (auto-routes
                        to Game Center when authed), friendChallengeService
  theme/                Colors, typography, spacing, motion, shadows, layout
  utils/                clamp, formatTime, seedRandom

assets/
  sfx/                  Drop-in folder for SFX MP3s (see assets/sfx/README.md)

docs/
  native/game-center.md Recipe for shipping the native Swift module
```

### Engine guarantees

- Every generated puzzle has **exactly one solution** (uniqueness verified
  per removed cell via `countSolutions(grid, 2)`).
- Generation is **fully deterministic**: same seed string → identical
  puzzle on every JavaScript engine.
- Completion events are **solution-aware**: a row that's been "filled with
  the wrong values" never triggers a row-complete VFX or a win, only
  `solution-correct` regions do.
- Pure TypeScript — no external Sudoku solvers, no native deps. Engine and
  persistence layers run under Jest with no native module setup.

### Persistence

`src/services/persistence/` exposes a `Storage` interface with two
implementations:

- `MMKVStorage` — used at runtime, lazy-requires `react-native-mmkv` 4.x
  via the `createMMKV({ id })` factory (the v4 API replaced the v3 class
  constructor — old `new MMKV(...)` code crashes on launch).
- `InMemoryStorage` — used by tests and any non-RN environment.

Schema versioning lives in `schema.ts`. Bumping `SCHEMA_VERSION` and
adding a branch to `migrateProgress` / `migrateSettings` lets us evolve
the on-disk shape without losing player data.

### Timer + AppState

Sessions track `startedAt`, `pausedTotalMs`, and `pausedAt` so the visible
timer is always wall-clock-accurate even after a background suspend.
`App.tsx` registers an `AppState` listener that auto-calls
`pauseSession()` whenever the OS suspends the app; the player taps
**Resume** on a scrim overlay when they come back. Time Trial sprints
share the exact same machinery, plus a `timeLimitMs` that converts
`tickTimer` into a graceful `timedOut` end.

### Saga Map (World 1: Logic Garden)

The map is a layered Skia + Reanimated 2.5D world rather than a vertical
list. [`SagaMap`](src/components/map/SagaMap.tsx) is the coordinator;
every visual layer derives its geometry from a single source of truth in
[`mapLayout.ts`](src/components/map/mapLayout.ts) (the 30 nodes, their
biome, and the 7 landmark anchors) plus the bezier helpers in
[`mapMath.ts`](src/components/map/mapMath.ts).

Layer stack (back → front):

| Layer | File | Notes |
| --- | --- | --- |
| Parallax backdrop | `ParallaxBackdrop.tsx` | Fixed Skia: deep navy radial gradient + faint neural grid + 8 distant orbs + top/bottom vignette. Drives parallax from a single Reanimated `scrollY` shared value (factor 0.18). |
| Terrain blobs | `GardenBackground.tsx` | In-scroll Skia: one large radial-gradient circle per cluster of ~5 nodes, with a darker undershadow + cyan rim hint to fake 3D form. |
| Vines + blossoms | `VineDecorations.tsx` | In-scroll Skia: short bezier curls springing off path midpoints, with biome-tinted blossom dots. Opacity scales with completed/unlocked progress (locked regions read as dormant). |
| Logic path | `AnimatedLogicPath.tsx` | In-scroll Skia: one quadratic bezier through every node, drawn 5x (outer glow, locked-tail tint, mid cyan, completed green overlay, gold core) plus a traveling pulse on the current segment. |
| Landmarks | `GardenLandmarks.tsx` | In-scroll Skia: procedural milestones (Seed Gate, Glass Sprout Bridge, Crystal Logic Fountain, Moonvine Crossing, Golden Ratio Grove, Oracle Bloom, Logic Garden Temple) at levels 1/5/10/15/20/25/30. |
| Level nodes | `LevelNode.tsx` | The only tappable surface. Bevel disc + outer halo + top-left highlight + bottom-right shadow + frost overlay (locked) + breathing scale (current) + one-shot Logic Bloom (newly unlocked). |
| Particle field | `ParticleField.tsx` | Fixed-foreground Skia: 60 ambient pollen particles + an imperative `burstAt(x, y, color)` for unlock celebrations. |
| Header emblem | `WorldHeaderEmblem.tsx` | Tiny Skia 8-petal flower with slow rotate + opacity pulse, sits next to the world title. |

Unlock animation flow (visual-only — no store mutation):

1. `SagaMap` keeps a `useRef` of the previous `unlockedLevels` array.
2. When a new id appears, it is added to a local `newlyUnlocked` list with
   a 1.5 s TTL.
3. The new id propagates to `LevelNode.isNewlyUnlocked` (one-shot bloom)
   and to `ParticleField.burstAt` (gold/cyan particle burst at the node's
   screen coordinates).
4. The path automatically re-segments because `AnimatedLogicPath` reads
   the same store selectors — completed/unlocked colouring updates without
   any explicit "sweep" event needed.

Performance:

- Five Skia `<Canvas>` surfaces total (backdrop, terrain, vines, path,
  landmarks, particles, emblem) — but every Canvas is leaf-leveled so each
  is independently snapshotted by Skia, not per-element.
- Path/vine/landmark/blob geometry is `useMemo`-cached against
  `(layout, width)`. They only recompute on rotation / split-view resize.
- The parallax + traveling-pulse animations live entirely in
  Reanimated 4 worklets — zero per-frame JS bridge crossings.
- Particle drift uses `withRepeat`/`withSequence` chains so the JS thread
  is idle while the field is alive.
- `Reduced Motion` (existing setting) collapses the parallax factor to 0,
  halts the breathing scale + traveling pulse, drops the ambient particle
  pool to 0, and shortens unlock bursts to ~0.5 s.

Future World 2 reuse:

- The `MapNodeLayout` type, `mapLayout.ts` patterns, and every layer
  component were designed to be world-agnostic. To reskin: drop a
  `world2NodeLayout`, add a `world2 / World 2` palette block to
  [`colors.ts`](src/theme/colors.ts) (mirrors the existing `garden*` set),
  and parameterize SagaMap on a `worldId` to pick which layout + palette
  to read.

### VFX

`EffectsLayer` is a single absolutely-positioned overlay that listens to
`useGameStore.selectLastEvents` and renders short-lived effect components
on top of the board:

| Effect      | Trigger                       | Visual                                   |
| ----------- | ----------------------------- | ---------------------------------------- |
| `RowSweep`  | Row solved correctly          | Gold "comet" left → right                |
| `ColumnBeam`| Column solved correctly       | Gold beam top → bottom                   |
| `BoxBurst`  | 3×3 box solved correctly      | Radial wash + expanding ring + core pulse|
| `LogicBloom`| Puzzle solved                 | Center bloom → expanding ring            |
| `ComboText` | Any completion / multi-event  | Floating gold label, name picked by combo|

Per-cell, `SudokuCell` adds a **scale pop** for correct placements and a
**shake** for mistakes via Reanimated shared values (UI thread). All
animations short-circuit to a quick fade when **Reduced Motion** is on.

The architecture is shaped so individual effect components can be swapped
for Skia-canvas implementations later without touching `EffectsLayer` or
the engine — same prop shape, same lifetime contract.

### Audio

`audioService` is a typed Expo Audio wrapper. The registry
(`sfxRegistry.ts`) starts empty so the app stays silent by default.
Dropping MP3s in `assets/sfx/` and registering them produces audio
immediately — see [`assets/sfx/README.md`](assets/sfx/README.md) for the
exact recipe and a recommended sound-design direction. Gameplay never
blocks on missing audio.

### Game Center

`gameCenterService` looks for an iOS-only `NativeModules.SudokuGameCenter`
at runtime. When absent (today), every method returns a safe default and
the rest of the app keeps working. When present (future), it routes
through the native bridge. The full recipe — including a working Swift
module starter, podspec, and Info.plist + entitlements snippets — lives
at [`docs/native/game-center.md`](docs/native/game-center.md).

`leaderboardService.submitLocalScore` is called by both `GameScreen` (on
campaign win) and `TimeTrialGameScreen` (on sprint end). Each submission
carries the puzzle seed + level + move count so a future server can
re-simulate the run for anti-cheat.

## Stack

| Layer                | Library                                              |
| -------------------- | ---------------------------------------------------- |
| Framework            | Expo SDK 54 (React Native 0.81, React 19.1)          |
| New Architecture     | Enabled (mandatory for Reanimated 4 + Nitro MMKV)    |
| Navigation           | `@react-navigation/native` + `native-stack`          |
| Animation            | `react-native-reanimated` 4 + `react-native-worklets`|
| Graphics             | `@shopify/react-native-skia` 2 (effects layer ready) |
| Gestures             | `react-native-gesture-handler`                       |
| State                | `zustand`                                            |
| Persistence          | `react-native-mmkv` 4 (Nitro Modules)                |
| Haptics              | `expo-haptics` (Core Haptics native upgrade later)   |
| Audio                | `expo-audio`                                         |
| Build properties     | `expo-build-properties` (iOS deploy target 15.1)     |
| Tests                | Jest + `jest-expo` preset                            |

## Phase status

- **Phase 1 — Scaffolding** ✅ project, deps, tooling, folders.
- **Phase 2 — Engine** ✅ types, RNG, generator, solver, validator,
  solution-aware completion detector, scoring, persistence, **71 unit
  tests passing**.
- **Phase 3 — Core gameplay loop** ✅ Home, Map, Game, Results, Profile,
  TimeTrial menu, Settings; board renders 9 columns correctly; placement
  + erase + undo + notes work; row/col/box/numberSet/puzzle completion
  events trigger haptics, audio dispatch, and a chip overlay; progress
  persists across reloads via MMKV.
- **Phase 4 — Cinematic VFX & audio polish** ✅ `EffectsLayer` with
  RowSweep, ColumnBeam, BoxBurst, LogicBloom, ComboText, plus per-cell
  pop and mistake shake. `audioService` is real (`expo-audio`); drop in
  MP3s under `assets/sfx/` to make sound. The Skia upgrade is the
  natural next step — components are isolated and ready to swap.
- **Phase 5 — Results polish** ⏳ XP animation, crown reveal, friend
  leaderboard preview UI.
- **Phase 6 — Time Trial + social + profile** ✅ 3-Minute Sprint and Daily
  Sprint playable; AppState foreground-handling for the timer (pauses on
  suspend, resumes on user tap); per-mode bests persist; `gameCenterService`
  + `leaderboardService` route through optional native module. Full
  ProfileScreen surfaces and the native Game Center module itself ship
  in Phase 6.5 — see [`docs/native/game-center.md`](docs/native/game-center.md).
- **Phase 7 — Polish, perf, manual QA** ⏳ profiling, jank reduction,
  additional component tests.

## Manual QA path

1. App opens to **Home** with XP/streak pills + nav buttons.
2. Tap **Saga Map** → 30 nodes; node 1 is current/unlocked, the rest are
   locked.
3. Tap node 1 → **Game** screen with a real Sudoku board (all 9 columns
   render).
4. Tap a non-given cell → it highlights; same row/col/box and same-number
   peer cells light up subtly.
5. Tap a number on the pad → it places.
   - Wrong → cell text turns red (persistent), background goes soft red
     (persistent until corrected), cell shakes once.
   - Right → cell text gold, brief scale pop, light haptic, streak ticks.
6. Toggle **Notes** → tapping numbers now toggles candidate notes for
   the selected cell.
7. **Undo** (up to 20 deep) reverts the last placement / note toggle.
8. Complete a row → gold sweep across the row, "Row Complete" chip,
   medium haptic.
9. Complete the puzzle → Logic Bloom from board center, success haptic
   chord, nav replaces with **Results**. Stars + XP + score show.
10. Tap **Next Level** → next level unlocks, board boots into level 2.
11. Press **Pause** in the top right → scrim with **Resume**, timer
    freezes; tap Resume to continue without time loss.
12. Background the app via Home gesture → on return, the paused scrim is
    showing automatically; timer didn't accumulate background seconds.
13. **Time Trial** → tap **3-Minute Sprint** → **Start sprint** → solve as
    much as you can; clock turns amber under 30s, red under 10s. On
    completion or 0:00 you get a sprint-flavoured Results screen with
    "Race Again" / "Time Trial Menu" CTAs. Best score persists.
14. Force-quit and relaunch → progress, stars, last played level, time
    trial bests, and settings all persisted via MMKV.
15. **Settings** → toggles persist; "Reset local progress" wipes.

## Known limitations / next steps

- **No real audio assets ship in repo.** Drop MP3s in `assets/sfx/` and
  register them in `sfxRegistry.ts` (one-line `require()`). The audio
  service rebuilds players idempotently.
- **Skia VFX upgrade** — current effects use Reanimated shared values +
  `View` shadows. Each effect file is self-contained, so swapping in
  `@shopify/react-native-skia` `<Canvas>` per effect is a leaf change.
- **Game Center native module** is intentionally not in the bundle —
  follow [`docs/native/game-center.md`](docs/native/game-center.md) to
  ship a Swift Expo Module and the JS service auto-detects + routes.
- **Symmetric cell removal** (rotational pair) is intentionally off for
  MVP across all difficulties to maximize generation success rate. Worth
  revisiting in product polish.
- **Friend graph / server leaderboards** — backend is out of scope. The
  service contract carries enough metadata (puzzle seed, level, move
  count, mistakes, hints, timestamp) to support replay-validation when
  the server lands.

## Troubleshooting

- **`Cannot read property 'prototype' of undefined` on launch** — usually
  means a peer dep (`react-native-worklets`, `expo-asset`) is missing.
  Run `npx expo-doctor` and `npx expo install <package>` for any flagged
  packages, then `npm run prebuild:ios && cd ios && pod install`.
- **Missing rightmost board column** — the board container has a 2px
  border. `SudokuBoard` accounts for this in its sizing math; if you
  reduce `boardMaxWidth` make sure to leave room for the border or 9
  cells will not fit.
- **`pod install` warns about `find: Projects/Sudoku: No such file`** —
  caused by spaces in the project path. Move the repo to a path without
  spaces (`/Users/you/Code/SudokuEvolved` etc).
- **`Unexpected XCode version string ''`** during `pod install` — your
  `xcode-select -p` is pointing at Command Line Tools instead of Xcode.
  Set `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` or run
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.

## Bundle identity

| Field             | Value                       |
| ----------------- | --------------------------- |
| iOS bundle id     | `com.sudokuevolved.app`     |
| Android package   | `com.sudokuevolved.app`     |
| URL scheme        | `sudokuevolved`             |
| iOS deployment    | 15.1 (via `expo-build-properties`) |
| Orientation       | Portrait only (phone-first) |

Update `app.json` if you need to ship under a different identifier.
