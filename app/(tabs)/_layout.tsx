import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TAB_BAR_SCREEN_OPTIONS, TAB_ICON_MAP } from '@/components';

export default function TabLayout() {
  return (
    <Tabs screenOptions={TAB_BAR_SCREEN_OPTIONS}>
      <Tabs.Screen
        name="(tend)"
        options={{
          title: 'Tend',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICON_MAP['(tend)']} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trace"
        options={{
          title: 'Trace',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICON_MAP['trace']} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weave"
        options={{
          title: 'Weave',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICON_MAP['weave']} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="anchor"
        options={{
          title: 'Anchor',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICON_MAP['anchor']} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICON_MAP['settings']} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
