import type { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;
type Falsy = false | null | undefined | '' | 0;

/**
 * Compose React Native styles like `clsx`. Arrays/objects are flattened;
 * falsy values are skipped. Returns a `StyleProp` ready to feed into a
 * `style={...}` prop.
 *
 * cn(styles.base, isActive && styles.active, { opacity: 0.5 })
 */
export function cn<S extends Style>(
  ...inputs: (StyleProp<S> | Falsy)[]
): StyleProp<S> {
  const flat: StyleProp<S>[] = [];
  for (const input of inputs) {
    if (!input) continue;
    flat.push(input as StyleProp<S>);
  }
  return flat as unknown as StyleProp<S>;
}
