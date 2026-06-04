import { Tabs } from "expo-router";

const typeColors: Record<string, string> = {
  fire: '#ef4444', water: '#3b82f6', grass: '#22c55e',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0d1117',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#0d1117' },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />, headerTitle: 'PokéDex NFT' }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{ title: 'Market', tabBarIcon: ({ color }) => <TabIcon emoji="🛒" color={color} />, headerTitle: 'Marketplace' }}
      />
      <Tabs.Screen
        name="battle"
        options={{ title: 'Battle', tabBarIcon: ({ color }) => <TabIcon emoji="⚔️" color={color} />, headerTitle: 'Battle Arena' }}
      />
      <Tabs.Screen
        name="collection"
        options={{ title: 'Collection', tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} />, headerTitle: 'My Collection' }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
