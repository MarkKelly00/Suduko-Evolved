import { Platform } from 'react-native';

/**
 * iOS-friendly elevation tokens. Android equivalents use `elevation`.
 * Skia-rendered glows are handled separately in effect components.
 */
export const shadows = {
  none: Platform.select({
    ios: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    android: { elevation: 0 },
    default: {},
  })!,
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  })!,
  elevated: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
    },
    android: { elevation: 8 },
    default: {},
  })!,
  goldGlow: Platform.select({
    ios: {
      shadowColor: '#E0B96A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 18,
    },
    android: { elevation: 6 },
    default: {},
  })!,
  successGlow: Platform.select({
    ios: {
      shadowColor: '#5BD6A8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  })!,
  mistakeGlow: Platform.select({
    ios: {
      shadowColor: '#E5484D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
    },
    android: { elevation: 4 },
    default: {},
  })!,
};
