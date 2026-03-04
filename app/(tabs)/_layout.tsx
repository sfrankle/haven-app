import { Tabs } from 'expo-router';

const TAB_ACTIVE = '#3B4E77';
const TAB_INACTIVE = '#7393A1';
const TAB_BG = '#FFFFFF';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: { backgroundColor: TAB_BG },
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
