import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export const TAB_ICON_MAP = {
  '(tend)': 'spa-outline',
  trace: 'notebook-heart-outline',
  weave: 'chart-timeline-variant-shimmer',
  anchor: 'anchor',
  settings: 'tune',
} as const;

export function makeTabBarIcon(tab: keyof typeof TAB_ICON_MAP) {
  return ({ color, size }: { color: string; size: number }) => (
    <MaterialCommunityIcons name={TAB_ICON_MAP[tab]} size={size} color={color} />
  );
}

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
