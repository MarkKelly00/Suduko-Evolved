import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';
import {
  describeUsernameError,
  normalizeUsername,
  profileService,
  validateUsername,
} from '@/services/supabase';

type Status =
  | { state: 'idle' }
  | { state: 'invalid'; reason?: 'too_short' | 'too_long' | 'invalid_chars' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' };

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Notified when the validation state changes — drives the parent Save button. */
  onStatusChange?: (status: Status) => void;
  /** When true, skip the network check (used during onboarding before sign-in). */
  offline?: boolean;
}

const DEBOUNCE_MS = 350;

/**
 * IMPORTANT — keyboard focus stability.
 *
 * Earlier this component was re-creating the inline style array and tone
 * object on every render, plus calling `onStatusChange` from a useEffect
 * whose dependency array included the callback prop. That cascade caused
 * the parent View's native style to be re-applied on every keystroke,
 * which iOS interpreted as a layout pass and dropped the TextInput's
 * first-responder status — so the keyboard collapsed after every letter.
 *
 * Fixes:
 *   1. `React.memo` so parent state churn (e.g. parent's usernameStatus
 *      state) doesn't re-render this component when only the status changed.
 *   2. `useMemo` on the tone + style arrays so the inputRow's style array
 *      is referentially stable across renders when status hasn't transitioned.
 *   3. `useCallback` on onChangeText so the TextInput prop is stable.
 *   4. A ref for `onStatusChange` so the parent-notify useEffect doesn't
 *      re-run when the prop reference changes — only when status flips.
 */
export const UsernameField = React.memo(function UsernameField({
  value,
  onChange,
  onStatusChange,
  offline = false,
}: Props) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest onStatusChange in a ref so the parent-notify effect can
  // depend only on `status` — avoids spurious effect runs when the parent
  // passes an inline arrow function.
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const normalized = normalizeUsername(value);
    if (normalized.length === 0) {
      setStatus({ state: 'idle' });
      return;
    }
    const validation = validateUsername(normalized);
    if (!validation.valid) {
      setStatus({ state: 'invalid', reason: validation.reason });
      return;
    }
    if (offline) {
      setStatus({ state: 'available' });
      return;
    }
    setStatus({ state: 'checking' });
    debounceRef.current = setTimeout(async () => {
      const ok = await profileService.checkUsernameAvailable(normalized);
      setStatus(ok ? { state: 'available' } : { state: 'taken' });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, offline]);

  useEffect(() => {
    onStatusChangeRef.current?.(status);
  }, [status]);

  const tone = useMemo(() => toneFor(status), [status]);

  // Memoize the input-row style array so its reference is stable when
  // status doesn't change. RN's native bridge re-applies the View's
  // style on every new array reference; on iOS that can drop the
  // keyboard's first-responder.
  const inputRowStyle = useMemo(
    () => [styles.inputRow, { borderColor: tone.border }, tone.shadow],
    [tone.border, tone.shadow],
  );

  const hintStyle = useMemo(
    () => [styles.hint, { color: tone.hintColor }],
    [tone.hintColor],
  );

  const handleChangeText = useCallback(
    (t: string) => onChange(normalizeUsername(t)),
    [onChange],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>USERNAME</Text>
      <View style={inputRowStyle}>
        <Text style={styles.at}>@</Text>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder="yourname"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={20}
          style={styles.input}
          accessibilityLabel="Username"
          // Keep the keyboard up between keystrokes — without this the
          // default RN behaviour can drop the keyboard when the row's
          // native props are re-applied.
          blurOnSubmit={false}
        />
        <View style={styles.statusSlot}>{renderStatus(status)}</View>
      </View>
      <Text style={hintStyle}>{tone.hint}</Text>
    </View>
  );
});

function renderStatus(status: Status): React.ReactElement | null {
  if (status.state === 'checking') return <ActivityIndicator color={colors.textMuted} />;
  if (status.state === 'available') return <Text style={styles.checkOk}>{'✓'}</Text>;
  if (status.state === 'taken' || status.state === 'invalid')
    return <Text style={styles.checkBad}>{'✕'}</Text>;
  return null;
}

function toneFor(status: Status): {
  border: string;
  hint: string;
  hintColor: string;
  shadow: object;
} {
  if (status.state === 'available') {
    return {
      border: colors.success,
      hint: 'Looks good — this username is available.',
      hintColor: colors.success,
      shadow: { shadowColor: colors.successGlow, shadowOpacity: 0.5, shadowRadius: 12 },
    };
  }
  if (status.state === 'taken') {
    return {
      border: colors.mistake,
      hint: 'That username is taken — try another.',
      hintColor: colors.mistake,
      shadow: { shadowColor: colors.mistakeGlow, shadowOpacity: 0.4, shadowRadius: 10 },
    };
  }
  if (status.state === 'invalid') {
    return {
      border: colors.mistake,
      hint: describeUsernameError(status.reason),
      hintColor: colors.mistake,
      shadow: { shadowColor: colors.mistakeGlow, shadowOpacity: 0.4, shadowRadius: 10 },
    };
  }
  if (status.state === 'checking') {
    return {
      border: colors.glassBorder,
      hint: 'Checking…',
      hintColor: colors.textMuted,
      shadow: {},
    };
  }
  return {
    border: colors.glassBorder,
    hint: '3–20 chars. lowercase letters, numbers, underscores.',
    hintColor: colors.textMuted,
    shadow: {},
  };
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  at: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.bold,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    paddingVertical: 0,
  },
  statusSlot: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOk: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
  },
  checkBad: {
    color: colors.mistake,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
  },
  hint: {
    fontSize: fontSize.xs,
  },
});

export type { Status as UsernameFieldStatus };
