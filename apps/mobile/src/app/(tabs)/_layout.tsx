import { Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { BookmarkIcon, HistoryIcon, SearchIcon } from '@/components/Icons';
import { fontSize, spacing, useTheme } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function TabsLayout() {
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SignOutButton />,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <SearchIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <HistoryIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => <BookmarkIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

/**
 * Sign out, in the header rather than a settings screen — with only one
 * account action, a whole screen for it would be overkill.
 */
function SignOutButton() {
  const colors = useTheme();
  const { signOut } = useAuth();

  return (
    <Pressable
      onPress={() => void signOut()}
      hitSlop={8}
      accessibilityRole="button"
      style={{ paddingHorizontal: spacing[4] }}
    >
      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '500' }}>
        Sign out
      </Text>
    </Pressable>
  );
}
