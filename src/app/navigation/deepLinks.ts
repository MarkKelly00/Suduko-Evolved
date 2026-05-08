/**
 * Deep linking configuration for React Navigation. Two URL surfaces:
 *
 *   - sudokuevolved://duel/<inviteCode>     (custom scheme — always works)
 *   - https://sudokuevolved.com/duel/<inviteCode> (Universal Links — needs
 *     Associated Domains capability + apple-app-site-association hosted on
 *     the domain. See docs/online-duels.md for the iOS setup.)
 *
 * The deep link resolves to `DuelInviteJoinScreen({ inviteCode })`. From
 * there: AuthGate (if needed) → redeem_duel_invite RPC → DuelLobby.
 */
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './routes';

export const DUEL_HOST = 'sudokuevolved.com';

export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'sudokuevolved://',
    `https://${DUEL_HOST}`,
    `https://www.${DUEL_HOST}`,
  ],
  config: {
    screens: {
      DuelInviteJoin: {
        path: 'duel/:inviteCode',
      },
    },
  },
};

export function buildDuelInviteUrl(inviteCode: string): string {
  return `https://${DUEL_HOST}/duel/${inviteCode}`;
}
