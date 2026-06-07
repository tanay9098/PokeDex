import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';
import '../lib/wagmi';

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppKit } from '@reown/appkit-wagmi-react-native';
import { wagmiConfig, queryClient } from '../lib/wagmi';

export default function RootLayout() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerStyle: { backgroundColor: '#0d1117' }, headerTintColor: '#f1f5f9', headerTitleStyle: { fontWeight: '700' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="detailed" options={{ title: 'Pokémon Details', headerBackTitle: 'Back' }} />
        </Stack>
        <AppKit />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
