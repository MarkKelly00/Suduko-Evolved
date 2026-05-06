# Wiring real Game Center

The TypeScript [`gameCenterService`](../../src/services/social/gameCenterService.ts)
is built to find a native iOS module called `SudokuGameCenter` at runtime
and route calls through it. When the module isn't present (the default
state of this repo today), every method returns a safe default so
gameplay, scoring, and persistence flows are never blocked.

When you're ready to ship leaderboards / achievements, this is the
shortest path from "stub" to "shipping":

## 1. Add the GameKit capability + Info.plist entries

In `app.json`, add the Game Center capability via
`expo-build-properties` (already installed):

```jsonc
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.sudokuevolved.app",
      "entitlements": {
        "com.apple.developer.game-center": true
      },
      "infoPlist": {
        "GKGameCenterBundleIdentifier": "com.sudokuevolved.app"
      }
    }
  }
}
```

You also need to enable Game Center in your App Store Connect record and
create at least one leaderboard (e.g. `tt.sprint-3min`) before the native
calls will succeed against a TestFlight build.

## 2. Drop the Swift module into an Expo Modules folder

Create `modules/sudoku-game-center/ios/SudokuGameCenterModule.swift` (the
folder name is the module slug; `expo prebuild` picks it up):

```swift
import ExpoModulesCore
import GameKit
import UIKit

public class SudokuGameCenterModule: Module {
    private var cachedPlayer: GKLocalPlayer? { GKLocalPlayer.local }

    public func definition() -> ModuleDefinition {
        Name("SudokuGameCenter")

        AsyncFunction("authenticate") { (promise: Promise) in
            let player = GKLocalPlayer.local
            player.authenticateHandler = { vc, error in
                if let vc = vc {
                    DispatchQueue.main.async {
                        UIApplication.shared
                            .keyWindow?.rootViewController?
                            .present(vc, animated: true, completion: nil)
                    }
                    return
                }
                if let _ = error {
                    promise.resolve(NSNull())
                    return
                }
                if player.isAuthenticated {
                    promise.resolve([
                        "id": player.gamePlayerID,
                        "alias": player.alias,
                        "displayName": player.displayName,
                    ])
                } else {
                    promise.resolve(NSNull())
                }
            }
        }

        Function("isAuthenticated") {
            return GKLocalPlayer.local.isAuthenticated
        }

        AsyncFunction("submitScore") { (leaderboardId: String, score: Int, promise: Promise) in
            GKLeaderboard.submitScore(
                score,
                context: 0,
                player: GKLocalPlayer.local,
                leaderboardIDs: [leaderboardId]
            ) { error in
                promise.resolve(error == nil)
            }
        }

        AsyncFunction("showLeaderboard") { (leaderboardId: String?, promise: Promise) in
            DispatchQueue.main.async {
                let vc: GKGameCenterViewController
                if let id = leaderboardId {
                    vc = GKGameCenterViewController(leaderboardID: id, playerScope: .friendsOnly, timeScope: .allTime)
                } else {
                    vc = GKGameCenterViewController(state: .leaderboards)
                }
                UIApplication.shared
                    .keyWindow?.rootViewController?
                    .present(vc, animated: true) { promise.resolve(nil) }
            }
        }

        AsyncFunction("reportAchievement") { (achievementId: String, percent: Double, promise: Promise) in
            let achievement = GKAchievement(identifier: achievementId)
            achievement.percentComplete = percent
            achievement.showsCompletionBanner = true
            GKAchievement.report([achievement]) { error in
                promise.resolve(error == nil)
            }
        }
    }
}
```

Then `modules/sudoku-game-center/expo-module.config.json`:

```json
{
  "platforms": ["ios"],
  "ios": { "modules": ["SudokuGameCenterModule"] }
}
```

And `modules/sudoku-game-center/ios/SudokuGameCenter.podspec`:

```ruby
require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'SudokuGameCenter'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'MIT'
  s.author = ''
  s.homepage = 'https://example.com'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.4'
  s.source = { git: '' }
  s.source_files = '**/*.{h,m,swift}'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'GameKit'
end
```

And `modules/sudoku-game-center/package.json`:

```json
{ "name": "sudoku-game-center", "version": "0.1.0", "main": "index.js" }
```

## 3. Re-prebuild and run

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npm run ios
```

The TS service auto-detects `NativeModules.SudokuGameCenter` and starts
routing real calls through it on next launch.

## 4. Trigger sign-in

`gameCenterService.authenticate()` is safe to call at app boot. The
recommended hook point is `App.tsx` after store hydration, e.g.

```ts
useEffect(() => {
  void gameCenterService.authenticate();
}, []);
```

That presents Apple's sign-in sheet on first launch (after the user opts
in via the Game Center settings prompt), and is a no-op afterward.

## 5. Friend leaderboard UI

Once authenticated, `gameCenterService.showLeaderboard(leaderboardId)`
presents the native Game Center sheet — that's the simplest premium
experience and stays current automatically. The placeholder Friends card
on `ResultsScreen` is the natural place to wire a "View leaderboard"
button.
