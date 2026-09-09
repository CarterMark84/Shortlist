/**
 * Design tokens — the single source of truth for how the product looks.
 *
 * Web feeds these into Tailwind's config; mobile feeds them into StyleSheet
 * themes. Changing a value here changes both clients, which is what keeps them
 * looking like one product rather than two apps sharing a backend.
 *
 * Direction: warm stone neutrals rather than the default cool grays, a single
 * confident indigo accent, amber reserved exclusively for star ratings, and
 * generous whitespace.
 */

export const palette = {
  light: {
    /** Page canvas. */
    bg: '#FAFAF9',
    /** Cards, inputs, sheets. */
    surface: '#FFFFFF',
    /** Recessed areas: chips, skeletons, table stripes. */
    surfaceMuted: '#F5F5F4',
    /** Hairlines. */
    border: '#E7E5E4',
    borderStrong: '#D6D3D1',
    /** Primary reading text. */
    text: '#1C1917',
    /** Secondary text: metadata, captions. */
    textMuted: '#57534E',
    /** Tertiary text: placeholders, disabled. */
    textSubtle: '#A8A29E',
    /** Brand accent — buttons, focus rings, active states. */
    accent: '#4F46E5',
    accentHover: '#4338CA',
    accentPressed: '#3730A3',
    /** Tinted accent background for badges and selected chips. */
    accentSubtle: '#EEF2FF',
    accentBorder: '#C7D2FE',
    /** Text/icon color that sits on `accent`. */
    onAccent: '#FFFFFF',
    /** Star ratings only — never used for anything else. */
    star: '#F59E0B',
    starEmpty: '#E7E5E4',
    success: '#059669',
    successSubtle: '#ECFDF5',
    danger: '#DC2626',
    dangerSubtle: '#FEF2F2',
    /** Overlay behind modals. */
    scrim: 'rgba(28, 25, 23, 0.45)',
  },
  dark: {
    bg: '#0C0A09',
    surface: '#1C1917',
    surfaceMuted: '#292524',
    border: '#292524',
    borderStrong: '#44403C',
    text: '#FAFAF9',
    textMuted: '#A8A29E',
    textSubtle: '#78716C',
    accent: '#818CF8',
    accentHover: '#A5B4FC',
    accentPressed: '#C7D2FE',
    accentSubtle: '#1E1B4B',
    accentBorder: '#3730A3',
    onAccent: '#1C1917',
    star: '#FBBF24',
    starEmpty: '#44403C',
    success: '#34D399',
    successSubtle: '#022C22',
    danger: '#F87171',
    dangerSubtle: '#450A0A',
    scrim: 'rgba(0, 0, 0, 0.65)',
  },
} as const;

export type ColorScheme = keyof typeof palette;

/**
 * The colour roles a theme provides.
 *
 * Widened to `string` per key on purpose: `palette` is `as const`, so deriving
 * this straight from `palette.light` would give literal types like `"#FAFAF9"`
 * and make the dark palette unassignable to it.
 */
export type ThemeColors = {
  readonly [K in keyof (typeof palette)['light']]: string;
};

/** 4px base scale. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,
  '5xl': 48,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 38,
  '4xl': 44,
  '5xl': 54,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Soft, low-contrast elevation — cards should feel lifted, not cut out. */
export const shadow = {
  sm: {
    web: '0 1px 2px 0 rgb(28 25 23 / 0.05)',
    native: { shadowColor: '#1C1917', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  },
  md: {
    web: '0 2px 8px -1px rgb(28 25 23 / 0.08), 0 1px 3px -1px rgb(28 25 23 / 0.06)',
    native: { shadowColor: '#1C1917', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  },
  lg: {
    web: '0 8px 24px -4px rgb(28 25 23 / 0.10), 0 2px 6px -2px rgb(28 25 23 / 0.06)',
    native: { shadowColor: '#1C1917', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  },
} as const;

/** Max content width on desktop, in px. */
export const layout = {
  contentMaxWidth: 1120,
  searchMaxWidth: 720,
  headerHeight: 64,
} as const;

/** Example prompts shown as chips under the search bar. */
export const EXAMPLE_PROMPTS = [
  'something to keep my coffee hot on my long commute',
  'a quiet desk fan that will not annoy my roommate',
  'headphones for a noisy open-plan office under $150',
  'a gift for someone who just moved into their first apartment',
  'a durable backpack that fits a 16 inch laptop',
] as const;
