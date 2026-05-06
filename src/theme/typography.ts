import { Platform } from 'react-native';

export const fontFamily = {
  display: Platform.select({
    ios: 'Georgia',
    default: 'serif',
  }),
  text: Platform.select({
    ios: 'System',
    default: 'sans-serif',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    default: 'monospace',
  }),
};

export const fontSize = {
  xxs: 10,
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 40,
  hero: 56,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const lineHeight = {
  tight: 1.15,
  normal: 1.35,
  relaxed: 1.55,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.2,
} as const;
