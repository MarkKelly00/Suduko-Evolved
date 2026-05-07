import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { InlineToast } from '@/components/ui/InlineToast';
import { useAuthStore } from '@/game/state/useAuthStore';
import { avatarService } from '@/services/supabase';
import { colors, fontSize, spacing } from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

const OUTPUT_SIZE = 512;

export default function AvatarCropScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'AvatarCrop'>>();
  const { uri, width: imgW, height: imgH } = route.params;

  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const screen = Dimensions.get('window');
  const frame = Math.min(screen.width - spacing.lg * 2, 360);
  const minScale = useMemo(
    () => Math.max(frame / imgW, frame / imgH),
    [frame, imgW, imgH],
  );

  // Pan + pinch shared values.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const baseTx = useSharedValue(0);
  const baseTy = useSharedValue(0);
  const scale = useSharedValue(minScale);
  const baseScale = useSharedValue(minScale);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pan = Gesture.Pan()
    .onStart(() => {
      baseTx.value = translateX.value;
      baseTy.value = translateY.value;
    })
    .onChange((e) => {
      translateX.value = baseTx.value + e.translationX;
      translateY.value = baseTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = scale.value;
    })
    .onChange((e) => {
      const next = baseScale.value * e.scale;
      scale.value = Math.max(minScale, Math.min(next, 4));
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleReset = () => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value = minScale;
    baseTx.value = 0;
    baseTy.value = 0;
    baseScale.value = minScale;
  };

  const handleUsePhoto = async () => {
    if (!profile?.id || uploading) return;
    setError(null);
    setUploading(true);
    setUploadProgress(0.05);
    try {
      const cropped = await cropAndCompress({
        uri,
        srcW: imgW,
        srcH: imgH,
        frame,
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
      });
      setUploadProgress(0.45);
      const data = await fetchAsBlob(cropped.uri);
      setUploadProgress(0.7);
      const result = await avatarService.uploadAvatar(profile.id, data, 'image/jpeg');
      setUploadProgress(1);
      setProfile({ ...profile, avatar_path: result.path, avatar_url: result.url });
      hapticsService.success();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed.');
      hapticsService.warning();
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const frameStyle: ViewStyle = {
    width: frame,
    height: frame,
    borderRadius: frame / 2,
    overflow: 'hidden',
  };

  const renderedImageW = imgW;
  const renderedImageH = imgH;

  return (
    <ScreenBackground>
      <TopBar title="Crop Avatar" />
      <View style={styles.body}>
        <View style={[styles.cropFrame, { width: frame, height: frame }]}>
          <GestureDetector gesture={composed}>
            <View style={frameStyle} collapsable={false}>
              <Animated.View
                style={[
                  styles.imageHolder,
                  {
                    width: renderedImageW,
                    height: renderedImageH,
                    left: (frame - renderedImageW) / 2,
                    top: (frame - renderedImageH) / 2,
                  },
                  imageStyle,
                ]}
              >
                <Image
                  source={{ uri }}
                  style={{ width: renderedImageW, height: renderedImageH }}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </GestureDetector>
          <View pointerEvents="none" style={[styles.ring, frameStyle]} />
        </View>

        <Text style={styles.hint}>Pinch to zoom • Drag to reposition</Text>

        {error ? (
          <InlineToast variant="error" message={error} nonce={error} />
        ) : null}

        <View style={styles.buttons}>
          <PremiumButton
            label="Reset"
            variant="ghost"
            compact
            onPress={handleReset}
            disabled={uploading}
          />
          <PremiumButton
            label={uploadProgress != null ? `Uploading ${Math.round(uploadProgress * 100)}%` : 'Use Photo'}
            variant="primary"
            onPress={handleUsePhoto}
            disabled={uploading}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

interface CropArgs {
  uri: string;
  srcW: number;
  srcH: number;
  frame: number;
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Convert the on-screen pan/pinch transform back into pixel-space crop
 * coordinates for the source image, then resize to OUTPUT_SIZE px.
 */
async function cropAndCompress(args: CropArgs): Promise<{ uri: string }> {
  let manipulator: typeof import('expo-image-manipulator') | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    manipulator = require('expo-image-manipulator');
  } catch {
    Alert.alert('Image tools unavailable', 'Please rebuild to enable avatar editing.');
    throw new Error('expo-image-manipulator not installed');
  }
  if (!manipulator) throw new Error('expo-image-manipulator missing');

  const { uri, srcW, srcH, frame, scale, translateX, translateY } = args;
  // Center of the cropping circle in screen coords:
  const cx = frame / 2;
  const cy = frame / 2;
  // The image's top-left in screen coords:
  // It's positioned with style { left: (frame - srcW) / 2, top: (frame - srcH) / 2 }
  // and then translated. So the on-screen position of the image's top-left:
  const onScreenLeft = (frame - srcW) / 2 + translateX;
  const onScreenTop = (frame - srcH) / 2 + translateY;
  // The image is rendered at native size (srcW × srcH) but transformed by `scale`.
  // The image-space coord (px, py) for the screen point (cx, cy):
  // px = (cx - onScreenLeft - srcW/2) / scale + srcW/2
  // py = (cy - onScreenTop - srcH/2) / scale + srcH/2
  const centerPxX = (cx - onScreenLeft - srcW / 2) / scale + srcW / 2;
  const centerPxY = (cy - onScreenTop - srcH / 2) / scale + srcH / 2;
  const cropSizePx = frame / scale;
  const originX = clamp(centerPxX - cropSizePx / 2, 0, Math.max(0, srcW - cropSizePx));
  const originY = clamp(centerPxY - cropSizePx / 2, 0, Math.max(0, srcH - cropSizePx));

  const result = await manipulator.manipulateAsync(
    uri,
    [
      { crop: { originX, originY, width: cropSizePx, height: cropSizePx } },
      { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
    ],
    { compress: 0.85, format: manipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

async function fetchAsBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  cropFrame: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  imageHolder: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(224, 185, 106, 0.6)',
    backgroundColor: 'transparent',
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.base,
    width: '100%',
    justifyContent: 'space-between',
  },
});
