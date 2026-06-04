import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#0d1117' }, headerTintColor: '#f1f5f9', headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detailed" options={{ title: 'Pokémon Details', headerBackTitle: 'Back' }} />
      </Stack>
    </>
  );
}
