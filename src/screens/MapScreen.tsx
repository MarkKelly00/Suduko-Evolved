import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SagaMap } from '@/components/map/SagaMap';
import { campaign } from '@/game/modes/campaign';
import type { RootStackNavigation } from '@/app/navigation/routes';

/**
 * Map route entry. The screen file stays small on purpose: navigation
 * routing and the campaign-launch handshake live here, while every visual
 * concern (header, parallax, path, particles, level nodes) lives inside
 * `SagaMap`. That split keeps the route safe to refactor and lets the
 * world component be reused for future World 2+ saga maps.
 */
function MapScreen() {
  const navigation = useNavigation<RootStackNavigation>();

  const startLevel = (id: string) => {
    if (campaign.startLevel(id)) {
      navigation.navigate('Game', { levelId: id });
    }
  };

  return (
    <ScreenBackground edgeToEdge>
      <SagaMap onSelectLevel={startLevel} />
    </ScreenBackground>
  );
}

export default MapScreen;
