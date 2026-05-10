// SudokuGameCenterModule
//
// Real Apple Game Center / GameKit bridge. Phase 2 swaps the Phase 1
// stubs with concrete GKLocalPlayer / GKLeaderboard / GKAchievement
// calls. The JS side (gameCenterService.ts) is unchanged — every
// AsyncFunction's name + signature is identical to the stub.
//
// Threading rules followed by every method:
//   • Anything touching UIKit (presenting GKGameCenterViewController,
//     presenting Apple's sign-in sheet) is dispatched onto
//     DispatchQueue.main. GameKit's framework code is mostly main-
//     thread-only, and Apple emits warnings/crashes if you violate
//     this even when the call appears to "work" off-thread.
//   • Network-bound completion handlers (submitScore, report,
//     resetAchievements) hop back to the main queue before resolving
//     the promise — the Expo Modules dispatcher doesn't care, but it
//     keeps consistent ordering with the UIKit calls.
//
// Result-shape contract (must match modules/expo-game-center/src/types.ts):
//   • Every AsyncFunction resolves a `[String: Any]` keyed dict.
//   • Errors surface as fields (`error`, `ok: false`) — never throw.
//   • The JS layer treats `ok && submitted` as "actually delivered".

import ExpoModulesCore
import GameKit
import UIKit

public class SudokuGameCenterModule: Module {

  // The auth handler is set ONCE per app session — Apple's contract.
  // Re-setting it has no effect; the original closure stays in place.
  // We track this to avoid wasted re-registrations on subsequent calls.
  private var authHandlerInstalled = false

  public func definition() -> ModuleDefinition {
    Name("SudokuGameCenter")

    // ─── Availability + auth state ────────────────────────────────────────

    AsyncFunction("isAvailable") { () -> Bool in
      // The GameKit framework is linked into the binary at build time,
      // so the only meaningful check is whether the device's iOS
      // version supports the API set we use (we already require iOS
      // 16.0 via expo-build-properties, so this is always true on a
      // running build). Returning a function lets us extend later
      // (e.g. region restrictions) without breaking JS callers.
      return true
    }

    AsyncFunction("isAuthenticated") { () -> Bool in
      return GKLocalPlayer.local.isAuthenticated
    }

    // Trigger the auth flow. `presentSignIn` controls whether we
    // actually present Apple's sign-in sheet when GameKit asks for
    // one. Settings opt-in passes true; background drains pass false
    // so the system never pops a sheet without user intent.
    //
    // GKLocalPlayer.local.authenticateHandler is set exactly once per
    // app launch (Apple's contract). After that, this method just
    // reads the current state and resolves immediately.
    AsyncFunction("authenticate") { (presentSignIn: Bool, promise: Promise) in
      let player = GKLocalPlayer.local

      // Already authenticated — fastest path.
      if player.isAuthenticated {
        promise.resolve([
          "authenticated": true,
          "available": true,
        ] as [String: Any])
        return
      }

      // Handler already installed and player still isn't authenticated:
      // either user previously cancelled, or sign-in failed. Apple
      // won't let us re-present in the same session — return a hint
      // so the JS layer can surface "try again next launch".
      if self.authHandlerInstalled {
        promise.resolve([
          "authenticated": false,
          "available": true,
          "requiresSignIn": false,
          "error": "auth-already-attempted",
        ] as [String: Any])
        return
      }

      self.authHandlerInstalled = true

      DispatchQueue.main.async {
        player.authenticateHandler = { [weak self] viewController, error in
          guard let self = self else { return }

          // Helper to reduce the if/else mess below. Apple's auth
          // handler can fire more than once across the app's lifetime
          // (e.g. user signs out and back in). Expo's `Promise.resolve`
          // is idempotent — it silently ignores second calls — so we
          // can call it on every handler invocation without harm.
          func finish(_ payload: [String: Any]) {
            promise.resolve(payload)
          }

          if let error = error {
            finish([
              "authenticated": false,
              "available": true,
              "error": error.localizedDescription,
            ] as [String: Any])
            return
          }

          if let vc = viewController {
            // GameKit needs us to present its sign-in sheet. Honour
            // the caller's `presentSignIn` flag.
            if presentSignIn {
              if let root = self.findRootViewController() {
                root.present(vc, animated: true) {
                  // Sheet dismissed — re-check auth state.
                  finish([
                    "authenticated": player.isAuthenticated,
                    "available": true,
                  ] as [String: Any])
                }
              } else {
                finish([
                  "authenticated": false,
                  "available": true,
                  "error": "no-root-view-controller",
                ] as [String: Any])
              }
            } else {
              // Caller opted not to present; report back so the JS
              // layer can decide whether to escalate.
              finish([
                "authenticated": false,
                "available": true,
                "requiresSignIn": true,
              ] as [String: Any])
            }
            return
          }

          // No VC, no error — auth resolved (success or silent fail).
          finish([
            "authenticated": player.isAuthenticated,
            "available": true,
          ] as [String: Any])
        }
      }
    }

    // ─── Local player ─────────────────────────────────────────────────────

    AsyncFunction("getLocalPlayer") { () -> [String: Any]? in
      let player = GKLocalPlayer.local
      guard player.isAuthenticated else { return nil }
      return [
        "displayName": player.displayName,
        "alias": player.alias,
        "gamePlayerID": player.gamePlayerID,
        "teamPlayerID": player.teamPlayerID,
      ] as [String: Any]
    }

    // ─── Score submission ─────────────────────────────────────────────────

    AsyncFunction("submitScore") {
      (leaderboardID: String, value: Int, promise: Promise) in
      let player = GKLocalPlayer.local
      guard player.isAuthenticated else {
        promise.resolve([
          "ok": false,
          "submitted": false,
          "leaderboardID": leaderboardID,
          "value": value,
          "error": "not-authenticated",
        ] as [String: Any])
        return
      }
      // iOS 14+ API. Deployment target is 16.0 so always available.
      GKLeaderboard.submitScore(
        value,
        context: 0,
        player: player,
        leaderboardIDs: [leaderboardID]
      ) { error in
        if let error = error {
          promise.resolve([
            "ok": false,
            "submitted": false,
            "leaderboardID": leaderboardID,
            "value": value,
            "error": error.localizedDescription,
          ] as [String: Any])
        } else {
          promise.resolve([
            "ok": true,
            "submitted": true,
            "leaderboardID": leaderboardID,
            "value": value,
          ] as [String: Any])
        }
      }
    }

    // ─── Achievement reporting ────────────────────────────────────────────

    AsyncFunction("reportAchievement") {
      (achievementID: String, percentComplete: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve([
          "ok": false,
          "submitted": false,
          "achievementID": achievementID,
          "percentComplete": percentComplete,
          "error": "not-authenticated",
        ] as [String: Any])
        return
      }
      let achievement = GKAchievement(identifier: achievementID)
      // Clamp to Apple's 0–100 range so a runaway percent calc can't
      // surface a bogus value to GameKit.
      achievement.percentComplete = min(100.0, max(0.0, percentComplete))
      // Show Apple's native banner notification on completion. This is
      // the polish path — banners feel of-a-piece with iOS rather than
      // requiring our own custom celebratory UI.
      achievement.showsCompletionBanner = true

      GKAchievement.report([achievement]) { error in
        if let error = error {
          promise.resolve([
            "ok": false,
            "submitted": false,
            "achievementID": achievementID,
            "percentComplete": achievement.percentComplete,
            "error": error.localizedDescription,
          ] as [String: Any])
        } else {
          promise.resolve([
            "ok": true,
            "submitted": true,
            "achievementID": achievementID,
            "percentComplete": achievement.percentComplete,
          ] as [String: Any])
        }
      }
    }

    // ─── Native UI ────────────────────────────────────────────────────────

    AsyncFunction("showLeaderboard") {
      (leaderboardID: String?, promise: Promise) in
      DispatchQueue.main.async {
        guard let root = self.findRootViewController() else {
          promise.resolve([
            "presented": false,
            "error": "no-root-view-controller",
          ] as [String: Any])
          return
        }
        let vc: GKGameCenterViewController
        if let id = leaderboardID, !id.isEmpty {
          vc = GKGameCenterViewController(
            leaderboardID: id,
            playerScope: .global,
            timeScope: .allTime
          )
        } else {
          vc = GKGameCenterViewController(state: .leaderboards)
        }
        vc.gameCenterDelegate = SudokuGameCenterPresenter.shared
        root.present(vc, animated: true) {
          promise.resolve(["presented": true] as [String: Any])
        }
      }
    }

    AsyncFunction("showAchievements") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let root = self.findRootViewController() else {
          promise.resolve([
            "presented": false,
            "error": "no-root-view-controller",
          ] as [String: Any])
          return
        }
        let vc = GKGameCenterViewController(state: .achievements)
        vc.gameCenterDelegate = SudokuGameCenterPresenter.shared
        root.present(vc, animated: true) {
          promise.resolve(["presented": true] as [String: Any])
        }
      }
    }

    AsyncFunction("showDashboard") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let root = self.findRootViewController() else {
          promise.resolve([
            "presented": false,
            "error": "no-root-view-controller",
          ] as [String: Any])
          return
        }
        let vc = GKGameCenterViewController(state: .dashboard)
        vc.gameCenterDelegate = SudokuGameCenterPresenter.shared
        root.present(vc, animated: true) {
          promise.resolve(["presented": true] as [String: Any])
        }
      }
    }

    // ─── Dev-only ─────────────────────────────────────────────────────────

    AsyncFunction("resetAchievementsDevOnly") { (promise: Promise) in
      #if DEBUG
        GKAchievement.resetAchievements { error in
          if let error = error {
            promise.resolve([
              "ok": false,
              "error": error.localizedDescription,
            ] as [String: Any])
          } else {
            promise.resolve(["ok": true] as [String: Any])
          }
        }
      #else
        promise.resolve([
          "ok": false,
          "error": "release-build",
        ] as [String: Any])
      #endif
    }
  }

  // MARK: - Helpers

  /// Locate the topmost view controller suitable for presentation. The
  /// modal hierarchy means we can't just use the rootViewController —
  /// if a navigation/modal stack is already presented we need to use
  /// THAT VC's `presentedViewController`. Walk the chain to the leaf.
  private func findRootViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
    let windowScene = scenes.first(where: {
      $0.activationState == .foregroundActive
    }) as? UIWindowScene
    let keyWindow = windowScene?.windows.first(where: { $0.isKeyWindow })
      ?? windowScene?.windows.first

    var top = keyWindow?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

// MARK: - Presenter

/// Singleton delegate used by every GKGameCenterViewController we
/// present. Apple's API requires a delegate to dismiss the sheet —
/// without one the user gets stuck on the modal.
fileprivate final class SudokuGameCenterPresenter:
  NSObject, GKGameCenterControllerDelegate
{
  static let shared = SudokuGameCenterPresenter()

  func gameCenterViewControllerDidFinish(
    _ gameCenterViewController: GKGameCenterViewController
  ) {
    gameCenterViewController.dismiss(animated: true)
  }
}
