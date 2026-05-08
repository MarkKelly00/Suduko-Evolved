# Online Duels

Same-seed real-time logic races between two players. Built on top of the
existing solo Time Trial — guests can still play solo without ever
touching this layer.

## Architecture overview

```
                   ┌────────────────────────────────────────────┐
                   │  TimeTrialScreen (hub)                     │
                   │  ─ Solo Sprint cards (guest-allowed)       │
                   │  ─ Online Duel  (auth → Matchmaking)       │
                   │  ─ Challenge Friend (auth → FriendDuelPicker)
                   │  ─ Invite Link  (auth → create_duel_link)  │
                   │  ─ Recent Duels (last 3)                   │
                   └─────────────────┬──────────────────────────┘
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        ▼                            ▼                             ▼
   MatchmakingScreen         FriendDuelPickerScreen      DuelInviteJoinScreen
   join_matchmaking →        create_friend_duel →        redeem_duel_invite →
   (poll queue)              (RPC: invite row)           (RPC: matched room)
        │                            │                             │
        └─────────────┬──────────────┴─────────────┬───────────────┘
                      ▼                            ▼
                DuelLobbyScreen ──countdown──► DuelGameScreen
                                                    │
                                          submit_duel_attempt
                                                    │
                                                    ▼
                                           DuelResultsScreen
```

### Backend (Supabase)

**Tables** (all RLS-enabled, all writes via SECURITY DEFINER RPCs):

| Table | Purpose |
|---|---|
| `duel_rooms` | Room state machine (created → matched → countdown → active → completed). Holds the puzzle seed shared by both players. |
| `duel_participants` | Two rows per room. Tracks current_score, progress_percent, completed_units, last_seen_at. |
| `duel_attempts` | Immutable final attempt per (room, user). Inserted once at end-of-game; cannot be updated. |
| `matchmaking_queue` | "Searching" rows. Partial-unique index prevents duplicate active entries. |
| `duel_invites` | Friend challenges (`opponent_id` set) + share links (`opponent_id` null). |

**RPCs** (all `SECURITY DEFINER`, granted to `authenticated`):

| RPC | Behavior |
|---|---|
| `join_matchmaking(mode, skill_bracket?)` | Atomic: sweeps expired rows, refuses if already in active duel, finds compatible waiting opponent (`FOR UPDATE SKIP LOCKED`), creates room or enqueues. |
| `cancel_matchmaking(mode)` | Marks caller's row `cancelled`. |
| `create_friend_duel(opponent_id, mode)` | Inserts pending invite addressed to a specific opponent. |
| `create_duel_link(mode)` | Inserts pending invite with `opponent_id = NULL` (anyone with the code can redeem). |
| `redeem_duel_invite(invite_code)` | Validates expiry/uses/audience, materializes room with both participants, transitions invite → `accepted`. |
| `heartbeat_duel(room_id, score, progress_percent, completed_units?)` | Updates participant row; rate-limit at the client (~1.5 s). |
| `submit_duel_attempt(...)` | Inserts immutable attempt; on second attempt, resolves winner with score → time_ms → mistakes → hints → moves tiebreaker; sets `duel_rooms.status = 'completed'`. |
| `forfeit_duel(room_id)` | Marks the caller forfeited; awards opponent the win immediately. |

**Realtime channels** used by the client:

- `duel_room_state:{roomId}` — Postgres Changes on `duel_rooms` for status transitions (countdown → active → completed).
- `duel_room_participants:{roomId}` — Postgres Changes on `duel_participants` for opponent score/progress.
- `duel_room:{roomId}` — Broadcast for high-frequency progress pings (1 Hz). Lossy by design.

### Client

```
src/services/duel/
  matchmakingService.ts     joinMatchmaking, cancelMatchmaking, getActiveMatchmakingRoom
  duelService.ts            getDuelRoom, getRecentDuels, pickSelf, pickOpponent
  duelRealtimeService.ts    subscribeRoomState, subscribeParticipants, openProgressBroadcast
  duelInviteService.ts      createFriendDuel, createDuelLink, redeemDuelInvite, getIncomingFriendDuels
  duelSubmissionService.ts  submitDuelAttempt, sendDuelHeartbeat, forfeitDuel

src/components/duel/
  OpponentRail.tsx          Slim avatar + progress + score rail; never shows the opponent grid

src/game/modes/duel.ts      synthesizeDuelLevel(modeId, seed) — reuses the time-trial mode catalog
src/game/sync/duelAttemptValidator.ts
                            Local sanity checks (score ceiling, time vs duration, final-grid validity)

src/screens/
  TimeTrialScreen.tsx       The hub — Solo / Online Duel / Challenge / Invite / Recent / Leaderboard
  MatchmakingScreen.tsx     Searching state, polls queue, transitions to Lobby
  DuelLobbyScreen.tsx       Both avatars + server-synced countdown
  DuelGameScreen.tsx        Reuses sprint engine + heartbeat + opponent rail
  DuelResultsScreen.tsx     Winner banner, side-by-side, rematch / add friend / share
  FriendDuelPickerScreen.tsx
  DuelInviteJoinScreen.tsx  Universal-link entry; AuthGate then redeem.
```

## Deep links / Universal Links

Two URL surfaces resolve to `DuelInviteJoinScreen`:

```
sudokuevolved://duel/<inviteCode>           # custom scheme — works without setup
https://sudokuevolved.com/duel/<inviteCode> # Universal Link — needs iOS setup
```

Configuration: [`src/app/navigation/deepLinks.ts`](src/app/navigation/deepLinks.ts) — wired into the `NavigationContainer` via `linking={linkingConfig}`.

### iOS Universal Links setup (production)

The custom scheme works out-of-the-box for the simulator and TestFlight; Universal Links require additional setup so https://sudokuevolved.com/duel/... opens the app instead of Safari.

1. **Apple Developer portal**
   - Identifiers → `com.sudokuevolved.app` → enable **Associated Domains** capability.
2. **app.json** — add:
   ```json
   "ios": {
     "associatedDomains": ["applinks:sudokuevolved.com"]
   }
   ```
3. **Host the AASA file** at:
   `https://sudokuevolved.com/.well-known/apple-app-site-association`

   Content (replace TEAM_ID with your team id `B4H49GDQ8Q`):
   ```json
   {
     "applinks": {
       "details": [
         {
           "appIDs": ["B4H49GDQ8Q.com.sudokuevolved.app"],
           "components": [
             { "/": "/duel/*", "comment": "Duel invite links" }
           ]
         }
       ]
     }
   }
   ```
   Serve as `application/json`, no `.json` extension. HTTPS required, no redirects.
4. **Run `npx expo prebuild`** so the entitlement makes it into the iOS project.
5. After install on a real device, tapping a `https://sudokuevolved.com/duel/<code>` link opens the app.

### Android App Links

Out of scope for this MVP. Scaffold:
- `app.json → android.intentFilters` with the same domain
- Host `https://sudokuevolved.com/.well-known/assetlinks.json`
- Verify with `adb shell pm verify-app-links --re-verify com.sudokuevolved.app`

### Fallback when app not installed

When the app isn't installed, the Universal Link falls through to Safari. Host a simple HTML page at `https://sudokuevolved.com/duel/<code>` that:
- Detects platform.
- Offers App Store / Play Store links.
- Stores the invite code in a query param so the freshly-installed app can pick it up post-install (deferred deep linking via `navigator.share` or paste).

Out of scope for this commit — the route exists, the redirect page does not.

## Anti-cheat & validation

- **Server-authoritative**: every mutation goes through a `SECURITY DEFINER` RPC; the anon role can never mutate `duel_*` tables directly.
- **Immutable attempts**: `duel_attempts` has `UNIQUE(room_id, user_id)` and no UPDATE policy — a second submission is silently ignored.
- **Server-derived seed**: `duel_seed_for_room(room_id, mode)` ensures both clients can't independently pick a seed; the server stamps it.
- **Local sanity check** (`duelAttemptValidator.ts`): rejects scores beyond the engine ceiling, times beyond the mode duration, final grids that don't satisfy the seed solution. Flagged attempts get `suspicious=true` recorded for later review.
- **Timeline / move count / app-background / reconnect counters** are recorded with each attempt for retroactive review.

For now we **flag, not ban**. Banning is an offline ops task on a future ranked ladder.

## Disconnect / reconnect

- The `last_seen_at` column on `duel_participants` advances every heartbeat (1.5 s).
- The opponent rail surfaces a "Reconnecting…" badge after 6 s of silence.
- App background / network loss is preserved on the client — no game state is lost; on resume, the heartbeat picks back up.
- `forfeit_duel` is the only path that awards the opponent immediately; the player has to explicitly tap "Leave duel".

## Known limitations (MVP)

- **No push notifications** for incoming friend duels — opponent has to be in-app to see the invite. (Wire APNS + an `auth.users` device-token table next.)
- **No skill-based matchmaking** — the queue is FIFO. The `skill_bracket` column is reserved for a future ELO/MMR.
- **No bot fallback** — if the queue stays empty for >90 s the user gets a "no rivals" state with a "share invite" CTA.
- **Realtime via Supabase Broadcast** — fine for 1v1 at our scale, but if duels grow to >10 k concurrent the right move is Cloudflare Durable Objects or a dedicated WebSocket fleet.
- **Daily Sprint duels not yet wired** — only `sprint-3min` is the default duel mode. Daily-seed duels would need a small change so both players get the same deterministic seed for the day.
- **Spectator mode** — out of scope. The schema would support it (read-only join via `duel_participants` with a third slot).
- **Universal Links** require the AASA file to be live before they fire on production builds. Custom scheme works regardless.

## Future roadmap

- Push notifications for offline friend challenges.
- Game Center challenge mirroring (separate duel leaderboard ID per mode).
- Ranked duel ladder w/ ELO + skill brackets.
- Weekly duel tournaments + seasonal cosmetics.
- Spectator / replay mode.
- Bot/ghost fallback if matchmaking is empty for >30 s.
- Cloudflare Durable Objects WebSocket service if Supabase Realtime becomes limiting.
- Android App Links (assetlinks.json + intent filters).
- Stronger anti-cheat (move-timeline replay validation; ELO loss caps).

## Acceptance check (manual QA)

Run through these in the simulator (or two physical devices):

1. **Solo unaffected** — Open Time Trial as guest. Tap "Race again" on 3-Minute Sprint. Game starts, completes normally. ✓
2. **Hub renders for guests** — Guest sees Solo cards, but Online Duel / Challenge / Invite open the AuthGate.
3. **Online Duel loop**:
   - Sign in on Device A; tap Online Duel → MatchmakingScreen ("Finding a rival…").
   - Sign in on Device B (separate account); same flow.
   - Both transition to DuelLobby with synced countdown.
   - Both transition to DuelGame at `start_at`.
   - One submits → opponent sees "Finished" badge.
   - Both submit → both navigate to DuelResults with correct winner.
4. **Friend challenge** — Pick a friend → invite created → friend sees pending invite (via inbox poll for now).
5. **Invite link** — Generate link → share → recipient taps → DuelInviteJoinScreen → AuthGate (if needed) → DuelLobby.
6. **Forfeit** — Leave duel from lobby → opponent gets "Opponent forfeited" on Results.
7. **Solo guest still ok** — sign out → run Solo Sprint → no errors.
