// SudokuGameCenterModule
//
// Phase 1 (this file): a no-op stub that registers the module name with
// Expo Modules Core so JS can call `requireNativeModule('SudokuGameCenter')`
// without crashing the bridge. Every method resolves with a typed result
// indicating Game Center is unavailable. This lets the rest of the app —
// services, settings store, UI surfaces — be built and shipped safely
// before any real GameKit wiring lands in Phase 2.
//
// Phase 2 will replace each AsyncFunction body with actual GameKit calls:
//   - GKLocalPlayer.local.authenticateHandler
//   - GKLeaderboard.submitScore(_:context:player:leaderboardIDs:completionHandler:)
//   - GKAchievement.report(_:withCompletionHandler:)
//   - GKGameCenterViewController presented on the root UIViewController
//
// Until Phase 2 lands, the entitlement is in place (so EAS provisions the
// build with Game Center enabled) but no GameKit code path is exercised —
// that means no system sign-in sheet pops, no scores submit, and no
// achievements report. Existing gameplay is untouched.

import ExpoModulesCore

public class SudokuGameCenterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SudokuGameCenter")

    // Returns whether the device + GameKit framework are usable. Phase 1
    // hardcodes false; Phase 2 will return true when GKLocalPlayer reports
    // the framework is reachable (effectively always true on iOS, but the
    // check lets us gate UI on it just in case).
    AsyncFunction("isAvailable") { () -> Bool in
      return false
    }

    // Whether the local player is currently authenticated. Phase 1 always
    // false — Phase 2 will read GKLocalPlayer.local.isAuthenticated.
    AsyncFunction("isAuthenticated") { () -> Bool in
      return false
    }

    // Trigger the auth flow. The `presentSignIn` flag controls whether we
    // present the system sign-in sheet when GameKit asks for one (true on
    // explicit Settings opt-in, false on background drains of the queue).
    // Phase 1 immediately resolves with `requiresSignIn: true` so callers
    // can exercise the flow shape without anything actually happening.
    AsyncFunction("authenticate") {
      (presentSignIn: Bool) -> [String: Any] in
      return [
        "authenticated": false,
        "available": false,
        "requiresSignIn": presentSignIn,
        "phase": 1,
      ] as [String: Any]
    }

    // Read identity for the currently authenticated player. Phase 1
    // returns nil-ish — Phase 2 reads GKLocalPlayer.local.{alias,
    // displayName, gamePlayerID, teamPlayerID}.
    AsyncFunction("getLocalPlayer") { () -> [String: Any?]? in
      return nil
    }

    // Submit a single score to a leaderboard. Phase 1 swallows the call
    // and resolves with a stub success so the JS-side queue/retry logic
    // can be unit tested without GameKit. Phase 2 will actually call
    // GKLeaderboard.submitScore on the iOS-14+ API.
    AsyncFunction("submitScore") {
      (leaderboardID: String, value: Int) -> [String: Any] in
      return [
        "ok": true,
        "submitted": false,
        "leaderboardID": leaderboardID,
        "value": value,
        "phase": 1,
      ] as [String: Any]
    }

    // Report a single achievement at a percent (0-100). Phase 1 swallows
    // and reports stub success; Phase 2 will instantiate GKAchievement +
    // GKAchievement.report.
    AsyncFunction("reportAchievement") {
      (achievementID: String, percentComplete: Double) -> [String: Any] in
      return [
        "ok": true,
        "submitted": false,
        "achievementID": achievementID,
        "percentComplete": percentComplete,
        "phase": 1,
      ] as [String: Any]
    }

    // Show the native Game Center modal scoped to a leaderboard, the
    // achievements list, or the dashboard. Phase 1 is a no-op; Phase 2
    // will instantiate GKGameCenterViewController + present on the root
    // VC's main thread.
    AsyncFunction("showLeaderboard") {
      (leaderboardID: String?) -> [String: Any] in
      return ["presented": false, "phase": 1] as [String: Any]
    }

    AsyncFunction("showAchievements") { () -> [String: Any] in
      return ["presented": false, "phase": 1] as [String: Any]
    }

    AsyncFunction("showDashboard") { () -> [String: Any] in
      return ["presented": false, "phase": 1] as [String: Any]
    }

    // Wipe all achievements for the current player. Destructive. Guarded
    // both with #if DEBUG here AND with __DEV__ in JS — never reachable
    // from a release build's UI.
    AsyncFunction("resetAchievementsDevOnly") { () -> [String: Any] in
      #if DEBUG
        // Phase 1: stub. Phase 2 will call GKAchievement.resetAchievements.
        return ["ok": true, "phase": 1] as [String: Any]
      #else
        return ["ok": false, "error": "release-build"] as [String: Any]
      #endif
    }
  }
}
