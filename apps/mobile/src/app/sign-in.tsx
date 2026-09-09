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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';

import { supabase } from '@/lib/supabase';
import { elevation, fontSize, radius, spacing, useTheme } from '@/lib/theme';

type Mode = 'signIn' | 'signUp' | 'forgot';

const MIN_PASSWORD_LENGTH = 8;

const COPY: Record<Mode, { heading: string; blurb: string; submit: string; pending: string }> = {
  signIn: {
    heading: 'Sign in to Shortlist',
    blurb: 'Your searches and saved products stay tied to your account.',
    submit: 'Sign in',
    pending: 'Signing in…',
  },
  signUp: {
    heading: 'Create your account',
    blurb: 'Free, and takes a moment.',
    submit: 'Create account',
    pending: 'Creating account…',
  },
  forgot: {
    heading: 'Reset your password',
    blurb: 'We will email you a link to choose a new password.',
    submit: 'Send reset link',
    pending: 'Sending…',
  },
};

/**
 * Email + password auth, all three modes on one screen.
 *
 * A single screen with a mode switch rather than three routes: on mobile the
 * navigation cost of pushing a screen to type one field is not worth it.
 */
export default function SignInScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
  }

  function validate(): string | null {
    const trimmed = email.trim();
    if (trimmed.length === 0) return 'Enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'That does not look like an email address.';
    }
    if (mode === 'forgot') return null;
    if (password.length === 0) return 'Enter your password.';
    if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
    }
    return null;
  }

  async function submit() {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);
    const address = email.trim().toLowerCase();

    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (signInError) {
          // Supabase deliberately does not distinguish "no such user" from
          // "wrong password"; keep it that way so this cannot be used to
          // enumerate accounts.
          setError(
            signInError.message === 'Invalid login credentials'
              ? 'That email and password do not match an account.'
              : signInError.message === 'Email not confirmed'
                ? 'Please confirm your email address first — check your inbox.'
                : signInError.message,
          );
        }
        // On success, AuthProvider observes the session and the root layout
        // routes away; nothing more to do here.
      } else if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            // handle_new_user() reads full_name to fill profiles.display_name.
            data: displayName.trim().length > 0 ? { full_name: displayName.trim() } : undefined,
          },
        });
        if (signUpError) {
          setError(
            signUpError.message.toLowerCase().includes('already registered')
              ? 'An account with that email already exists. Try signing in.'
              : signUpError.message,
          );
        } else if (!data.session) {
          // Email confirmation is on, so there is no session yet.
          setNotice(`Confirmation link sent to ${address}. Open it, then sign in.`);
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(address);
        // Report success either way — revealing which addresses have accounts
        // would let anyone enumerate registered users.
        if (resetError && !resetError.message.toLowerCase().includes('not found')) {
          setError(resetError.message);
        } else {
          setNotice(`If an account exists for ${address}, a reset link is on its way.`);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  const copy = COPY[mode];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom + spacing[8] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: colors.accent }]}>
            <Svg width={26} height={26} viewBox="0 0 18 18">
              {[
                { x: 1, h: 5 },
                { x: 5, h: 8 },
                { x: 9, h: 11 },
                { x: 13, h: 14 },
              ].map(({ x, h }) => (
                <Rect
                  key={x}
                  x={x}
                  y={16 - h}
                  width={2.5}
                  height={h}
                  rx={1.25}
                  fill={colors.onAccent}
                  opacity={0.55 + (h / 14) * 0.45}
                />
              ))}
            </Svg>
          </View>
          <Text style={[styles.wordmark, { color: colors.text }]}>Shortlist</Text>
        </View>

        <View
          style={[
            styles.card,
            elevation.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.heading, { color: colors.text }]}>{copy.heading}</Text>
          <Text style={[styles.blurb, { color: colors.textMuted }]}>{copy.blurb}</Text>

          {error && (
            <View style={[styles.banner, { backgroundColor: colors.dangerSubtle }]}>
              <Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}
          {notice && (
            <View style={[styles.banner, { backgroundColor: colors.successSubtle }]}>
              <Text style={[styles.bannerText, { color: colors.success }]}>{notice}</Text>
            </View>
          )}

          {mode === 'signUp' && (
            <LabelledInput
              label="Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name (optional)"
              autoCapitalize="words"
              autoComplete="name"
            />
          )}

          <LabelledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          {mode !== 'forgot' && (
            <LabelledInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              hint={mode === 'signUp' ? 'At least 8 characters.' : undefined}
              onSubmitEditing={submit}
            />
          )}

          <Pressable
            onPress={submit}
            disabled={pending}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: pressed ? colors.accentPressed : colors.accent,
                opacity: pending ? 0.7 : 1,
              },
            ]}
          >
            {pending && <ActivityIndicator color={colors.onAccent} size="small" />}
            <Text style={[styles.submitText, { color: colors.onAccent }]}>
              {pending ? copy.pending : copy.submit}
            </Text>
          </Pressable>

          {mode === 'signIn' && (
            <Pressable onPress={() => switchTo('forgot')} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.accent }]}>Forgot your password?</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.switcher}>
          {mode === 'signIn' ? (
            <Pressable onPress={() => switchTo('signUp')} accessibilityRole="button">
              <Text style={[styles.switchText, { color: colors.textMuted }]}>
                No account yet? <Text style={{ color: colors.accent }}>Create one</Text>
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => switchTo('signIn')} accessibilityRole="button">
              <Text style={[styles.switchText, { color: colors.accent }]}>Back to sign in</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.legal, { color: colors.textSubtle }]}>
          Shortlist links out to Amazon to complete purchases. It never sees or stores your Amazon
          credentials.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabelledInput({
  label,
  hint,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label: string; hint?: string }) {
  const colors = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.textSubtle}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface },
        ]}
      />
      {hint && <Text style={[styles.hint, { color: colors.textSubtle }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing[6] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], justifyContent: 'center' },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontSize: fontSize.xl, fontWeight: '600', letterSpacing: -0.3 },
  card: {
    marginTop: spacing[8],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[3],
  },
  heading: { fontSize: fontSize.xl, fontWeight: '600', letterSpacing: -0.3 },
  blurb: { fontSize: fontSize.sm, lineHeight: 20 },
  banner: { padding: spacing[3], borderRadius: radius.md },
  bannerText: { fontSize: fontSize.sm, lineHeight: 20 },
  field: { gap: spacing[1] },
  label: { fontSize: fontSize.sm, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
  },
  hint: { fontSize: fontSize.xs },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    marginTop: spacing[1],
  },
  submitText: { fontSize: fontSize.base, fontWeight: '600' },
  link: { fontSize: fontSize.sm, fontWeight: '500', textAlign: 'center' },
  switcher: { marginTop: spacing[5], alignItems: 'center' },
  switchText: { fontSize: fontSize.sm },
  legal: { fontSize: fontSize.xs, lineHeight: 18, textAlign: 'center', marginTop: spacing[6] },
});
