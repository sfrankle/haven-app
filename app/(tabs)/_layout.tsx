import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.interactive,
        tabBarInactiveTintColor: colors.chrome,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tend' }} />
      <Tabs.Screen name="trace" options={{ title: 'Trace' }} />
      <Tabs.Screen name="weave" options={{ title: 'Weave' }} />
      <Tabs.Screen name="anchor" options={{ title: 'Anchor' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
