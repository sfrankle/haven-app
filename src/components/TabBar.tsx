import { colors } from '@/constants/theme';

/**
 * Maps each tab screen name to its MaterialCommunityIcons icon name.
 * Used in _layout.tsx tabBarIcon render props and independently testable.
 */
export const TAB_ICON_MAP = {
  '(tend)': 'spa-outline',
  trace: 'notebook-heart-outline',
  weave: 'chart-timeline-variant-shimmer',
  anchor: 'anchor',
  settings: 'tune',
} as const;

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
