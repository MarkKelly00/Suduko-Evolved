# Sudoku Evolved

iOS-first premium mobile Sudoku game built on React Native + Expo. Pure
Sudoku rules wrapped in a cinematic feel: saga-map progression, completion
VFX, streaks, combos, stars, and crowns.

This repo contains the **Phase 1–3 vertical slice** — scaffold, engine, and
the core gameplay loop. Phases 4–7 (Skia VFX polish, Time Trial mechanics,
profile UX, performance pass) ship in follow-up sessions.

## Quick start

```bash
# Install JS deps
npm install

# Run the engine + persistence Jest suite (pure TS, no native build needed)
npm test

# Type-check without emitting JS
npm run typecheck

# Lint
npm run lint
```

## Running on iOS

MMKV and `@shopify/react-native-skia` are native modules, so they will not
run in Expo Go. You must `prebuild` and run a native build at least once.

```bash
# Generate ios/ + android/ folders from app.json (only needed once or after
# changing native plugins/config)
npm run prebuild:ios

# Install pods (after prebuild)
cd ios && pod install && cd ..

# Build and launch on the iOS simulator
npm run ios
```

Requirements:

- Xcode 15+ installed (Command Line Tools too).
- CocoaPods (`brew install cocoapods` if missing).
- An iOS simulator booted (`xcrun simctl list devices`) or a connected
  device.

> Note: This repo does not commit the `ios/` or `android/` directories —
> they regenerate from `app.json` via `expo prebuild` and stay out of source
> control.

## Architecture

```
src/
  app/                  Root App + navigation
    App.tsx             Hydrates stores, wires gesture handler + nav theme
    navigation/         Stack navigator + typed route params
  screens/              One file per route (Home, Map, Game, Results, etc.)
  game/
    engine/             Pure-TypeScript Sudoku engine (zero RN imports)
      types.ts          CellValue, Grid, Puzzle, ScoreBreakdown, ...
      rng.ts            Deterministic mulberry32 + FNV-1a hash
      puzzleSeeds.ts    3 hand-verified solution grids + level seeds
      sudokuSolver.ts   Bitmask + MRV backtracking (solve + countSolutions)
      sudokuGenerator.ts Transform chain + cell removal w/ uniqueness check
      moveValidator.ts  Conflict + correctness check
      completionDetector.ts Diff-based row/col/box/numberSet/puzzle events
      scoring.ts        Score, stars, XP
    state/              Zustand stores (game session, progress, settings)
    content/            Level + world definitions
    modes/              Campaign / Time Trial / Daily orchestrators
  components/
    board/              SudokuBoard, SudokuCell, NumberPad, CompletionOverlay
    map/                LevelNode (saga map)
    ui/                 GlassCard, PremiumButton, TopBar, etc.
    effects/            (Phase 4 — Skia overlays)
  services/
    audio/              audioService + sfx registry (no-op until Phase 4)
    haptics/            expo-haptics wrapper
    persistence/        MMKVStorage + InMemoryStorage + versioned schema
    social/             Game Center, leaderboard, friend-challenge stubs
  theme/                Colors, typography, spacing, motion, shadows
  utils/                cn, clamp, formatTime, seedRandom
```

### Engine guarantees

- Every generated puzzle has **exactly one solution** (uniqueness verified
  per removed cell via `countSolutions(grid, 2)`).
- Generation is **fully deterministic**: same seed string → identical
  puzzle on every JavaScript engine.
- Pure TypeScript — no external Sudoku solvers, no native deps. Engine and
  persistence layers run under Jest with no native module setup.

### Persistence

`src/services/persistence/` exposes a `Storage` interface with two
implementations:

- `MMKVStorage` — used at runtime, lazy-requires `react-native-mmkv` so
  importing the storage module from a Node environment (Jest) doesn't
  crash.
- `InMemoryStorage` — used by tests and any non-RN environment.

Schema versioning lives in `schema.ts`. Bumping `SCHEMA_VERSION` and adding
a branch to `migrateProgress` / `migrateSettings` lets us evolve the
on-disk shape without losing player data.

## Stack

| Layer                | Library                                              |
| -------------------- | ---------------------------------------------------- |
| Framework            | Expo SDK 54 (React Native 0.81, React 19.1)          |
| New Architecture     | Enabled (mandatory for Reanimated 4)                 |
| Navigation           | `@react-navigation/native` + `native-stack`          |
| Animation            | `react-native-reanimated` 4                          |
| Graphics             | `@shopify/react-native-skia` 2 (used in Phase 4+)    |
| Gestures             | `react-native-gesture-handler`                       |
| State                | `zustand`                                            |
| Persistence          | `react-native-mmkv`                                  |
| Haptics              | `expo-haptics` (placeholder; native Core Haptics later) |
| Audio                | `expo-audio` (no asset files yet — Phase 4 wires SFX)|
| Tests                | Jest + `jest-expo` preset                            |

## Phase status

- **Phase 1 — Scaffolding** ✅ project, deps, tooling, folders.
- **Phase 2 — Engine** ✅ types, RNG, generator, solver, validator,
  completion detector, scoring, persistence, **61 unit tests passing**.
- **Phase 3 — Core gameplay loop** ✅ Home, Map, Game, Results, Profile,
  TimeTrial, Settings; board renders; placement + erase + undo + notes
  work; row/col/box/numberSet/puzzle completion events trigger haptics
  and an animated label chip; progress persists across reloads via MMKV.
- **Phase 4 — Cinematic VFX & audio polish** ⏳ Skia overlay (RowSweep,
  ColumnBeam, BoxBurst, ComboText, LogicBloom), real SFX assets, fine-
  tuned haptics, animated home / map backgrounds.
- **Phase 5 — Results polish** ⏳ XP animation, crown reveal, friend
  leaderboard preview UI.
- **Phase 6 — Time Trial + social + profile** ⏳ 3-Minute Sprint, daily
  seed run, Game Center native module, full ProfileScreen surfaces,
  AppState foreground-handling for the timer.
- **Phase 7 — Polish, perf, manual QA** ⏳ profiling, jank reduction,
  additional component tests.

## Manual QA path (Phase 3)

Once you have it running on the simulator:

1. App opens to **Home**.
2. Tap **Saga Map** → 30 nodes; node 1 is current, the rest are locked.
3. Tap node 1 → **Game** screen with a real Sudoku board.
4. Tap a non-given cell → it highlights; same row/col/box/same-number
   highlights light up.
5. Tap a number on the pad → it places. Wrong → mistake counter ticks,
   warning haptic. Right → streak ticks, light haptic.
6. Toggle **Notes** → tapping numbers now toggles candidate notes for
   the selected cell.
7. **Undo** (up to 20 deep) reverts last placement / note toggle.
8. Complete a row → "Row Complete" chip flashes, medium haptic.
9. Complete the puzzle → score + stars + XP computed; nav replaces with
   **Results**.
10. Tap **Next Level** → next level unlocks, board boots into level 2.
11. Force-quit and relaunch → progress, stars, last played level all
    persisted.
12. **Settings** → toggles persist; "Reset local progress" wipes.

## Known limitations / next steps

- No real audio assets — `audioService` is currently a no-op contract.
  Phase 4 wires the assets through `sfxRegistry`.
- The completion overlay is a placeholder Reanimated chip. Phase 4 layers
  a Skia `<Canvas>` for sweep / beam / burst / Logic Bloom particle effects.
- Time Trial UI is visible/navigable but the sprint loop ships in Phase 6.
- Game Center, leaderboards, and friend challenges are typed stubs.
  Hooking the real iOS native module is a Phase 6 task — bundle ID
  `com.sudokuevolved.app` is reserved for it in `app.json`.
- Timer doesn't yet account for backgrounding/foregrounding (TODO comment
  in `useGameStore`). Phase 6 wires `AppState`.
- Symmetric cell removal (rotational pair) is intentionally **off** for
  MVP across all difficulties to maximize generation success rate. Worth
  revisiting in product polish.

## Bundle identity

| Field             | Value                       |
| ----------------- | --------------------------- |
| iOS bundle id     | `com.sudokuevolved.app`     |
| Android package   | `com.sudokuevolved.app`     |
| URL scheme        | `sudokuevolved`             |
| iOS deployment    | 15.1                        |
| Orientation       | Portrait only (phone-first) |

Update `app.json` if you need to ship under a different identifier.
