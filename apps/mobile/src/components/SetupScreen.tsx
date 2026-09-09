import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radius, spacing, useTheme } from '@/lib/theme';

/**
 * Shown when EXPO_PUBLIC_SUPABASE_* are missing, instead of letting the app
 * fail on its first request.
 */
export function SetupScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing[6],
        paddingTop: insets.top + spacing[8],
        paddingBottom: insets.bottom + spacing[8],
      }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Finish setting up</Text>

      <Text style={[styles.body, { color: colors.textMuted }]}>
        Shortlist needs your Supabase project details before it can run.
      </Text>

      <View
        style={[
          styles.codeBlock,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.code, { color: colors.text }]}>
          {'# apps/mobile/.env\n'}
          {'EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n'}
          {'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...'}
        </Text>
      </View>

      <Text style={[styles.body, { color: colors.textMuted }]}>
        Then restart the dev server with a cleared cache:
      </Text>

      <View
        style={[
          styles.codeBlock,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.code, { color: colors.text }]}>npx expo start --clear</Text>
      </View>

      <Text style={[styles.note, { color: colors.textSubtle }]}>
        Expo inlines EXPO_PUBLIC_* values at build time, so a restart is required for changes to
        take effect. The repository README has the full walkthrough.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize['3xl'], fontWeight: '600', letterSpacing: -0.5 },
  body: { fontSize: fontSize.base, lineHeight: 24, marginTop: spacing[4] },
  codeBlock: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  code: { fontFamily: 'monospace', fontSize: fontSize.xs, lineHeight: 20 },
  note: { fontSize: fontSize.sm, lineHeight: 21, marginTop: spacing[6] },
});
