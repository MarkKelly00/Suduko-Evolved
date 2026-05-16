/**
 * AchievementGlyph
 *
 * Renders an achievement's icon as a square asset, with a graceful
 * tier-coloured fallback when the PNG hasn't been generated yet.
 *
 * Two display states:
 *   - asset present → render the bundled PNG via <Image>.
 *   - asset missing → render a rounded-square placeholder filled with the
 *                     tier `shadow` colour, with the achievement's first
 *                     letter in the tier `primary` colour at the centre.
 *
 * The `locked` prop dims the glyph to ~35 % opacity and softens contrast
 * so the gallery can show a locked vs unlocked variant from the same
 * source.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import {
  getAchievementTier,
  TIER_COLORS,
  type AchievementTier,
} from '@/game/achievements/tiers';
import { ACHIEVEMENT_METADATA } from '@/game/achievements/metadata';
import { getAchievementAsset } from '@/components/achievements/achievementAssets';
import { fontFamily, fontWeight, radius } from '@/theme';
import type { GameCenterAchievementId } from '@/services/gameCenter';

interface Props {
  id: GameCenterAchievementId;
  /** Render size in DOM points. Default 64. */
  size?: number;
  /** When true, applies a dimming overlay + reduced opacity. */
  locked?: boolean;
}

export function AchievementGlyph({ id, size = 64, locked = false }: Props) {
  const asset = getAchievementAsset(id);
  const tier = getAchievementTier(id);

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radius.lg },
        locked && styles.locked,
      ]}
    >
      {asset != null ? (
        <Image
          source={asset}
          style={{ width: size, height: size }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <FallbackPlaceholder id={id} tier={tier} size={size} />
      )}
    </View>
  );
}

function FallbackPlaceholder({
  id,
  tier,
  size,
}: {
  id: GameCenterAchievementId;
  tier: AchievementTier;
  size: number;
}) {
  const tone = TIER_COLORS[tier];
  const initial = (ACHIEVEMENT_METADATA[id]?.name ?? '?').charAt(0).toUpperCase();
  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: tone.shadow,
          borderColor: tone.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.placeholderInitial,
          {
            color: tone.primary,
            fontSize: Math.round(size * 0.5),
            lineHeight: Math.round(size * 0.55),
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  locked: {
    opacity: 0.35,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  placeholderInitial: {
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});
