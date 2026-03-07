import { colors } from '@/constants/theme';

/**
 * Shared screenOptions for the Expo Router <Tabs> component.
 * Spread into <Tabs screenOptions={TAB_BAR_SCREEN_OPTIONS}>.
 */
export const TAB_BAR_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: colors.interactive,
  tabBarInactiveTintColor: colors.chrome,
  tabBarStyle: {
    backgroundColor: colors.surface,
  },
} as const;
