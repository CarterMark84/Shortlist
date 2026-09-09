/**
 * Bridges the shared design tokens into React Native.
 *
 * Same source of truth as the web app's generated CSS
 * (packages/shared/src/theme.ts), so the two clients stay visually identical.
 */

import { fontSize, lineHeight, palette, radius, spacing, type ThemeColors } from '@recs/shared';
import { useColorScheme } from 'react-native';

export { fontSize, lineHeight, radius, spacing };
export type { ThemeColors };

/** Colours for the device's current appearance setting. */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  // `useColorScheme` can report null before the native module answers.
  return scheme === 'dark' ? palette.dark : palette.light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

/** Elevation that reads correctly on both platforms. */
export const elevation = {
  card: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
