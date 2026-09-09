import { describeApiError, EXAMPLE_PROMPTS } from '@recs/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ArrowRightIcon } from '@/components/Icons';
import { runSearch } from '@/lib/queries';
import { elevation, fontSize, radius, spacing, useTheme } from '@/lib/theme';

export default function SearchScreen() {
  const colors = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = query.trim().length > 0 && !pending;

  async function submit() {
    if (!canSubmit) return;

    setPending(true);
    setError(null);
    try {
      const searchId = await runSearch(query.trim());
      router.push(`/results/${searchId}`);
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.headline, { color: colors.text }]}>
          What are you looking for?
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Describe it however it comes out — you do not need to know what it is called.
        </Text>

        <View
          style={[
            styles.inputCard,
            elevation.card,
            { backgroundColor: colors.surface, borderColor: colors.borderStrong },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            editable={!pending}
            multiline
            maxLength={500}
            placeholder="Something to keep my coffee hot on my long commute…"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel="Describe the product you are looking for"
          />

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: canSubmit
                  ? pressed
                    ? colors.accentPressed
                    : colors.accent
                  : colors.surfaceMuted,
              },
            ]}
          >
            {pending ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : (
              <ArrowRightIcon color={canSubmit ? colors.onAccent : colors.textSubtle} size={18} />
            )}
            <Text
              style={[
                styles.submitText,
                { color: canSubmit ? colors.onAccent : colors.textSubtle },
              ]}
            >
              {pending ? 'Finding the best five…' : 'Find products'}
            </Text>
          </Pressable>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSubtle }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {pending && (
          <Text style={[styles.progress, { color: colors.textMuted }]}>
            Interpreting your description, then searching Amazon and ranking the results.
          </Text>
        )}

        {!pending && (
          <View style={styles.examples}>
            <Text style={[styles.examplesLabel, { color: colors.textSubtle }]}>
              OR TRY ONE OF THESE
            </Text>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => setQuery(prompt)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: pressed ? colors.accentSubtle : colors.surface,
                    borderColor: pressed ? colors.accentBorder : colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.textMuted }]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing[5], paddingBottom: spacing[12] },
  headline: {
    fontSize: fontSize['3xl'],
    fontWeight: '600',
    letterSpacing: -0.6,
    marginTop: spacing[2],
  },
  sub: { fontSize: fontSize.base, lineHeight: 24, marginTop: spacing[2] },
  inputCard: {
    marginTop: spacing[6],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  input: {
    minHeight: 88,
    fontSize: fontSize.lg,
    lineHeight: 26,
    padding: spacing[1],
    textAlignVertical: 'top',
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    paddingVertical: spacing[3],
  },
  submitText: { fontSize: fontSize.base, fontWeight: '600' },
  errorBox: { marginTop: spacing[4], padding: spacing[3], borderRadius: radius.md },
  errorText: { fontSize: fontSize.sm, lineHeight: 20 },
  progress: {
    marginTop: spacing[4],
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  examples: { marginTop: spacing[8], gap: spacing[2] },
  examplesLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing[1],
  },
  chip: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  chipText: { fontSize: fontSize.sm, lineHeight: 20 },
});
