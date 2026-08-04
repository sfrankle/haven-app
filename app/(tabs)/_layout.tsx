import { Tabs } from 'expo-router';
import { TAB_BAR_SCREEN_OPTIONS, makeTabBarIcon } from '@/components';

export default function TabLayout() {
  return (
    <Tabs screenOptions={TAB_BAR_SCREEN_OPTIONS}>
      <Tabs.Screen name="(tend)" options={{ title: 'Tend', tabBarIcon: makeTabBarIcon('(tend)'), tabBarButtonTestID: 'tab-tend' }} />
      <Tabs.Screen name="trace" options={{ title: 'Trace', tabBarIcon: makeTabBarIcon('trace'), tabBarButtonTestID: 'tab-trace' }} />
      <Tabs.Screen name="weave" options={{ title: 'Weave', tabBarIcon: makeTabBarIcon('weave'), tabBarButtonTestID: 'tab-weave' }} />
      <Tabs.Screen name="anchor" options={{ title: 'Anchor', tabBarIcon: makeTabBarIcon('anchor'), tabBarButtonTestID: 'tab-anchor' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: makeTabBarIcon('settings'), tabBarButtonTestID: 'tab-settings' }} />
    </Tabs>
  );
}
