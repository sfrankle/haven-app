import { Tabs } from 'expo-router';
import { TAB_BAR_SCREEN_OPTIONS } from '@/components';

export default function TabLayout() {
  return (
    <Tabs screenOptions={TAB_BAR_SCREEN_OPTIONS}>
      <Tabs.Screen name="index" options={{ title: 'Tend' }} />
      <Tabs.Screen name="trace" options={{ title: 'Trace' }} />
      <Tabs.Screen name="weave" options={{ title: 'Weave' }} />
      <Tabs.Screen name="anchor" options={{ title: 'Anchor' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
