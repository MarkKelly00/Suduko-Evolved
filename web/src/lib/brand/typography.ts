/**
 * Typography tokens — mirror of /src/theme/typography.ts.
 * Sizes are rem-derived for the web; the app uses px.
 */
export const fontFamily = {
  display: 'Georgia, "Times New Roman", serif',
  text: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  mono: 'Menlo, "SF Mono", Consolas, monospace',
} as const;

export const fontSize = {
  xxs: '0.625rem',
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  md: '1.125rem',
  lg: '1.25rem',
  xl: '1.5rem',
  xxl: '2rem',
  display: '2.5rem',
  hero: '3.5rem',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
} as const;

export const letterSpacing = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.05em',
  wider: '0.18em',
} as const;
